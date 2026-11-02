# 完成提醒 · 开发手册

> 面向维护者、二次开发者与做代码审查的人。<br>
> 使用手册：[docs/README.md](./README.md) ｜ 项目主页：[README.md](../README.md)

本文记录 `dsh-completed-ding` 的实现方式、运行契约、数据流、样式系统、扩展方法和发布流程。目标是让一个熟悉 React / TypeScript 的开发者在不读完全部 `client.js` 的情况下，也能安全地改动这个插件。

---

## 目录

- [0. 快速事实](#0-快速事实)
- [1. 架构总览](#1-架构总览)
- [2. 运行契约](#2-运行契约)
- [3. 数据源与状态模型](#3-数据源与状态模型)
- [4. 提醒数据模型](#4-提醒数据模型)
- [5. 触发、分类与调度](#5-触发分类与调度)
- [6. UI 组件](#6-ui-组件)
- [7. CSS 系统](#7-css-系统)
- [8. 设置子系统](#8-设置子系统)
- [9. 声音子系统](#9-声音子系统)
- [10. 集成动作](#10-集成动作)
- [11. 代码地图](#11-代码地图)
- [12. 开发与调试](#12-开发与调试)
- [13. 扩展指南](#13-扩展指南)
- [14. 性能与安全](#14-性能与安全)
- [15. 兼容性与已知限制](#15-兼容性与已知限制)
- [16. 发布流程](#16-发布流程)
- [17. 测试清单](#17-测试清单)
- [License](#license)

---

## 0. 快速事实

| 项目 | 值 |
| --- | --- |
| 包名 | `dsh-completed-ding` |
| 包版本 | `1.5.4` |
| 类型 | ESM / 无构建 |
| Host 入口 | `index.js`（Gitee 更新路由 + Windows 前台全屏检测） |
| Client 入口 | `client.js` |
| Bundle 入口 | `cordis.patch.yml` |
| 客户端运行格式 | `window.__ModuleLoader__.load({ id, factory })` |
| 主要依赖 | `react`；可选 `react-dom` |
| 样式 | 内嵌在 `client.js` 的 CSS 模板字符串中 |
| 数据持久化 | 浏览器 `localStorage` |
| 网络请求 | 手动检查/更新，或每日自动更新检查（24h 节流） |
| 后台轮询 | 无网络轮询；每小时本地 tick 判断是否到期 |
| License | AGPL-3.0 |

`client.js` 约 4k 行、约 140 KB，单文件包含：

- 常量与国际化字典
- 设置存储与迁移
- 图标、吉祥物、设置页、提醒卡片
- 会话状态订阅、队列、声音、DSH 内 / Windows 通知中心 / 悬浮窗切换
- 全部 CSS

没有 `src/`、没有打包器、没有生成步骤。修改 `client.js` 就是修改产物。

---

## 1. 架构总览

```text
┌────────────────────────────────────────────────────────────┐
│ DSH Host                                                   │
│  · Session 状态投影（running / pendingInteraction）          │
│  · api-session/error 事件                                   │
│  · remote.session（打开工作区）                              │
│  · remote.pluginManager（卸载）                              │
│  · webServer / connection → /completed-ding/update       │
│  · /completed-ding/foreground → Win32 前台全屏检测        │
│  · Gitee API（仅检查/应用更新时）                             │
│  · uiWorkspace（跳转会话，客户端服务）                        │
└───────────────────────────┬────────────────────────────────┘
                            │ Cordis / Remote / Slots / 同源 HTTP
┌───────────────────────────▼────────────────────────────────┐
│ Client bundle: dsh-completed-ding                          │
│                                                            │
│  apply(ctx)                                                │
│   ├─ locale.register(NS, { zh, en })                       │
│   ├─ insertStyles(CSS)                                     │
│   ├─ audio unlock listeners                                 │
│   ├─ runtime.remote / runtime.openPluginManager             │
│   └─ slot registrations                                    │
│        ├─ shell.overlay  → ToastLayer                      │
│        ├─ sidebar.panellist → PanelIcon                    │
│        └─ main (key) → SettingsPage                        │
│                                                            │
│  ToastLayer                                                 │
│   ├─ useSessionStatus(...)                                  │
│   ├─ completion / error / pendingInteraction detection      │
│   ├─ queue state machine                                    │
│   └─ ReactDOM.createPortal(card, body-level host)           │
│   ├─ desktop mode: Web Notification → OS                    │
│   └─ floating mode: Document PiP → always-on-top window     │
│                                                            │
│  SettingsPage                                               │
│   ├─ 配置 / 预览 / 卸载                                     │
│   └─ 版本与更新 → POST /completed-ding/update            │
└────────────────────────────────────────────────────────────┘
```

### Host half 负责更新与前台检测

`index.js` 注册两个同源、已认证路由：

- `POST /completed-ding/update`：
  - `check`：读取 Gitee `master` 的 `package.json` 并比较版本。
  - `apply`：按最新 `package.json` 的 `files` 拉取运行文件，校验
    `client.js` / `index.js` / `cordis.patch.yml`，然后替换插件目录中的文件。
  - 写入失败时回滚已替换的文件；`client.js` 最后写入，避免 HMR 在资源尚未
    落盘时提前重载。
- `GET /completed-ding/foreground`：Windows 前台窗口全屏检测，供 Windows 通知
  全屏静音使用。

没有 `webServer` 时直接返回，不影响提醒功能。Host 仍然没有定时器、轮询或常驻
网络任务；Gitee 请求由客户端的每日检查或设置页手动检查触发。

---

## 2. 运行契约

### 2.1 Client factory

```js
window.__ModuleLoader__.load({
  id: 'dsh-completed-ding',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    let ReactDOM = null;
    try { ReactDOM = require('react-dom'); } catch { /* optional */ }

    // ... component / CSS / apply

    return { inject, apply };
  },
});
```

约定：

- `id` 必须等于包名 `dsh-completed-ding`。
- `require('react')` 来自宿主的模块表，不要自己安装 React 或引 CDN。
- `react-dom` 是可选增强：用于 Body Portal。缺失时退回内联渲染，提醒仍然可用。
- `apply(ctx)` 中注册的所有资源都必须通过 `ctx.effect` / `ctx.on` 或组件 effect 返回清理函数。
- `inject` 数组声明依赖的 Client 服务：

```js
const inject = [
  'slots',
  'sessions',
  'workspaces',
  'locale',
  'remote',
  'remote.session',
  'remote.pluginManager',
];
```

`remote.pluginManager` 用于设置页的卸载按钮，属于必需依赖（DSH 插件管理器提供）。`uiWorkspace` / `pluginNavigation` 是可选增强，缺失时代码会退化为提示文字。

> `inject` 中列出的服务缺失时，插件不会被激活。新增必需服务前请确认宿主确实提供；可选能力请用 `ctx.get()` + 运行时判断，不要放进 `inject`。

### 2.2 Slot 注册

| Slot | id | order | 组件 | 作用 |
| --- | --- | --- | --- | --- |
| `shell.overlay` | `completed-ding.toast` | 80 | `ToastLayer` | 全窗口浮层里的提醒卡片 |
| `sidebar.panellist` | `completed-ding` | 30 | `PanelIcon` | 左侧栏「完成提醒」入口 |
| `main` | key = `completed-ding` | — | `SettingsPage` | 设置页 |

`shell.overlay` 的 inject 面：

```js
inject: () => ({
  sessions,
  workspaces,
  sessionRemote,
  remote,
  uiWorkspace,
})
```

`SettingsPage` 不通过 slot props 拿服务，而是读 `runtime`：

```js
const runtime = {
  remote: null,
  openPluginManager: () => false,
};
```

`apply()` 里填充它。这样设置页可以在不额外声明 slot inject 的情况下访问卸载服务。

### 2.3 标准 props

`ToastLayer` 收到：

| prop | 含义 |
| --- | --- |
| `t` | 绑定到 `completed-ding` 命名空间的翻译函数 |
| `sessions` | 会话 store（`list.getSnapshot()`） |
| `workspaces` | 工作区 store |
| `sessionRemote` | `remote.session`，打开工作区用 |
| `remote` | `ctx.remote`，事件订阅等 |
| `uiWorkspace` | 可选，跳转到待回答会话 |
| `useSessionStatus` | 会话状态投影 hook |

`SettingsPage` 收到 `t`，其余从模块级设置/`runtime` 读取。

---

## 3. 数据源与状态模型

### 3.1 `useSessionStatus` 的 Map

`ToastLayer` 通过：

```js
const statusHook = typeof useSessionStatus === 'function'
  ? useSessionStatus
  : (selector) => selector(EMPTY_STATUS);

const status = statusHook((snapshot) => snapshot);
```

拿到一个 `Map<sessionId, SessionStatus>`：

```ts
type SessionStatus = {
  running?: boolean;
  pendingInteraction?: PendingInteraction;
  completionUnread?: boolean; // 存在；本插件没有使用
};
```

关键点：

- `running` 从 `true` 变成 `false` → 完成。
- `pendingInteraction` 从无到有 → 需要你回答。
- 同一个 interaction 对象在状态更新中保持引用稳定；用引用/字段生成 identity 做去重。
- `completionUnread` 是宿主给其他 UI 的未读标记；本插件不使用。

### 3.2 `pendingInteraction` 形状

按 `kind` 分：

```ts
type PendingInteraction =
  | {
      kind: 'question' | 'plan-review';
      sessionId: string;
      key: string;
      callId?: string;
      questions: Array<{
        question: string;
        header?: string;
        options?: Array<{ label: string; description?: string }>;
      }>;
    }
  | {
      kind: 'approval';
      sessionId: string;
      key?: string;
      callId?: string;
      toolName?: string;
      reason?: string;
      displayReason?: string;
    };
```

插件只读取：

- `kind`
- `questions[0].header` / `questions[0].question`
- `questions.length`
- `toolName`
- `reason` / `displayReason`（优先 `displayReason`）
- `key`（用于去重）

未知 kind 会退化为普通问题样式。

### 3.3 会话行

`sessions.list.getSnapshot()` 的关键字段：

```ts
{
  byId: Record<string, {
    id: string;
    title?: string;
    displayTitle?: string;
    cwd?: string;
    origin?: 'subagent' | string;
    blank?: boolean;
    retainedBy?: { mainView?: number };
  }>;
  ids: string[];
  phase: string;
}
```

插件用它来：

- 取标题、cwd、origin、blank。
- 过滤子代理（`includeSubagents === false` 时跳过 `origin === 'subagent'`）。
- 生成工作区/路径展示。

### 3.4 工作区

```ts
workspaces.list.getSnapshot() = {
  items: Array<{
    title?: string;
    path?: string;
    sessionIds?: string[];
  }>;
}
```

`resolveWorkspace(session, state)`：

1. 用 `session.id` 在 `items[].sessionIds` 中找到 owner。
2. owner 有 title 且不是 `default-workspace` → 用它。
3. 否则用 owner.path 的 basename。
4. 找不到 owner → 用 `session.cwd` 的 basename。

---

## 4. 提醒数据模型

### 4.1 普通提醒（完成 / 失败）

`makeNotice(session, workspaceState, settings, fallbackWorkspace, failure)` 返回：

| 字段 | 说明 |
| --- | --- |
| `key` | `${session.id}:${Date.now()}`，每次新提醒唯一 |
| `workspace` | 工作区名 |
| `cwd` | 工作目录 |
| `folder` | 打开工作区用的路径 |
| `task` | 截断后的任务名 |
| `time` | 本地时间字符串 |
| `isError` | 是否失败 |
| `errorKind` | `success` 或分类结果 |
| `errorMessage` | 原始错误摘要（最多 180 字） |
| `showWorkspace` / `showTask` / `showPath` / `showTime` | 按设置决定是否渲染 |
| `durationSeconds` | 自动关闭时长 |

### 4.2 待回答提醒

`waitingFacts(interaction)` 先做安全提取：

```js
{
  kind, questions, header, text, reason, tool, key
}
```

`makeWaitingNotice(...)` 返回：

| 字段 | 说明 |
| --- | --- |
| `key` | `${sessionId}:waiting:${key || tool || Date.now()}` |
| `sessionId` | 用于跳转 |
| `waiting` | `true` |
| `waitingKind` | `question` / `plan-review` / `approval` |
| `waitingKey` | 原始 interaction key |
| `workspace` / `cwd` / `folder` | 同普通提醒 |
| `task` / `sessionTitle` | 截断后的会话标题 |
| `questionHeader` | 首题 header，截断到 `max(12, titleChars)` |
| `questionText` | 首题正文，压平空白并截断 180 字 |
| `questionCount` | 题目数量 |
| `approvalReason` | 优先 `displayReason`，其次 `reason` |
| `approvalTool` | 工具名 |
| `isError` | `false` |
| `errorKind` | `success` |
| `durationSeconds` | 同设置 |

### 4.3 展示规则（ToastLayer）

待回答卡片的文案选择：

- `approval`：
  - eyebrow = `操作等你确认`
  - 主行 = `approvalReason || 操作等你确认`
  - 详情 = `工具：{toolName}`（有工具时）
  - 按钮 = `去确认`
- `plan-review`：
  - eyebrow = `计划等你确认`
  - 主行 = `questionHeader || questionText || sessionTitle`
  - 详情 = 有 header 时显示 questionText
  - 按钮 = `去确认`
- `question`：
  - eyebrow = `{count} 个问题等你回答`（多题）或 `有个问题等你回答`
  - 主行 = `questionHeader || questionText || sessionTitle`
  - 详情 = 有 header 时显示 questionText
  - 按钮 = `去回答`

如果 `questionHeader` 为空，直接把 `questionText` 作为主行，不重复显示 detail。

---

## 5. 触发、分类与调度

### 5.1 完成：running → idle

状态 effect：

```js
for (const [sessionId, value] of status) {
  if (value?.running === true) {
    errors.current.delete(sessionId);
    cancelCompletion(sessionId);
    continue;
  }
  const before = previous?.get(sessionId);
  if (before?.running === true && value?.running === false) {
    scheduleCompletion(sessionId);
  }
}
```

`scheduleCompletion`：

```text
running true -> false
  └─ 320ms 延迟（等待错误事件落地）
       └─ showCompletion(sessionId)
            ├─ 再读一次最新 status（可能又变 running）
            ├─ 读 session 行
            ├─ 过滤 blank / subagent
            ├─ 取 30 秒内最近错误
            └─ enqueue(makeNotice(...))
```

**为什么延迟 320ms：** `api-session/error` 可能略晚于 running 变 false。先等一小段时间，避免把失败误报成“完成”。

错误缓存：

- `errors` 是一个 `Map<sessionId, { message, at }>`。
- 每个会话最多保留一条；全局最多 60 条。
- 超过 30 秒的旧错误在生成提醒时丢弃。
- 会话重新 `running === true` 时清掉旧错误。

### 5.2 失败分类

`classifyFailure(message)` 对错误文本做小写匹配，按顺序返回：

| 顺序 | kind | 关键词示例 |
| --- | --- | --- |
| 1 | `auth` | unauthorized、403、api key、credential、登录、鉴权、认证、权限 |
| 2 | `quota` | quota、balance、402、余额、额度、欠费、配额 |
| 3 | `ratelimit` | rate limit、429、限流、频率 |
| 4 | `network` | network、ECONNRESET、timeout、offline、网络、超时、断网 |
| 5 | `context` | context length、max tokens、上下文、token 数 |
| 6 | `server` | 502/503/504/500、bad gateway、服务异常 |
| 7 | `unknown` | 其余 |

对应文案在 `zh` / `en` 字典的 `toast.error.*`。新增分类时：

1. 在 `classifyFailure` 中按优先级插入正则。
2. 在两个字典添加 `toast.error.<kind>`。
3. 更新使用手册里的失败原因列表。

### 5.3 待回答：pendingInteraction

状态 effect 同时处理：

```js
const interaction = value?.pendingInteraction || null;
if (interaction) {
  showWaiting(sessionId, interaction);
  continue;
}
const before = previous?.get(sessionId);
if (before?.pendingInteraction) dismissWaiting(sessionId);
```

`showWaiting`：

1. 检查 `enabled` / `showWaiting`。
2. 生成 identity：
   ```text
   sessionId:kind:key|tool|reason|questionText[0..60]
   ```
3. `seenWaiting` Set 去重；超过 200 条时删除最早一条。
4. 取 session 行；过滤 `blank` 与子代理。
5. `enqueue(makeWaitingNotice(...))`。
6. `scheduleCue()` 播放提示音（90ms 防抖）。

`seenWaiting` 的意义：

- 同一个问题在多次 status 更新中只提醒一次。
- 用户关闭卡片后不会因为状态刷新再次弹出。
- 页面刷新会重置，因此刷新后仍 pending 的问题会再次提醒一次。

`dismissWaiting(sessionId)`：

- 如果当前卡片是这个会话的待回答 → `beginExit()`。
- 如果 pending 队列里是这个会话 → 清掉。
- 问题被回答、取消、超时后自动收起。

**初次加载：** 状态 effect 在 `previous` 为空时也会执行 `showWaiting`，所以刷新页面时仍 pending 的问题会提醒一次；完成检测则跳过首次快照。

### 5.4 队列状态机

```text
idle
  │ enqueue
  ▼
visible ── auto close / close button / replace ──► leaving
  ▲                                                  │ 180ms
  │                                                  ▼
  └──────── pending? ── gap(默认200ms) ──────────── idle
```

实现细节：

- `machine.current` 保存：
  ```js
  { active, pending, leaving, hideTimer, exitTimer, gapTimer }
  ```
- `present(next)`：清除旧计时器，设置 active，渲染，启动自动关闭定时器。
- `beginExit()`：设置 leaving，180ms 后清空 active；如果有 pending，则等 gap 后 present。
- `enqueue(next)`：
  - 没有 active → 直接 present（除非正在 gap 中，先存 pending）。
  - 有 active → pending = next，并开始退出当前卡片。
  - **pending 只保留一个**，后来者覆盖先前待显示项。
- 关闭按钮、自动关闭、新提醒替换都会走 `beginExit`。
- 待回答 interaction 消失时，只关闭对应会话的卡片，不影响其他提醒。
- 所有 timer 在组件卸载时清理。

### 5.5 声音调度

- 完成/失败：`showCompletion` 后 `scheduleCue()`。
- 待回答：`showWaiting` 后 `scheduleCue()`。
- `scheduleCue` 先清掉旧 timer，再在 90ms 后播放当前设置的声音，避免同一批状态更新连续响多次。
- 关闭提醒不停止已经播放的声音；再次播放会先 `stopSound()` 停掉上一条。

短音预设：

- `CHIME_KINDS = ['chime', 'chime-bright', 'chime-soft', 'chime-wood', 'chime-drop', 'chime-dingdong']`。
- `CHIME_PRESETS` 保存每个预设的 wave、频率序列、delay、gain、滤波和衰减；`chime` 保持原默认波形参数不变。
- `playChime(volume, kind)` 按预设合成；`playConfiguredSound` 对短音传入 `soundKind`。
- 设置页「短音」按钮点击后执行 `applyShortSound(kind)`：保存 `soundKind`、强制打开声音，并立即试听。

### 5.6 通知位置、Windows 通知中心与悬浮窗

`enqueue(next)` 先看 `settings.deliveryMode`：

- `auto`（默认）→ 用 `dshIsForeground()`（`document.visibilityState` + `document.hasFocus()`）判断：
  - 前台 → `inApp` 卡片；
  - 后台/最小化/托盘且悬浮窗已打开 → `floating`，Portal 到 PiP；
  - 后台且没有可用悬浮窗 → `desktop`；
  - `desktop` 也不可用 → 回退到 `inApp`。
- `inApp` → 走 5.4 的卡片队列。
- `desktop` → 走 `enqueueDesktop(next)`，使用浏览器 Web Notifications：

```js
new Notification(title, {
  body,
  icon: document.querySelector('link[rel="icon"]')?.href,
  silent: true,
  tag: 'dsh-completed-ding',
  requireInteraction: false,
})
```

桌面队列 `desktopMachine.current`：

```js
{ active, notice, pending, hideTimer, gapTimer }
```

- 同一时间只保留一条系统通知；新提醒会关闭上一条，等待配置的 gap（至少 180ms）后显示下一条。
- `pending` 只保留最新一条，避免系统通知中心堆积。
- `hideTimer` 按 `durationSeconds` 主动 `close()`；但系统仍可能提前/延后自动隐藏。
- `silent: true`：系统通知不播放系统音，声音仍走 5.5 的插件声音设置，避免双响。
- 点击系统通知：关闭通知，尝试 `window.focus()`，并在 `uiWorkspace.openSession` 可用时打开对应会话。
- 权限：设置页切换时调用 `Notification.requestPermission()`；拒绝、未知或没有 `Notification` 构造器时，`enqueue` 自动回退到 DSH 内卡片。
- 切换回 `inApp` 或关闭总开关时，`clearDesktopQueue()` 关闭活动通知并清空 pending/timer。
- Windows 通知的标题/正文复用提醒数据：完成/失败标题、任务名、错误摘要、工作区、问题/计划/授权内容。样式、位置和停留行为由操作系统决定。
- `suppressWindowsFullscreen` 默认 `true`：显示 Windows 通知前请求 `GET /completed-ding/foreground`；Host 用 Windows `GetForegroundWindow` + 窗口矩形与监视器 `rcMonitor` 比较，判断其他应用是否全屏。全屏时跳过通知，但 `scheduleCue` 仍播放声音。
- 前台检测缓存 1.2s；非 Windows 或 PowerShell/检测失败返回 `false`（按允许弹出处理），避免误吞提醒。
- 检测是 Best-effort：无边框全屏、游戏覆盖层、特殊多屏布局可能识别不到。

### 5.7 桌面悬浮窗

`deliveryMode: 'floating'` 时：

```js
documentPictureInPicture.requestWindow({
  width: 440,
  height: 260,
  disallowReturnToOpener: true,
  preferInitialWindowPlacement: true,
})
```

实现：

- `openFloatingWindow()` 必须在用户手势（设置页点击）中调用；返回的 PiP 窗口默认置顶。
- 把 `CSS + FLOATING_CSS` 注入 PiP document；`floatingState.host` 作为 React Portal 容器。
- 没有提醒时渲染 `dcd-floating-idle-card` 待机卡；有提醒时复用正常 `.dcd-toast` 卡片。
- 仍然是单卡片队列，40 秒自动关闭，关闭后回到待机卡。
- 窗口被用户关闭时触发 `pagehide`：清空 host，若当前模式仍是 `floating` 则自动切回 `inApp`。
- 从悬浮窗切到其他模式时，`closeFloatingWindow(false)` 主动关闭；组件卸载时 `closeFloatingWindow(true)`。
- 不支持 `documentPictureInPicture` 时设置页提示，提醒回退到 DSH 内卡片。
- 悬浮窗的位置、窗口边框和关闭按钮由浏览器 PiP 实现控制，不是插件自绘的置顶层。

---

## 6. UI 组件

### 6.1 图标

`iconProps(size)` 统一 SVG 属性。图标组件：

- `CheckIcon`：完成对勾
- `AlertIcon`：失败感叹号
- `FolderIcon`：工作区
- `OpenIcon`：外链/打开
- `CloseIcon`：关闭
- `HelpIcon`：待回答问号
- `ChatIcon`：会话标签
- `TrashIcon`：卸载
- `PanelIcon`：左侧栏果冻脸图标

新增图标时保持 `currentColor` + `aria-hidden`，避免把颜色写死。

### 6.2 `JellyMascot`

签名：

```js
function JellyMascot({ size = 56, mood = 'happy' })
```

`mood`：

- `happy`：对勾徽标，微笑嘴
- `error`：感叹号徽标，下弯嘴
- `waiting`：问号徽标，小圆嘴

结构：

```text
.dcd-mascot
├─ .dcd-mascot-ear--left/right
├─ .dcd-mascot-body
│  ├─ shine
│  ├─ eye--left/right
│  ├─ blush--left/right
│  ├─ mouth
│  └─ mark（对勾 / ! / ?）
└─ sparkle--left/right
```

#### 眼睛跟随鼠标

`JellyMascot` 内部：

- `mascotRef` 指向根节点。
- effect 添加 `pointermove`（passive）和 `blur` / `pointerleave` 重置。
- 每次移动：
  - 用 `getBoundingClientRect()` 取吉祥物中心。
  - 计算鼠标到中心的向量和距离。
  - `maxOffset = max(1.8, size * 0.05)`。
  - 距离超过 150px 后强度封顶；位移限制在 `maxOffset`。
  - 用 rAF 以 0.38 的插值平滑逼近目标。
  - 写入根节点 CSS 变量 `--dcd-gaze-x` / `--dcd-gaze-y`。
- CSS `.dcd-mascot-eye`：
  ```css
  transform: translate(var(--dcd-gaze-x, 0px), var(--dcd-gaze-y, 0px));
  transition: transform 90ms linear;
  ```
- `prefers-reduced-motion: reduce` 下禁用 transform 与 transition。
- 卸载时移除监听、取消 rAF、移除 CSS 变量。

性能：每个吉祥物一个监听器；同时最多两个（设置页 + 提醒卡片），用 rAF 合并更新，不做逐事件重排。

### 6.3 `ToastLayer`

职责：

- 订阅状态、错误事件、演示事件。
- 维护队列。
- 渲染卡片。
- 管理 Body Portal。
- 打开工作区 / 跳转会话。

渲染结构：

```text
.dcd-toast-root (fixed inset 0, pointer-events none)
└─ .dcd-toast (pointer-events auto)
   ├─ .dcd-toast-mascot
   ├─ .dcd-bubble --one/--two/--three
   ├─ .dcd-toast-body
   │  ├─ head：eyebrow + check icon
   │  ├─ task
   │  ├─ detail（待回答）或 error（失败）
   │  ├─ meta：workspace / path / session / action
   │  ├─ actions：整行「去回答」按钮（待回答）
   │  └─ foot：时间 + 自动关闭
   ├─ close button
   └─ progress bar
```

Portal：

```js
React.useEffect(() => {
  const host = document.createElement('div');
  host.className = 'dcd-toast-host'; // display: contents
  host.dataset.plugin = 'dsh-completed-ding';
  document.body.append(host);
  setPortalHost(host);
  return () => host.remove();
}, []);
```

渲染：

```js
return portalHost && ReactDOM?.createPortal
  ? ReactDOM.createPortal(layer, portalHost)
  : layer;
```

为什么 Portal：宿主 `shell.overlay` 的祖先可能有 `transform` / `filter` / 裁剪，导致 `position: fixed` 改为相对祖先定位。挂到 body 下可以保证相对视口定位。

### 6.4 `SettingsPage`

结构：

1. 隐藏的文件输入（自定义音频）。
2. Hero：吉祥物、标题、副标题、右上角卸载图标。
3. 总开关卡片。
4. 操作行：预览提醒 / 预览失败 / 预览待回答 / 试听 / 恢复默认。
5. 提醒内容卡片。
6. 声音与提醒卡片：通知位置、声音开关/来源、音量、时长、间隔。
7. 提醒范围卡片。
8. 版本与更新卡片：当前版本、每日自动更新模式、检查、确认、更新、刷新、Gitee 链接。
9. 关于卡片：标题「关于」、软件全称 **DSH会话完成提醒**、版本、AGPL-3.0、Gitee 仓库入口。
10. 右上角更新提示卡（`UpdatePrompt`，由 shell.overlay 单独注册）。
11. 备注。
12. 卸载确认 modal（条件渲染）。

设置控件：

- `Switch`
- `RangeControl`
- `SettingRow`
- `SettingCard`

更新卡片的客户端状态机：

```text
idle → checking → latest | available | error
available → confirm → updating → done | restart | error
latest/error → checking
```

- `check` 只读取版本，不写文件。
- `apply` 由用户二次确认后触发，替换运行文件。
- `done` 后 1.6s 自动 `location.reload()`；HMR 已经重载时计时器会随旧组件卸载。
- 服务端失败统一展示 `update.error`；网络类错误展示更友好的离线提示。

卸载 modal：

- 由右上角 `TrashIcon` 按钮打开。
- `role="alertdialog"`，`aria-modal="true"`。
- 状态：`idle → busy → done | restart | cancelled | manual | opened | error`。
- 成功时保留 modal，提供“刷新页面”；需要重启时提示重启；失败显示错误并可重试。
- 遮罩点击在非 busy 状态取消。
- 关闭/取消按钮在 busy 时禁用。

### 6.5 `PanelIcon`

左侧栏图标是独立的果冻脸 SVG，不是 `JellyMascot`；它只负责入口呈现和 active 态。

---

## 7. CSS 系统

CSS 通过模板字符串内嵌：

```js
const CSS = `
  ...
`;

function insertStyles(css) {
  // 删除旧的同 id 标签，再插入新标签
}
```

### 7.1 令牌

共享令牌定义在：

```css
.dcd-toast-root,
.dcd-page {
  --dcd-amber: #e39a45;
  --dcd-amber-deep: #b96a22;
  --dcd-amber-soft: #f4c17f;
  --dcd-peach: #ffb184;
  --dcd-coral: #cf5d38;
  --dcd-cream: #fff8ec;
  --dcd-cream-deep: #ffeacc;
  --dcd-card-glow: #ffd9a1;
  --dcd-ink: #38220f;
  --dcd-ink-soft: #7a5636;
  --dcd-accent: ...
  --dcd-hairline: ...
  --dcd-card-shadow: ...
}
```

深色覆盖：

```css
body[data-ds-dark-theme] .dcd-toast-root,
body[data-ds-dark-theme] .dcd-page {
  --dcd-cream: #33251b;
  --dcd-cream-deep: #261a12;
  --dcd-ink: #fdf2e5;
  --dcd-ink-soft: #cfae8a;
  --dcd-accent: #ffc078;
  ...
}
```

原则：

- 文字/背景优先用主题令牌或暖色令牌。
- 不要新增无来源的硬编码颜色；确需固定色（吉祥物、徽标）要保证深浅主题都可读。
- 失败态用 `--dcd-coral`；待回答态用金色 accent；完成态用默认琥珀 accent。

### 7.2 定位与响应式

`.dcd-toast-root`：

```css
position: fixed;
inset: 0;
z-index: 2147483000;
display: flex;
align-items: flex-end;
justify-content: flex-end;
padding: max(16px, env(safe-area-inset-top))
         max(22px, env(safe-area-inset-right))
         max(22px, env(safe-area-inset-bottom))
         max(16px, env(safe-area-inset-left));
pointer-events: none;
```

卡片：

```css
.dcd-toast {
  width: min(424px, 100%);
  min-width: 0;
  max-width: 100%;
  pointer-events: auto;
  ...
}
```

断点：

| 条件 | 行为 |
| --- | --- |
| `max-width: 680px` | 卡片更紧凑，留白 14px，吉祥物 50px |
| `max-width: 400px` | 留白 10px，吉祥物 42px，隐藏气泡 |
| `max-height: 560px` | 紧凑纵向布局，题目/详情截断更短 |

卸载 modal 的 `z-index: 2147483200`，高于提醒卡片，避免被待回答提示遮住。

### 7.3 动画

- `dcd-jelly-in`：弹入。
- `dcd-toast-out`：退出（`EXIT_MS` 180ms）。
- `dcd-toast-progress`：进度条，时长由 `durationSeconds` 内联设置。
- `dcd-bob`：吉祥物上下浮动。
- `dcd-twinkle`：星点闪烁。
- `dcd-float`：气泡浮动。
- `dcd-wait-pulse`：待回答问号徽标的呼吸光圈。

`prefers-reduced-motion: reduce` 下：

- 卡片动画缩短到 1ms。
- 吉祥物/星点/气泡/待回答 pulse 关闭。
- 眼睛跟随的 CSS transform 关闭。

### 7.4 眼睛跟随

见 [6.2](#62-jellymascot)。注意：

- 位移变量写在 `.dcd-mascot` 根节点，眼睛继承。
- 不要给 `.dcd-mascot-eye` 增加其他 `transform`，否则会覆盖跟随。
- 缩小屏幕时吉祥物通过外层 `transform: scale(...)` 缩放，眼睛位移会一起缩放。

---

## 8. 设置子系统

### 8.1 默认值与范围

```js
const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  soundEnabled: true,
  soundKind: 'chime',
  volume: 0.55,
  durationSeconds: 40,
  gapMs: 200,
  showWorkspace: true,
  showTask: true,
  titleChars: 14,
  showPath: false,
  showTime: true,
  includeSubagents: false,
  showWaiting: true,
});

const LIMITS = Object.freeze({
  volume: { min: 0, max: 1 },
  durationSeconds: { min: 5, max: 60 },
  gapMs: { min: 0, max: 2000 },
  titleChars: { min: 4, max: 40 },
});
```

`normalizeSettings(raw)`：

- 每个字段做类型检查/数值 clamp。
- 非法值回落到默认值。
- 新增字段必须在这里加默认值，否则旧存储会丢字段。

### 8.2 存储键

| 键 | 内容 |
| --- | --- |
| `dsh-completed-ding.settings.v2` | 当前设置 JSON |
| `dsh-completed-ding.settings.v1` | 旧设置（迁移源） |
| `dsh-completed-ding.sound.v1` | 自定义音频 `{ name, dataUrl }` |

### 8.3 v1 → v2 迁移

`readStoredSettings()`：

1. 先读 v2；存在则直接 normalize。
2. 没有 v2 时读 v1。
3. 如果 v1 的 `durationSeconds` 恰好是旧默认 20，则改成 40。
4. 其他字段原样带入。
5. 把迁移结果写到 v2。
6. 解析失败或存储不可用 → 返回默认设置。

**不要**在迁移时无差别覆盖用户手动调整过的时长；只迁移“仍是旧默认 20”的情况。

### 8.4 读写与订阅

- `settings` 是模块级变量。
- `saveSettings(patch)`：
  - normalize 合并结果。
  - 与旧值做 JSON 比较，无变化则跳过。
  - 写 localStorage。
  - 通知 `settingsListeners`。
- `resetSettings()`：恢复默认并持久化。
- `useSettings()`：React hook，订阅设置变化。
- `storage` 事件：
  - 自定义音频键变化 → 清缓存并通知。
  - 设置键变化 → 重新读取并通知。

### 8.5 新增一个设置

1. `DEFAULT_SETTINGS` 加字段。
2. `normalizeSettings` 加类型/clamp。
3. 如果有限制，在 `LIMITS` 加范围。
4. 设置页加 `SettingRow`，按需使用 `Switch` / `RangeControl`。
5. `zh` / `en` 同时加文案。
6. 如果是行为开关，在对应逻辑处读取 `settingsRef.current`，不要只改 UI。
7. 更新 `docs/README.md` 配置表。
8. 考虑旧存储：新字段在 `normalizeSettings` 中要有默认值。

---

## 9. 声音子系统

### 9.1 轻提示音

`playChime(volume)`：

- Web Audio API 实时合成，不依赖音频文件。
- 三个正弦波音符：
  - 783.99 Hz
  - 1046.50 Hz
  - 1567.98 Hz
- 每个音符延迟 0 / 95ms / 190ms。
- 包络：12ms 起音，420ms 指数衰减。
- 总增益约 `volume * 0.115`，经过 3600Hz 低通柔化。
- 播放后 900ms 断开节点。

`ensureAudioContext()` 惰性创建 AudioContext；如果 suspended，先 `resume()`。

### 9.2 内置语音

两个 `data:audio/mpeg;base64,...` 常量：

- `BUILTIN_VOICE_DATA_URL` → `sounds/您的任务完成啦，请查看（可爱）.mp3`
- `BUILTIN_VOICE_ELEGANT_DATA_URL` → `sounds/您的任务已完成，请查看（知性）.mp3`

注意：

- 运行时播放的是 `client.js` 里内嵌的副本。
- 只替换音频文件不会改变运行时声音；必须同时更新对应内嵌常量（或改为 Host 资源加载）。
- `soundKind: 'voice'` 播放可爱语音，`soundKind: 'voice-elegant'` 播放知性语音，均用普通 `Audio` 播放。

### 9.3 自定义音频

设置页：

1. `<input type="file" accept="audio/*,...">`。
2. 检查大小 ≤ `MAX_CUSTOM_SOUND_BYTES`（2 MB）。
3. 检查 MIME/扩展名。
4. `FileReader.readAsDataURL`。
5. 规范化 MIME 前缀。
6. `saveStoredSound(name, dataUrl)` 写入 localStorage。
7. 自动切换到 `soundKind: 'custom'` 并试听。

播放失败时 `playConfiguredSound` 回退到轻提示音。

### 9.4 声音选择

```js
playConfiguredSound(current, force = false) {
  if (!current.enabled) return;
  if (!force && !current.soundEnabled) return;
  if (current.volume <= 0) return;
  stopSound();
  if (current.soundKind === 'voice' && playAudioSource(BUILTIN_VOICE_DATA_URL, current.volume)) return;
  if (current.soundKind === 'voice-elegant'
    && playAudioSource(BUILTIN_VOICE_ELEGANT_DATA_URL, current.volume)) return;
  if (current.soundKind === 'custom') {
    const custom = getCustomSound();
    if (custom && playAudioSource(custom.dataUrl, current.volume)) return;
  }
  playChime(current.volume, current.soundKind);
}
```

`force = true` 用于设置页「试听声音」：即使 `soundEnabled` 关闭也能试听，但仍受总开关和音量限制。

### 9.5 自动播放解锁

`apply()` 注册一次性的 `pointerdown` / `keydown`（capture）监听，在首次用户交互时 resume AudioContext。组件卸载时移除。

---

## 10. 集成动作

### 10.1 打开工作区

```js
sessionRemote.openWorkspacePath({ path: notice.folder })
```

- `folder` 来自 `resolveWorkspace` / `cwd`。
- 返回 `{ ok }`；失败时卡片保持可关闭，不弹错误。
- 只有 `notice.folder && sessionRemote` 时工作区 chip 才变成按钮。

### 10.2 打开待回答会话

```js
uiWorkspace.openSession(notice.sessionId)
```

- `uiWorkspace` 可能不存在；用 `runtime` 或 slot prop 判断。
- 成功后 `beginExit()` 关闭卡片。
- 失败/不存在时退化为提示文字「打开会话继续」。
- 跳转只切主视图到该会话，不自动回答问题。

### 10.3 卸载

入口：

- 设置页右上角 `TrashIcon`。
- 打开确认 modal。

执行：

```js
runtime.remote.pluginManager.removeBundle('dsh-completed-ding')
```

结果处理：

| 结果 | UI |
| --- | --- |
| `answer.ok === false` | 显示 `answer.error.message` |
| `value.error.code === 'stop-profile'` | 提示到插件页/手动卸载 |
| `value.application === 'failed'` | 显示 error diagnostic / code |
| `value.application === 'cancelled'` | 显示已取消 |
| `value.application === 'restart-required'` | 提示重启 DSH |
| 其他成功值 | 显示已卸载 + 刷新按钮 |

降级：

- `remote.pluginManager` 不存在 → `runtime.openPluginManager()`。
- `pluginNavigation.openBundle('dsh-completed-ding')` 可用 → 打开插件详情页。
- 都不可用 → 提示去左侧「插件」页。

不要直接删 `node_modules` 或改 profile 文件来“模拟卸载”；那会绕过插件管理器的锁、pnpm 状态和热重载。

### 10.4 检查更新与热更新

入口：设置页「版本与更新」卡片。

```text
POST /completed-ding/update
{ "action": "check" }
{ "action": "apply", "version": "1.5.4" }
```

Host 半边：

1. `check` 读取 Gitee 仓库默认分支的 `package.json`，返回
   `currentVersion` / `latestVersion` / `available` / `repoUrl`。
2. `apply` 重新读取最新版本，确认版本没有被仓库移动。
3. 按最新 `package.json.files` 收集运行文件：
   `package.json`、`index.js`、`client.js`、`cordis.patch.yml`、`locale/*.json`、
   `icon.svg`、`sounds/*.mp3`。
4. 校验包名、`client.js` 语法、Host 入口和 bundle 名称。
5. 逐文件比较；只写有变化的文件，`client.js` 最后写入。写入失败按备份回滚。
6. 返回 `applied` / `files` / `restartRequired`。

安全与边界：

- 路由是 exact POST，优先调用 `connection.requestRejection`；没有 Connection
  服务时只允许 loopback。
- `safeTarget` 拒绝 `..` 和越界绝对路径。
- 单文件上限 5 MB，总量上限 25 MB，请求体上限 4 KB。
- 写入根目录来自 `import.meta.url` 的 `dirname`，即插件自身安装目录。
- `restartRequired` 在当前 `index.js` 也发生变化时为 true；提醒客户端更新通常只
  需要 HMR，不需要重启。

客户端：

- `PLUGIN_VERSION` 必须和 `package.json.version` 一致。
- `checking → latest/available/error`、`available → confirm → updating → done/restart/error`
  状态机；
- `done` 后 1.6 秒刷新页面；`restart` 留给用户重启 DSH。
- 手动检查只在点击按钮时请求；自动检查见 10.5。

### 10.5 每日自动更新

`autoUpdateMode`：

- `off`（默认）：不自动检查；`startAutoUpdate` 的 tick 会直接返回，不访问 Gitee。
- `prompt`：每天检查，发现新版本后 `setUpdatePrompt({visible:true,status:'available'})`；DSH 右上角卡片显示「立即更新」，Windows 通知只提示。
- `install`：每天检查后直接调用 `applyAutoUpdate(version)`，自动下载、校验、替换；失败或需要重启时在卡片/提示中说明。

调度：

- `startAutoUpdate()` 在 `apply()` 生命周期内启动，每小时 tick 一次。
- `readLastUpdateCheck()` / `writeLastUpdateCheck()` 用 localStorage 做 24 小时节流。
- 检查失败不写时间戳，下个 tick 重试；成功检查才写。
- 设置切换 `autoUpdateMode` 时触发一次检查；已有 24h 时间戳则不会重复请求。
- 自动检查/更新仍走 `POST /completed-ding/update`，复用 Host 的校验、写入顺序和回滚。

提示：

- `updatePromptState` + `useUpdatePrompt()` 是模块级 store；`UpdatePrompt` 注册在
  `shell.overlay`（id `completed-ding.update`，order 81），右上角显示。
- Windows 通知的更新提示只包含标题/正文；点击只聚焦 DSH，不直接执行更新。
- 全屏静音开关同样作用于更新提示：其他应用全屏时跳过 Windows 更新通知。

---

## 11. 代码地图

> 行号会随版本变化；按函数/区块名查找。

| 区块 | 关键符号 | 职责 |
| --- | --- | --- |
| 常量 | `NS`, `PLUGIN_VERSION`, `UPDATE_ROUTE`, `SETTINGS_KEY`, `LIMITS`, `DEFAULT_SETTINGS` | 标识、版本、更新路由、存储、限制、默认值 |
| 国际化 | `zh`, `en` | 文案；两套必须同步 |
| 设置 | `normalizeSettings`, `readStoredSettings`, `saveSettings`, `useSettings` | 读取/迁移/持久化/订阅 |
| 音频 | `ensureAudioContext`, `playChime`, `CHIME_PRESETS`, `playAudioSource`, `playConfiguredSound`, `applyShortSound` | 短音预设、语音/自定义音频 |
| Windows 通知中心 | `desktopPermissionGranted`, `enqueueDesktop`, `showDesktop`, `closeDesktop` | 系统通知、权限、队列、回退 |
| 自动选择 | `dshIsForeground`, `deliverWindows`, `windowsForegroundFullscreen` | 前台/后台路由、全屏静音 |
| 每日自动更新 | `startAutoUpdate`, `checkDailyUpdate`, `applyAutoUpdate`, `updatePromptState`, `UpdatePrompt` | 24h 检查、提示/自动安装、更新卡片 |
| Host 全屏检测 | `foregroundFullscreen`（index.js） | Win32 前台窗口矩形检测、缓存 |
| 悬浮窗 | `openFloatingWindow`, `closeFloatingWindow`, `floatingState` | Document PiP 置顶窗口、Portal、生命周期 |
| 图标 | `CheckIcon` … `TrashIcon`, `PanelIcon` | SVG |
| 吉祥物 | `JellyMascot` | 表情、眼睛跟随 |
| 文本 | `truncate`, `classifyFailure`, `summarizeError`, `basename` | 纯函数 |
| 工作区 | `resolveWorkspace` | 会话 → 工作区 |
| 提醒模型 | `makeNotice`, `waitingFacts`, `makeWaitingNotice` | 构造 notice |
| 设置页 | `SettingsPage` | 表单、预览、更新卡片、卸载 modal |
| 提醒层 | `ToastLayer` | 状态订阅、队列、渲染、Portal |
| CSS | `CSS` 模板字符串 | 全部样式 |
| 样式注入 | `insertStyles` | 去重插入 |
| 注册 | `inject`, `apply` | 服务、slot、生命周期 |
| Host 更新 | `checkForUpdate`, `applyUpdate`, `downloadRuntimeFiles`, `safeTarget` | Gitee 检查、校验、热更新 |

`ToastLayer` 内部关键闭包：

- `present` / `beginExit` / `enqueue`
- `scheduleCue`
- `showCompletion` / `scheduleCompletion` / `cancelCompletion`
- `showWaiting` / `dismissWaiting` / `waitingIdentity`
- `openWorkspace` / `openWaiting`
- 状态 effect、启用/等待开关 effect、卸载清理 effect

---

## 12. 开发与调试

### 12.1 本地开发安装

推荐走插件管理器：

1. 左侧 **插件 → 添加插件**。
2. 填入仓库绝对路径，例如 `D:\work\dsh-completed-ding`。
3. 安装/启用。
4. 修改 `client.js` 后刷新 DSH 页面。

如果使用 `link:` 安装，profile 的 `package.json` 会类似：

```json
{
  "dependencies": {
    "dsh-completed-ding": "link:D:/work/dsh-completed-ding"
  },
  "dsh": {
    "profile": {
      "bundles": ["dsh-completed-ding"]
    }
  }
}
```

`link:` 的好处：改源码后刷新即可。注意它依赖本地目录存在，不适合作为分发包。

### 12.2 没有构建步骤

- 直接编辑 `client.js`。
- 修改后跑一次：

  ```bash
  node --check client.js
  ```

- 如果改了 CSS 模板字符串，注意反引号和 `${}` 转义；`EXIT_MS` 是模板里唯一的变量插值之一。
- 如果改了 `inject` 或 slot 结构，必须刷新整页（HMR 可能只更新组件，不重新解析依赖）。

### 12.3 调试入口

- 浏览器 DevTools Console：看模块加载和运行时错误。
- Elements：搜索 `.dcd-toast-root`、`.dcd-toast`、`.dcd-page`。
- Application → Local Storage：检查三个存储键。
- Network：正常使用时不应有插件发起的请求（宿主自身请求除外）。
- React DevTools：检查 `ToastLayer` / `SettingsPage` 的 state。
- 样式：直接改 `.dcd-toast` 的 CSS 变量做临时对比。

### 12.4 常见坑

| 现象 | 原因 |
| --- | --- |
| 插件完全不加载 | `inject` 中某个服务不存在；或 `client.js` 语法错误 |
| 弹窗在错误位置 | 旧版没有 Portal；或宿主浮层祖先有 transform（新版已规避） |
| 卡片被裁切 | 根层没有 `inset: 0` 或 z-index 被覆盖 |
| 待回答不弹 | `pendingInteraction` 不存在、`showWaiting` 关闭、子代理被过滤 |
| 卸载无反应 | `remote.pluginManager` 缺失或进程不支持热卸载 |
| 设置不生效 | 读取的是旧 `settings` 闭包；应看 `settingsRef.current` |
| 声音不响 | AudioContext 未解锁、音量 0、声音开关关闭、文件不可播放 |
| CSS 整体失效 | 模板字符串被反引号/`${}` 截断，或 style 标签被替换 |
| 改文案只改了一边 | `zh` / `en` 字典不同步 |

---

## 13. 扩展指南

### 13.1 增加失败原因

1. 在 `classifyFailure` 中按优先级加正则。
2. 在 `zh` / `en` 加 `toast.error.<kind>`。
3. 使用手册的失败原因列表同步更新。
4. 用一条真实错误文本测试，确认不会被更高优先级的规则误判。

### 13.2 增加设置项

见 [8.5](#85-新增一个设置)。额外注意：

- 设置项要能通过 `normalizeSettings` 兼容旧存储。
- 行为逻辑读取 `settingsRef.current`，不要依赖渲染时的 `current`。
- 如果影响正在显示的卡片，考虑是否立即关闭/刷新卡片。

### 13.3 增加一种提醒状态

以“新状态 `foo`”为例：

1. `makeFooNotice` 构造 notice，至少包含 `key`、展示字段、`durationSeconds`。
2. `ToastLayer` 的 JSX 增加分支/class/mood。
3. CSS 增加 `.dcd-toast--foo` 与对应 accent。
4. 在状态 effect 或事件订阅中调用 `enqueue`。
5. `seen*` 去重、`dismiss*` 收起逻辑。
6. `makeDemoNotice` 增加预览分支。
7. 设置页加开关、字典加文案。
8. 文档更新。

### 13.4 改配色

1. 只改共享令牌（见 7.1）和必要的深色覆盖。
2. 检查失败态/待回答态/深色态的对比度。
3. 检查按钮、徽标、进度条、工作区 chip 是否仍可读。
4. 更新 `docs/assets/` 截图。
5. 用窄屏 + 深色 + 失败/待回答两种卡片各看一遍。

### 13.5 增加语言

1. 在 `zh` / `en` 同级增加字典对象。
2. `ctx.locale.register(NS, { zh, en })` 增加语言键。
3. 检查所有 `tr('...')` 键在两套字典都有值。
4. 中文/英文的行长、断行、按钮宽度分别检查。

### 13.6 增加动作按钮

推荐模式：

1. 把服务作为 slot prop / runtime 依赖传入。
2. 服务不存在时渲染非交互提示，而不是禁用按钮或抛错。
3. 点击后先执行动作，成功再 `beginExit()`。
4. 捕获异常，保持卡片可关闭。
5. 不把宿主 API 调用写进渲染函数。

---

## 14. 性能与安全

### 性能

- 没有 `setInterval`、没有轮询、没有后台任务。
- 没有提醒时，唯一的常驻成本是 React 组件与状态订阅。
- 队列最多一个 active + 一个 pending。
- 眼睛跟随每个吉祥物一个 `pointermove` + rAF；同时最多两个吉祥物。
- 所有 timer / listener / rAF 在卸载时清理。
- 样式只注入一次，重复 apply 会先删除旧标签。

### 安全

- 日常提醒不发起网络请求，不收集遥测。
- 只有点击「检查更新」、确认更新，或每日自动更新检查到期时，Host 才访问 Gitee 公开仓库；不上传设置、
  会话内容或自定义音频。
- 更新路由要求同源、已认证请求：优先走 `connection.requestRejection`，没有
  Connection 服务时只接受 loopback。
- 全屏检测路由同样要求认证；只调用固定 PowerShell 脚本读取前台窗口矩形和监视器范围，不读取窗口内容或标题。
- 更新只写插件自己的运行文件，拒绝 `..` 路径；先校验 `client.js` 语法、Host
  入口和 bundle 名称，写入失败会回滚。
- 更新来源是 Gitee `master`；只有信任该仓库时才确认更新。
- 不读取凭据、不写会话日志。
- 问题文本/错误文本作为纯文本渲染（React 转义），不注入 HTML。
- 自定义音频只读取用户选择的文件，限制 2 MB，存为 Data URL。
- 卸载操作走官方 `pluginManager.removeBundle`，不直接改 profile 文件。
- `localStorage` 可能被禁用/占满，所有读写都有 try/catch，失败不阻断提醒。

---

## 15. 兼容性与已知限制

- **DSH 版本耦合：** 依赖 `shell.overlay`、`main`、`sidebar.panellist`、`sessions`、`workspaces`、`useSessionStatus`。DSH 大版本升级后需要回归。
- **三种通知位置：** 默认是 DSH 内卡片；切到 Windows 通知中心后由系统绘制；切到悬浮窗后使用 Document Picture-in-Picture 的置顶窗口。
- **桌面能力受环境限制：** 浏览器/Electron 拒绝通知权限、系统关闭通知、或没有 Document Picture-in-Picture 时会回退到 DSH 内卡片。
- **悬浮窗需要用户手势：** 首次打开和关闭后重新打开都必须由用户点击，不能在没有手势时自动创建；刷新页面后也不会自动恢复。
- **自动更新会联网：** 默认关闭；开启后每天最多检查一次，`install` 模式会直接替换运行文件，只有信任 Gitee 仓库时才应开启。检查失败不写时间戳，下个小时会重试。
- **全屏检测是 Best-effort：** 依赖 Windows 前台窗口矩形与监视器 `rcMonitor` 比较；无边框全屏、游戏覆盖层、多屏特殊布局可能漏判，非 Windows/检测失败时按允许弹出处理。
- **DSH Desktop 可能没有 Document PiP：** Electron 宿主未暴露 `documentPictureInPicture` 时，设置页把悬浮窗选项标为当前环境不支持并回退到 DSH 内卡片；这不是异常，系统通知仍然可用。
- **悬浮窗 portal 是实验性的：** 卡片通过 React Portal 渲染到 PiP document；关闭/打开/定位由 PiP 实现控制，个别宿主可能限制任意 HTML。
- **单浏览器设置：** 设置/自定义音频不跨浏览器、不跨设备同步。
- **单卡片队列：** 不支持堆叠，最新的 pending 覆盖旧的。
- **待回答依赖宿主投影：** 宿主不暴露 `pendingInteraction` 时无法提醒。
- **自定义音频 2 MB：** 受 localStorage 配额限制。
- **卸载需要管理器：** 没有 `remote.pluginManager` 时只能退化为打开插件页/手动卸载。
- **热更新需要 Web 宿主：** 没有 `webServer` / `connection` 时提醒照常，但「检查更新」不可用。
- **更新写权限：** 插件安装目录必须可写；只读包或受保护目录会提示失败，可回到插件管理器手动更新。
- **首次启用更新路由可能需要重启：** 1.1.0 新增 Host 路由；如果当前进程没有热加载 Host 文件，重启一次 DSH 后再使用按钮。
- **Git 安装的更新会被重新安装覆盖：** 热更新写入当前安装目录；之后如果从插件管理器重装，以仓库/包管理器为准。
- **无构建工具链：** `client.js` 仍是单文件产物，长期扩展时要注意模块化边界。
- **版本号：** 从 1.1.0 起 `package.json`、`PLUGIN_VERSION`、版本徽章和更新记录保持同步。

---

## 16. 发布流程

1. 修改 `client.js` / `index.js` / 文档。
2. 跑 `node --check client.js` 和 `node --check index.js`。
3. 回归[测试清单](#17-测试清单)。
4. 更新 `package.json` 的 `version`；同步 `client.js` 的 `PLUGIN_VERSION`、
   `docs/assets/badge-version.svg`。
5. 更新 `docs/README.md` 的更新记录。
6. 如果改了截图，更新 `docs/assets/`。
7. 更新 `package.json` 的 `description`（如需要）。
8. commit，提交信息沿用日期版本风格，例如：

   ```text
   11.02-1增加检查更新
   ```

9. push 到 Gitee。
10. 在 1.1.0 之前的版本上手动安装一次；之后可用设置页「检查更新」验证完整
    的检查 → 确认 → 热更新流程。
11. 确认 `check` 返回的版本、`apply` 后的文件、刷新后的 `PLUGIN_VERSION` 一致。

### 版本号约定

- Git 提交：日期序号（`11.02-1`），用于追加变更。
- `package.json`：包语义版本，当前 `1.5.4`；功能或更新机制变化时 bump。
- `client.js` 的 `PLUGIN_VERSION` 必须与 `package.json` 一致，否则设置页显示和
  更新比较会错位。
- `docs/README.md` 的更新记录是用户能读懂的权威变更摘要。

---

## 17. 测试清单

每次改动至少覆盖：

- [ ] 完成预览：卡片出现在右下角，40 秒自动关闭。
- [ ] 失败预览：陶土红点缀，错误标题/摘要正确。
- [ ] 待回答预览：问题/原因、会话 chip、整行「去回答」。
- [ ] 真实完成：运行会话结束后触发。
- [ ] 真实失败：额度/网络等错误不会被误报为完成。
- [ ] 真实待回答：问题出现时提醒，回答/取消后卡片收起。
- [ ] 连续多个提醒：不堆叠，间隔约 200ms。
- [ ] 浅色/深色主题：文字、按钮、边框都可读。
- [ ] 窄屏（约 520px）与矮屏：不溢出，按钮可点。
- [ ] 六种短音：轻提示音、清脆三音、柔和低音、木质轻敲、水滴声、叮咚；点一下即试听并应用。
- [ ] 内置语音与自定义音频：选择、试听、刷新后保留。
- [ ] 通知位置默认是自动选择；切换 Windows 通知中心会请求权限。
- [ ] 自动选择：DSH 前台用卡片；切到后台用 Windows；悬浮窗打开后后台优先悬浮窗。
- [ ] 全屏静音：其他应用全屏时不弹 Windows 通知，但仍播放声音；关闭开关后恢复。
- [ ] Windows 通知中心出现在 DSH 窗口外；拒绝权限时回退到 DSH 内。
- [ ] Windows 通知一次只留一条，新提醒关闭上一条后再来。
- [ ] 点击 Windows 通知能聚焦 DSH 并打开对应会话（可用时）。
- [ ] 悬浮窗：设置页点开后显示待机卡；提醒复用同一张卡片；关闭窗口回退到 DSH 内。
- [ ] 悬浮窗不支持时给出提示，不阻断提醒。
- [ ] 自动更新提示：24h 内不重复检查；发现新版本出右上角卡片；Windows 只提示。
- [ ] 自动更新安装：发现新版本自动替换并刷新；失败/需要重启时有提示。
- [ ] 切换自动更新模式后按 24h 节流检查，不重复打 Gitee。
- [ ] 静音/音量 0/总开关关闭：不播放。
- [ ] 自定义音频超 2MB / 非音频：有错误提示。
- [ ] 刷新后：设置保留；旧 20 秒迁移正确；pending 问题重新提醒。
- [ ] 检查更新：同源 POST 可用；未登录/跨源被拒绝。
- [ ] 最新版本：显示已是最新，不写文件。
- [ ] 有更新：确认后只替换运行文件，`client.js` 最后写入，页面可刷新。
- [ ] 更新失败：`client.js` 保持原样或回滚，设置不丢。
- [ ] 卸载：确认框、成功/重启/失败路径。
- [ ] 减少动态效果：动画和眼睛跟随关闭。
- [ ] 窗口缩放/侧栏开关：仍贴右下角。

---

## License

[AGPL-3.0](../LICENSE)
