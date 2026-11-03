/**
 * Host half of dsh-completed-ding.
 *
 * The reminder itself lives entirely in the browser. This half adds one
 * authenticated, same-origin update route: it reads the public Gitee repository
 * and can replace the plugin's runtime files without uninstalling it. A second
 * route clears the leftovers an earlier install or uninstall can leave behind,
 * right before the plugin manager removes the package.
 *
 * The routes are intentionally quiet until the user asks for them.
 */
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lstat, mkdir, readFile, readdir, realpath, rm, rmdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PACKAGE_NAME = 'dsh-completed-ding';
const GITEE_OWNER = 'user_gitee';
const GITEE_REPO = 'dsh-completed-ding';
const GITEE_BRANCH = 'master';
const GITEE_REPO_URL = 'https://gitee.com/user_gitee/dsh-completed-ding.git';
const ROUTE_PATH = '/completed-ding/update';
const FOREGROUND_PATH = '/completed-ding/foreground';
const UNINSTALL_PATH = '/completed-ding/uninstall';
const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const REQUEST_LIMIT_BYTES = 4 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const FULLSCREEN_TIMEOUT_MS = 1_500;
const FULLSCREEN_CACHE_MS = 1_200;
/* Anonymous Gitee API calls are capped at roughly 60 per hour per IP, so file
 * bodies come from the raw endpoint and directory listings are cached. */
const RAW_BASE = `https://gitee.com/${GITEE_OWNER}/${GITEE_REPO}/raw`;
const RATE_LIMIT_HINT = 'Gitee 接口限流（403）：未登录调用每小时约 60 次，请约一小时后再试；频繁点「更新」也会触发。';
const DIRECTORY_CACHE_MS = 5 * 60 * 1000;
const directoryCache = new Map();

function apiUrl(path) {
  return `https://gitee.com/api/v5/repos/${GITEE_OWNER}/${GITEE_REPO}${path}`;
}

