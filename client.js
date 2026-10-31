window.__ModuleLoader__.load({
  id: 'dsh-completed-ding',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    let ReactDOM = null;
    try {
      ReactDOM = require('react-dom');
    } catch {
      /* Older clients may not expose react-dom; the toast then renders inline. */
    }

    const NS = 'completed-ding';
    const PANEL_ID = 'completed-ding';
    const SETTINGS_KEY = 'dsh-completed-ding.settings.v2';
    const LEGACY_SETTINGS_KEY = 'dsh-completed-ding.settings.v1';
    const CUSTOM_SOUND_KEY = 'dsh-completed-ding.sound.v1';
    const MAX_CUSTOM_SOUND_BYTES = 2 * 1024 * 1024;
    const EXIT_MS = 180;
    const EMPTY_STATUS = new Map();
    const SOUND_KINDS = ['chime', 'voice', 'custom'];
    /* Filled by apply(): the settings page can reach the manager without a slot prop. */
    const runtime = {
      remote: null,
      openPluginManager: () => false,
    };
    const BUILTIN_VOICE_DATA_URL = 'data:audio/mpeg;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+1LEAAPAAAGkAAAAIAAANIAAAARMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UMQAA8AAAaQAAAAgAAA0gAAABExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+1LEAAPAAAGkAAAAIAAANIAAAARMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UsQAA8AAAaQAAAAgAAA0gAAABExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tSxAADwAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+1LEAAPAAAGkAAAAIAAANIAAAARMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UsQAA8AAAaQAAAAgAAA0gAAABExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tSxAADwAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+1LEAAPAAAGkAAAAIAAANIAAAARMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UsQAA8AAAaQAAAAgAAA0gAAABExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tSxAADwAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+1LEAAPAAAGkAAAAIAAANIAAAARMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UsQAA8AAAaQAAAAgAAA0gAAABExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tSxAADwAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+1LEAAPAAAGkAAAAIAAANIAAAARMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

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

    const zh = {
      'panel.label': '完成提醒',
      'toast.title': '完成啦～',
      'toast.waiting.question': '有个问题等你回答',
      'toast.waiting.many': '{count} 个问题等你回答',
      'toast.waiting.plan': '计划等你确认',
      'toast.waiting.approval': '操作等你确认',
      'toast.waiting.generic': '需要你的回答',
      'toast.waiting.tool': '工具：{tool}',
      'toast.waiting.answer': '去回答',
      'toast.waiting.confirm': '去确认',
      'toast.waiting.open': '打开会话继续',
      'toast.close': '关闭提醒',
      'toast.autoClose': '{seconds} 秒后自动关闭',
      'toast.openWorkspace': '在文件夹中打开工作区',
      'toast.error.auth': '需要重新登录',
      'toast.error.quota': '额度或余额不足',
      'toast.error.ratelimit': '请求过于频繁',
      'toast.error.network': '网络连接中断',
      'toast.error.context': '上下文超出限制',
      'toast.error.server': '服务暂时不可用',
      'toast.error.unknown': '任务未完成',
      'settings.title': '完成提醒',
      'settings.subtitle': '每个会话完成、失败，或需要你回答时，在窗口右下角轻轻提醒一下。默认 40 秒自动收起，同时出现多个提醒时只保留一条，不堆叠。',
      'settings.preview': '预览提醒',
      'settings.previewFailure': '预览失败提醒',
      'settings.previewWaiting': '预览待回答提醒',
      'settings.testSound': '试听声音',
      'settings.reset': '恢复默认',
      'settings.saved': '修改会自动保存',
      'settings.master.title': '启用完成提醒',
      'settings.master.desc': '关闭后不再弹出完成、失败或待回答提醒，也不会播放声音；左侧栏入口仍保留，随时可以重新开启。',
      'settings.master.on': '已开启',
      'settings.master.off': '已关闭',
      'settings.note': '这些设置与自定义音频仅保存在当前浏览器中，不写入会话记录，也不产生后台轮询。',
      'section.content': '提醒内容',
      'section.content.desc': '挑选卡片上展示的信息。任务名称会按下面设定的字数截短。',
      'content.workspace': '显示工作区',
      'content.workspace.desc': '展示会话所属工作区的名称。',
      'content.task': '显示任务名称',
      'content.task.desc': '展示会话标题；没有标题时使用目录名。',
      'content.titleChars': '任务名称字数',
      'content.titleChars.desc': '超出部分以省略号显示。',
      'content.path': '显示完整路径',
      'content.path.desc': '在卡片底部补充会话的工作目录。',
      'content.time': '显示提醒时间',
      'content.time.desc': '在卡片底部显示提醒触发的时间。',
      'section.behavior': '声音与提醒',
      'section.behavior.desc': '声音可选择浏览器合成的轻提示、内置完成的语音，或上传自己的音频文件。',
      'behavior.sound': '声音提示',
      'behavior.sound.desc': '提醒出现时播放提示音。',
      'behavior.source': '提示声音',
      'behavior.source.desc': '默认使用轻柔的合成提示音，也可以换成内置语音或自己的音频。',
      'behavior.source.chime': '轻提示音（默认）',
      'behavior.source.voice': '完成的语音.mp3（甜美）',
      'behavior.source.custom': '自定义音频文件',
      'behavior.customFile': '自定义音频',
      'behavior.customFile.desc': '支持 MP3、WAV、OGG、M4A 等，文件不超过 2 MB。',
      'behavior.chooseFile': '选择文件',
      'behavior.replaceFile': '更换文件',
      'behavior.clearFile': '清除',
      'behavior.noFile': '尚未选择文件',
      'behavior.fileTooLarge': '音频文件不能超过 2 MB。',
      'behavior.fileTypeError': '请选择音频文件（MP3、WAV、OGG、M4A 等）。',
      'behavior.fileReadError': '读取音频文件失败，请重试。',
      'behavior.storageError': '浏览器存储空间不足，无法保存这个音频文件。',
      'behavior.volume': '音量',
      'behavior.volume.desc': '仅影响本插件的提示音。',
      'behavior.duration': '自动关闭时长',
      'behavior.duration.desc': '卡片停留多久后自动收起。',
      'behavior.gap': '连续提醒间隔',
      'behavior.gap.desc': '上一个卡片关闭后，间隔多久再显示下一个。',
      'section.scope': '提醒范围',
      'section.scope.desc': '默认只提醒主会话，避免后台子代理频繁打扰。',
      'scope.subagents': '包含子代理会话',
      'scope.subagents.desc': '开启后，子代理完成时也会提醒。',
      'scope.waiting': '待回答时提醒',
      'scope.waiting.desc': '会话请你回答问题、确认计划或授权操作时，也弹窗提醒。',
      'uninstall.action': '卸载插件',
      'uninstall.confirmTitle': '确定卸载「完成提醒」？',
      'uninstall.confirmDesc': '卸载后需要重新安装才能恢复完成与待回答提醒。',
      'uninstall.cancel': '取消',
      'uninstall.confirm': '确认卸载',
      'uninstall.busy': '正在卸载…',
      'uninstall.done': '已卸载。若界面仍在，刷新页面即可。',
      'uninstall.restart': '已卸载，重启 DSH 后生效。',
      'uninstall.cancelled': '已取消卸载。',
      'uninstall.manual': '当前进程无法热卸载，请在左侧「插件」页中卸载。',
      'uninstall.failed': '卸载失败：{reason}',
      'uninstall.failedGeneric': '未知错误',
      'uninstall.refresh': '刷新页面',
      'uninstall.retry': '重试',
      'uninstall.close': '关闭',
      'uninstall.openManager': '打开插件管理',
      'uninstall.opened': '已打开插件管理页，请在详情页确认卸载。',
      'uninstall.noManager': '未找到插件管理入口，请在左侧「插件」页中卸载。',
      'demo.workspace': 'DSH 工作区',
      'demo.task': '优化完成提醒的视觉与交互',
      'demo.failure': '额度或余额不足，请充值后重试。',
      'demo.waitingHeader': '选择部署方式',
      'demo.waitingQuestion': '这次先发到测试环境，还是直接上线？',
      'unit.chars': ' 字',
      'unit.seconds': ' 秒',
      'unit.ms': ' 毫秒',
    };

    const en = {
      'panel.label': 'Completion alerts',
      'toast.title': 'All done!',
      'toast.waiting.question': 'A question is waiting',
      'toast.waiting.many': '{count} questions are waiting',
      'toast.waiting.plan': 'Plan ready for review',
      'toast.waiting.approval': 'Approval needed',
      'toast.waiting.generic': 'Your answer is needed',
      'toast.waiting.tool': 'Tool: {tool}',
      'toast.waiting.answer': 'Answer',
      'toast.waiting.confirm': 'Review',
      'toast.waiting.open': 'Open the session to continue',
      'toast.close': 'Dismiss alert',
      'toast.autoClose': 'Closes in {seconds}s',
      'toast.openWorkspace': 'Open workspace folder',
      'toast.error.auth': 'Sign-in required',
      'toast.error.quota': 'Quota or balance exhausted',
      'toast.error.ratelimit': 'Too many requests',
      'toast.error.network': 'Network connection lost',
      'toast.error.context': 'Context limit reached',
      'toast.error.server': 'Service temporarily unavailable',
      'toast.error.unknown': 'Task finished with an error',
      'settings.title': 'Completion alerts',
      'settings.subtitle': 'A quiet bottom-right notice when a session completes, fails, or needs your answer. It closes after 40 seconds by default, and simultaneous alerts replace one another instead of stacking.',
      'settings.preview': 'Preview alert',
      'settings.previewFailure': 'Preview failure',
      'settings.previewWaiting': 'Preview waiting',
      'settings.testSound': 'Test sound',
      'settings.reset': 'Reset defaults',
      'settings.saved': 'Changes save automatically',
      'settings.master.title': 'Enable completion alerts',
      'settings.master.desc': 'When off, completion, failure, and waiting-for-answer alerts stop and no sound plays. The sidebar entry stays available so you can turn it back on at any time.',
      'settings.master.on': 'On',
      'settings.master.off': 'Off',
      'settings.note': 'These preferences and any custom audio stay in this browser. They are not written to the session log, and the plugin performs no background polling.',
      'section.content': 'Alert content',
      'section.content.desc': 'Choose the details shown on the card. The task title is shortened to the character count below.',
      'content.workspace': 'Show workspace',
      'content.workspace.desc': 'Display the name of the workspace that owns the session.',
      'content.task': 'Show task title',
      'content.task.desc': 'Show the session title, or the folder name when it has no title.',
      'content.titleChars': 'Task title length',
      'content.titleChars.desc': 'Longer titles end with an ellipsis.',
      'content.path': 'Show full path',
      'content.path.desc': 'Add the session working directory to the card footer.',
      'content.time': 'Show alert time',
      'content.time.desc': 'Show when the alert was triggered.',
      'section.behavior': 'Sound and timing',
      'section.behavior.desc': 'Use the synthesised light chime, the bundled completion voice, or your own audio file.',
      'behavior.sound': 'Sound',
      'behavior.sound.desc': 'Play a cue when an alert appears.',
      'behavior.source': 'Cue sound',
      'behavior.source.desc': 'The light chime is the default; the bundled voice or your own audio can be used instead.',
      'behavior.source.chime': 'Light chime (default)',
      'behavior.source.voice': 'Completion voice.mp3 (sweet)',
      'behavior.source.custom': 'Custom audio file',
      'behavior.customFile': 'Custom audio',
      'behavior.customFile.desc': 'MP3, WAV, OGG, M4A, and similar formats up to 2 MB.',
      'behavior.chooseFile': 'Choose file',
      'behavior.replaceFile': 'Replace file',
      'behavior.clearFile': 'Clear',
      'behavior.noFile': 'No file selected',
      'behavior.fileTooLarge': 'The audio file must be 2 MB or smaller.',
      'behavior.fileTypeError': 'Choose an audio file such as MP3, WAV, OGG, or M4A.',
      'behavior.fileReadError': 'Could not read the audio file. Try again.',
      'behavior.storageError': 'Browser storage is full, so this audio file could not be saved.',
      'behavior.volume': 'Volume',
      'behavior.volume.desc': 'Affects only this plugin’s cue.',
      'behavior.duration': 'Auto-close delay',
      'behavior.duration.desc': 'How long the card stays on screen.',
      'behavior.gap': 'Gap between alerts',
      'behavior.gap.desc': 'How long to wait after one card closes before showing the next.',
      'section.scope': 'Alert scope',
      'section.scope.desc': 'Only primary sessions are announced by default, so subagents do not flood the screen.',
      'scope.subagents': 'Include subagent sessions',
      'scope.subagents.desc': 'Also announce when a subagent finishes.',
      'scope.waiting': 'Alert when an answer is needed',
      'scope.waiting.desc': 'Also show a card when a session asks a question, needs plan review, or requests approval.',
      'uninstall.action': 'Uninstall plugin',
      'uninstall.confirmTitle': 'Uninstall "Completion alerts"?',
      'uninstall.confirmDesc': 'You will need to install it again to restore completion and waiting alerts.',
      'uninstall.cancel': 'Cancel',
      'uninstall.confirm': 'Uninstall',
      'uninstall.busy': 'Uninstalling…',
      'uninstall.done': 'Uninstalled. Refresh the page if it is still visible.',
      'uninstall.restart': 'Uninstalled. Restart DSH to finish.',
      'uninstall.cancelled': 'Uninstall cancelled.',
      'uninstall.manual': 'This process cannot unload it live. Use the Plugins page in the sidebar.',
      'uninstall.failed': 'Could not uninstall: {reason}',
      'uninstall.failedGeneric': 'Unknown error',
      'uninstall.refresh': 'Refresh page',
      'uninstall.retry': 'Retry',
      'uninstall.close': 'Close',
      'uninstall.openManager': 'Open plugin manager',
      'uninstall.opened': 'Opened the plugin manager; confirm the uninstall on its details page.',
      'uninstall.noManager': 'No plugin manager entry was found; use the Plugins page in the sidebar.',
      'demo.workspace': 'DSH workspace',
      'demo.task': 'Polish the completion alert card',
      'demo.failure': 'Quota or balance exhausted. Add credit and try again.',
      'demo.waitingHeader': 'Choose a deploy target',
      'demo.waitingQuestion': 'Ship to staging first, or go straight to production?',
      'unit.chars': ' chars',
      'unit.seconds': 's',
      'unit.ms': 'ms',
    };

    function clampNumber(value, fallback, min, max, step) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      let next = Math.min(max, Math.max(min, parsed));
      if (step) next = Math.round(next / step) * step;
      return Math.min(max, Math.max(min, next));
    }

    function normalizeSettings(raw) {
      const source = raw && typeof raw === 'object' ? raw : {};
      return {
        enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_SETTINGS.enabled,
        soundEnabled: typeof source.soundEnabled === 'boolean' ? source.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
        soundKind: SOUND_KINDS.includes(source.soundKind) ? source.soundKind : DEFAULT_SETTINGS.soundKind,
        volume: clampNumber(source.volume, DEFAULT_SETTINGS.volume, LIMITS.volume.min, LIMITS.volume.max, 0.01),
        durationSeconds: Math.round(clampNumber(source.durationSeconds, DEFAULT_SETTINGS.durationSeconds, LIMITS.durationSeconds.min, LIMITS.durationSeconds.max, 1)),
        gapMs: Math.round(clampNumber(source.gapMs, DEFAULT_SETTINGS.gapMs, LIMITS.gapMs.min, LIMITS.gapMs.max, 50)),
        showWorkspace: typeof source.showWorkspace === 'boolean' ? source.showWorkspace : DEFAULT_SETTINGS.showWorkspace,
        showTask: typeof source.showTask === 'boolean' ? source.showTask : DEFAULT_SETTINGS.showTask,
        titleChars: Math.round(clampNumber(source.titleChars, DEFAULT_SETTINGS.titleChars, LIMITS.titleChars.min, LIMITS.titleChars.max, 1)),
        showPath: typeof source.showPath === 'boolean' ? source.showPath : DEFAULT_SETTINGS.showPath,
        showTime: typeof source.showTime === 'boolean' ? source.showTime : DEFAULT_SETTINGS.showTime,
        includeSubagents: typeof source.includeSubagents === 'boolean' ? source.includeSubagents : DEFAULT_SETTINGS.includeSubagents,
        showWaiting: typeof source.showWaiting === 'boolean' ? source.showWaiting : DEFAULT_SETTINGS.showWaiting,
      };
    }

    function isAudioDataUrl(value) {
      return typeof value === 'string'
        && value.startsWith('data:audio/')
        && value.length <= Math.ceil(MAX_CUSTOM_SOUND_BYTES * 4 / 3) + 128;
    }

    let customSound;

    function readStoredSound() {
      try {
        const raw = globalThis.localStorage && globalThis.localStorage.getItem(CUSTOM_SOUND_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.name !== 'string' || !isAudioDataUrl(parsed.dataUrl)) return null;
        return { name: parsed.name, dataUrl: parsed.dataUrl };
      } catch {
        return null;
      }
    }

    function saveStoredSound(name, dataUrl) {
      if (!isAudioDataUrl(dataUrl)) return false;
      try {
        if (!globalThis.localStorage) return false;
        globalThis.localStorage.setItem(CUSTOM_SOUND_KEY, JSON.stringify({ name, dataUrl }));
        customSound = { name, dataUrl };
        return true;
      } catch {
        return false;
      }
    }

    function clearStoredSound() {
      customSound = null;
      try {
        if (globalThis.localStorage) globalThis.localStorage.removeItem(CUSTOM_SOUND_KEY);
      } catch {
        /* ignore */
      }
    }

    function getCustomSound() {
      if (customSound === undefined) customSound = readStoredSound();
      return customSound;
    }

    function readStoredSettings() {
      try {
        const storage = globalThis.localStorage;
        if (!storage) return normalizeSettings(DEFAULT_SETTINGS);
        const raw = storage.getItem(SETTINGS_KEY);
        if (raw) return normalizeSettings(JSON.parse(raw));
        const legacyRaw = storage.getItem(LEGACY_SETTINGS_KEY);
        if (!legacyRaw) return normalizeSettings(DEFAULT_SETTINGS);
        const legacy = JSON.parse(legacyRaw);
        /* v2 raises the default dwell time; only the untouched 20s default is migrated. */
        const migrated = normalizeSettings({
          ...(legacy && typeof legacy === 'object' ? legacy : {}),
          durationSeconds: Number(legacy && legacy.durationSeconds) === 20
            ? DEFAULT_SETTINGS.durationSeconds
            : legacy && legacy.durationSeconds,
        });
        storage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
        return migrated;
      } catch {
        return normalizeSettings(DEFAULT_SETTINGS);
      }
    }

    let settings = readStoredSettings();
    const settingsListeners = new Set();

    function getSettings() {
      return settings;
    }

    function subscribeSettings(listener) {
      settingsListeners.add(listener);
      return () => {
        settingsListeners.delete(listener);
      };
    }

    function persistSettings() {
      try {
        if (globalThis.localStorage) globalThis.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* A blocked storage area must not break the reminder itself. */
      }
    }

    function saveSettings(patch) {
      const next = normalizeSettings({ ...settings, ...patch });
      if (JSON.stringify(next) === JSON.stringify(settings)) return;
      settings = next;
      persistSettings();
      for (const listener of [...settingsListeners]) {
        try {
          listener();
        } catch {
          /* A settings subscriber must not break the others. */
        }
      }
    }

    function resetSettings() {
      settings = normalizeSettings(DEFAULT_SETTINGS);
      persistSettings();
      for (const listener of [...settingsListeners]) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function useSettings() {
      const [value, setValue] = React.useState(getSettings);
      React.useEffect(() => {
        setValue(getSettings());
        return subscribeSettings(() => setValue(getSettings()));
      }, []);
      return value;
    }

    const demoListeners = new Set();

    function requestDemo(kind) {
      for (const listener of [...demoListeners]) {
        try {
          listener(kind);
        } catch {
          /* ignore */
        }
      }
    }

    function subscribeDemo(listener) {
      demoListeners.add(listener);
      return () => {
        demoListeners.delete(listener);
      };
    }

    function iconProps(size) {
      return {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: 'false',
      };
    }

    function CheckIcon({ size = 18 }) {
      return h('svg', iconProps(size), h('path', { d: 'm5 12.5 4.2 4.2L19 6.9' }));
    }

    function AlertIcon({ size = 18 }) {
      return h('svg', iconProps(size),
        h('circle', { cx: 12, cy: 12, r: 8.6 }),
        h('path', { d: 'M12 7.6v5.2' }),
        h('path', { d: 'M12 16.4h.01' }),
      );
    }

    function FolderIcon({ size = 13 }) {
      return h('svg', iconProps(size),
        h('path', { d: 'M3.5 6.8a1.8 1.8 0 0 1 1.8-1.8h4l1.7 2h7.7a1.8 1.8 0 0 1 1.8 1.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8Z' }),
      );
    }

    function OpenIcon({ size = 10 }) {
      return h('svg', iconProps(size),
        h('path', { d: 'M9 5h4v4' }),
        h('path', { d: 'M13 5 7 11' }),
      );
    }

    function CloseIcon({ size = 14 }) {
      return h('svg', iconProps(size),
        h('path', { d: 'M6 6l12 12M18 6 6 18' }),
      );
    }

    function HelpIcon({ size = 18 }) {
      return h('svg', iconProps(size),
        h('circle', { cx: 12, cy: 12, r: 8.6 }),
        h('path', { d: 'M9.5 9.2a2.6 2.6 0 1 1 3.5 2.4c-.7.3-1 .8-1 1.5v.3' }),
        h('path', { d: 'M12 16.5h.01' }),
      );
    }

    function ChatIcon({ size = 12 }) {
      return h('svg', iconProps(size),
        h('path', { d: 'M4.2 6.6A2.1 2.1 0 0 1 6.3 4.5h11.4a2.1 2.1 0 0 1 2.1 2.1v6.7a2.1 2.1 0 0 1-2.1 2.1H9.2l-4 3.1v-3.1a2.1 2.1 0 0 1-.9-1.8Z' }),
      );
    }

    function TrashIcon({ size = 16 }) {
      return h('svg', iconProps(size),
        h('path', { d: 'M4.5 6.8h15' }),
        h('path', { d: 'M9 6.8V5.2a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 5.2v1.6' }),
        h('path', { d: 'M6.3 6.8l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.6a1.6 1.6 0 0 0 1.6-1.5l.8-12' }),
        h('path', { d: 'M10 10.8v5.8M14 10.8v5.8' }),
      );
    }

    function PanelIcon({ size = 18, active = false }) {
      return h('span', {
        className: 'dcd-panel-icon',
        'data-active': active ? 'true' : 'false',
        'aria-hidden': 'true',
      }, h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        focusable: 'false',
        'aria-hidden': 'true',
      },
        h('circle', { cx: 6, cy: 6.6, r: 3.7, fill: 'currentColor', opacity: 0.45 }),
        h('circle', { cx: 18, cy: 6.6, r: 3.7, fill: 'currentColor', opacity: 0.45 }),
        h('path', {
          d: 'M3.3 13.1c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7v.7c0 4.8-3.9 8.7-8.7 8.7S3.3 18.6 3.3 13.8v-.7Z',
          fill: 'currentColor',
        }),
        h('circle', { cx: 9, cy: 12, r: 1.35, fill: 'var(--dsw-alias-bg-base)' }),
        h('circle', { cx: 15, cy: 12, r: 1.35, fill: 'var(--dsw-alias-bg-base)' }),
        h('path', {
          d: 'M10 15.3c.65.9 1.3 1.35 2 1.35s1.35-.45 2-1.35',
          stroke: 'var(--dsw-alias-bg-base)',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
      ));
    }

    function JellyMascot({ size = 56, mood = 'happy' }) {
      const mascotRef = React.useRef(null);
      React.useEffect(() => {
        const node = mascotRef.current;
        if (!node || !globalThis.document || typeof globalThis.addEventListener !== 'function') return undefined;
        const maxOffset = Math.max(1.8, size * 0.05);
        let frame = 0;
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        const render = () => {
          frame = 0;
          currentX += (targetX - currentX) * 0.38;
          currentY += (targetY - currentY) * 0.38;
          if (Math.abs(targetX - currentX) < 0.05) currentX = targetX;
          if (Math.abs(targetY - currentY) < 0.05) currentY = targetY;
          node.style.setProperty('--dcd-gaze-x', `${currentX.toFixed(2)}px`);
          node.style.setProperty('--dcd-gaze-y', `${currentY.toFixed(2)}px`);
          if (currentX !== targetX || currentY !== targetY) schedule();
        };
        const schedule = () => {
          if (frame) return;
          frame = globalThis.requestAnimationFrame(render);
        };
        const follow = (event) => {
          const rect = node.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const dx = event.clientX - (rect.left + rect.width / 2);
          const dy = event.clientY - (rect.top + rect.height / 2);
          const distance = Math.hypot(dx, dy);
          if (distance < 1) {
            targetX = 0;
            targetY = 0;
            schedule();
            return;
          }
          const strength = Math.min(1, distance / 150);
          targetX = (dx / distance) * maxOffset * strength;
          targetY = (dy / distance) * maxOffset * strength;
          schedule();
        };
        const reset = () => {
          targetX = 0;
          targetY = 0;
          schedule();
        };
        globalThis.addEventListener('pointermove', follow, { passive: true });
        globalThis.addEventListener('blur', reset);
        globalThis.document.addEventListener('pointerleave', reset);
        return () => {
          globalThis.removeEventListener('pointermove', follow);
          globalThis.removeEventListener('blur', reset);
          globalThis.document.removeEventListener('pointerleave', reset);
          if (frame) globalThis.cancelAnimationFrame(frame);
          node.style.removeProperty('--dcd-gaze-x');
          node.style.removeProperty('--dcd-gaze-y');
        };
      }, [size]);
      return h('span', {
        ref: mascotRef,
        className: 'dcd-mascot',
        'data-mood': mood,
        style: { width: `${size}px`, height: `${size}px` },
        'aria-hidden': 'true',
      },
        h('span', { className: 'dcd-mascot-ear dcd-mascot-ear--left' }),
        h('span', { className: 'dcd-mascot-ear dcd-mascot-ear--right' }),
        h('span', { className: 'dcd-mascot-body' },
          h('span', { className: 'dcd-mascot-shine' }),
          h('span', { className: 'dcd-mascot-eye dcd-mascot-eye--left' }),
          h('span', { className: 'dcd-mascot-eye dcd-mascot-eye--right' }),
          h('span', { className: 'dcd-mascot-blush dcd-mascot-blush--left' }),
          h('span', { className: 'dcd-mascot-blush dcd-mascot-blush--right' }),
          h('span', { className: 'dcd-mascot-mouth' }),
          h('span', { className: 'dcd-mascot-mark' },
            mood === 'error' ? '!' : mood === 'waiting' ? '?' : h(CheckIcon, { size: 10 }),
          ),
        ),
        h('span', { className: 'dcd-mascot-sparkle dcd-mascot-sparkle--left' }, '✦'),
        h('span', { className: 'dcd-mascot-sparkle dcd-mascot-sparkle--right' }, '✦'),
      );
    }

    function truncate(value, max) {
      const chars = Array.from(String(value == null ? '' : value).trim());
      if (chars.length <= max) return chars.join('');
      return chars.slice(0, max).join('') + '…';
    }

    function classifyFailure(message) {
      const text = String(message == null ? '' : message).toLowerCase();
      if (/unauthorized|forbidden|authentication|auth|api.?key|credential|permission|sign.?in|login|401|403|登录|鉴权|认证|凭证|密钥|权限/.test(text)) return 'auth';
      if (/quota|insufficient_quota|balance|余额|额度|欠费|credit|billing|payment required|402|配额/.test(text)) return 'quota';
      if (/rate.?limit|too many requests|429|限流|频率|请求过多/.test(text)) return 'ratelimit';
      if (/network|fetch failed|econnreset|econnrefused|etimedout|enotfound|eai_again|socket|connection (?:reset|refused|lost)|offline|timeout|timed out|网络|连接|超时|断网|未连接/.test(text)) return 'network';
      if (/context (?:length|window)|max(?:imum)? tokens|too many tokens|token limit|上下文|token 数/.test(text)) return 'context';
      if (/bad gateway|service unavailable|internal server|server error|gateway|502|503|504|500|服务.*(?:异常|不可用)|网关/.test(text)) return 'server';
      return 'unknown';
    }

    function summarizeError(message) {
      return truncate(String(message == null ? '' : message).replace(/\s+/g, ' ').trim(), 180);
    }

    function basename(path) {
      if (!path) return '';
      const normalized = String(path).replace(/[\\/]+$/, '');
      const parts = normalized.split(/[\\/]/);
      return parts[parts.length - 1] || normalized;
    }

    function audioMimeForFile(file) {
      const declared = file && typeof file.type === 'string' ? file.type : '';
      if (declared.startsWith('audio/')) return declared;
      const extension = file && typeof file.name === 'string'
        ? file.name.split('.').pop().toLowerCase()
        : '';
      return {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        oga: 'audio/ogg',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        flac: 'audio/flac',
        webm: 'audio/webm',
        opus: 'audio/ogg',
      }[extension] || 'audio/mpeg';
    }

    function resolveWorkspace(session, workspaceState) {
      const fallbackPath = session && session.cwd ? String(session.cwd) : '';
      const items = workspaceState && Array.isArray(workspaceState.items) ? workspaceState.items : [];
      const owner = items.find((item) => item && Array.isArray(item.sessionIds) && session && item.sessionIds.includes(session.id));
      if (!owner) {
        return { name: basename(fallbackPath), path: fallbackPath };
      }
      const title = typeof owner.title === 'string' ? owner.title.trim() : '';
      const path = typeof owner.path === 'string' ? owner.path : fallbackPath;
      const name = title && title !== 'default-workspace' ? title : basename(path);
      return { name: name || title, path };
    }

    function formatTime() {
      try {
        const lang = globalThis.document && globalThis.document.documentElement
          ? globalThis.document.documentElement.lang
          : undefined;
        return new Intl.DateTimeFormat(lang || undefined, {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date());
      } catch {
        return new Date().toLocaleTimeString();
      }
    }

    function makeNotice(session, workspaceState, currentSettings, fallbackWorkspace, failure) {
      const owner = resolveWorkspace(session, workspaceState);
      const cwd = (session && session.cwd ? String(session.cwd) : '') || owner.path || '';
      const workspace = owner.name || fallbackWorkspace || '';
      const task = truncate(
        (session && (session.displayTitle || session.title)) || basename(cwd) || fallbackWorkspace || '',
        currentSettings.titleChars,
      );
      const isError = Boolean(failure);
      return {
        key: `${session && session.id ? session.id : 'demo'}:${Date.now()}`,
        workspace,
        cwd,
        folder: owner.path || cwd,
        task,
        time: formatTime(),
        isError,
        errorKind: isError ? classifyFailure(failure.message) : 'success',
        errorMessage: isError ? summarizeError(failure.message) : '',
        showWorkspace: currentSettings.showWorkspace && Boolean(workspace),
        showTask: currentSettings.showTask && Boolean(task),
        showPath: currentSettings.showPath && Boolean(cwd),
        showTime: currentSettings.showTime,
        durationSeconds: currentSettings.durationSeconds,
      };
    }

    function waitingFacts(interaction) {
      const kind = interaction && typeof interaction.kind === 'string' ? interaction.kind : 'question';
      const questions = interaction && Array.isArray(interaction.questions) ? interaction.questions : [];
      const first = questions[0] && typeof questions[0] === 'object' ? questions[0] : {};
      const header = typeof first.header === 'string' ? first.header.trim() : '';
      const text = typeof first.question === 'string' ? first.question.trim() : '';
      const reason = interaction && typeof interaction.displayReason === 'string'
        ? interaction.displayReason.trim()
        : interaction && typeof interaction.reason === 'string'
          ? interaction.reason.trim()
          : '';
      const tool = interaction && typeof interaction.toolName === 'string' ? interaction.toolName.trim() : '';
      const key = interaction && typeof interaction.key === 'string' && interaction.key
        ? interaction.key
        : '';
      return { kind, questions, header, text, reason, tool, key };
    }

    function makeWaitingNotice(session, workspaceState, currentSettings, interaction, fallbackWorkspace) {
      const facts = waitingFacts(interaction);
      const owner = resolveWorkspace(session, workspaceState);
      const cwd = (session && session.cwd ? String(session.cwd) : '') || owner.path || '';
      const workspace = owner.name || fallbackWorkspace || '';
      const sessionTitle = truncate(
        (session && (session.displayTitle || session.title)) || basename(cwd) || fallbackWorkspace || '',
        currentSettings.titleChars,
      );
      const id = session && session.id ? session.id : 'demo';
      return {
        key: `${id}:waiting:${facts.key || facts.tool || Date.now()}`,
        sessionId: session && session.id ? session.id : '',
        waiting: true,
        waitingKind: facts.kind,
        waitingKey: facts.key,
        workspace,
        cwd,
        folder: owner.path || cwd,
        task: sessionTitle,
        sessionTitle,
        questionHeader: truncate(facts.header, Math.max(12, currentSettings.titleChars)),
        questionText: summarizeError(facts.text),
        questionCount: facts.questions.length,
        approvalReason: summarizeError(facts.reason),
        approvalTool: facts.tool,
        time: formatTime(),
        isError: false,
        errorKind: 'success',
        errorMessage: '',
        showWorkspace: currentSettings.showWorkspace && Boolean(workspace),
        showTask: currentSettings.showTask && Boolean(sessionTitle),
        showPath: currentSettings.showPath && Boolean(cwd),
        showTime: currentSettings.showTime,
        durationSeconds: currentSettings.durationSeconds,
      };
    }

    let audioContext = null;
    let activeAudio = null;

    function audioConstructor() {
      return globalThis.AudioContext || globalThis.webkitAudioContext;
    }

    function ensureAudioContext() {
      if (audioContext) return audioContext;
      const AudioContextClass = audioConstructor();
      if (!AudioContextClass) return null;
      try {
        audioContext = new AudioContextClass();
      } catch {
        audioContext = null;
      }
      return audioContext;
    }

    function stopSound() {
      if (!activeAudio) return;
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch {
        /* ignore */
      }
      activeAudio = null;
    }

    function playAudioSource(dataUrl, volume) {
      if (!globalThis.Audio || !isAudioDataUrl(dataUrl)) return false;
      stopSound();
      try {
        const audio = new globalThis.Audio(dataUrl);
        audio.volume = clampNumber(volume, DEFAULT_SETTINGS.volume, 0, 1, 0);
        audio.preload = 'auto';
        activeAudio = audio;
        const release = () => {
          if (activeAudio === audio) activeAudio = null;
        };
        audio.addEventListener('ended', release, { once: true });
        audio.addEventListener('error', release, { once: true });
        const started = audio.play();
        if (started && typeof started.catch === 'function') started.catch(release);
        return true;
      } catch {
        activeAudio = null;
        return false;
      }
    }

    function playChime(volume) {
      const gainValue = clampNumber(volume, DEFAULT_SETTINGS.volume, 0, 1, 0);
      if (gainValue <= 0) return;
      const context = ensureAudioContext();
      if (!context) return;

      const play = () => {
        try {
          const master = context.createGain();
          master.gain.value = gainValue * 0.115;
          const softener = context.createBiquadFilter();
          softener.type = 'lowpass';
          softener.frequency.value = 3600;
          softener.Q.value = 0.4;
          master.connect(softener);
          softener.connect(context.destination);
          const start = context.currentTime + 0.01;
          [
            { frequency: 783.99, delay: 0 },
            { frequency: 1046.5, delay: 0.095 },
            { frequency: 1567.98, delay: 0.19 },
          ].forEach(({ frequency, delay }) => {
            const oscillator = context.createOscillator();
            const envelope = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, start + delay);
            envelope.gain.setValueAtTime(0.0001, start + delay);
            envelope.gain.exponentialRampToValueAtTime(1, start + delay + 0.012);
            envelope.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.42);
            oscillator.connect(envelope);
            envelope.connect(master);
            oscillator.start(start + delay);
            oscillator.stop(start + delay + 0.45);
          });
          globalThis.setTimeout(() => {
            try {
              master.disconnect();
              softener.disconnect();
            } catch {
              /* already released */
            }
          }, 900);
        } catch {
          /* Audio is a nicety; the visual reminder still works. */
        }
      };

      if (context.state === 'suspended') {
        context.resume().then(play).catch(() => {});
      } else {
        play();
      }
    }

    function playConfiguredSound(current, force = false) {
      if (!current.enabled) return;
      if (!force && !current.soundEnabled) return;
      if (current.volume <= 0) return;
      stopSound();
      if (current.soundKind === 'voice' && playAudioSource(BUILTIN_VOICE_DATA_URL, current.volume)) return;
      if (current.soundKind === 'custom') {
        const custom = getCustomSound();
        if (custom && playAudioSource(custom.dataUrl, current.volume)) return;
      }
      playChime(current.volume);
    }

    function Switch({ checked, onChange, label }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': label,
        className: 'dcd-switch',
        'data-on': checked ? 'true' : 'false',
        onClick: () => onChange(!checked),
      }, h('span', { className: 'dcd-switch-knob' }));
    }

    function SettingRow({ title, desc, children }) {
      return h('div', { className: 'dcd-row' },
        h('div', { className: 'dcd-row-text' },
          h('div', { className: 'dcd-row-title' }, title),
          desc ? h('div', { className: 'dcd-row-desc' }, desc) : null,
        ),
        h('div', { className: 'dcd-row-control' }, children),
      );
    }

    function RangeControl({ label, value, min, max, step, suffix, disabled, onChange }) {
      return h('div', { className: 'dcd-range', 'data-disabled': disabled ? 'true' : 'false' },
        h('input', {
          type: 'range',
          min,
          max,
          step,
          value,
          disabled: Boolean(disabled),
          'aria-label': label,
          onChange: (event) => onChange(Number(event.target.value)),
        }),
        h('span', { className: 'dcd-range-value' }, `${value}${suffix}`),
      );
    }

    function SettingCard({ title, desc, children }) {
      return h('section', { className: 'dcd-card' },
        h('div', { className: 'dcd-card-head' },
          h('h2', { className: 'dcd-card-title' }, title),
          desc ? h('p', { className: 'dcd-card-desc' }, desc) : null,
        ),
        h('div', { className: 'dcd-rows' }, children),
      );
    }

    function SettingsPage({ t }) {
      const current = useSettings();
      const customSound = current.soundKind === 'custom' ? getCustomSound() : null;
      const tr = typeof t === 'function' ? t : (key) => key;
      const set = (patch) => saveSettings(patch);
      const [soundError, setSoundError] = React.useState('');
      const [confirmingUninstall, setConfirmingUninstall] = React.useState(false);
      const [uninstall, setUninstall] = React.useState({ status: 'idle', message: '' });
      const fileInput = React.useRef(null);

      const cancelUninstall = () => {
        setConfirmingUninstall(false);
        setUninstall({ status: 'idle', message: '' });
      };

      const confirmUninstall = async () => {
        let manager = null;
        try {
          manager = runtime.remote && runtime.remote.pluginManager;
        } catch {
          manager = null;
        }
        if (!manager || typeof manager.removeBundle !== 'function') {
          if (runtime.openPluginManager()) {
            setUninstall({ status: 'opened', message: tr('uninstall.opened') });
          } else {
            setUninstall({ status: 'manual', message: tr('uninstall.noManager') });
          }
          return;
        }
        setUninstall({ status: 'busy', message: tr('uninstall.busy') });
        try {
          const answer = await manager.removeBundle('dsh-completed-ding');
          if (!answer || !answer.ok) {
            const reason = answer && answer.error && answer.error.message
              ? answer.error.message
              : tr('uninstall.failedGeneric');
            setUninstall({ status: 'error', message: tr('uninstall.failed', { reason }) });
            return;
          }
          const value = answer.value || {};
          if (value.error && value.error.code === 'stop-profile') {
            setUninstall({ status: 'manual', message: tr('uninstall.manual') });
            return;
          }
          if (value.application === 'failed') {
            const reason = value.error && (value.error.diagnostic || value.error.code)
              ? value.error.diagnostic || value.error.code
              : tr('uninstall.failedGeneric');
            setUninstall({ status: 'error', message: tr('uninstall.failed', { reason }) });
            return;
          }
          if (value.application === 'failed') {
            const reason = value.error && (value.error.diagnostic || value.error.code)
              ? value.error.diagnostic || value.error.code
              : tr('uninstall.failedGeneric');
            setUninstall({ status: 'error', message: tr('uninstall.failed', { reason }) });
            return;
          }
          if (value.application === 'cancelled') {
            setUninstall({ status: 'cancelled', message: tr('uninstall.cancelled') });
            return;
          }
          if (value.application === 'restart-required') {
            setUninstall({ status: 'restart', message: tr('uninstall.restart') });
            return;
          }
          setUninstall({ status: 'done', message: tr('uninstall.done') });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          setUninstall({ status: 'error', message: tr('uninstall.failed', { reason }) });
        }
      };

      const chooseSoundFile = () => {
        setSoundError('');
        if (fileInput.current) fileInput.current.click();
      };

      const handleSoundFile = (event) => {
        const input = event.target;
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        if (file.size > MAX_CUSTOM_SOUND_BYTES) {
          setSoundError(tr('behavior.fileTooLarge'));
          return;
        }
        const looksAudio = (file.type && file.type.startsWith('audio/'))
          || /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus)$/i.test(file.name);
        if (!looksAudio) {
          setSoundError(tr('behavior.fileTypeError'));
          return;
        }
        if (!globalThis.FileReader) {
          setSoundError(tr('behavior.fileReadError'));
          return;
        }
        const reader = new globalThis.FileReader();
        reader.onload = () => {
          const raw = typeof reader.result === 'string' ? reader.result : '';
          const dataUrl = raw.replace(/^data:[^;]*;/, `data:${audioMimeForFile(file)};`);
          if (!saveStoredSound(file.name, dataUrl)) {
            setSoundError(tr('behavior.storageError'));
            return;
          }
          setSoundError('');
          saveSettings({ soundKind: 'custom' });
          playConfiguredSound({ ...getSettings(), soundKind: 'custom' }, true);
        };
        reader.onerror = () => setSoundError(tr('behavior.fileReadError'));
        reader.readAsDataURL(file);
      };

      const clearSoundFile = () => {
        clearStoredSound();
        setSoundError('');
        saveSettings({ soundKind: 'chime' });
      };

      return h('div', { className: 'dcd-page', 'data-enabled': current.enabled ? 'true' : 'false' },
        h('input', {
          ref: fileInput,
          type: 'file',
          accept: 'audio/*,.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac,.webm,.opus',
          className: 'dcd-file-input',
          onChange: handleSoundFile,
          tabIndex: -1,
          'aria-hidden': 'true',
        }),
        h('div', { className: 'dcd-shell' },
          h('header', { className: 'dcd-hero' },
            h('div', { className: 'dcd-hero-mascot' }, h(JellyMascot, { size: 62 })),
            h('div', { className: 'dcd-hero-copy' },
              h('h1', { className: 'dcd-hero-title' }, tr('settings.title')),
              h('p', { className: 'dcd-hero-subtitle' }, tr('settings.subtitle')),
            ),
            h('button', {
              type: 'button',
              className: 'dcd-uninstall-icon',
              title: tr('uninstall.action'),
              'aria-label': tr('uninstall.action'),
              onClick: () => {
                setConfirmingUninstall(true);
                setUninstall({ status: 'idle', message: '' });
              },
            }, h(TrashIcon, { size: 16 })),
          ),
          h('section', {
            className: `dcd-master${current.enabled ? '' : ' dcd-master--off'}`,
          },
            h('div', { className: 'dcd-master-copy' },
              h('div', { className: 'dcd-master-title' }, tr('settings.master.title')),
              h('div', { className: 'dcd-master-desc' }, tr('settings.master.desc')),
            ),
            h('div', { className: 'dcd-master-control' },
              h('span', {
                className: 'dcd-master-state',
                'data-on': current.enabled ? 'true' : 'false',
              }, current.enabled ? tr('settings.master.on') : tr('settings.master.off')),
              h(Switch, {
                checked: current.enabled,
                label: tr('settings.master.title'),
                onChange: (value) => set({ enabled: value }),
              }),
            ),
          ),
          h('div', { className: 'dcd-actions' },
            h('button', {
              type: 'button',
              className: 'dcd-btn dcd-btn-primary',
              disabled: !current.enabled,
              onClick: () => requestDemo(),
            }, tr('settings.preview')),
            h('button', {
              type: 'button',
              className: 'dcd-btn',
              disabled: !current.enabled,
              onClick: () => requestDemo('failure'),
            }, tr('settings.previewFailure')),
            h('button', {
              type: 'button',
              className: 'dcd-btn',
              disabled: !current.enabled,
              onClick: () => requestDemo('waiting'),
            }, tr('settings.previewWaiting')),
            h('button', {
              type: 'button',
              className: 'dcd-btn',
              disabled: !current.enabled,
              onClick: () => playConfiguredSound(current, true),
            }, tr('settings.testSound')),
            h('button', {
              type: 'button',
              className: 'dcd-btn dcd-btn-ghost',
              onClick: () => resetSettings(),
            }, tr('settings.reset')),
            h('span', { className: 'dcd-saved' }, tr('settings.saved')),
          ),

          h(SettingCard, {
            title: tr('section.content'),
            desc: tr('section.content.desc'),
          },
            h(SettingRow, {
              title: tr('content.workspace'),
              desc: tr('content.workspace.desc'),
            }, h(Switch, {
              checked: current.showWorkspace,
              label: tr('content.workspace'),
              onChange: (value) => set({ showWorkspace: value }),
            })),
            h(SettingRow, {
              title: tr('content.task'),
              desc: tr('content.task.desc'),
            }, h(Switch, {
              checked: current.showTask,
              label: tr('content.task'),
              onChange: (value) => set({ showTask: value }),
            })),
            h(SettingRow, {
              title: tr('content.titleChars'),
              desc: tr('content.titleChars.desc'),
            }, h(RangeControl, {
              label: tr('content.titleChars'),
              value: current.titleChars,
              min: LIMITS.titleChars.min,
              max: LIMITS.titleChars.max,
              step: 1,
              suffix: tr('unit.chars'),
              disabled: !current.showTask,
              onChange: (value) => set({ titleChars: value }),
            })),
            h(SettingRow, {
              title: tr('content.path'),
              desc: tr('content.path.desc'),
            }, h(Switch, {
              checked: current.showPath,
              label: tr('content.path'),
              onChange: (value) => set({ showPath: value }),
            })),
            h(SettingRow, {
              title: tr('content.time'),
              desc: tr('content.time.desc'),
            }, h(Switch, {
              checked: current.showTime,
              label: tr('content.time'),
              onChange: (value) => set({ showTime: value }),
            })),
          ),

          h(SettingCard, {
            title: tr('section.behavior'),
            desc: tr('section.behavior.desc'),
          },
            h(SettingRow, {
              title: tr('behavior.sound'),
              desc: tr('behavior.sound.desc'),
            }, h(Switch, {
              checked: current.soundEnabled,
              label: tr('behavior.sound'),
              onChange: (value) => set({ soundEnabled: value }),
            })),
            h(SettingRow, {
              title: tr('behavior.source'),
              desc: tr('behavior.source.desc'),
            }, h('select', {
              className: 'dcd-select',
              value: current.soundKind,
              disabled: !current.soundEnabled,
              'aria-label': tr('behavior.source'),
              onChange: (event) => set({ soundKind: event.target.value }),
            },
              h('option', { value: 'chime' }, tr('behavior.source.chime')),
              h('option', { value: 'voice' }, tr('behavior.source.voice')),
              h('option', { value: 'custom' }, tr('behavior.source.custom')),
            )),
            current.soundKind === 'custom' ? h(SettingRow, {
              title: tr('behavior.customFile'),
              desc: tr('behavior.customFile.desc'),
            }, h('div', { className: 'dcd-file' },
              h('button', {
                type: 'button',
                className: 'dcd-btn dcd-btn-small',
                disabled: !current.soundEnabled,
                onClick: chooseSoundFile,
              }, customSound ? tr('behavior.replaceFile') : tr('behavior.chooseFile')),
              customSound ? h('button', {
                type: 'button',
                className: 'dcd-btn dcd-btn-small dcd-btn-ghost',
                disabled: !current.soundEnabled,
                onClick: clearSoundFile,
              }, tr('behavior.clearFile')) : null,
              h('span', {
                className: 'dcd-file-name',
                title: customSound ? customSound.name : '',
              }, customSound ? customSound.name : tr('behavior.noFile')),
            )) : null,
            current.soundKind === 'custom' && soundError
              ? h('div', { className: 'dcd-error', role: 'alert' }, soundError)
              : null,
            h(SettingRow, {
              title: tr('behavior.volume'),
              desc: tr('behavior.volume.desc'),
            }, h(RangeControl, {
              label: tr('behavior.volume'),
              value: Math.round(current.volume * 100),
              min: 0,
              max: 100,
              step: 5,
              suffix: '%',
              disabled: !current.soundEnabled,
              onChange: (value) => set({ volume: value / 100 }),
            })),
            h(SettingRow, {
              title: tr('behavior.duration'),
              desc: tr('behavior.duration.desc'),
            }, h(RangeControl, {
              label: tr('behavior.duration'),
              value: current.durationSeconds,
              min: LIMITS.durationSeconds.min,
              max: LIMITS.durationSeconds.max,
              step: 1,
              suffix: tr('unit.seconds'),
              onChange: (value) => set({ durationSeconds: value }),
            })),
            h(SettingRow, {
              title: tr('behavior.gap'),
              desc: tr('behavior.gap.desc'),
            }, h(RangeControl, {
              label: tr('behavior.gap'),
              value: current.gapMs,
              min: LIMITS.gapMs.min,
              max: LIMITS.gapMs.max,
              step: 50,
              suffix: tr('unit.ms'),
              onChange: (value) => set({ gapMs: value }),
            })),
          ),

          h(SettingCard, {
            title: tr('section.scope'),
            desc: tr('section.scope.desc'),
          },
            h(SettingRow, {
              title: tr('scope.waiting'),
              desc: tr('scope.waiting.desc'),
            }, h(Switch, {
              checked: current.showWaiting,
              label: tr('scope.waiting'),
              onChange: (value) => set({ showWaiting: value }),
            })),
            h(SettingRow, {
              title: tr('scope.subagents'),
              desc: tr('scope.subagents.desc'),
            }, h(Switch, {
              checked: current.includeSubagents,
              label: tr('scope.subagents'),
              onChange: (value) => set({ includeSubagents: value }),
            })),
          ),

          h('p', { className: 'dcd-note' }, tr('settings.note')),

          confirmingUninstall
            ? h('div', {
              className: 'dcd-uninstall-mask',
              onClick: uninstall.status === 'busy' ? undefined : cancelUninstall,
            },
              h('div', {
                className: 'dcd-uninstall-dialog',
                role: 'alertdialog',
                'aria-modal': 'true',
                'aria-label': tr('uninstall.confirmTitle'),
                onClick: (event) => event.stopPropagation(),
              },
                h('div', { className: 'dcd-uninstall-dialog-head' },
                  h('span', { className: 'dcd-uninstall-dialog-icon' }, h(TrashIcon, { size: 18 })),
                  h('div', { className: 'dcd-uninstall-dialog-copy' },
                    h('div', { className: 'dcd-uninstall-dialog-title' }, tr('uninstall.confirmTitle')),
                    h('div', { className: 'dcd-uninstall-dialog-desc' }, tr('uninstall.confirmDesc')),
                  ),
                ),
                uninstall.status === 'error'
                  ? h('div', { className: 'dcd-confirm-error', role: 'alert' }, uninstall.message)
                  : uninstall.status === 'busy'
                    ? h('div', { className: 'dcd-confirm-note', role: 'status' }, tr('uninstall.busy'))
                    : uninstall.status !== 'idle'
                      ? h('div', { className: 'dcd-confirm-note', 'data-tone': uninstall.status, role: 'status' }, uninstall.message)
                      : null,
                h('div', { className: 'dcd-confirm-actions' },
                  uninstall.status === 'done'
                    ? h('button', {
                      type: 'button',
                      className: 'dcd-btn dcd-btn-small',
                      onClick: () => globalThis.location.reload(),
                    }, tr('uninstall.refresh'))
                    : null,
                  uninstall.status === 'manual'
                    ? h('button', {
                      type: 'button',
                      className: 'dcd-btn dcd-btn-small',
                      onClick: () => {
                        if (runtime.openPluginManager()) cancelUninstall();
                      },
                    }, tr('uninstall.openManager'))
                    : null,
                  h('button', {
                    type: 'button',
                    className: 'dcd-btn dcd-btn-ghost dcd-btn-small',
                    disabled: uninstall.status === 'busy',
                    onClick: cancelUninstall,
                  }, uninstall.status === 'idle' ? tr('uninstall.cancel') : tr('uninstall.close')),
                  uninstall.status === 'idle' || uninstall.status === 'busy' || uninstall.status === 'error'
                    ? h('button', {
                      type: 'button',
                      className: 'dcd-btn dcd-btn-danger dcd-btn-small',
                      disabled: uninstall.status === 'busy',
                      onClick: confirmUninstall,
                    }, uninstall.status === 'error' ? tr('uninstall.retry') : tr('uninstall.confirm'))
                    : null,
                ),
              ),
            )
            : null,
        ),
      );
    }

    function ToastLayer({ t, sessions, workspaces, sessionRemote, remote, uiWorkspace, useSessionStatus }) {
      const tr = typeof t === 'function' ? t : (key) => key;
      const currentSettings = useSettings();
      const settingsRef = React.useRef(currentSettings);
      settingsRef.current = currentSettings;

      const sessionsRef = React.useRef(sessions);
      sessionsRef.current = sessions;
      const workspacesRef = React.useRef(workspaces);
      workspacesRef.current = workspaces;

      const [notice, setNotice] = React.useState(null);
      const [leaving, setLeaving] = React.useState(false);
      const [portalHost, setPortalHost] = React.useState(null);
      const machine = React.useRef({
        active: null,
        pending: null,
        leaving: false,
        hideTimer: 0,
        exitTimer: 0,
        gapTimer: 0,
      });
      const previousStatus = React.useRef(undefined);
      const openingFolder = React.useRef(false);
      const errors = React.useRef(new Map());
      const pendingCompletions = React.useRef(new Map());
      const seenWaiting = React.useRef(new Set());
      const cueTimer = React.useRef(0);

      const statusHook = typeof useSessionStatus === 'function' ? useSessionStatus : (selector) => selector(EMPTY_STATUS);
      const status = statusHook((snapshot) => snapshot);
      const statusRef = React.useRef(status || EMPTY_STATUS);
      statusRef.current = status || EMPTY_STATUS;

      /*
       * Mount the card in its own body-level layer. Host overlays can sit inside
       * transformed, filtered, or clipped ancestors, which would make a fixed
       * descendant anchor to that ancestor instead of the viewport. A body
       * portal keeps the card in the real bottom-right corner on every screen.
       */
      React.useEffect(() => {
        if (!globalThis.document || !globalThis.document.body) return undefined;
        const host = globalThis.document.createElement('div');
        host.className = 'dcd-toast-host';
        host.dataset.plugin = 'dsh-completed-ding';
        globalThis.document.body.append(host);
        setPortalHost(host);
        return () => {
          host.remove();
        };
      }, []);

      const clearTimer = (name) => {
        const state = machine.current;
        if (state[name]) {
          globalThis.clearTimeout(state[name]);
          state[name] = 0;
        }
      };

      const present = (next) => {
        if (!settingsRef.current.enabled) return;
        const state = machine.current;
        clearTimer('exitTimer');
        clearTimer('gapTimer');
        clearTimer('hideTimer');
        state.active = next;
        state.leaving = false;
        setNotice(next);
        setLeaving(false);
        state.hideTimer = globalThis.setTimeout(() => {
          state.hideTimer = 0;
          beginExit();
        }, Math.max(1, settingsRef.current.durationSeconds) * 1000);
      };

      const beginExit = () => {
        const state = machine.current;
        if (!state.active || state.leaving) return;
        state.leaving = true;
        setLeaving(true);
        clearTimer('hideTimer');
        if (state.exitTimer) return;
        state.exitTimer = globalThis.setTimeout(() => {
          state.exitTimer = 0;
          state.active = null;
          state.leaving = false;
          setNotice(null);
          setLeaving(false);
          const next = state.pending;
          state.pending = null;
          if (!next) return;
          const gap = Math.max(0, settingsRef.current.gapMs);
          if (gap === 0) {
            present(next);
            return;
          }
          state.gapTimer = globalThis.setTimeout(() => {
            state.gapTimer = 0;
            present(next);
          }, gap);
        }, EXIT_MS);
      };

      const enqueue = (next) => {
        if (!settingsRef.current.enabled) return;
        const state = machine.current;
        if (!state.active) {
          if (state.gapTimer) {
            state.pending = next;
            return;
          }
          present(next);
          return;
        }
        state.pending = next;
        beginExit();
      };

      const scheduleCue = () => {
        if (!settingsRef.current.enabled) return;
        if (cueTimer.current) globalThis.clearTimeout(cueTimer.current);
        cueTimer.current = globalThis.setTimeout(() => {
          cueTimer.current = 0;
          playConfiguredSound(settingsRef.current);
        }, 90);
      };

      const showCompletion = (sessionId) => {
        if (!settingsRef.current.enabled) return;
        const latestStatus = statusRef.current.get(sessionId);
        if (!latestStatus || latestStatus.running !== false) return;
        const list = sessionsRef.current && sessionsRef.current.list
          ? sessionsRef.current.list.getSnapshot()
          : null;
        const session = list && list.byId ? list.byId[sessionId] : null;
        if (!session || session.blank === true) return;
        if (!settingsRef.current.includeSubagents && session.origin === 'subagent') return;
        let failure = errors.current.get(sessionId) || null;
        if (failure && Date.now() - failure.at > 30000) failure = null;
        errors.current.delete(sessionId);
        const workspaceState = workspacesRef.current && workspacesRef.current.list
          ? workspacesRef.current.list.getSnapshot()
          : null;
        enqueue(makeNotice(session, workspaceState, settingsRef.current, undefined, failure));
        scheduleCue();
      };

      const waitingIdentity = (sessionId, interaction) => {
        const facts = waitingFacts(interaction);
        return [
          sessionId,
          facts.kind,
          facts.key || facts.tool || facts.reason || facts.text.slice(0, 60),
        ].join(':');
      };

      const dismissWaiting = (sessionId) => {
        const state = machine.current;
        if (state.active && state.active.waiting && state.active.sessionId === sessionId) beginExit();
        if (state.pending && state.pending.waiting && state.pending.sessionId === sessionId) {
          state.pending = null;
        }
      };

      const showWaiting = (sessionId, interaction) => {
        if (!settingsRef.current.enabled || !settingsRef.current.showWaiting) return;
        const identity = waitingIdentity(sessionId, interaction);
        if (seenWaiting.current.has(identity)) return;
        const list = sessionsRef.current && sessionsRef.current.list
          ? sessionsRef.current.list.getSnapshot()
          : null;
        const session = (list && list.byId ? list.byId[sessionId] : null) || { id: sessionId };
        if (session.blank === true) return;
        if (!settingsRef.current.includeSubagents && session.origin === 'subagent') return;
        seenWaiting.current.add(identity);
        if (seenWaiting.current.size > 200) {
          const oldest = seenWaiting.current.values().next().value;
          if (oldest !== undefined) seenWaiting.current.delete(oldest);
        }
        const workspaceState = workspacesRef.current && workspacesRef.current.list
          ? workspacesRef.current.list.getSnapshot()
          : null;
        enqueue(makeWaitingNotice(session, workspaceState, settingsRef.current, interaction, undefined));
        scheduleCue();
      };

      const scheduleCompletion = (sessionId) => {
        if (!settingsRef.current.enabled) return;
        const pending = pendingCompletions.current;
        const previous = pending.get(sessionId);
        if (previous) globalThis.clearTimeout(previous);
        const timer = globalThis.setTimeout(() => {
          pending.delete(sessionId);
          showCompletion(sessionId);
        }, 320);
        pending.set(sessionId, timer);
      };

      const cancelCompletion = (sessionId) => {
        const timer = pendingCompletions.current.get(sessionId);
        if (!timer) return;
        globalThis.clearTimeout(timer);
        pendingCompletions.current.delete(sessionId);
      };

      const makeDemoNotice = (kind) => {
        const list = sessionsRef.current && sessionsRef.current.list
          ? sessionsRef.current.list.getSnapshot()
          : null;
        const rows = list && list.byId ? Object.values(list.byId) : [];
        const sample = rows.find((row) => row && (row.retainedBy && row.retainedBy.mainView)) || rows.find((row) => row && !row.blank);
        const workspaceState = workspacesRef.current && workspacesRef.current.list
          ? workspacesRef.current.list.getSnapshot()
          : null;
        const waitingTarget = kind === 'waiting'
          ? {
            kind: 'question',
            key: 'demo-waiting',
            questions: [{
              header: tr('demo.waitingHeader'),
              question: tr('demo.waitingQuestion'),
            }],
          }
          : null;
        const failure = kind === 'failure'
          ? { message: tr('demo.failure'), at: Date.now() }
          : null;
        if (sample) {
          if (waitingTarget) {
            return makeWaitingNotice(sample, workspaceState, { ...settingsRef.current, showPath: true }, waitingTarget);
          }
          return makeNotice(sample, workspaceState, { ...settingsRef.current, showPath: true }, undefined, failure);
        }
        if (waitingTarget) {
          return makeWaitingNotice(
            { id: 'demo', displayTitle: tr('demo.task') },
            workspaceState,
            { ...settingsRef.current, showPath: false },
            waitingTarget,
            tr('demo.workspace'),
          );
        }
        return makeNotice(
          { id: 'demo', displayTitle: tr('demo.task') },
          workspaceState,
          { ...settingsRef.current, showPath: false },
          tr('demo.workspace'),
          failure,
        );
      };

      const openWorkspace = async (target) => {
        if (!target || !target.folder || !sessionRemote || !sessionRemote.openWorkspacePath) return;
        if (openingFolder.current) return;
        openingFolder.current = true;
        try {
          const result = await sessionRemote.openWorkspacePath({
            path: target.folder,
          });
          if (!result || !result.ok) throw new Error('workspace folder could not be opened');
        } catch {
          /* The toast stays non-modal; a failed native hand-off leaves the card dismissible. */
        } finally {
          openingFolder.current = false;
        }
      };

      const openWaiting = (target) => {
        if (!target || !target.sessionId || !uiWorkspace || typeof uiWorkspace.openSession !== 'function') return;
        try {
          uiWorkspace.openSession(target.sessionId);
          beginExit();
        } catch {
          /* Navigation is optional; the reminder itself must stay dismissible. */
        }
      };

      React.useEffect(() => {
        if (!remote || typeof remote.$on !== 'function') return;
        const dispose = remote.$on('api-session/error', (sessionId, message) => {
          if (!settingsRef.current.enabled) return;
          if (typeof sessionId !== 'string' || !sessionId) return;
          errors.current.set(sessionId, {
            message: String(message == null ? '' : message),
            at: Date.now(),
          });
          if (errors.current.size > 60) {
            const oldest = errors.current.keys().next().value;
            if (oldest !== undefined) errors.current.delete(oldest);
          }
        });
        return typeof dispose === 'function' ? dispose : undefined;
      }, [remote]);

      React.useEffect(() => subscribeDemo((kind) => {
        if (!settingsRef.current.enabled) return;
        const next = makeDemoNotice(kind);
        enqueue(next);
        playConfiguredSound(settingsRef.current);
      }), []);

      React.useEffect(() => {
        if (!status) return;
        const previous = previousStatus.current;
        previousStatus.current = status;
        if (!settingsRef.current.enabled) return;
        for (const [sessionId, value] of status) {
          const interaction = value && value.pendingInteraction ? value.pendingInteraction : null;
          if (interaction) {
            showWaiting(sessionId, interaction);
            continue;
          }
          const before = previous && previous.get(sessionId);
          if (before && before.pendingInteraction) dismissWaiting(sessionId);
        }
        if (!previous) return;
        for (const [sessionId, value] of status) {
          if (value && value.running === true) {
            errors.current.delete(sessionId);
            cancelCompletion(sessionId);
            continue;
          }
          const before = previous.get(sessionId);
          if (!before || before.running !== true || !value || value.running !== false) continue;
          scheduleCompletion(sessionId);
        }
      }, [status]);

      React.useEffect(() => {
        if (currentSettings.enabled) {
          previousStatus.current = statusRef.current;
          if (currentSettings.showWaiting) {
            for (const [sessionId, value] of statusRef.current) {
              if (value && value.pendingInteraction) showWaiting(sessionId, value.pendingInteraction);
            }
          } else {
            const state = machine.current;
            if (state.active && state.active.waiting) beginExit();
            if (state.pending && state.pending.waiting) state.pending = null;
          }
          return;
        }
        for (const timer of pendingCompletions.current.values()) globalThis.clearTimeout(timer);
        pendingCompletions.current.clear();
        errors.current.clear();
        if (cueTimer.current) globalThis.clearTimeout(cueTimer.current);
        cueTimer.current = 0;
        stopSound();
        const state = machine.current;
        state.pending = null;
        if (state.active) {
          beginExit();
          return;
        }
        globalThis.clearTimeout(state.hideTimer);
        globalThis.clearTimeout(state.exitTimer);
        globalThis.clearTimeout(state.gapTimer);
        state.hideTimer = 0;
        state.exitTimer = 0;
        state.gapTimer = 0;
      }, [currentSettings.enabled, currentSettings.showWaiting]);

      React.useEffect(() => () => {
        const state = machine.current;
        globalThis.clearTimeout(state.hideTimer);
        globalThis.clearTimeout(state.exitTimer);
        globalThis.clearTimeout(state.gapTimer);
        state.hideTimer = 0;
        state.exitTimer = 0;
        state.gapTimer = 0;
        if (cueTimer.current) globalThis.clearTimeout(cueTimer.current);
        cueTimer.current = 0;
        for (const timer of pendingCompletions.current.values()) globalThis.clearTimeout(timer);
        pendingCompletions.current.clear();
        errors.current.clear();
      }, []);

      if (!notice) return null;

      const waiting = Boolean(notice.waiting);
      const waitingKind = notice.waitingKind;
      const waitingLabel = waiting
        ? waitingKind === 'approval'
          ? tr('toast.waiting.approval')
          : waitingKind === 'plan-review'
            ? tr('toast.waiting.plan')
            : notice.questionCount > 1
              ? tr('toast.waiting.many', { count: notice.questionCount })
              : tr('toast.waiting.question')
        : '';
      const waitingPrimary = waiting
        ? waitingKind === 'approval'
          ? notice.approvalReason || tr('toast.waiting.approval')
          : notice.questionHeader || notice.questionText || notice.sessionTitle || tr('toast.waiting.generic')
        : '';
      const waitingDetail = waiting
        ? waitingKind === 'approval'
          ? notice.approvalTool
            ? tr('toast.waiting.tool', { tool: notice.approvalTool })
            : ''
          : notice.questionHeader
            ? notice.questionText
            : ''
        : '';

      const meta = [];
      if (notice.showWorkspace) {
        const workspaceChildren = [
          h(FolderIcon, { size: 12 }),
          h('span', { className: 'dcd-toast-ellipsis' }, notice.workspace),
        ];
        if (notice.folder && sessionRemote) {
          workspaceChildren.push(h('span', { className: 'dcd-toast-open', 'aria-hidden': 'true' }, h(OpenIcon, { size: 10 })));
          meta.push(h('button', {
            key: 'workspace',
            type: 'button',
            className: 'dcd-toast-workspace dcd-toast-workspace--action',
            title: `${tr('toast.openWorkspace')}: ${notice.folder}`,
            'aria-label': `${tr('toast.openWorkspace')}: ${notice.workspace}`,
            onClick: () => openWorkspace(notice),
          }, ...workspaceChildren));
        } else {
          meta.push(h('span', {
            key: 'workspace',
            className: 'dcd-toast-workspace',
            title: notice.workspace,
          }, ...workspaceChildren));
        }
      }
      if (notice.showPath) {
        meta.push(h('span', { key: 'path', className: 'dcd-toast-path', title: notice.cwd }, notice.cwd));
      }
      if (waiting && notice.sessionTitle && currentSettings.showTask && waitingPrimary !== notice.sessionTitle) {
        meta.push(h('span', {
          key: 'session',
          className: 'dcd-toast-session',
          title: notice.sessionTitle,
        },
          h(ChatIcon, { size: 12 }),
          h('span', { className: 'dcd-toast-ellipsis' }, notice.sessionTitle),
        ));
      }

      const layer = h('div', { className: 'dcd-toast-root' },
        h('div', {
          className: `dcd-toast${notice.isError ? ' dcd-toast--error' : ''}${waiting ? ' dcd-toast--waiting' : ''}${leaving ? ' dcd-toast--out' : ''}`,
          role: 'status',
          'aria-live': 'polite',
          'aria-atomic': 'true',
        },
          h('div', { className: 'dcd-toast-mascot' },
            h(JellyMascot, { size: 58, mood: notice.isError ? 'error' : waiting ? 'waiting' : 'happy' }),
          ),
          h('span', { className: 'dcd-bubble dcd-bubble--one', 'aria-hidden': 'true' }),
          h('span', { className: 'dcd-bubble dcd-bubble--two', 'aria-hidden': 'true' }),
          h('span', { className: 'dcd-bubble dcd-bubble--three', 'aria-hidden': 'true' }),
          h('div', { className: 'dcd-toast-body' },
            h('div', { className: 'dcd-toast-head' },
              h('span', { className: 'dcd-toast-eyebrow' },
                waiting ? waitingLabel : notice.isError ? tr(`toast.error.${notice.errorKind}`) : tr('toast.title'),
              ),
              h('span', { className: 'dcd-toast-check', 'aria-hidden': 'true' },
                waiting ? h(HelpIcon, { size: 11 }) : notice.isError ? h(AlertIcon, { size: 10 }) : h(CheckIcon, { size: 9 }),
              ),
            ),
            waiting
              ? waitingPrimary ? h('div', { className: 'dcd-toast-task' }, waitingPrimary) : null
              : notice.showTask ? h('div', { className: 'dcd-toast-task' }, notice.task) : null,
            waiting && waitingDetail
              ? h('div', { className: 'dcd-toast-detail' }, waitingDetail)
              : null,
            notice.isError && notice.errorMessage
              ? h('div', { className: 'dcd-toast-error' }, notice.errorMessage)
              : null,
            meta.length > 0 ? h('div', { className: 'dcd-toast-meta' }, meta) : null,
            waiting
              ? h('div', { className: 'dcd-toast-actions' },
                uiWorkspace && notice.sessionId
                  ? h('button', {
                    type: 'button',
                    className: 'dcd-toast-answer',
                    onClick: () => openWaiting(notice),
                  }, waitingKind === 'question' ? tr('toast.waiting.answer') : tr('toast.waiting.confirm'))
                  : h('span', { className: 'dcd-toast-hint' }, tr('toast.waiting.open')),
              )
              : null,
            h('div', { className: 'dcd-toast-foot' },
              notice.showTime ? h('span', null, notice.time) : null,
              notice.showTime ? h('span', { className: 'dcd-toast-sep', 'aria-hidden': 'true' }, '·') : null,
              h('span', null, tr('toast.autoClose', { seconds: notice.durationSeconds })),
            ),
          ),
          h('button', {
            type: 'button',
            className: 'dcd-toast-close',
            'aria-label': tr('toast.close'),
            onClick: beginExit,
          }, h(CloseIcon, { size: 13 })),
          h('span', {
            className: 'dcd-toast-progress',
            'aria-hidden': 'true',
            style: { animationDuration: `${notice.durationSeconds}s` },
          }),
        ),
      );

      return portalHost && ReactDOM && typeof ReactDOM.createPortal === 'function'
        ? ReactDOM.createPortal(layer, portalHost)
        : layer;
    }

    const CSS = `
.dcd-toast-host {
  display: contents;
}

/* Shared warm honey/peach palette for the card and the settings page. */
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
  --dcd-accent: var(--dcd-amber-deep);
  --dcd-accent-soft: var(--dcd-amber-soft);
  --dcd-accent-deep: #8f4d16;
  --dcd-hairline: color-mix(in srgb, #b96a22 55%, transparent);
  --dcd-inner-highlight: rgba(255, 255, 255, 0.86);
  --dcd-card-shadow:
    0 34px 70px -24px rgba(112, 56, 16, 0.5),
    0 14px 30px -16px rgba(112, 56, 16, 0.34);
}

body[data-ds-dark-theme] .dcd-toast-root,
body[data-ds-dark-theme] .dcd-page {
  --dcd-amber: #ffbe72;
  --dcd-amber-deep: #ffc884;
  --dcd-amber-soft: #8e5c2d;
  --dcd-peach: #d9835c;
  --dcd-coral: #ef8a66;
  --dcd-cream: #33251b;
  --dcd-cream-deep: #261a12;
  --dcd-card-glow: #5a3a22;
  --dcd-ink: #fdf2e5;
  --dcd-ink-soft: #cfae8a;
  --dcd-accent: #ffc078;
  --dcd-accent-soft: #8e5c2d;
  --dcd-accent-deep: #ffcf96;
  --dcd-hairline: color-mix(in srgb, #ffc078 42%, transparent);
  --dcd-inner-highlight: rgba(255, 222, 184, 0.16);
  --dcd-card-shadow:
    0 30px 74px -18px rgba(0, 0, 0, 0.78),
    0 12px 26px -12px rgba(0, 0, 0, 0.56);
}

.dcd-toast-root {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  box-sizing: border-box;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding:
    max(16px, env(safe-area-inset-top))
    max(22px, env(safe-area-inset-right))
    max(22px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  pointer-events: none;
  font-family: inherit;
  color: var(--dcd-ink);
}

.dcd-toast {
  position: relative;
  width: min(424px, 100%);
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 18px 44px 20px 18px;
  overflow: hidden;
  border: 1px solid var(--dcd-hairline);
  border-radius: 26px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--dcd-inner-highlight) 55%, transparent), transparent 26%),
    radial-gradient(115% 95% at 0% -12%, color-mix(in srgb, var(--dcd-card-glow) 48%, transparent), transparent 56%),
    radial-gradient(95% 115% at 102% 110%, color-mix(in srgb, var(--dcd-peach) 28%, transparent), transparent 62%),
    linear-gradient(155deg,
      color-mix(in srgb, var(--dcd-cream) 99%, transparent),
      color-mix(in srgb, var(--dcd-cream-deep) 97%, transparent));
  box-shadow:
    var(--dcd-card-shadow),
    inset 0 1px 0 var(--dcd-inner-highlight),
    0 0 0 5px color-mix(in srgb, var(--dcd-amber) 9%, transparent);
  -webkit-backdrop-filter: blur(28px) saturate(1.18);
  backdrop-filter: blur(28px) saturate(1.18);
  pointer-events: auto;
  transform-origin: bottom right;
  animation: dcd-jelly-in 520ms cubic-bezier(0.2, 1.28, 0.32, 1) both;
}

.dcd-toast--error {
  --dcd-accent: var(--dcd-coral);
  --dcd-accent-soft: #f2a98d;
  --dcd-accent-deep: #b04a2c;
  border-color: color-mix(in srgb, var(--dcd-coral) 58%, transparent);
  box-shadow:
    var(--dcd-card-shadow),
    inset 0 1px 0 var(--dcd-inner-highlight),
    0 0 0 5px color-mix(in srgb, var(--dcd-coral) 7%, transparent);
}

body[data-ds-dark-theme] .dcd-toast--error {
  --dcd-accent: #ffab86;
  --dcd-accent-soft: #8e5c2d;
  --dcd-accent-deep: #ffb08e;
}

.dcd-toast--waiting {
  --dcd-accent: #b9791f;
  --dcd-accent-soft: #f0c17e;
  --dcd-accent-deep: #8a5612;
  border-color: color-mix(in srgb, var(--dcd-amber) 62%, transparent);
  box-shadow:
    var(--dcd-card-shadow),
    inset 0 1px 0 var(--dcd-inner-highlight),
    0 0 0 5px color-mix(in srgb, var(--dcd-amber) 11%, transparent);
}

body[data-ds-dark-theme] .dcd-toast--waiting {
  --dcd-accent: #ffd08a;
  --dcd-accent-soft: #8e5c2d;
  --dcd-accent-deep: #ffd9a0;
}

.dcd-toast--waiting .dcd-toast-check {
  animation: dcd-wait-pulse 2.4s ease-in-out infinite;
}

.dcd-toast--error::before {
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--dcd-coral) 28%, transparent), transparent 58%),
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--dcd-cream) 55%, transparent), transparent 46%);
}

.dcd-toast::before {
  content: "";
  position: absolute;
  top: -130px;
  right: -90px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--dcd-amber) 34%, transparent), transparent 58%),
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--dcd-cream) 55%, transparent), transparent 46%);
  pointer-events: none;
}

.dcd-toast::after {
  content: "";
  position: absolute;
  left: -100px;
  bottom: -140px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--dcd-peach) 30%, transparent), transparent 68%);
  pointer-events: none;
}

.dcd-toast--out {
  animation: dcd-toast-out ${EXIT_MS}ms ease-in both;
}

.dcd-toast-mascot {
  position: relative;
  z-index: 1;
  width: 58px;
  height: 58px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dcd-toast-mascot::before {
  content: "";
  position: absolute;
  inset: -12%;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--dcd-amber) 30%, transparent), transparent 70%);
  pointer-events: none;
}

.dcd-mascot {
  position: relative;
  display: inline-block;
  flex: none;
}

.dcd-mascot-ear {
  position: absolute;
  top: 1%;
  z-index: 0;
  width: 34%;
  height: 34%;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffd09a, #ed9a46);
  border: 1px solid rgba(255, 248, 236, 0.72);
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.52);
}

.dcd-mascot-ear--left {
  left: 11%;
  transform: rotate(-16deg);
}

.dcd-mascot-ear--right {
  right: 11%;
  transform: rotate(16deg);
}

.dcd-mascot-body {
  position: absolute;
  z-index: 1;
  inset: 14% 3% 2%;
  border-radius: 48% 52% 45% 55% / 54% 45% 55% 46%;
  background:
    radial-gradient(circle at 30% 20%, #fff6e3 0 7%, transparent 30%),
    linear-gradient(145deg, #ffd08a, #f5a94f 52%, #df7f2f);
  border: 1px solid rgba(255, 246, 230, 0.78);
  box-shadow:
    inset 0 -5px 10px rgba(140, 74, 24, 0.24),
    inset 0 4px 9px rgba(255, 255, 255, 0.62),
    0 10px 22px rgba(150, 78, 24, 0.34);
  animation: dcd-bob 2.8s ease-in-out infinite;
}

.dcd-mascot-shine {
  position: absolute;
  top: 12%;
  left: 18%;
  width: 28%;
  height: 16%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  filter: blur(1px);
  transform: rotate(-20deg);
}

.dcd-mascot-eye {
  position: absolute;
  top: 41%;
  width: 9%;
  height: 13%;
  border-radius: 50%;
  background: #5a3418;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.55);
  transform: translate(var(--dcd-gaze-x, 0px), var(--dcd-gaze-y, 0px));
  transition: transform 90ms linear;
  will-change: transform;
}

.dcd-mascot-eye--left {
  left: 29%;
}

.dcd-mascot-eye--right {
  right: 29%;
}

.dcd-mascot-blush {
  position: absolute;
  top: 57%;
  width: 18%;
  height: 8%;
  border-radius: 50%;
  background: #ff8f74;
  opacity: 0.62;
  filter: blur(0.4px);
}

.dcd-mascot-blush--left {
  left: 13%;
}

.dcd-mascot-blush--right {
  right: 13%;
}

.dcd-mascot-mouth {
  position: absolute;
  left: 50%;
  top: 59%;
  width: 10%;
  height: 8%;
  transform: translateX(-50%);
  border-bottom: 2px solid #5a3418;
  border-radius: 0 0 50% 50%;
}

.dcd-mascot[data-mood="error"] .dcd-mascot-mouth {
  top: 62%;
  border-bottom: 0;
  border-top: 2px solid #5a3418;
  border-radius: 50% 50% 0 0;
}

.dcd-mascot[data-mood="waiting"] .dcd-mascot-mouth {
  top: 58%;
  width: 9%;
  height: 9%;
  border: 2px solid #5a3418;
  border-radius: 50%;
  background: transparent;
}

.dcd-mascot-mark {
  position: absolute;
  right: -4%;
  bottom: -1%;
  width: 38%;
  height: 38%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #a25a16;
  background: #fffdf6;
  border: 2px solid #e8a24f;
  box-shadow:
    0 3px 9px rgba(150, 78, 24, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.dcd-mascot[data-mood="error"] .dcd-mascot-mark {
  color: #c04a2b;
  background: #fff8f2;
  border-color: #e89077;
}

.dcd-mascot[data-mood="waiting"] .dcd-mascot-mark {
  color: #a25a16;
  background: #fffdf6;
  border-color: #e8a24f;
  font-size: 13px;
}

.dcd-mascot-sparkle {
  position: absolute;
  z-index: 3;
  color: #fff1c9;
  font-size: 11px;
  line-height: 1;
  text-shadow: 0 0 8px #ffcf85;
  animation: dcd-twinkle 2.2s ease-in-out infinite;
}

.dcd-mascot-sparkle--left {
  left: -3%;
  top: 14%;
}

.dcd-mascot-sparkle--right {
  right: -2%;
  bottom: 18%;
  font-size: 9px;
  animation-delay: 0.7s;
}

.dcd-bubble {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 26%, transparent);
  background: color-mix(in srgb, var(--dcd-cream) 34%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 46%, transparent);
  opacity: 0.62;
  pointer-events: none;
  animation: dcd-float 3.6s ease-in-out infinite;
}

.dcd-bubble--one {
  width: 10px;
  height: 10px;
  top: 16px;
  right: 62px;
}

.dcd-bubble--two {
  width: 6px;
  height: 6px;
  top: 42px;
  right: 34px;
  animation-delay: 0.7s;
}

.dcd-bubble--three {
  width: 8px;
  height: 8px;
  right: 76px;
  bottom: 22px;
  animation-delay: 1.2s;
}

.dcd-toast-body {
  position: relative;
  z-index: 1;
  min-width: 0;
  flex: 1;
  padding-top: 1px;
}

.dcd-toast-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
}

.dcd-toast-eyebrow {
  font-size: 11px;
  line-height: 16px;
  font-weight: 760;
  letter-spacing: 0.085em;
  color: var(--dcd-accent-deep);
}

.dcd-toast-check {
  width: 17px;
  height: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--dcd-accent-deep);
  background: color-mix(in srgb, var(--dcd-cream) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 42%, transparent);
  box-shadow:
    inset 0 1px 0 var(--dcd-inner-highlight),
    0 1px 3px color-mix(in srgb, var(--dcd-accent) 18%, transparent);
}

.dcd-toast-task {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 15px;
  line-height: 22px;
  font-weight: 660;
  letter-spacing: 0.005em;
  color: var(--dcd-ink);
  overflow-wrap: anywhere;
}

.dcd-toast-error {
  margin-top: 7px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--dcd-coral) 34%, transparent);
  border-radius: 11px;
  color: var(--dcd-ink-soft);
  background: color-mix(in srgb, var(--dcd-coral) 11%, transparent);
  font-size: 11.5px;
  line-height: 17px;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.dcd-toast-detail {
  margin-top: 7px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 26%, transparent);
  border-radius: 11px;
  color: var(--dcd-ink-soft);
  background: color-mix(in srgb, var(--dcd-accent) 7%, transparent);
  font-size: 11.5px;
  line-height: 17px;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.dcd-toast-session {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  padding: 3px 9px;
  border-radius: 999px;
  color: var(--dcd-ink-soft);
  background: color-mix(in srgb, var(--dcd-cream) 52%, transparent);
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 18%, transparent);
}

.dcd-toast-actions {
  display: flex;
  margin-top: 9px;
}

.dcd-toast-answer {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 34px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  color: #fff8ec;
  background: linear-gradient(135deg, var(--dcd-accent-deep), var(--dcd-accent));
  box-shadow:
    0 5px 16px color-mix(in srgb, var(--dcd-accent) 28%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  font: inherit;
  font-size: 12.5px;
  font-weight: 720;
  line-height: 18px;
  cursor: pointer;
  transition: filter 140ms ease, transform 100ms ease;
}

.dcd-toast-answer:hover {
  filter: brightness(1.06) saturate(1.04);
  transform: translateY(-1px);
}

.dcd-toast-answer:active {
  transform: translateY(0);
}

body[data-ds-dark-theme] .dcd-toast-answer {
  color: #3a2412;
}

.dcd-toast-hint {
  color: var(--dcd-ink-soft);
  font-size: 11px;
  opacity: 0.9;
}

.dcd-toast-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 8px;
  margin-top: 7px;
  min-width: 0;
  color: var(--dcd-ink-soft);
  font-size: 11.5px;
  line-height: 17px;
}

.dcd-toast-workspace {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  padding: 3px 9px;
  border-radius: 999px;
  color: color-mix(in srgb, var(--dcd-accent-deep) 82%, var(--dcd-ink));
  background: color-mix(in srgb, var(--dcd-cream) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 30%, transparent);
}

.dcd-toast-workspace--action {
  appearance: none;
  -webkit-appearance: none;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
  transition: color 140ms ease, background 140ms ease, border-color 140ms ease;
}

.dcd-toast-workspace--action:hover {
  color: var(--dcd-accent-deep);
  background: color-mix(in srgb, var(--dcd-accent-soft) 26%, var(--dcd-cream));
  border-color: color-mix(in srgb, var(--dcd-accent) 40%, transparent);
}

.dcd-toast-workspace--action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dcd-accent) 66%, transparent);
  outline-offset: 2px;
}

.dcd-toast-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.55;
  transition: opacity 140ms ease, transform 140ms ease;
}

.dcd-toast-workspace--action:hover .dcd-toast-open {
  opacity: 1;
  transform: translate(1px, -1px);
}

.dcd-toast-path {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--dcd-ink-soft);
  opacity: 0.92;
}

.dcd-toast-ellipsis {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dcd-toast-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 10.5px;
  line-height: 16px;
  letter-spacing: 0.01em;
  color: var(--dcd-ink-soft);
  opacity: 1;
}

.dcd-toast-sep {
  opacity: 0.5;
}

.dcd-toast-close {
  position: absolute;
  z-index: 2;
  top: 11px;
  right: 11px;
  width: 27px;
  height: 27px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 18%, transparent);
  border-radius: 50%;
  color: var(--dcd-ink-soft);
  background: color-mix(in srgb, var(--dcd-cream) 52%, transparent);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease, transform 140ms ease;
}

.dcd-toast-close:hover {
  color: var(--dcd-accent-deep);
  background: color-mix(in srgb, var(--dcd-accent-soft) 26%, var(--dcd-cream));
  border-color: color-mix(in srgb, var(--dcd-accent) 22%, transparent);
  transform: rotate(8deg) scale(1.04);
}

.dcd-toast-close:focus-visible,
.dcd-toast-answer:focus-visible,
.dcd-switch:focus-visible,
.dcd-btn:focus-visible,
.dcd-select:focus-visible,
.dcd-range input:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dcd-accent) 64%, transparent);
  outline-offset: 2px;
}

.dcd-toast-progress {
  position: absolute;
  z-index: 1;
  left: 18px;
  right: 18px;
  bottom: 10px;
  height: 3px;
  border-radius: 999px;
  transform-origin: left center;
  background: linear-gradient(90deg, var(--dcd-accent-deep), var(--dcd-accent-soft));
  box-shadow: 0 0 8px color-mix(in srgb, var(--dcd-accent) 35%, transparent);
  opacity: 0.85;
  animation-name: dcd-toast-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

.dcd-toast--error .dcd-toast-progress {
  background: linear-gradient(90deg, var(--dcd-coral), var(--dcd-accent-soft));
  box-shadow: 0 0 8px color-mix(in srgb, var(--dcd-coral) 32%, transparent);
}

.dcd-panel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, #c1732c);
  opacity: 0.82;
}

.dcd-panel-icon[data-active="true"] {
  opacity: 1;
}

body[data-ds-dark-theme] .dcd-panel-icon {
  color: #ffc078;
}

.dcd-page {
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
  padding: 34px 32px 72px;
  color: var(--dsw-alias-label-primary);
  background-color: color-mix(in srgb, var(--dcd-cream) 48%, var(--dsw-alias-bg-base));
  background:
    radial-gradient(1000px 520px at 18% -8%, color-mix(in srgb, var(--dcd-amber) 20%, transparent), transparent 62%),
    radial-gradient(900px 500px at 100% 0%, color-mix(in srgb, var(--dcd-peach) 15%, transparent), transparent 58%),
    radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dcd-amber) 13%, transparent) 1.2px, transparent 1.3px),
    linear-gradient(180deg, color-mix(in srgb, var(--dcd-cream) 60%, var(--dsw-alias-bg-base)), var(--dsw-alias-bg-base));
  background-size: auto, auto, 22px 22px, auto;
  font-family: inherit;
}

.dcd-shell {
  width: min(780px, 100%);
  margin: 0 auto;
}

.dcd-hero {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 22px;
  padding-right: 44px;
}

.dcd-hero-mascot {
  width: 66px;
  height: 66px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--dcd-accent) 16%, transparent), transparent 68%);
}

.dcd-hero-copy {
  min-width: 0;
}

.dcd-hero-title {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 720;
  letter-spacing: 0.01em;
}

.dcd-hero-title::after {
  content: "✦";
  display: inline-block;
  margin-left: 7px;
  color: var(--dcd-accent);
  font-size: 13px;
  line-height: 1;
  vertical-align: 7px;
  opacity: 0.55;
  transform: rotate(12deg);
}

.dcd-hero-subtitle {
  max-width: 66ch;
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 21px;
  color: var(--dsw-alias-label-secondary);
}

.dcd-master {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
  padding: 18px 22px;
  overflow: hidden;
  border: 1.5px solid color-mix(in srgb, var(--dcd-accent) 30%, transparent);
  border-radius: 24px;
  background: var(--dsw-alias-bg-layer-1);
  background:
    radial-gradient(120% 120% at 8% 0%, color-mix(in srgb, var(--dcd-cream) 55%, transparent), transparent 50%),
    linear-gradient(135deg, color-mix(in srgb, var(--dcd-amber) 16%, transparent), color-mix(in srgb, var(--dsw-alias-bg-layer-1) 76%, transparent));
  box-shadow:
    0 16px 38px color-mix(in srgb, var(--dcd-accent-deep) 10%, transparent),
    inset 0 2px 0 color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent);
  -webkit-backdrop-filter: blur(18px) saturate(1.24);
  backdrop-filter: blur(18px) saturate(1.24);
}

.dcd-master::after {
  content: "✦";
  position: absolute;
  top: 13px;
  right: 20px;
  color: var(--dcd-accent);
  opacity: 0.2;
  font-size: 18px;
  line-height: 1;
  transform: rotate(12deg);
  pointer-events: none;
}

.dcd-master--off {
  border-color: color-mix(in srgb, var(--dsw-alias-border-l1) 70%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 76%, transparent);
  box-shadow:
    0 10px 26px color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent),
    inset 0 2px 0 color-mix(in srgb, var(--dsw-alias-bg-base) 48%, transparent);
}

.dcd-master--off::after {
  color: var(--dsw-alias-label-secondary);
  opacity: 0.1;
}

.dcd-master-copy {
  min-width: 0;
}

.dcd-master-title {
  font-size: 15px;
  line-height: 21px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary);
}

.dcd-master-desc {
  max-width: 58ch;
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}

.dcd-master-control {
  flex: none;
  display: flex;
  align-items: center;
  gap: 11px;
}

.dcd-master-state {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  line-height: 17px;
  font-weight: 650;
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 60%, transparent);
}

.dcd-master-state[data-on="true"] {
  color: var(--dcd-accent);
  background: color-mix(in srgb, var(--dcd-accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--dcd-accent) 26%, transparent);
}

.dcd-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
  margin-bottom: 20px;
}

.dcd-btn {
  height: 33px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 24%, transparent);
  border-radius: 999px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  background: color-mix(in srgb, var(--dcd-accent-soft) 12%, color-mix(in srgb, var(--dsw-alias-bg-layer-2) 78%, transparent));
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, transform 100ms ease, filter 140ms ease;
}

.dcd-btn:hover {
  background: color-mix(in srgb, var(--dcd-accent-soft) 18%, color-mix(in srgb, var(--dsw-alias-bg-layer-2) 78%, transparent));
  transform: translateY(-1px);
}

.dcd-btn:active {
  transform: translateY(1px);
}

.dcd-btn:disabled {
  opacity: 0.48;
  cursor: default;
  transform: none;
}

.dcd-btn-small {
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  font-size: 11.5px;
}

.dcd-btn-primary {
  color: var(--dsw-alias-bg-base);
  border-color: transparent;
  background: linear-gradient(135deg, var(--dcd-accent-deep), var(--dcd-accent));
  box-shadow:
    0 6px 18px color-mix(in srgb, var(--dcd-accent) 28%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-bg-base) 32%, transparent);
}

.dcd-btn-primary:hover {
  filter: brightness(1.06) saturate(1.05);
}

.dcd-btn-ghost {
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.dcd-btn-ghost:hover {
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
}

.dcd-saved {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  opacity: 0.8;
}

.dcd-card {
  position: relative;
  margin-bottom: 16px;
  padding: 22px 24px 9px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 24%, transparent);
  border-radius: 28px;
  background: var(--dsw-alias-bg-layer-1);
  background:
    radial-gradient(120% 100% at 8% 0%, color-mix(in srgb, var(--dcd-cream) 58%, transparent), transparent 52%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--dcd-cream) 46%, var(--dsw-alias-bg-layer-1)),
      color-mix(in srgb, var(--dcd-cream) 28%, var(--dsw-alias-bg-layer-1))
    );
  box-shadow:
    0 18px 48px color-mix(in srgb, var(--dcd-accent-deep) 8%, transparent),
    inset 0 2px 0 color-mix(in srgb, var(--dsw-alias-bg-base) 58%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--dcd-accent) 10%, transparent);
  -webkit-backdrop-filter: blur(20px) saturate(1.22);
  backdrop-filter: blur(20px) saturate(1.22);
}

.dcd-card::before {
  content: "✦";
  position: absolute;
  top: 12px;
  right: 18px;
  color: var(--dcd-accent);
  opacity: 0.16;
  font-size: 18px;
  line-height: 1;
  transform: rotate(12deg);
  pointer-events: none;
}

.dcd-card-head {
  margin-bottom: 4px;
}

.dcd-card-title {
  margin: 0;
  font-size: 15px;
  line-height: 21px;
  font-weight: 680;
}

.dcd-card-desc {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}

.dcd-rows {
  margin-top: 8px;
}

.dcd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  min-height: 58px;
  padding: 10px 0;
  border-top: 1px dashed color-mix(in srgb, var(--dcd-accent) 18%, transparent);
}

.dcd-row-text {
  min-width: 0;
}

.dcd-row-title {
  font-size: 13px;
  line-height: 19px;
  font-weight: 560;
}

.dcd-row-desc {
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 17px;
  color: var(--dsw-alias-label-secondary);
}

.dcd-row-control {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.dcd-select {
  height: 34px;
  min-width: 196px;
  max-width: 100%;
  padding: 0 11px;
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 24%, transparent);
  border-radius: 14px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  background: color-mix(in srgb, var(--dcd-accent-soft) 10%, color-mix(in srgb, var(--dsw-alias-bg-layer-2) 78%, transparent));
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}

.dcd-select:disabled {
  opacity: 0.48;
  cursor: default;
}

.dcd-file {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.dcd-file-input {
  display: none;
}

.dcd-file-name {
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  line-height: 17px;
  color: var(--dsw-alias-label-secondary);
}

.dcd-error {
  margin: 0 0 9px;
  padding: 8px 11px;
  border: 1px solid color-mix(in srgb, var(--dcd-coral) 32%, transparent);
  border-radius: 10px;
  color: var(--dcd-coral);
  background: color-mix(in srgb, var(--dcd-coral) 9%, transparent);
  font-size: 11.5px;
  line-height: 17px;
}

.dcd-switch {
  position: relative;
  width: 42px;
  height: 24px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 80%, transparent);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.dcd-switch[data-on="true"] {
  border-color: transparent;
  background: linear-gradient(135deg, var(--dcd-accent-deep), var(--dcd-accent));
  box-shadow:
    0 4px 14px color-mix(in srgb, var(--dcd-accent) 26%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);
}

.dcd-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);
  transition: transform 160ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.dcd-switch[data-on="true"] .dcd-switch-knob {
  transform: translateX(18px);
}

.dcd-range {
  width: 250px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dcd-range[data-disabled="true"] {
  opacity: 0.48;
}

.dcd-range input[type="range"] {
  flex: 1;
  width: 100%;
  height: 4px;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dcd-accent) 16%, transparent);
  cursor: pointer;
}

.dcd-range input[type="range"]::-webkit-slider-thumb {
  width: 15px;
  height: 15px;
  appearance: none;
  -webkit-appearance: none;
  border: 2px solid var(--dsw-alias-bg-layer-1);
  border-radius: 50%;
  background: var(--dcd-accent-deep);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);
}

.dcd-range input[type="range"]::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border: 2px solid var(--dsw-alias-bg-layer-1);
  border-radius: 50%;
  background: var(--dcd-accent-deep);
}

.dcd-range input[type="range"]:disabled {
  cursor: default;
}

.dcd-range-value {
  min-width: 58px;
  text-align: right;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}

.dcd-note {
  margin: 18px 2px 0;
  font-size: 11.5px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  opacity: 0.82;
}

.dcd-uninstall-icon {
  position: absolute;
  top: 0;
  right: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--dcd-ink-soft);
  background: transparent;
  cursor: pointer;
  opacity: 0.72;
  transition: color 140ms ease, background 140ms ease, border-color 140ms ease, opacity 140ms ease;
}

.dcd-uninstall-icon:hover {
  color: var(--dcd-coral);
  background: color-mix(in srgb, var(--dcd-coral) 9%, transparent);
  border-color: color-mix(in srgb, var(--dcd-coral) 26%, transparent);
  opacity: 1;
}

.dcd-uninstall-icon:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dcd-coral) 58%, transparent);
  outline-offset: 2px;
}

.dcd-uninstall-mask {
  position: fixed;
  inset: 0;
  z-index: 2147483200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, #2b1a10 42%, transparent);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.dcd-uninstall-dialog {
  width: min(420px, 100%);
  box-sizing: border-box;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--dcd-coral) 34%, transparent);
  border-radius: 22px;
  background: linear-gradient(155deg, var(--dcd-cream), var(--dcd-cream-deep));
  box-shadow:
    0 30px 80px rgba(60, 25, 8, 0.42),
    inset 0 1px 0 var(--dcd-inner-highlight);
  color: var(--dcd-ink);
}

.dcd-uninstall-dialog-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dcd-uninstall-dialog-icon {
  width: 36px;
  height: 36px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--dcd-coral);
  background: color-mix(in srgb, var(--dcd-coral) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--dcd-coral) 26%, transparent);
}

.dcd-uninstall-dialog-copy {
  min-width: 0;
}

.dcd-uninstall-dialog-title {
  font-size: 15px;
  line-height: 21px;
  font-weight: 720;
  color: var(--dcd-ink);
}

.dcd-uninstall-dialog-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dcd-ink-soft);
}

.dcd-btn-danger {
  color: #fff8ec;
  border-color: transparent;
  background: linear-gradient(135deg, #a63f24, var(--dcd-coral));
  box-shadow:
    0 6px 18px color-mix(in srgb, var(--dcd-coral) 28%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.dcd-btn-danger:hover {
  filter: brightness(1.05) saturate(1.03);
}

.dcd-btn-danger:disabled {
  opacity: 0.55;
  filter: none;
  transform: none;
}

.dcd-confirm-note {
  margin-top: 12px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dcd-ink-soft);
}

.dcd-confirm-note[data-tone="done"] {
  color: color-mix(in srgb, var(--dcd-amber-deep) 76%, var(--dcd-ink));
}

.dcd-confirm-note[data-tone="error"] {
  color: var(--dcd-coral);
}

.dcd-confirm-error {
  margin-top: 12px;
  max-height: 120px;
  overflow: auto;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--dcd-coral) 32%, transparent);
  border-radius: 10px;
  color: var(--dcd-coral);
  background: color-mix(in srgb, var(--dcd-coral) 8%, transparent);
  font-size: 11.5px;
  line-height: 17px;
  overflow-wrap: anywhere;
}

.dcd-confirm-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

@keyframes dcd-wait-pulse {
  0%, 100% {
    box-shadow:
      inset 0 1px 0 var(--dcd-inner-highlight),
      0 0 0 0 color-mix(in srgb, var(--dcd-amber) 26%, transparent);
  }
  50% {
    box-shadow:
      inset 0 1px 0 var(--dcd-inner-highlight),
      0 0 0 5px color-mix(in srgb, var(--dcd-amber) 0%, transparent);
  }
}

@keyframes dcd-jelly-in {
  0% {
    opacity: 0;
    transform: translate3d(18px, 14px, 0) scale(0.86);
  }
  55% {
    opacity: 1;
    transform: translate3d(-2px, -2px, 0) scale(1.035);
  }
  78% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(0.986);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes dcd-toast-out {
  from {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    opacity: 0;
    transform: translate3d(8px, 7px, 0) scale(0.92);
  }
}

@keyframes dcd-toast-progress {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

@keyframes dcd-bob {
  0%, 100% {
    transform: translateY(0) rotate(-1deg);
  }
  50% {
    transform: translateY(-3px) rotate(1.5deg);
  }
}

@keyframes dcd-twinkle {
  0%, 100% {
    opacity: 0.35;
    transform: scale(0.8) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.15) rotate(18deg);
  }
}

@keyframes dcd-float {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.35;
  }
  50% {
    transform: translateY(-5px) scale(1.08);
    opacity: 0.7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dcd-toast,
  .dcd-toast--out {
    animation-duration: 1ms;
  }

  .dcd-mascot-body,
  .dcd-mascot-sparkle,
  .dcd-bubble,
  .dcd-toast--waiting .dcd-toast-check {
    animation: none;
  }

  .dcd-mascot-eye {
    transform: none;
    transition: none;
    will-change: auto;
  }
}

@media (max-width: 680px) {
  .dcd-page {
    padding: 22px 16px 56px;
  }

  .dcd-master {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .dcd-master-control {
    justify-content: space-between;
  }

  .dcd-row {
    flex-direction: column;
    align-items: stretch;
    gap: 9px;
  }

  .dcd-row-control {
    justify-content: flex-start;
  }

  .dcd-range {
    width: 100%;
  }

  .dcd-select {
    width: 100%;
  }

  .dcd-file {
    justify-content: flex-start;
  }

  .dcd-file-name {
    max-width: 100%;
  }

  .dcd-saved {
    margin-left: 0;
    flex-basis: 100%;
  }

  .dcd-toast-root {
    padding:
      max(14px, env(safe-area-inset-top))
      max(14px, env(safe-area-inset-right))
      max(14px, env(safe-area-inset-bottom))
      max(14px, env(safe-area-inset-left));
  }

  .dcd-toast {
    border-radius: 22px;
    padding: 16px 40px 18px 14px;
    gap: 11px;
  }

  .dcd-toast-mascot {
    width: 50px;
    height: 50px;
  }

  .dcd-toast-mascot .dcd-mascot {
    transform: scale(0.86);
    transform-origin: center;
  }

  .dcd-toast-task {
    font-size: 14.5px;
    line-height: 21px;
  }

  .dcd-toast-error {
    -webkit-line-clamp: 2;
  }

  .dcd-toast-detail {
    -webkit-line-clamp: 2;
  }

  .dcd-toast-progress {
    left: 14px;
    right: 14px;
  }
}

@media (max-width: 400px) {
  .dcd-toast-root {
    padding:
      max(10px, env(safe-area-inset-top))
      max(10px, env(safe-area-inset-right))
      max(10px, env(safe-area-inset-bottom))
      max(10px, env(safe-area-inset-left));
  }

  .dcd-toast {
    border-radius: 20px;
    padding: 14px 36px 16px 12px;
    gap: 8px;
  }

  .dcd-toast-mascot {
    width: 42px;
    height: 42px;
  }

  .dcd-toast-mascot .dcd-mascot {
    transform: scale(0.72);
  }

  .dcd-toast-task {
    font-size: 13.5px;
    line-height: 19px;
    -webkit-line-clamp: 2;
  }

  .dcd-bubble {
    display: none;
  }

  .dcd-toast-progress {
    left: 12px;
    right: 12px;
    bottom: 9px;
  }
}

@media (max-height: 560px) {
  .dcd-toast-root {
    padding:
      max(10px, env(safe-area-inset-top))
      max(12px, env(safe-area-inset-right))
      max(10px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
  }

  .dcd-toast {
    padding: 13px 36px 15px 12px;
    border-radius: 20px;
  }

  .dcd-toast-mascot {
    width: 44px;
    height: 44px;
  }

  .dcd-toast-mascot .dcd-mascot {
    transform: scale(0.75);
  }

  .dcd-toast-task {
    font-size: 13.5px;
    line-height: 19px;
    -webkit-line-clamp: 1;
  }

  .dcd-toast-error {
    -webkit-line-clamp: 2;
    margin-top: 5px;
    padding: 5px 8px;
  }

  .dcd-toast-detail {
    -webkit-line-clamp: 2;
    margin-top: 5px;
    padding: 5px 8px;
  }

  .dcd-toast-meta,
  .dcd-toast-foot {
    margin-top: 5px;
  }

  .dcd-bubble {
    display: none;
  }
}
`;

    function insertStyles(css) {
      for (const previous of globalThis.document.querySelectorAll('style[data-plugin-css="dsh-completed-ding"]')) {
        previous.remove();
      }
      const tag = globalThis.document.createElement('style');
      tag.dataset.plugin = 'dsh-completed-ding';
      tag.dataset.pluginCss = 'dsh-completed-ding';
      tag.textContent = css;
      globalThis.document.head.append(tag);
      return () => {
        if (tag.isConnected) tag.remove();
      };
    }

    const inject = ['slots', 'sessions', 'workspaces', 'locale', 'remote', 'remote.session', 'remote.pluginManager'];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'completed-ding: dictionaries');
      const t = ctx.locale.bind(NS);

      ctx.effect(() => insertStyles(CSS), 'completed-ding: styles');

      ctx.effect(() => {
        const unlock = () => {
          const context = ensureAudioContext();
          if (context && context.state === 'suspended') context.resume().catch(() => {});
        };
        globalThis.addEventListener('pointerdown', unlock, { capture: true, once: true, passive: true });
        globalThis.addEventListener('keydown', unlock, { capture: true, once: true });
        return () => {
          globalThis.removeEventListener('pointerdown', unlock, { capture: true });
          globalThis.removeEventListener('keydown', unlock, { capture: true });
        };
      }, 'completed-ding: audio unlock');

      const sessions = ctx.get('sessions');
      const workspaces = ctx.get('workspaces');
      const remote = ctx.remote;
      runtime.remote = remote;
      runtime.openPluginManager = () => {
        try {
          const navigation = ctx.get('pluginNavigation');
          if (navigation && typeof navigation.openBundle === 'function') {
            navigation.openBundle('dsh-completed-ding');
            return true;
          }
        } catch {
          /* The manager is optional; the settings page explains the manual path. */
        }
        return false;
      };
      const sessionRemote = ctx.remote && ctx.remote.session
        ? ctx.remote.session
        : ctx.get('remote.session');
      /* Optional: lets a waiting card jump straight to the session that needs an answer. */
      let uiWorkspace = null;
      try {
        uiWorkspace = ctx.get('uiWorkspace') || null;
      } catch {
        uiWorkspace = null;
      }

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'completed-ding.toast',
        order: 80,
        locale: NS,
        inject: () => ({ sessions, workspaces, sessionRemote, remote, uiWorkspace }),
      }, ToastLayer));

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 30,
        locale: NS,
        label: () => t('panel.label'),
      }, PanelIcon));

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      }, SettingsPage));

      ctx.effect(() => {
        const notify = () => {
          for (const listener of [...settingsListeners]) {
            try {
              listener();
            } catch {
              /* ignore */
            }
          }
        };
        const onStorage = (event) => {
          if (event.key === CUSTOM_SOUND_KEY) {
            customSound = undefined;
            settings = { ...settings };
            notify();
            return;
          }
          if (event.key !== SETTINGS_KEY) return;
          settings = readStoredSettings();
          notify();
        };
        globalThis.addEventListener('storage', onStorage);
        return () => {
          globalThis.removeEventListener('storage', onStorage);
          stopSound();
          if (audioContext) {
            try {
              audioContext.close();
            } catch {
              /* already closed */
            }
            audioContext = null;
          }
        };
      }, 'completed-ding: storage and audio lifecycle');
    }

    return { inject, apply };
  },
});
