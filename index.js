/**
 * Host half of dsh-completed-ding.
 *
 * The reminder itself lives entirely in the browser. This half adds one
 * authenticated, same-origin update route: it reads the public Gitee repository
 * and can replace the plugin's runtime files without uninstalling it.
 *
 * The route is intentionally quiet until the user presses "check for updates".
 */
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const REQUEST_LIMIT_BYTES = 4 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const FULLSCREEN_TIMEOUT_MS = 1_500;
const FULLSCREEN_CACHE_MS = 1_200;

function apiUrl(path) {
  return `https://gitee.com/api/v5/repos/${GITEE_OWNER}/${GITEE_REPO}${path}`;
}

function encodeContentPath(path) {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
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
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Gitee ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return response.json();
}

function decodeEntry(entry) {
  if (!entry || entry.type !== 'file' || typeof entry.content !== 'string') {
    throw new Error('Gitee returned a non-file entry');
  }
  if (entry.encoding === 'utf-8' || entry.encoding === 'utf8') {
    return Buffer.from(entry.content, 'utf8');
  }
  return Buffer.from(entry.content.replace(/\s+/g, ''), 'base64');
}

async function readLocalPackage() {
  const text = await readFile(join(PACKAGE_ROOT, 'package.json'), 'utf8');
  return JSON.parse(text);
}

async function fetchLatestPackage() {
  const repository = await gitee('');
  const branch = typeof repository.default_branch === 'string' && repository.default_branch
    ? repository.default_branch
    : GITEE_BRANCH;
  const entry = await gitee(`/contents/package.json?ref=${encodeURIComponent(branch)}`);
  const raw = decodeEntry(entry);
  const latest = JSON.parse(raw.toString('utf8'));
  if (latest.name !== PACKAGE_NAME) {
    throw new Error(`the Gitee package is "${String(latest.name)}", not ${PACKAGE_NAME}`);
  }
  if (typeof latest.version !== 'string' || latest.version.trim() === '') {
    throw new Error('the Gitee package has no version');
  }
  return {
    repository,
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
      const entries = await gitee(
        `/contents/${encodeContentPath(directory)}?ref=${encodeURIComponent(branch)}`,
      );
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
    const entry = await gitee(
      `/contents/${encodeContentPath(path)}?ref=${encodeURIComponent(branch)}`,
    );
    const bytes = decodeEntry(entry);
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
    pushedAt: latest.repository.pushed_at,
    repoUrl: latest.repository.html_url || GITEE_REPO_URL,
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
}