function encodeContentPath(path) {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/** One Gitee failure, in words the settings page can show as-is. */
function giteeFailure(status, detail) {
  const limited = status === 429 || (status === 403 && /rate\s*limit/i.test(detail));
  const error = new Error(limited
    ? RATE_LIMIT_HINT
    : `Gitee ${status}${detail ? `: ${detail}` : ''}`);
  error.status = status;
  error.rateLimited = limited;
  return error;
}

/** Read one file from the raw endpoint: it does not spend the API quota. */
async function readRaw(branch, path) {
  const url = `${RAW_BASE}/${encodeURIComponent(branch)}/${encodeContentPath(path)}`;
  const response = await fetch(url, {
    headers: { 'user-agent': 'dsh-completed-ding-updater' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    throw giteeFailure(response.status, detail);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** One directory listing, cached for a few minutes to spare the API quota. */
async function listDirectory(branch, directory) {
  const key = `${branch}:${directory}`;
  const cached = directoryCache.get(key);
  if (cached !== undefined && Date.now() - cached.at < DIRECTORY_CACHE_MS) return cached.entries;
  const entries = await gitee(`/contents/${encodeContentPath(directory)}?ref=${encodeURIComponent(branch)}`);
  if (Array.isArray(entries)) directoryCache.set(key, { at: Date.now(), entries });
  return entries;
}

const FULLSCREEN_SCRIPT = `
$signature = @"
using System;
using System.Runtime.InteropServices;
public static class DshForeground {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);
}
"@
Add-Type -TypeDefinition $signature
$h = [DshForeground]::GetForegroundWindow()
if ($h -eq [IntPtr]::Zero) { Write-Output '0'; exit }
$class = New-Object System.Text.StringBuilder 256
[DshForeground]::GetClassName($h, $class, $class.Capacity) | Out-Null
if ($class.ToString() -match '^(Progman|WorkerW|Shell_TrayWnd)$') { Write-Output '0'; exit }
$rect = New-Object DshForeground+RECT
if (-not [DshForeground]::GetWindowRect($h, [ref]$rect)) { Write-Output '0'; exit }
$monitor = New-Object DshForeground+MONITORINFO
$monitor.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($monitor)
$handle = [DshForeground]::MonitorFromWindow($h, 2)
if (-not [DshForeground]::GetMonitorInfo($handle, [ref]$monitor)) { Write-Output '0'; exit }
$full = $rect.Left -le $monitor.rcMonitor.Left -and $rect.Top -le $monitor.rcMonitor.Top -and $rect.Right -ge $monitor.rcMonitor.Right -and $rect.Bottom -ge $monitor.rcMonitor.Bottom
if ($full) { Write-Output '1' } else { Write-Output '0' }
`;

let fullscreenCache = { at: 0, value: false };

async function foregroundFullscreen() {
  if (process.platform !== 'win32') return false;
  const now = Date.now();
  if (now - fullscreenCache.at < FULLSCREEN_CACHE_MS) return fullscreenCache.value;
  let value = false;
  try {
    const encoded = Buffer.from(FULLSCREEN_SCRIPT, 'utf16le').toString('base64');
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-EncodedCommand',
      encoded,
    ], {
      timeout: FULLSCREEN_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 64 * 1024,
    });
    value = String(stdout).trim() === '1';
  } catch {
    value = false;
  }
  fullscreenCache = { at: now, value };
  return value;
}

function normalizeVersion(value) {
  const raw = String(value == null ? '' : value).trim().replace(/^v/i, '');
  const [core] = raw.split('-');
  return core.split('.').map((part) => {
    const number = Number.parseInt(part, 10);
    return Number.isFinite(number) ? number : 0;
  });
}

function compareVersions(left, right) {
  const a = normalizeVersion(left);
  const b = normalizeVersion(right);
  const length = Math.max(a.length, b.length, 3);
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }
  return 0;
}

async function gitee(path, signal) {
  const response = await fetch(apiUrl(path), {
    headers: {
      accept: 'application/json',
      'user-agent': 'dsh-completed-ding-updater',
    },
    signal: signal || AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    throw giteeFailure(response.status, detail);
  }
  return response.json();
}

async function readLocalPackage() {
  const text = await readFile(join(PACKAGE_ROOT, 'package.json'), 'utf8');
  return JSON.parse(text);
}

async function fetchLatestPackage() {
  let branch = GITEE_BRANCH;
  let raw;
  try {
    raw = await readRaw(branch, 'package.json');
  } catch (error) {
    /* Only a renamed default branch justifies asking the API for its name. */
    if (error.status !== 404) throw error;
    const repository = await gitee('');
    if (typeof repository.default_branch === 'string' && repository.default_branch) {
      branch = repository.default_branch;
    }
    raw = await readRaw(branch, 'package.json');
  }
  const latest = JSON.parse(raw.toString('utf8'));
  if (latest.name !== PACKAGE_NAME) {
    throw new Error(`the Gitee package is "${String(latest.name)}", not ${PACKAGE_NAME}`);
  }
  if (typeof latest.version !== 'string' || latest.version.trim() === '') {
    throw new Error('the Gitee package has no version');
  }
  return {
    branch,
    packageJson: latest,
    raw,
  };
}

function globToRegExp(pattern) {
  let source = '^';
  for (const character of pattern) {
    if (character === '*') source += '.*';
    else if (character === '?') source += '.';
    else source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  }
  return new RegExp(`${source}$`);
}

async function collectRuntimeFiles(latest, branch) {
  const files = new Set(['package.json', 'index.js', 'client.js', 'cordis.patch.yml']);
  const declared = Array.isArray(latest.files) ? latest.files : [];
  for (const pattern of declared) {
    if (typeof pattern !== 'string' || pattern.trim() === '') continue;
    if (pattern.includes('..') || isAbsolute(pattern)) continue;
    const slash = pattern.indexOf('/');
    if (slash >= 0 && pattern.slice(slash + 1).includes('*')) {
      const directory = pattern.slice(0, slash);
      const namePattern = pattern.slice(slash + 1);
      const entries = await listDirectory(branch, directory);
      if (!Array.isArray(entries)) continue;
      const matcher = globToRegExp(namePattern);
      for (const entry of entries) {
        if (entry && entry.type === 'file' && matcher.test(entry.name)) {
          files.add(`${directory}/${entry.name}`);
        }
      }
    } else {
      files.add(pattern);
    }
  }
  return [...files];
}

async function downloadRuntimeFiles(latest, branch) {
  const paths = await collectRuntimeFiles(latest, branch);
  const payload = new Map();
  let total = 0;
  for (const path of paths) {
    const bytes = await readRaw(branch, path);
    if (bytes.length > MAX_FILE_BYTES) {
      throw new Error(`${path} is larger than the 5 MB update limit`);
    }
    total += bytes.length;
    if (total > MAX_TOTAL_BYTES) {
      throw new Error('the update is larger than the 25 MB limit');
    }
    payload.set(path, bytes);
  }

  const client = payload.get('client.js');
  if (!client) throw new Error('the Gitee package has no client.js');
  const clientText = client.toString('utf8');
  if (!clientText.includes('window.__ModuleLoader__.load') || !clientText.includes(PACKAGE_NAME)) {
    throw new Error('client.js is not a dsh-completed-ding client bundle');
  }
  try {
    new Function(clientText);
  } catch (error) {
    throw new Error(`client.js has a syntax error: ${messageOf(error)}`);
  }

  const index = payload.get('index.js');
  if (!index || !index.toString('utf8').includes('export function apply')) {
    throw new Error('index.js is not a valid Host entry');
  }
  const patch = payload.get('cordis.patch.yml');
  if (!patch || !patch.toString('utf8').includes(PACKAGE_NAME)) {
    throw new Error('cordis.patch.yml does not name the plugin');
  }
  return payload;
}

function safeTarget(path) {
  const target = resolve(PACKAGE_ROOT, path);
  const inside = relative(PACKAGE_ROOT, target);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    throw new Error(`refusing to write outside the plugin directory: ${path}`);
  }
  return target;
}

function readJsonBody(req) {
  return new Promise((resolvePromise, rejectPromise) => {
    let body = '';
    let size = 0;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > REQUEST_LIMIT_BYTES) {
        rejectPromise(new Error('request body is too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('error', rejectPromise);
    req.on('end', () => {
      try {
        resolvePromise(body ? JSON.parse(body) : {});
      } catch {
        rejectPromise(new Error('request body is not valid JSON'));
      }
    });
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function isLoopback(req) {
  const address = req.socket && req.socket.remoteAddress;
  return address === '127.0.0.1'
    || address === '::1'
    || address === '::ffff:127.0.0.1';
}

async function checkForUpdate() {
  const [local, latest] = await Promise.all([readLocalPackage(), fetchLatestPackage()]);
  return {
    ok: true,
    currentVersion: local.version,
    latestVersion: latest.packageJson.version,
    available: compareVersions(latest.packageJson.version, local.version) > 0,
    branch: latest.branch,
    pushedAt: null,
    repoUrl: GITEE_REPO_URL,
  };
}

async function applyUpdate(requestedVersion) {
  const latest = await fetchLatestPackage();
  const local = await readLocalPackage();
  if (requestedVersion && requestedVersion !== latest.packageJson.version) {
    throw new Error(
      `the repository moved from ${requestedVersion} to ${latest.packageJson.version}; check again`,
    );
  }
  if (compareVersions(latest.packageJson.version, local.version) <= 0) {
    return {
      ok: true,
      applied: false,
      currentVersion: local.version,
      latestVersion: latest.packageJson.version,
      available: false,
    };
  }

  const payload = await downloadRuntimeFiles(latest.packageJson, latest.branch);
  const files = [...payload.keys()].sort((left, right) => {
    if (left === 'client.js') return 1;
    if (right === 'client.js') return -1;
    return 0;
  });
  const changed = [];
  const backups = new Map();

  try {
    for (const path of files) {
      const target = safeTarget(path);
      let previous = null;
      try {
        previous = await readFile(target);
      } catch (error) {
        if (error && error.code !== 'ENOENT') throw error;
      }
      backups.set(path, previous);
      if (previous && previous.equals(payload.get(path))) continue;
      changed.push(path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, payload.get(path));
    }
  } catch (error) {
    for (const path of changed.reverse()) {
      const target = safeTarget(path);
      const previous = backups.get(path);
      try {
        if (previous === null) await rm(target, { force: true });
        else await writeFile(target, previous);
      } catch {
        /* Best-effort rollback; the original write error is the useful one. */
      }
    }
    throw error;
  }

  const indexChanged = changed.includes('index.js');
  return {
    ok: true,
    applied: changed.length > 0,
    currentVersion: latest.packageJson.version,
    latestVersion: latest.packageJson.version,
    available: false,
    files: changed,
    restartRequired: indexChanged,
  };
}

/** pnpm's temporary directory for a package it is importing, e.g. dsh-completed-ding_tmp_7244_3. */
const TEMPORARY_DIRECTORY = new RegExp(`^${PACKAGE_NAME}_tmp_\\d+_\\d+$`);

/**
 * The profile directory this plugin was installed into. The Host knows it
 * through `profileContext`; the package location answers for hosts without it.
 * @param ctx - the Host plugin context.
 * @returns the profile directory, or null when it cannot be told.
 */
function profileDirectory(ctx) {
  try {
    const profile = ctx.get('profileContext');
    if (profile && typeof profile.dir === 'string' && profile.dir !== '') return profile.dir;
  } catch {
    /* The service is optional outside profile-managed hosts. */
  }
  const parent = dirname(PACKAGE_ROOT);
  return basename(parent) === 'node_modules' ? dirname(parent) : null;
}

async function realPath(path) {
  try {
    return await realpath(path);
  } catch {
    return null;
  }
}

async function sameDirectory(left, right) {
  const [a, b] = await Promise.all([realPath(left), realPath(right)]);
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}

/** Whether a directory holds this package, so a cleanup never deletes a stranger. */
async function declaresPackage(directory) {
  try {
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    return manifest !== null && typeof manifest === 'object' && manifest.name === PACKAGE_NAME;
  } catch {
    return false;
  }
}

/**
 * Remove what an interrupted install or uninstall leaves in the profile's
 * node_modules: the directory link a local-path install creates, and pnpm's
 * temporary directories. Either one makes the next install fail with EPERM on
 * Windows, because pnpm cannot move a package into a name that already exists.
 * The package the Host is running from is left to the plugin manager's own
 * `pnpm remove`, so a failed removal cannot leave the profile half-uninstalled.
 * @param profileDir - the profile directory the plugin lives in.
 * @returns the entries removed, and those deliberately kept with the reason.
 */
async function cleanUninstallLeftovers(profileDir) {
  const nodeModules = join(profileDir, 'node_modules');
  const removed = [];
  const kept = [];
  const attempt = async (target, remove) => {
    try {
      await remove();
      removed.push(relative(profileDir, target));
    } catch (error) {
      kept.push({ path: relative(profileDir, target), reason: messageOf(error) });
    }
  };

  const packageDir = join(nodeModules, PACKAGE_NAME);
  const entry = await lstat(packageDir).catch(() => null);
  if (entry !== null) {
    if (entry.isSymbolicLink()) {
      /* A junction or symlink from a local-path install; remove the link, never its target. */
      await attempt(packageDir, () => rmdir(packageDir));
    } else if (entry.isDirectory()) {
      if (await sameDirectory(packageDir, PACKAGE_ROOT)) {
        kept.push({
          path: relative(profileDir, packageDir),
          reason: 'the running package is removed by the plugin manager',
        });
      } else if (await declaresPackage(packageDir)) {
        await attempt(packageDir, () => rm(packageDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 }));
      } else {
        kept.push({ path: relative(profileDir, packageDir), reason: 'not a dsh-completed-ding package' });
      }
    }
  }

  for (const directory of [nodeModules, join(nodeModules, '.ignored')]) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const item of entries) {
      if (!TEMPORARY_DIRECTORY.test(item.name)) continue;
      const target = join(directory, item.name);
      await attempt(target, () => rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 }));
    }
  }

  return { removed, kept };
}

/** Wait for the Web carrier before registering routes; apply may run first on boot. */
export const inject = ['webServer'];

/** Register the updater route. Normal reminders never touch the network. */
export function apply(ctx) {
  const webServer = ctx.get('webServer');
  if (!webServer || typeof webServer.register !== 'function') return;
  const connection = ctx.get('connection');

  let applying = null;

  const rejectUnauthorized = (req, res) => {
    if (connection && typeof connection.requestRejection === 'function') {
      const rejection = connection.requestRejection({ headers: req.headers });
      if (rejection) {
        sendJson(res, rejection, { ok: false, error: 'unauthorized' });
        return true;
      }
      return false;
    }
    if (!isLoopback(req)) {
      sendJson(res, 403, { ok: false, error: 'forbidden' });
      return true;
    }
    return false;
  };

  const handler = async (req, res) => {
    try {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' });
        return;
      }
      if (rejectUnauthorized(req, res)) return;

      const body = await readJsonBody(req);
      if (body.action === 'check') {
        sendJson(res, 200, await checkForUpdate());
        return;
      }
      if (body.action === 'apply') {
        if (applying) {
          sendJson(res, 200, { ok: false, error: 'an update is already running' });
          return;
        }
        applying = applyUpdate(typeof body.version === 'string' ? body.version : '');
        try {
          sendJson(res, 200, await applying);
        } finally {
          applying = null;
        }
        return;
      }
      sendJson(res, 400, { ok: false, error: 'unknown update action' });
    } catch (error) {
      sendJson(res, 200, { ok: false, error: messageOf(error) });
    }
  };

  const foregroundHandler = async (req, res) => {
    try {
      if (req.method !== 'GET') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' });
        return;
      }
      if (rejectUnauthorized(req, res)) return;
      sendJson(res, 200, {
        ok: true,
        fullscreen: await foregroundFullscreen(),
      });
    } catch (error) {
      sendJson(res, 200, { ok: false, error: messageOf(error), fullscreen: false });
    }
  };

  /*
   * Runs while the plugin still can answer: the client asks for this right
   * before it hands the uninstall to the plugin manager, so a leftover link or
   * temporary directory cannot make the next install fail with EPERM.
   */
  const uninstallHandler = async (req, res) => {
    try {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' });
        return;
      }
      if (rejectUnauthorized(req, res)) return;
      const body = await readJsonBody(req);
      if (body.action !== undefined && body.action !== 'cleanup') {
        sendJson(res, 400, { ok: false, error: 'unknown uninstall action' });
        return;
      }
      const profileDir = profileDirectory(ctx);
      if (profileDir === null) {
        sendJson(res, 200, { ok: false, error: 'the profile directory is unknown here' });
        return;
      }
      sendJson(res, 200, { ok: true, ...await cleanUninstallLeftovers(profileDir) });
    } catch (error) {
      sendJson(res, 200, { ok: false, error: messageOf(error) });
    }
  };

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler,
  }), 'completed-ding: update route');

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: FOREGROUND_PATH,
    handler: foregroundHandler,
  }), 'completed-ding: foreground route');

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: UNINSTALL_PATH,
    handler: uninstallHandler,
  }), 'completed-ding: uninstall route');
}
