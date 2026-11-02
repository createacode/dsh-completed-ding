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
    const PLUGIN_VERSION = '1.5.4';
    const UPDATE_ROUTE = '/completed-ding/update';
    const FOREGROUND_ROUTE = '/completed-ding/foreground';
    const UPDATE_REPO_URL = 'https://gitee.com/user_gitee/dsh-completed-ding';
    const UPDATE_CHECK_KEY = 'dsh-completed-ding.update-check.v1';
    const AUTO_CHECK_INTERVAL_MS = 60 * 60 * 1000;
    const DAILY_CHECK_MS = 24 * 60 * 60 * 1000;
    const SETTINGS_KEY = 'dsh-completed-ding.settings.v2';
    const LEGACY_SETTINGS_KEY = 'dsh-completed-ding.settings.v1';
    const CUSTOM_SOUND_KEY = 'dsh-completed-ding.sound.v1';
    const MAX_CUSTOM_SOUND_BYTES = 2 * 1024 * 1024;
    const EXIT_MS = 180;
    const EMPTY_STATUS = new Map();
    const CHIME_KINDS = ['chime', 'chime-bright', 'chime-soft', 'chime-wood', 'chime-drop', 'chime-dingdong'];
    const SOUND_KINDS = [...CHIME_KINDS, 'voice', 'voice-elegant', 'custom'];
    const CHIME_PRESETS = Object.freeze({
      chime: Object.freeze({
        gain: 0.115,
        filter: 3600,
        wave: 'sine',
        notes: [
          { frequency: 783.99, delay: 0 },
          { frequency: 1046.5, delay: 0.095 },
          { frequency: 1567.98, delay: 0.19 },
        ],
        decay: 0.42,
        release: 0.45,
        cleanup: 900,
      }),
      'chime-bright': Object.freeze({
        gain: 0.105,
        filter: 5200,
        wave: 'sine',
        notes: [
          { frequency: 1046.5, delay: 0 },
          { frequency: 1318.51, delay: 0.07 },
          { frequency: 1567.98, delay: 0.14 },
        ],
        decay: 0.3,
        release: 0.34,
        cleanup: 700,
      }),
      'chime-soft': Object.freeze({
        gain: 0.12,
        filter: 2600,
        wave: 'sine',
        notes: [
          { frequency: 659.25, delay: 0 },
          { frequency: 987.77, delay: 0.11 },
          { frequency: 1318.51, delay: 0.22 },
        ],
        decay: 0.5,
        release: 0.55,
        cleanup: 1000,
      }),
      'chime-wood': Object.freeze({
        gain: 0.13,
        filter: 1900,
        wave: 'triangle',
        notes: [
          { frequency: 520, delay: 0 },
          { frequency: 780, delay: 0.045 },
        ],
        decay: 0.17,
        release: 0.22,
        cleanup: 520,
      }),
      'chime-drop': Object.freeze({
        gain: 0.12,
        filter: 4200,
        wave: 'sine',
        notes: [
          { frequency: 1180, endFrequency: 620, glide: 0.16, delay: 0 },
        ],
        decay: 0.24,
        release: 0.3,
        cleanup: 600,
      }),
      'chime-dingdong': Object.freeze({
        gain: 0.11,
        filter: 3200,
        wave: 'sine',
        notes: [
          { frequency: 880, delay: 0 },
          { frequency: 660, delay: 0.18 },
        ],
        decay: 0.46,
        release: 0.5,
        cleanup: 850,
      }),
    });
    /* Filled by apply(): the settings page can reach the manager without a slot prop. */
    const runtime = {
      remote: null,
      openPluginManager: () => false,
    };
    const floatingState = {
      window: null,
      host: null,
      autoReset: true,
      listeners: new Set(),
    };
    const subscribeFloating = (listener) => {
      floatingState.listeners.add(listener);
      return () => floatingState.listeners.delete(listener);
    };
    const notifyFloating = () => {
      for (const listener of floatingState.listeners) {
        try {
          listener();
        } catch {
          /* A disposed component should not break the window owner. */
        }
      }
    };
    let translate = (key) => key;
    const updatePromptState = {
      value: {
        visible: false,
        status: 'idle',
        version: '',
        message: '',
      },
      listeners: new Set(),
    };
    const setUpdatePrompt = (patch) => {
      updatePromptState.value = { ...updatePromptState.value, ...patch };
      for (const listener of [...updatePromptState.listeners]) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    };
    const subscribeUpdatePrompt = (listener) => {
      updatePromptState.listeners.add(listener);
      return () => updatePromptState.listeners.delete(listener);
    };
    const useUpdatePrompt = () => {
      const [value, setValue] = React.useState(updatePromptState.value);
      React.useEffect(() => subscribeUpdatePrompt(() => setValue(updatePromptState.value)), []);
      return value;
    };
    const updateErrorText = (error) => {
      return error instanceof Error ? error.message : String(error);
    };
    const readLastUpdateCheck = () => {
      try {
        const raw = globalThis.localStorage && globalThis.localStorage.getItem(UPDATE_CHECK_KEY);
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? value : 0;
      } catch {
        return 0;
      }
    };
    const writeLastUpdateCheck = () => {
      try {
        if (globalThis.localStorage) {
          globalThis.localStorage.setItem(UPDATE_CHECK_KEY, String(Date.now()));
        }
      } catch {
        /* storage is optional */
      }
    };
    let autoUpdateBusy = false;

    async function callUpdate(action, extra = {}) {
      const response = await globalThis.fetch(UPDATE_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload && payload.error ? payload.error : `HTTP ${response.status}`);
      }
      if (!payload || payload.ok !== true) {
        throw new Error(payload && payload.error ? payload.error : 'unknown update error');
      }
      return payload;
    }

    function notifyWindowsUpdate(version) {
      if (typeof globalThis.Notification !== 'function'
        || globalThis.Notification.permission !== 'granted') return;
      const show = () => {
        try {
          const notification = new globalThis.Notification(
            translate('autoUpdate.windowsTitle', { version }),
            {
              body: translate('autoUpdate.windowsBody'),
              silent: true,
              tag: 'dsh-completed-ding-update',
              requireInteraction: false,
            },
          );
          notification.onclick = () => {
            try {
              globalThis.focus();
            } catch {
              /* best-effort */
            }
            try {
              notification.close();
            } catch {
              /* already closed */
            }
          };
        } catch {
          /* The OS may reject notifications. */
        }
      };
      if (getSettings().suppressWindowsFullscreen) {
        windowsForegroundFullscreen().then((fullscreen) => {
          if (!fullscreen) show();
        });
      } else {
        show();
      }
    }

    function promptForUpdate(version) {
      setUpdatePrompt({
        visible: true,
        status: 'available',
        version,
        message: translate('autoUpdate.available', { version }),
      });
      if (!dshIsForeground() && getSettings().deliveryMode !== 'inApp') {
        notifyWindowsUpdate(version);
      }
    }

    async function applyAutoUpdate(version) {
      if (autoUpdateBusy) return;
      autoUpdateBusy = true;
      setUpdatePrompt({
        visible: true,
        status: 'updating',
        version,
        message: translate('autoUpdate.updating', { version }),
      });
      try {
        const result = await callUpdate('apply', { version });
        if (result.applied === false) {
          setUpdatePrompt({ visible: false, status: 'idle', message: '' });
          return;
        }
        const currentVersion = result.currentVersion || result.latestVersion || version;
        if (result.restartRequired) {
          setUpdatePrompt({
            visible: true,
            status: 'restart',
            version: currentVersion,
            message: translate('autoUpdate.restart', { version: currentVersion }),
          });
          return;
        }
        setUpdatePrompt({
          visible: true,
          status: 'done',
          version: currentVersion,
          message: translate('autoUpdate.done', { version: currentVersion }),
        });
        globalThis.setTimeout(() => {
          if (globalThis.location) globalThis.location.reload();
        }, 1600);
      } catch (error) {
        setUpdatePrompt({
          visible: true,
          status: 'error',
          version,
          message: translate('autoUpdate.failed', { reason: truncate(updateErrorText(error), 180) }),
        });
      } finally {
        autoUpdateBusy = false;
      }
    }

    async function checkDailyUpdate() {
      if (autoUpdateBusy) return;
      const settings = getSettings();
      if (settings.autoUpdateMode !== 'prompt' && settings.autoUpdateMode !== 'install') return;
      if (Date.now() - readLastUpdateCheck() < DAILY_CHECK_MS) return;
      autoUpdateBusy = true;
      try {
        const result = await callUpdate('check');
        writeLastUpdateCheck();
        if (!result.available) return;
        if (settings.autoUpdateMode === 'install') {
          autoUpdateBusy = false;
          await applyAutoUpdate(result.latestVersion);
          return;
        }
        promptForUpdate(result.latestVersion);
      } catch {
        /* Retry on the next hourly tick; do not mark the day as checked. */
      } finally {
        autoUpdateBusy = false;
      }
    }

    function startAutoUpdate() {
      let lastMode = getSettings().autoUpdateMode;
      const tick = () => {
        void checkDailyUpdate();
      };
      const timer = globalThis.setInterval(tick, AUTO_CHECK_INTERVAL_MS);
      const unsubscribe = subscribeSettings(() => {
        const mode = getSettings().autoUpdateMode;
        if (mode === lastMode) return;
        lastMode = mode;
        void checkDailyUpdate();
      });
      tick();
      return () => {
        globalThis.clearInterval(timer);
        unsubscribe();
      };
    }
    let foregroundCache = { at: 0, value: false };

    function dshIsForeground() {
      const doc = globalThis.document;
      if (!doc) return true;
      if (doc.visibilityState === 'hidden') return false;
      if (typeof doc.hasFocus === 'function') return doc.hasFocus();
      return true;
    }

    async function windowsForegroundFullscreen() {
      const now = Date.now();
      if (now - foregroundCache.at < 1200) return foregroundCache.value;
      let value = false;
      try {
        const response = await globalThis.fetch(FOREGROUND_ROUTE, {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (response.ok) {
          const payload = await response.json();
          value = payload && payload.ok === true && payload.fullscreen === true;
        }
      } catch {
        /* The host may be unavailable; do not suppress by default. */
      }
      foregroundCache = { at: now, value };
      return value;
    }
    const BUILTIN_VOICE_DATA_URL = 'data:audio/mpeg;base64,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';
    const BUILTIN_VOICE_ELEGANT_DATA_URL = 'data:audio/mpeg;base64,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9t+9zDDjjhpGjzdL6kPF//NkxNIkAuKtnpvLLETUgo5D2yWajNb+VTKbbtrU1T////0Y12KVKO5ikEQ6lQgf///coCCIwLuBA92eHVAVEApGiedeyTSQe77eJ6SbOYERBybfv4stmvPibfWLVSGP5cdCedjKGsJZUpJ3mec9w+L9jG6R8On/+5K7raEoxml5yIVVQRlaKUjHEqAQy6vV//NkxMUc8tK6XMGK0j9SmmVmX5G3RP///nfXv6oqPuinVF6P/////+NHnEwAOBC/t/QlAHnrbZuSFUQM/Igg7YlYQE+FeomoT34nRKWpHIAXl9KWQgbjFwqIVIh8w5ZRZTWoECjE6nf/+7w8xAhQ44VwhS58iOFr55aPCM4rViy//N//30X/dP9eqkNlW/pV//NkxNQds6azHsDLMJaPqk//////+R2B0USIy4NCmhByzspVAAG99uAQAD8qoycR3zz6CFMB3NMfh00urfJelVIu0Km8g8AcNKsmz1vMZ7QooRbZf68Y61JJK/ymZ//AgMa3MjDMyBCtMugXh3bn8aw6u73OoKKAqjxw9GGOX/op28jl/v/S+ZvLXu6sVDGX//NkxOAc0662fnjFGPM+n8r/////5iiczHjHqg8gcKIIJnFo4kkhQhRVCbGAuJFQBCgNXcU7B7VXkgjgmSBQwsxR0mD48et2YAcYs41rVSWt24T/WAGnWuZ/923HX1zzZLx7aZyzGlkzO0vHllpeAgEEJFGOMDLtUuahlQ0tVQBMUylZ0/8xmbzGM/6t///9//NkxO8is9qeVspK3K6OQyK6t1K4lBSPr///YsNIlQbEQFkZpjOIkkkKgBmBEGYsCm+NCIuNfAF+MZEdubEJricVTRGKl9utLqutLCvefmVRBhkscJwVFnJqG5NNpOqHmoo1xNece2Iez3Wr57RNWWgCcdexsX+64uW1FzK05QJlSaXKk01tY8us1n/687av//NkxOcgGt6dttME1vo3////dHzCXIYGNioop///9UXlWiIGwZEjEREDMZAZmbRVACBppKRwHmFIIVQSPf2SGGml+1eJgyRKO/cirtOQnLoDIh6F1KPM9d3fQPWhruJ3K7EFkMx0Mram7OgpHU/+pvwtSKKCOwVkcUazEf5m1bf9f////0MUsqzhV6uMMf////NkxOkiCraJntrFGE/9JZ6RCpoO4i54Ue4gJQIhKcarkKpb8QLhi+di8kfw8gYOuvuDjZgCwGOPiqZPVTeMchkt4vmFVZRCKSbt5fm5Fjl2xzjMINBRvSU0j+369OkhFXNDIBA4EJ/rsQQAPhHFDioGM2Upbcqf///9/z1d3vpTclnRCQh3IjIIU6kXz99P//NkxOMbws6NntMEqv/+r//kZOR9W0dC1U+hJjlIvVDlKkUqFCZlsn+rXcahVCpkTeoLNKYS5kLmjiAwhMoBK8Bo9n7yRBSgWCkxBHYkGmNOGuCGOMGSOG+oGwHF+CwBEPVUyGIZWRARkNXDgXxU9IEoPGdcIYl9Q1uBdzbFZGgMZ12j0YF24nWdZ3D0sRfF//NkxPcijDaNntDFNpWqQ7VkhL6qewy/ljOlNvNByAZx0nm0KZ5AVE8keZIJRFpeJDmadt7zM9M0o3/ZZYWBIcYHxmBf/vObdhxew7LdG/ILhUoX2y3brWYZfYEg8bjEg1AWFa9OT7JzQln5PB8AV/Wc6nFyxxbvu/5JNRAGbRlbR/6YcFK4JNTKGi3FO2Zp//NkxO82mwapHtPZGklegGYm/gEpbM/jhmvCLGydxgvCpq+EULrJCmACr1RcHUEUShJhRB2jYXOCgARJEbqe8CSa+LIqYj4wFCzNadMaeGxkvhduBuZbnEkCkkXANykOZq8K17fP38+lKw6Xu/P5QPG+fV2OHv+Hmm/9Yz70xven9rwIReI8BOIoo3I/0kaO//NkxJcyexag/svTVhCoLqZkmJzI0RIgTXJ5h94IKMMPQeTCyFZlRhAOI2xWmTrJJzLicr+1MUWxbOiQos2fLINAH++tu9/KwrRzscYq80TUPWdfvTavr+sV6We12FZ999ea+I41q7IoCl0qSrKRV3+QhwixcDQwX4miWSlP7+3eqTFK+bGr97HdtnZmZ8nR//NkxFAlS97FlssFShrBi3DFdd6dv//VTEAinElUgJFIxDM87EM5CByDKdGQDEUc06kK+rnKDOcwMMrkpta1H/r1qpl//30q6KQ6GEFmt9QXA1UgKKQCS/61/7lQCO1kqmG7kZoGR6pgl4RiLzMGziGwiuvLUIt/OTqS572QjnsqPZiwXP9Ze/Yh8jNcmKIr//NkxD0gnCK+PnpE7YIfTqC7f3wwpVVrMrlc71X//LKv2PMwM7ILVTGRkUqqUrGR29rJ9adSsU3//9f9//4HFhBFQiEOQyyYJ1Fqx3WHEBFga0pTCti27HG/1VKgk8Yp9xTmam2TtrhuIuTzlZlVMjB0I6w4Vs0Wa4U3ywh7W5SCHKVGzLQ/CjVCs5ZsgFVR//NkxD0c8u7FnsIEzim3bl5TGfKxkM7FSb//sj+bVkfR1YrZ/y2190NKzGB1M9wbs3/9/5cAgWKFVPpC7Q2VDaRQ8IoQ0AVNjbju6YGVHbsqk3yXGYwsGHgbDUvQD4JhhmnS+5kUHOGCyrx1TViEC/SilgoWoVFalf4KsSe3tbNf//3HdxERVlScsC1pDHEw//NkxEwccXKI+tvQbGhEDLmCU6CrE//bEqaC3K6ga0YiDpZ4lEvqV//qsv3kd4dUa9R6GCbsntklmq+gNJTCLIxIIQsmAwqFl6vMy1JHmWbIYTzb6sMnPdV1S0AhZKJCiKokExxYQCFUSRmpbOXHF/szHfyR4GUEOSBVKwmdQ8LkEEjYHYS/JdDaTsVUacVq//NkxF0dUU6If1sYAH+28rBUJjSPs/8s+eUWKqfnr0PAKGsEpqopSOWSSyaTR5GsiIRhK8SwxocWgBeJmdkTRmmkQTuL2T7oFKlkLGgU0YEDDXlDTqZncLMM67OLG2D1OXdsDF308iPPxWO3ZpD+d21qBAqZavuTg0HSOQtFowfL/wok+o8OG/2o4URWd8zP//NkxGo1XCq+X5l4AxXJlgzHrnMu/0MQguc9M37xqdQnK0H53/////+nHV2N/iBqn8fEV1eBIyVvi2////////4ceeBRnj7ve9KUvuZgds8jyR81vOz9XvZ////////////j////Wf////76ve0jhuvzp5fMkeg7VUKJAuo5XVa6aPfj+v/////htMtj6g7c//NkxBcic7K4ocJYAcyaNdMcUVkI4ytklBa8tA48YEEGI6yhsjvIhGB2LwAwd06HjeX2Vl8Q/f91ml584gifo8aGlcMZMMN3MzfQKz1DsTUmSWdUNDSe27b5N3Mm7YzYyWZoxjK3fXc//7K/////4630/YyofFcn/nAwz+AL6lW8xYlme5cAAT0uXz9kIT2T//NkxBAdGqbfHGGGnJn3z7MZbN6Obar4r9rTS0ouDD0YEOkxnr/JucxuM3HfUt/b26xDM0PKqUuTxSgkCo5M91n5///+tNnKS0urWtjJmR/2zv2e349AoqwJPDYYKgvJPz3+t9ZOGkpHCJdixM0lbJ1KV4ZYllzgB138JW7UNWqlUazG4W0eRIVVJ5ygNMen//NkxB4bUVLG8nmEuKccyJm60HpV8B7pjyEqvUIOOxBOJ7S9OrOi2RDjeFc8qNYZEoMiUFBC419an6s6weIzwSKsiJljIVniqlu8N9fXWt3suHPAq3EjMcsq74aq5zIMbCAAbPSNBJWWMOBOt0d5a8aNLfUasJUAESFGJFH4bjwfSC3O//+l0BEiJL9RarMu//NkxDMcq8K6TnmE1DY+zju6847kVUUMzbXRC3NRjGdsu1+3+qzS2rV5fmL9W/0TpTv2Tdruy7f/////qzrayDKOoUizwaPCU2T5DI1ntocAoEzvajYx2oT4N6kOVWA45fpJlt6zMFSjx6KOOJGY2NHBUcaYUUeenJTH2lbGGzKJESU2afbkpi0LBGkKCwlC//NkxEMb4TqyLsGGzAsGQs2JZ5zjaF33/obiJj/kbvIlkIUbpIpCYFV///zw0NgqCEK1g+DBwXl+lUBwEgQKICZffqAIlDetBYRyaWdThfdbTvQ9DZcNtuR5pAZZZUPAiqhaMSrwZVsvLXkY+ffohWbv70/Rr0udUMzIVNfYzwA6N9/79vb5d//e1V/+m+v1//NkxFYcdAa2NsJEzCI1SsUq3Kv///////cisxjI5YSoMADja8Wdyy0AYCx+K/66iiMtJdlIc4HCeRYMVS7v7FSwjl6ut/+wWlSYrJapSOeiRpCQHgG50VuZwgQx8ofRZYWv+Z0uYXBusZ2u/64x0Nao5r//d5WkAfY0DEi5pYTX4NVuWRv/0jnzgbkCAftY//NkxGcbsZqx9MJG0A6CSBKH4t5xAFACDgSQ/6VlQ+nB/7JsUc2uryDBItMZhRN52d6doovmpE6khl41vEfX67WfzOWosVdmJm1ELpby19ELRpn9uk0IndiOqq3NaW9Df/////+rGrdrbTf+yI63tv1MV3u5qtdv///XfvbrRmfxp1ozNHLktKoCAUgWDQAJ//NkxHscy/aqNMvKtLEELT+Kfwjx5K4lHIAkUgmZpEBAnN4PWrVTU6iQiDTbg9wq4p/FZl0KgN2VMDFy8lG62X3W6/q+Lrt18UccYm0+fq6Rd6tOLuLO7//taGGEyayS/vA1OFXjnghIqOnEf/+AlAUliIWoDSSpmgBSm+hqFKyD+NYcGGkpcnrHAL8eRnxs//NkxIocoXqhtjYWGB3vqDKmnWaBZKZ38ji/u3nrVUi2OYjcCI1xwNZUCzllAePOhR5T1fTL/lWrIgTRKi3J0MtVSa3////7JR1Iz5XEnd7jzuqsAsOKPFgRct//0wE6WLJQWQXOtUZqAhVoDqlqANrHrDBMa9ltpACWrXzWAEk0n48Odo0xEwHkrYRZD+h9//NkxJockl6qXsHLCEpJf5StgT4E9hIEUSgbZu0yO6A2fTfdJnQoEcKwViWkigQlhhUyb/+qtYs8GR4C1hIXGu9qAZbvUe//6pE6KBNWKiUoOHBd3ooCEUk+2/IgyWSSUsbHtWziSqHHiqgIYdC0vKf/JMe0GoDZ3EZEdn6M/s5s6zM67St1w3UBw0V6NEdL//NkxKob4V6dvtPEjAseUy5Vj8eTyrRQkFMeX//qIPXpLF4oI1/9T1uGPEgFEqvtzbCIasf9H/+tZURihLQ0sVFHgL1VBBgRXHDVuPyCRcJjJDeKL7DiyBkJjaQaQXl9b4y2k7aaUvef3zBBCahPOVllpK5/L50IImC+3W+MUJMLDKTRNLvM76AwkgRYX+lQ//NkxL0cWb6NvssGmM8uCw8ApR//WMHB4TDk/+JVwEZcd5L+La5VZIspRI0hkJgtSbW50WlVADa5RvCRLKZiYjAmy1gqvBjTEdgADbFIKbUairzP/ff1x4tEYAt1MkNgibucmr3jS5PYPmtu1WKOHMelNEL9+k8qyTQTm8z///3HUM8siVS3wzf///8rqZaL//NkxM4c4ZZ4/OJE7F///8qlBCUKHhY9rDX8X0VGltRZyTGf+lVCkwHAMxuGECngZo+yZgVAZhCqIguMGxIMEBHM/inMFgGQNCAqJwiDCRZzi7QGFmaqmqTmWIgAykSFApfGYjUcXc0+MxiNxmNYawo4ZkMMRhuStr0pTsbYwLCY3Gd6dcgrILlbKTSpW1j8//NkxN0cks6JntIE/plLcerBBBfyCPg9h/Hsiin9f/qZTr10302R+vof9Sf/////Z0qGp////9bW8nSckHDyHH5KKxEeZ4cVaavgiJJgMjG1vSes25oIFGTw0YXJhhoVmIA8YHBSOim8MTjpqYr+UcAoNXaYDARdpFZe80MKP7E1TSaUGRqW6ycTkU3CTCFH//NkxO0pE4IsAO6afMK0S0nFa0SxJ/Rqu12szsw9lFIiJIFqyWr9T0seQfwzft+2xGW2VFkqGjr6eW/sxx88dUeDusbw9hONUQgkEEAwEbBOBcBCIKVggBMxIiQVByoRC6FLcV+QEspXixX5JaLTBEu2m4uTROV8w3jkHaXhb4KdQ3OKZozLUFXqN+wq3wWH//NkxMsgwWIoAVxoABemZ9r6HquCh6rtdhtuDn71A/03s7qG/cLWzaNu3//lnePJY7JqGyay2RrYhPsWheaeR7O+n8vnfarAiakiU7ya9n3tC+LZ1bO/Te7azauMZ/08ibhTR/Ej4gR7e99YzX5rXNa5rX1xr43nWLW19Z/pb7z9x77zDtWPPq+5od6ZjxM3//NkxMs1A+owFZt4AYPi+SxlqOhcCjkwXQBQCk1CEpUSQIqwlAiTcMlSGY+YmNct9THRIBxq2QCBQ0IgKGwVGHhKs6lZ3iX/lj28RYiLHqjyct/iL//R1nc6JcSrO1nRLiXzvK//4iVqR9JlsdBSkKChQTpUHAQSGspM9mVcmmqGqCZUcmyWOXnksNf9QoYG//NkxHoUYJG0DcwwAI4zUhIYGg6tZLHI1zaw5Sa8scjWE1JqTUylzLWw//JYaxya2XyOkspH+Sxy/1WOR/+sNYawjWZH//MobBYapJNMVEkqbbYTVetKVEpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxKsc64zYABhHBaqqqqo3bdpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxH8AoAQAANgAAKqqqqqqqqpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxHwAAANIAAAAAKqqqqqqqqpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxHwAAANIAAAAAKqqqqqqqqpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxHwAAANIAAAAAKqqqqqqqqpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxHwAAANIAAAAAKqqqqqqqqpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxHwAAANIAAAAAKqqqqqqqqpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxHwAAANIAAAAAKqqqqqqqqpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq22v/oRXJQouRjuTsd9ZG9ToxyE6dgBu8KJEifv/+8QOPRAcX/hxdNKaInlQ7//NkxHwAAANIAAAAAKwYh+J5RxeZnphBMjsj4Ib0jwBxFe5XHceDU/WQrjzHpr//////////////5v+iEIN8hbSfig16fCkVBvljgM+6fHyf5c2VD5//////8w1eyVY48Bk1Dj5vf4ppTqs3y5u1IdCsLYPQlVlViuEkgl/ONTlzQhtLm7wfiMJ+WNvjyk/L//NkxLANA3WEBgCH5hkgDUEsXapQtSL6XVh7gXxnmXBE3Q5KM6sO88yVoXGq1GhFV7OxxzcHoMggYADF+XcBwGmEbW4afTYVA6BuFwJwlCfi5pJKoWp0PNgIwYZxk/HGxHWc55koOBvIOX4WBcF8H4f6YQ0NWXtsZ8URaFqRcq5CJPA1/wAAAET7jMDADiDZ//NkxP88vAHkAUx4AEkAAiHVrLhgkI3LBLf6///+pNucdvEp6k2nXqOJzp/GmhWf+lf83Uv6jSW9Z08Ui+XkUpvnSYPGkiZmXZUyPFvEJxYxP4yBKjfUQ8NUFkyL50jTQ1MTFFcmiZK0mCmTxcMyyYl0ulZaJgS5LQwIFigfGLGagNghcwEeC/FxhlgUCFvY//NkxI80TCY4AYuAAHziC5cSJ5RmVyyYnjVRktjqP5WLxiQ8nS4TBNniaLBNEUTLhkr40xH4WWBYoOWDb4WPhigGyAtYDFYNgsWMwH0MRapABXgHcAdoZnjbbW6VIcF+NFhNg6C4gwUO/dTXJ1HWNOL9Z3prj5AqXNEUXHcJRe6KpYhQiDgZLoQmGK5h6lM+//NkxEAb23bzHYU5Aks5Jp8X3QxWHEO2ONPPPX5jef9/r9DGOUuj+ur0a3/////lRKGg0EiNPyhYp39FNQhpiIh4jSWQBMyeLGZmM1AmZDosHMwhHMRI4152KBPRoQJaBYSzMPgEg7KLlj77JCw2MNDJeGMNGfDKimMWqJPm8f//qeylcdZPTJZfbyg4yXk8//NkxFMcei7vHcxYAtEmGhjEvJhINiQCY04Ows////lCtCmIMeaIXf//vyaMy0eZaY6pHvldOCvJ2h5fUYJgcm8eHu7JBV8VTQaRoBcSqNpPkkNumLrKTiFlG2gUQpv/Z8owToGg23OtCigeSBmMzGQJ/ZlU0yGBFA0Zl//+ZncymO1UPKULxMN/IEvB8HB7//NkxGQcakrXGHmE9Cf//0uVxFQGl0e/OIitoJAGSbpbzwPKBTnMqD6n1p0qe7j2rFae7TU9e/BqTXxqNw1ClNKdXKVesleVFnOxcfzvOik5z4cAcTCyYm6SYhRdCgRnTx08dAs8dFJ4/zpw6eKh7j2HoPYJ0VjMVDqE2GAE+HsPb//ielgwQ9RnGAHsJ8Kx//NkxHUx1C6eIMJa3FFhaPUqKx6j0Kh1Hrj1HqPYe5XLSz+PXlRWVD1j249SwrlhaJ6WFY9SzHqWf//5UVFvysqHWPYe2PUepWWHB5HzhdL88fOl0vS/O/PF89P/nZdVdYSWaXiawUow+QVViUOH0QDnAUgFMo6bVskNYERoeK+WdYDivunRUv89rBdIsNAp//NkxDAacILTHs4YKME4IpAIULCrgEGgaCh2ygSRqr/h06XXEL//PUn14sDXJLekqmVSwsVFCErHm///4NEkkgwIxtETP7lihNub5BO5J/zDBnwuGVLArsEaXetPeXx+ruDgq3y4ByPt2xZrQOxe7M7Y+p+TWWyLQwjbf+zdVdWZT+0HRLMatFt1L///8oyM//NkxEkdGhK+XsMGeOJC5YM4xX22P8MPOvWJBFiX/OpnUCMoCwFtzv7j3/yQdaLAmMBUMw104VMqAAELAEJRv0MaUVNb/A2FypS0A4jBm8tnPceor4CjOxzrjAOCtvQwYsSQ9C8/+rNZyAQGSofDuguWcT90ZlRcbGh2HhweAIfRyqpU0/1/MYrtNZzIwkWC//NkxFcdGeKaFtPKdCwOlrJL/+gKtekgBycNP3u/c7/1nDRIKRCHWq/yNQABBGZVNJTxUwsLOC5zWwv/MLMzC1v/8kK0BtX+eoQkk1/4gBC3vpLjUuZfFm9zvbcKj2UP8h+4EfriS4KBDNTI52kul40CiggWg2R+SWCz1zQcca///1YOCALgUGAKbAMkVVFX//NkxGUcKVaGFN4GdH//khCaBI2NWcW48iAHY5JLa7bbqoChdjpLVlIucKTXPQ761NbZv4SoRESXv/m47i0REp36l3gzm3GChkCigDgBzWFExoujEUWjQBp3/nnTnoAMlABj6nCCLf/5FPUQrkEZ8Hx5+D6hOHyji4HNhE//B94IHCgY1AhAAD5ARh+pWATT//NkxHccwp7mXjoFMti2kK7Mev////V/U9M47ZMIQye1c7hBSxW9jThIgfkpeTKMoC4YPOE50iQHuhl//+cAXBjjBx3QA0turuoIGO4Ap//V9fboIBixzv/VLv/kt//f0VyKgu4gfsryFY2EUpHsNi6ICAsykO44yZLCsh5ZFCp+5xCdCNsewmCiYo4xGGqM//NkxIcYG47EABJFiDH4zxgeDgeGDg6tBesz/MIgUCjY4cNj/G/ob5igwEQZnYMqohqsULcgEPsBN6jAwEMrdplkf61uzoFkgq8kVvLCURSJEXKuCQNNDup/Qs9GCnGA8vOwJHYV6SySm1r8WOr32kagzHM/Egw+Car2nyeDM7OwGJT4WPhACnB7vlxNBmdu//NkxKkc6orSVBlFNBvrT4fKnXba+OMN8AwY1BSCIOESrvrnJUw4VcLd1QcZ9SiM8hgifaMf3EXwC52wFWQCtpEADi2wOGttT+Gq5MQSUKJUbfOHkwECJF6Oj8dJpT+gVHd/NkwkLOf8n1ohNDi2dndFjZ+ZLgjMB5eYJMPX/IF8pnAwBtXjigE95Xz7/Mvl//NkxLgcoZq+RGGFLGRjhQJU0f5v6b1Y1nqr2X0b/1z03VsZ10hxwKqPcGNBIRNJXZF1ut08C+s6nVVzayVAXoU36xthayRZaGHJ81YCIzENT6mbbK2zkYVxH5jOjU7X9DqADAAAYoymHBoTzLMMFcoSQ0gZdHlkrT02K3MmBghRgiAWit8G+PMgycRhWhDT//NkxMgcmsK+LmGFSMVUiZeaen/2tra5xo2JlKnpU6dqej3qf3dc+Ddox2kEOA3bkGrsMLhAEKOPHGPmllcm+kEYuAi5cTYmBmFIBZJd3tkM0TjJwpd5fhdxtbuZoMl+C/SBIBXa7PbIASYyYLL8IECwMmahZkwWX4bMu4rCja/HoHpHp/NhfaGhDyRL6HND//NkxNgdAR7GNsMG6ENBISSoaDAJL2lpLNDkPaev95P++8n799PK+nmedee+eST+Tz+f/4GMN8CH4MEMBwQEBf///AuMOCgYEBQYwIYHwQ4DgX//wXgP4KNgwcH+MMDGG/j+B//x1f9yi+pp92Aml/vBAUa0xMlkjOgsZmWBDgigBJDJ2oBTjZ/QInWhYCFA//NkxOcvVCKIrNvFUBCpZEAE5tacWRXauwRhQld/6BAAtZWTLuXYIws4RdEjJdrZi+hhYX8GQYWAJyIO/1VV9faGgOzoah5Iuvg9uBWAsGwbZtg9B6DY/4mEwmE0TYzGBmDyMFCxYCGNSpQtKy2VLzZ76TV6TGrOf///4KcQh0OxAHcQcBsBggiGA8OiH/////NkxKwwtCJ8ANvPZPiaDwYjMTxjg/iYsVlin8acoULf5XjRTBDgvPwjZkWhlbT2NM6Bq//QRgWpzgprQqSRa/6nYKRX/QUT4lpfv/fdKh/0jSIGMxl1RUArJdaioV9Amm4PI3fuFX/FX/4qO/pB/veiEL3dCl5U9HqymaKHGQ6PJkX2OcRCQ6gkU6CDuch6//NkxGwiswqdTMpLSL3////4e/Hf40f47xw/ZH7dTjjBU2UOwF8hFRO7OnGAIAKpIf0+WIXADjRKefUqk3oTEwRtUBUDNLwH11tmrwVeOcs1Va000897xzWACHopXuonRbGN6uuYrBW2LL6ZWWVdsKyFIb0HBGFOgkMpVZgoJHv/+/W7eFMY9bP9XOigNHnP//NkxGQbqgqc9sMEXIOlcOB0Jz7HqC1KcRZAJpGBrGNqlYUuFS60MNwY0ybWyuTZMxA9MqPeHpmIHriYy1xjkzgGcEGptl1dEMPTghBiGH2YQk9lOhFkbWQk89m//veQve10ndDo09CKIODBOMW+fHDX/RTSRX/3d40CID4RCxxYEAaig0drKFyknUCL7kzh//NkxHgcqkqdlkmEvB0MouB8N+FCdqsRy7iKxbq9098KR+4qRuTyqTqhVyqa1LpEtqqQo/XFXTvXzC9S7k1sOzSbCdKceJmLQs6jaT9G3MfrIuKbXcj1lb1cpGuCySqhSKZhiQnc275dz3imUZG47Pduz3sEEIyd5e7jWXbGI3Y+GeJTKxGUSUorj3blpZb+//NkxIg0RDKYynmZzb951oiGx3oILq2ezHJ0QsyXsncbmTPT85auftWvms1xchrTp91w9Eq62BVhqiZTFEYwl6iHDpydHdL98ahcrNfTL0RYWrmN6FusBPM97aib7BAbYsiuZE7VseIplalBJAjv1W/f9Dk4hpYGtqT5uq9rV3V7gjUNbGhDWpqJ6nzZqMRU//NkxDoqLBacAHpLpEZDlWsESOf5RZ+oJgE0HAiT5NJWFofxwGwUIeoiUd0kDijzi/+kaIkQ93p6fcwwml/8OeND8Oh8ODRoeHjg5Dgz/w//AD4bDADAcNfAMNCoCSxoYAIXhv8LDf/hf/igb51QehkVkYuyPyy/DyY0wqYokgAKEBZa7dE5RDwkuXhlCZ+v//NkxBQc4iLCNmJEvFPQ7KL2QoIxpYqiguQJiNBOE5ubduUrDg1PspM0mMooXCGoIQ2SMXQj4/NaOzmdNkZ2+QZoo0rMkilRvP/SzMkwQSeOu0M0TOyIBNI8Atkyt+V4pcLWIjxmha/Jnk/hinhCVcQEe0p83S1oCQ/NFGI2MP3KFVGgkY0D54qgHL08u0Qw//NkxCMdOP7S1sMGjGDdfhYcUtQwSLmq5huKFpKdCpBxgbaHDxICBEFDIbOBpA8iakzQOoFyJrlRzuaNFiOt0FXXot9rZ8ug9cpItvo4ViEt1n01gQEkhgMAuXWt/9nQAVQBbIPdal1XgAVYpDe7GXGV4w/TYd2pxx/rtynTRDLz+WP8QwHndrWbgCBZHK+E//NkxDEfk+LCFsMLCHkG5RighhXxTUoSdnVVBlPVGAEK9RIQHXK4otkSii+iELSUzO/YylVHVGa9qtQzofuv/6/f9f4+7GdSMldS///////D4dxg0ODRowfjVdQTiIkANtQm1PCSilh5tK+nPQHLpagt6vT4RX79+qwbgI5Vd/O/DjLy033tPqZDXr2V4djQ//NkxDUe69bCJnlFZGVP38qrlmkxgwaOjBwyz6hp2Pc7jAQ/BgsYEC7zy+38l1U9Ff1aS/bZLf3/yvv/5Et92///////9CsdnYl5QxRogf4YPkx67BZSAArWkQ3umWAL0y3fOygRGadJ/sVFb2ZRbnzEcSETqBkssKwDltuXgXQ3kZz2tswCAfIipQXQKg3Q//NkxDwdMNLKNg4SGGWIGmgICINBQkkNAADAVE41Krto0styYLBkqMPayPo/KtKHmBU3///bJrBVAOjAM9Abh1eYAAXOJuI6oEFu5h7hyfAkAsTTTdAXAH2BC2dgNwK1U/0Ujey2xHY4m9fqxqct96sPUyAgzUDMTrHQdfQ/u6oxvy4M2Wuv7F3O7yPkVzrt//NkxEodK77ONnjFMUWWkjEZ7NSqV+/R+v/6t9vX6HVtdqf////9+aahwpQ8BP//0c57RhoE0FVBsEAG70V/Mvj488RKm4eqNwcFzex191tP1Uy+IAENR4Wack8IWRwzLx8zNqoNsAgwdKzKQJn5UvJG9TYyOdqEEHHh+22RnKXxEThkdrizBmLiYedXlcPA//NkxFgcqebGlsGG0Gd/leIhzG5rSdYU19/yp6ZzyRpgVdwG5FF8cgxFI79fwrWEEMfcpkYiEQZgSR3ltmUGlbDDpyHKaj7vVTNvPyra1q9Opu3ntusey6USu7ocqzXOuAI5FKxn19DGMUpSzZjAyoblKj4r5a3W1SjZlFU///9Nf5nhMJJJEQVRutxZ1cFg//NkxGgcqeKhaMvKtOkqJKp0lVEJNRpFOm0Pp3jaeYbCXHcCddswIBTB/qS+lTFd8h2efKiAov6RmZfKxjYSoz7q0agSKRtQUVKdWNu5Ss/QzlKxUdDFJWpSGehl/ohnSWo0GpKWqI///o//35mKdl//2dF+zFKjk5f/1br/3UpW/veoqntlZBKeqBUqTAX8//NkxHgdDAqQFNGKyfjVqJ5Nq2ruEW4+kkzTKLLZQhj12SRKLVcKV8YOxDnFBg1jlZvKJdaFirgom0ZQ9FaXgZdCEFhY4qq5XZo5VG1VTPVFKj1//6vWW1ziQYkSAkVUcGlG+lGVk2//skoCriXJXzqzq5mdb/6gD/s1pxFpDCCgyQsBZjTZVEjOhG5koUVn//NkxIYdAp6FnsoE2GU/w5WidUio7iO7j6cj6ZkhBr4UQZ8WqwMoR9DCVR4BiAzK0tMB2tL/2zutTKxsZqxzZP//sb8tvJVE9UKsDRfpInoeEus4tkOyVZ36bbVPXV/bYwO3tPXTS0V9FXbaWWAJgAw6wHx6FL4MVCwFerSmIxVsrsyR/oBpr7wJqppsl4yq//NkxJUbmeplnMsGbBSac+jnmVk9/mkIk0HF0k+7sy0buQmQtTGQjMVopyNRmr32ZasqsmdiueWR31vYrvfdu2/UrNPaj/Wn//6v/j+N///+D4F4MbjqVqpoKdCGjNAFwqxNTho4KEigEONIkdNCYJJc0iaqsZtWNV9jVmoCWwE7MdVdvh+pRl2bq7FszUBU//NkxKkb285EANJE0EJ0GioKiUNB0qdBUsFQVWdUFQWkhEVPWqPMxEWPBryoC/19Z10Rf/YdsklBWkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxLwZYWY4FHmGUKqqqqqqqqpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxHwAAANIAAAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

    const CHIME_LABEL_KEYS = Object.freeze({
      chime: 'behavior.source.chime',
      'chime-bright': 'behavior.source.chimeBright',
      'chime-soft': 'behavior.source.chimeSoft',
      'chime-wood': 'behavior.source.chimeWood',
      'chime-drop': 'behavior.source.chimeDrop',
      'chime-dingdong': 'behavior.source.chimeDingdong',
    });

    const DEFAULT_SETTINGS = Object.freeze({
      enabled: true,
      deliveryMode: 'auto',
      autoUpdateMode: 'off',
      suppressWindowsFullscreen: true,
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
      'settings.note': '这些设置与自定义音频仅保存在当前浏览器中，不写入会话记录。日常提醒不联网；只有点击「检查更新」或触发每日自动更新检查时才会访问 Gitee。',
      'about.title': '关于',
      'about.name': 'DSH会话完成提醒',
      'about.tagline': '专注 DSH 的每一次会话收尾：完成、失败、待回答都会温柔提醒；支持失败原因归类、提问/计划/授权提醒、多种轻提示音、工作区直达，以及 Windows 通知与桌面悬浮窗。',
      'about.license': 'AGPL-3.0',
      'about.repo': 'Gitee 仓库',
      'about.privacy': '设置与自定义音频只保存在当前浏览器；检查/自动更新会访问 Gitee。',
      'update.title': '版本与更新',
      'update.desc': '从 Gitee 检查插件更新并热更新运行文件；日常提醒不会联网。',
      'update.current': '当前版本 v{version}',
      'update.check': '检查更新',
      'update.checking': '正在连接 Gitee…',
      'update.upToDate': '已是最新版本',
      'update.available': '发现新版本 v{version}',
      'update.update': '立即更新',
      'update.confirmTitle': '更新到 v{version}？',
      'update.confirmDesc': '将替换插件的运行文件，设置和自定义音频会保留。更新期间请不要关闭页面。',
      'update.confirm': '开始更新',
      'update.cancel': '取消',
      'update.updating': '正在下载并应用更新…',
      'update.done': '已更新到 v{version}，页面将自动刷新。',
      'update.refresh': '刷新页面',
      'update.restart': '已更新到 v{version}，重启 DSH 后生效。',
      'update.error': '更新失败：{reason}',
      'update.offline': '无法连接 Gitee，请检查网络后重试。',
      'update.retry': '重试',
      'update.repo': '打开 Gitee 仓库',
      'update.unsupported': '当前环境不支持在线更新。',
      'autoUpdate.title': '自动更新',
      'autoUpdate.desc': '启动后每天最多检查一次 Gitee，只读取公开仓库。',
      'autoUpdate.off': '不自动更新（默认）',
      'autoUpdate.prompt': '每天检查，发现新版本时提示我',
      'autoUpdate.install': '每天检查，发现新版本时自动更新',
      'autoUpdate.available': '发现新版本 v{version}，可以立即更新。',
      'autoUpdate.updating': '正在更新到 v{version}…',
      'autoUpdate.done': '已更新到 v{version}，页面将自动刷新。',
      'autoUpdate.restart': '已更新到 v{version}，请重启 DSH 完成。',
      'autoUpdate.failed': '自动更新失败：{reason}',
      'autoUpdate.windowsTitle': '完成提醒有新版本 v{version}',
      'autoUpdate.windowsBody': '打开 DSH 后可立即更新；Windows 通知仅作提示。',
      'autoUpdate.cardTitle': '发现新版本 v{version}',
      'autoUpdate.later': '稍后',
      'autoUpdate.update': '立即更新',
      'autoUpdate.retry': '重试',
      'autoUpdate.refresh': '刷新页面',
      'autoUpdate.close': '关闭',
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
      'section.behavior.desc': '声音可选择浏览器合成的轻提示、内置语音，或上传自己的音频文件。',
      'behavior.sound': '声音提示',
      'behavior.sound.desc': '提醒出现时播放提示音。',
      'behavior.delivery': '通知位置',
      'behavior.delivery.desc': 'DSH 内卡片固定在窗口右下角；Windows 通知中心由系统显示，只提供系统允许的通知样式。',
      'behavior.delivery.inApp': 'DSH 内卡片',
      'behavior.delivery.auto': '自动选择（默认）',
      'behavior.delivery.autoNote': 'DSH 在前台时用卡片；切到后台、最小化或托盘时，优先用已打开的悬浮窗，否则用 Windows 通知中心。',
      'behavior.delivery.desktop': 'Windows 通知中心',
      'behavior.delivery.desktopNote': 'Windows 通知中心不能像 DSH 内通知那样使用果冻卡片、进度条、按钮或自定义布局；样式、位置和停留时间由 Windows 决定。',
      'behavior.fullscreen': '全屏应用时只保留声音',
      'behavior.fullscreen.desc': '使用 Windows 通知中心时，检测到其他应用全屏则不发通知，只播放提示音。',
      'behavior.delivery.floating': '桌面悬浮窗（实验）',
      'behavior.delivery.floatingUnavailable': '桌面悬浮窗（当前 DSH 不支持）',
      'behavior.delivery.denied': '浏览器/系统未授权通知权限，已保留 DSH 内提醒。',
      'behavior.delivery.unsupported': '当前环境不支持 Windows 通知中心，已保留 DSH 内提醒。',
      'behavior.delivery.floatingUnsupported': '当前 DSH 宿主没有提供 Document Picture-in-Picture，无法创建置顶悬浮窗。请改用「桌面系统通知」或「DSH 内卡片」；需要真正原生浮窗时，要由 DSH 桌面端开放窗口 API。',
      'behavior.delivery.floatingClosed': '悬浮窗已关闭；重新选择「桌面悬浮窗」或点下面的按钮可再次打开。',
      'behavior.delivery.floatingOpen': '打开悬浮窗',
      'floating.idleTitle': '完成提醒已悬浮',
      'floating.idleDesc': '有新提醒时会显示在这里；关闭此窗口会自动回到 DSH 内卡片。',
      'behavior.source': '提示声音',
      'behavior.source.desc': '默认使用轻柔的合成提示音，也可以换成内置语音或自己的音频。',
      'behavior.source.chime': '轻提示音（默认）',
      'behavior.source.chimeBright': '清脆三音',
      'behavior.source.chimeSoft': '柔和低音',
      'behavior.source.chimeWood': '木质轻敲',
      'behavior.source.chimeDrop': '水滴声',
      'behavior.source.chimeDingdong': '叮咚',
      'behavior.shortSounds': '短音',
      'behavior.shortSounds.desc': '点一下即可试听并应用；默认仍是轻提示音。',
      'behavior.shortSounds.hint': '试听并应用',
      'behavior.source.voice': '您的任务完成啦，请查看（可爱）.mp3',
      'behavior.source.voiceElegant': '您的任务已完成，请查看（知性）.mp3',
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
      'settings.note': 'These preferences and any custom audio stay in this browser. Normal reminders never touch the network; Gitee is contacted only when you check for updates or the daily check runs.',
      'about.title': 'About',
      'about.name': 'DSH Session Completion Alerts',
      'about.tagline': 'Built for every DSH session ending: gentle alerts for completion, failure, and waiting-for-answer states, with failure reasons, question/plan/approval alerts, multiple short sounds, workspace access, Windows notifications, and a desktop floating window.',
      'about.license': 'AGPL-3.0',
      'about.repo': 'Gitee repository',
      'about.privacy': 'Settings and custom audio stay in this browser; update checks contact Gitee.',
      'update.title': 'Version and updates',
      'update.desc': 'Check Gitee and hot-update the runtime files. Normal reminders never touch the network.',
      'update.current': 'Current version v{version}',
      'update.check': 'Check for updates',
      'update.checking': 'Connecting to Gitee…',
      'update.upToDate': 'You are up to date',
      'update.available': 'Version v{version} is available',
      'update.update': 'Update now',
      'update.confirmTitle': 'Update to v{version}?',
      'update.confirmDesc': 'This replaces the plugin runtime files. Settings and custom audio are kept. Keep the page open while it updates.',
      'update.confirm': 'Start update',
      'update.cancel': 'Cancel',
      'update.updating': 'Downloading and applying the update…',
      'update.done': 'Updated to v{version}. The page will refresh automatically.',
      'update.refresh': 'Refresh page',
      'update.restart': 'Updated to v{version}. Restart DSH to finish.',
      'update.error': 'Update failed: {reason}',
      'update.offline': 'Could not reach Gitee. Check the network and try again.',
      'update.retry': 'Retry',
      'update.repo': 'Open Gitee repository',
      'update.unsupported': 'Online updates are not available in this environment.',
      'autoUpdate.title': 'Automatic updates',
      'autoUpdate.desc': 'Checks Gitee at most once a day after startup; only the public repository is read.',
      'autoUpdate.off': 'Do not check automatically (default)',
      'autoUpdate.prompt': 'Check daily and tell me about new versions',
      'autoUpdate.install': 'Check daily and install new versions automatically',
      'autoUpdate.available': 'Version v{version} is available; you can update now.',
      'autoUpdate.updating': 'Updating to v{version}…',
      'autoUpdate.done': 'Updated to v{version}; the page will refresh automatically.',
      'autoUpdate.restart': 'Updated to v{version}; restart DSH to finish.',
      'autoUpdate.failed': 'Automatic update failed: {reason}',
      'autoUpdate.windowsTitle': 'Completion alerts v{version} is available',
      'autoUpdate.windowsBody': 'Open DSH to update. The Windows notification is only a prompt.',
      'autoUpdate.cardTitle': 'Version v{version} is available',
      'autoUpdate.later': 'Later',
      'autoUpdate.update': 'Update now',
      'autoUpdate.retry': 'Retry',
      'autoUpdate.refresh': 'Refresh page',
      'autoUpdate.close': 'Dismiss',
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
      'section.behavior.desc': 'Use the synthesised light chime, the bundled voice, or your own audio file.',
      'behavior.sound': 'Sound',
      'behavior.sound.desc': 'Play a cue when an alert appears.',
      'behavior.delivery': 'Notification surface',
      'behavior.delivery.desc': 'The in-app card stays in the DSH window corner; Windows notifications are drawn by the OS and only expose system-supported styles.',
      'behavior.delivery.inApp': 'In-app card',
      'behavior.delivery.auto': 'Auto select (default)',
      'behavior.delivery.autoNote': 'Uses the in-app card while DSH is focused. In the background, minimized, or in the tray it prefers an open floating window, otherwise Windows notifications.',
      'behavior.delivery.desktop': 'Windows notification center',
      'behavior.delivery.desktopNote': 'Windows notifications cannot use the jelly card, progress bar, buttons, or custom layout of the in-app card; Windows controls their style, position, and duration.',
      'behavior.fullscreen': 'Sound only while another app is fullscreen',
      'behavior.fullscreen.desc': 'When using Windows notifications, skip the notification and play only the cue if another app is fullscreen.',
      'behavior.delivery.floating': 'Desktop floating window (experimental)',
      'behavior.delivery.floatingUnavailable': 'Desktop floating window (not supported by this DSH host)',
      'behavior.delivery.denied': 'Windows notifications are not permitted; the in-app card stays enabled.',
      'behavior.delivery.unsupported': 'This environment cannot show Windows notifications; the in-app card stays enabled.',
      'behavior.delivery.floatingUnsupported': 'This DSH host does not expose Document Picture-in-Picture, so a floating always-on-top window cannot be created. Use “Desktop notification” or “In-app card”; a true native floating window requires the DSH desktop host to expose a window API.',
      'behavior.delivery.floatingClosed': 'The floating window was closed. Choose “Desktop floating window” again or use the button below to reopen it.',
      'behavior.delivery.floatingOpen': 'Open floating window',
      'floating.idleTitle': 'Completion alerts are floating',
      'floating.idleDesc': 'New alerts appear here. Close this window to return to the in-app card.',
      'behavior.source': 'Cue sound',
      'behavior.source.desc': 'The light chime is the default; the bundled voice or your own audio can be used instead.',
      'behavior.source.chime': 'Light chime (default)',
      'behavior.source.chimeBright': 'Bright triple',
      'behavior.source.chimeSoft': 'Soft low',
      'behavior.source.chimeWood': 'Wooden tap',
      'behavior.source.chimeDrop': 'Water drop',
      'behavior.source.chimeDingdong': 'Ding-dong',
      'behavior.shortSounds': 'Short sounds',
      'behavior.shortSounds.desc': 'Click one to preview and apply it. The light chime remains the default.',
      'behavior.shortSounds.hint': 'Preview and apply',
      'behavior.source.voice': 'Your task is complete (cute).mp3',
      'behavior.source.voiceElegant': 'Your task is complete (elegant).mp3',
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
        deliveryMode: source.deliveryMode === 'desktop' || source.deliveryMode === 'inApp' || source.deliveryMode === 'floating' || source.deliveryMode === 'auto'
          ? source.deliveryMode
          : DEFAULT_SETTINGS.deliveryMode,
        autoUpdateMode: source.autoUpdateMode === 'install' || source.autoUpdateMode === 'prompt' || source.autoUpdateMode === 'off'
          ? source.autoUpdateMode
          : DEFAULT_SETTINGS.autoUpdateMode,
        suppressWindowsFullscreen: typeof source.suppressWindowsFullscreen === 'boolean'
          ? source.suppressWindowsFullscreen
          : DEFAULT_SETTINGS.suppressWindowsFullscreen,
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
        sessionId: session && session.id ? session.id : '',
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

    function playChime(volume, kind = 'chime') {
      const gainValue = clampNumber(volume, DEFAULT_SETTINGS.volume, 0, 1, 0);
      if (gainValue <= 0) return;
      const context = ensureAudioContext();
      if (!context) return;
      const preset = CHIME_PRESETS[kind] || CHIME_PRESETS.chime;

      const play = () => {
        try {
          const master = context.createGain();
          master.gain.value = gainValue * preset.gain;
          const softener = context.createBiquadFilter();
          softener.type = 'lowpass';
          softener.frequency.value = preset.filter;
          softener.Q.value = 0.4;
          master.connect(softener);
          softener.connect(context.destination);
          const start = context.currentTime + 0.01;
          preset.notes.forEach(({ frequency, endFrequency, glide, delay }) => {
            const oscillator = context.createOscillator();
            const envelope = context.createGain();
            oscillator.type = preset.wave;
            oscillator.frequency.setValueAtTime(frequency, start + delay);
            if (endFrequency) {
              oscillator.frequency.exponentialRampToValueAtTime(
                endFrequency,
                start + delay + (glide || preset.decay),
              );
            }
            envelope.gain.setValueAtTime(0.0001, start + delay);
            envelope.gain.exponentialRampToValueAtTime(1, start + delay + 0.012);
            envelope.gain.exponentialRampToValueAtTime(0.0001, start + delay + preset.decay);
            oscillator.connect(envelope);
            envelope.connect(master);
            oscillator.start(start + delay);
            oscillator.stop(start + delay + preset.release);
          });
          globalThis.setTimeout(() => {
            try {
              master.disconnect();
              softener.disconnect();
            } catch {
              /* already released */
            }
          }, preset.cleanup);
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
      if (current.soundKind === 'voice-elegant'
        && playAudioSource(BUILTIN_VOICE_ELEGANT_DATA_URL, current.volume)) return;
      if (current.soundKind === 'custom') {
        const custom = getCustomSound();
        if (custom && playAudioSource(custom.dataUrl, current.volume)) return;
      }
      playChime(current.volume, current.soundKind);
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
      const canFloat = Boolean(globalThis.documentPictureInPicture
        && typeof globalThis.documentPictureInPicture.requestWindow === 'function');
      const set = (patch) => saveSettings(patch);
      const [soundError, setSoundError] = React.useState('');
      const [deliveryError, setDeliveryError] = React.useState('');
      const [floatingReady, setFloatingReady] = React.useState(Boolean(floatingState.host));
      const [confirmingUninstall, setConfirmingUninstall] = React.useState(false);
      const [uninstall, setUninstall] = React.useState({ status: 'idle', message: '' });
      const [update, setUpdate] = React.useState({
        status: 'idle',
        currentVersion: PLUGIN_VERSION,
        latestVersion: '',
        message: '',
        repoUrl: UPDATE_REPO_URL,
      });
      const fileInput = React.useRef(null);

      const updateRequest = async (action, extra = {}) => {
        const response = await globalThis.fetch(UPDATE_ROUTE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action, ...extra }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload && payload.error ? payload.error : `HTTP ${response.status}`);
        }
        if (!payload || payload.ok !== true) {
          throw new Error(payload && payload.error ? payload.error : 'unknown update error');
        }
        return payload;
      };

      const updateFailure = (error) => {
        const reason = error instanceof Error ? error.message : String(error);
        const offline = /fetch|network|connect|timeout|gitee 5\d\d/i.test(reason);
        return offline
          ? tr('update.offline')
          : tr('update.error', { reason: truncate(reason, 180) });
      };

      const checkForUpdate = async () => {
        setUpdate((value) => ({ ...value, status: 'checking', message: tr('update.checking') }));
        try {
          const result = await updateRequest('check');
          const currentVersion = result.currentVersion || PLUGIN_VERSION;
          const latestVersion = result.latestVersion || currentVersion;
          setUpdate({
            status: result.available ? 'available' : 'latest',
            currentVersion,
            latestVersion,
            message: result.available
              ? tr('update.available', { version: latestVersion })
              : tr('update.upToDate'),
            repoUrl: result.repoUrl || UPDATE_REPO_URL,
          });
        } catch (error) {
          setUpdate((value) => ({ ...value, status: 'error', message: updateFailure(error) }));
        }
      };

      const applyUpdate = async () => {
        const latestVersion = update.latestVersion;
        if (!latestVersion) return;
        setUpdate((value) => ({ ...value, status: 'updating', message: tr('update.updating') }));
        try {
          const result = await updateRequest('apply', { version: latestVersion });
          if (result.applied === false) {
            setUpdate((value) => ({ ...value, status: 'latest', message: tr('update.upToDate') }));
            return;
          }
          const version = result.currentVersion || result.latestVersion || latestVersion;
          if (result.restartRequired) {
            setUpdate((value) => ({
              ...value,
              status: 'restart',
              currentVersion: version,
              latestVersion: version,
              message: tr('update.restart', { version }),
            }));
            return;
          }
          setUpdate((value) => ({
            ...value,
            status: 'done',
            currentVersion: version,
            latestVersion: version,
            message: tr('update.done', { version }),
          }));
          globalThis.setTimeout(() => {
            if (globalThis.location) globalThis.location.reload();
          }, 1600);
        } catch (error) {
          setUpdate((value) => ({ ...value, status: 'error', message: updateFailure(error) }));
        }
      };

      const cancelUpdate = () => {
        setUpdate((value) => ({
          ...value,
          status: value.latestVersion ? 'available' : 'latest',
          message: value.latestVersion
            ? tr('update.available', { version: value.latestVersion })
            : tr('update.upToDate'),
        }));
      };

      React.useEffect(() => subscribeFloating(() => {
        setFloatingReady(Boolean(floatingState.host));
      }), []);

      React.useEffect(() => {
        if (current.deliveryMode === 'inApp') {
          setDeliveryError('');
          return;
        }
        if (current.deliveryMode === 'desktop') {
          if (typeof globalThis.Notification !== 'function') {
            setDeliveryError(tr('behavior.delivery.unsupported'));
            return;
          }
          if (globalThis.Notification.permission !== 'granted') {
            setDeliveryError(tr('behavior.delivery.denied'));
            return;
          }
          setDeliveryError('');
          return;
        }
        if (current.deliveryMode !== 'floating') return;
        if (!globalThis.documentPictureInPicture) {
          setDeliveryError(tr('behavior.delivery.floatingUnsupported'));
          return;
        }
        if (!floatingReady) {
          setDeliveryError(tr('behavior.delivery.floatingClosed'));
          return;
        }
        setDeliveryError('');
      }, [current.deliveryMode, floatingReady]);

      const chooseDelivery = async (mode) => {
        if (mode === 'auto') {
          setDeliveryError('');
          set({ deliveryMode: 'auto' });
          return;
        }
        if (mode === 'floating') {
          if (floatingState.host) {
            setDeliveryError('');
            set({ deliveryMode: 'floating' });
            return;
          }
          if (!globalThis.documentPictureInPicture) {
            set({ deliveryMode: 'inApp' });
            setDeliveryError(tr('behavior.delivery.floatingUnsupported'));
            return;
          }
          set({ deliveryMode: 'inApp' });
          try {
            await openFloatingWindow();
            setDeliveryError('');
            set({ deliveryMode: 'floating' });
          } catch {
            setDeliveryError(tr('behavior.delivery.floatingUnsupported'));
          }
          return;
        }
        if (mode !== 'desktop') {
          closeFloatingWindow(false);
          setDeliveryError('');
          set({ deliveryMode: 'inApp' });
          return;
        }
        const NotificationClass = globalThis.Notification;
        if (typeof NotificationClass !== 'function') {
          setDeliveryError(tr('behavior.delivery.unsupported'));
          return;
        }
        try {
          let permission = NotificationClass.permission;
          if (permission === 'default' && typeof NotificationClass.requestPermission === 'function') {
            permission = await NotificationClass.requestPermission();
          }
          if (permission !== 'granted') {
            setDeliveryError(tr('behavior.delivery.denied'));
            return;
          }
          closeFloatingWindow(false);
          setDeliveryError('');
          set({ deliveryMode: 'desktop' });
        } catch {
          setDeliveryError(tr('behavior.delivery.unsupported'));
        }
      };

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

      const applyShortSound = (kind) => {
        const next = { ...getSettings(), soundKind: kind, soundEnabled: true };
        saveSettings({ soundKind: kind, soundEnabled: true });
        playConfiguredSound(next, true);
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
              title: tr('behavior.delivery'),
              desc: tr('behavior.delivery.desc'),
            }, h('select', {
              className: 'dcd-select',
              value: current.deliveryMode,
              'aria-label': tr('behavior.delivery'),
              onChange: (event) => chooseDelivery(event.target.value),
            },
              h('option', { value: 'auto' }, tr('behavior.delivery.auto')),
              h('option', { value: 'inApp' }, tr('behavior.delivery.inApp')),
              h('option', { value: 'desktop' }, tr('behavior.delivery.desktop')),
              h('option', { value: 'floating', disabled: !canFloat },
                tr(canFloat ? 'behavior.delivery.floating' : 'behavior.delivery.floatingUnavailable')),
            )),
            current.deliveryMode === 'auto' && !deliveryError
              ? h('div', { className: 'dcd-delivery-note' }, tr('behavior.delivery.autoNote'))
              : null,
            current.deliveryMode === 'desktop' && !deliveryError
              ? h('div', { className: 'dcd-delivery-note' }, tr('behavior.delivery.desktopNote'))
              : null,
            current.deliveryMode === 'desktop' || current.deliveryMode === 'auto'
              ? h(SettingRow, {
                title: tr('behavior.fullscreen'),
                desc: tr('behavior.fullscreen.desc'),
              }, h(Switch, {
                checked: current.suppressWindowsFullscreen,
                label: tr('behavior.fullscreen'),
                onChange: (value) => set({ suppressWindowsFullscreen: value }),
              }))
              : null,
            deliveryError
              ? h('div', { className: 'dcd-error', role: 'alert' }, deliveryError)
              : null,
            current.deliveryMode === 'floating' && !floatingReady
              ? h('div', { className: 'dcd-delivery-actions' },
                h('button', {
                  type: 'button',
                  className: 'dcd-btn dcd-btn-small',
                  onClick: () => chooseDelivery('floating'),
                }, tr('behavior.delivery.floatingOpen')),
              )
              : null,
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
              h('option', { value: 'chime-bright' }, tr('behavior.source.chimeBright')),
              h('option', { value: 'chime-soft' }, tr('behavior.source.chimeSoft')),
              h('option', { value: 'chime-wood' }, tr('behavior.source.chimeWood')),
              h('option', { value: 'chime-drop' }, tr('behavior.source.chimeDrop')),
              h('option', { value: 'chime-dingdong' }, tr('behavior.source.chimeDingdong')),
              h('option', { value: 'voice' }, tr('behavior.source.voice')),
              h('option', { value: 'voice-elegant' }, tr('behavior.source.voiceElegant')),
              h('option', { value: 'custom' }, tr('behavior.source.custom')),
            )),
            h(SettingRow, {
              title: tr('behavior.shortSounds'),
              desc: tr('behavior.shortSounds.desc'),
            }, h('div', { className: 'dcd-sound-chips' },
              CHIME_KINDS.map((kind) => h('button', {
                key: kind,
                type: 'button',
                className: 'dcd-sound-chip',
                'data-active': current.soundKind === kind ? 'true' : 'false',
                title: tr('behavior.shortSounds.hint'),
                onClick: () => applyShortSound(kind),
              }, tr(CHIME_LABEL_KEYS[kind]))),
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

          h('section', { className: `dcd-update dcd-update--${update.status}` },
            h('div', { className: 'dcd-update-head' },
              h('div', { className: 'dcd-update-heading' },
                h('div', { className: 'dcd-update-title' }, tr('update.title')),
                h('span', { className: 'dcd-update-version' }, `v${update.currentVersion || PLUGIN_VERSION}`),
              ),
              h('a', {
                className: 'dcd-update-link',
                href: update.repoUrl || UPDATE_REPO_URL,
                target: '_blank',
                rel: 'noreferrer',
              }, tr('update.repo')),
            ),
            h('div', { className: 'dcd-update-desc' }, tr('update.desc')),
            h(SettingRow, {
              title: tr('autoUpdate.title'),
              desc: tr('autoUpdate.desc'),
            }, h('select', {
              className: 'dcd-select',
              value: current.autoUpdateMode,
              'aria-label': tr('autoUpdate.title'),
              onChange: (event) => set({ autoUpdateMode: event.target.value }),
            },
              h('option', { value: 'off' }, tr('autoUpdate.off')),
              h('option', { value: 'prompt' }, tr('autoUpdate.prompt')),
              h('option', { value: 'install' }, tr('autoUpdate.install')),
            )),
            update.status === 'confirm'
              ? h('div', { className: 'dcd-update-confirm' },
                h('div', { className: 'dcd-update-confirm-title' },
                  tr('update.confirmTitle', { version: update.latestVersion }),
                ),
                h('div', { className: 'dcd-update-confirm-desc' }, tr('update.confirmDesc')),
              )
              : update.message
                ? h('div', {
                  className: 'dcd-update-message',
                  'data-tone': update.status,
                  role: 'status',
                }, update.message)
                : null,
            h('div', { className: 'dcd-update-actions' },
              update.status === 'available'
                ? h('button', {
                  type: 'button',
                  className: 'dcd-btn dcd-btn-small dcd-btn-primary',
                  onClick: () => setUpdate((value) => ({ ...value, status: 'confirm' })),
                }, tr('update.update'))
                : update.status === 'confirm'
                  ? [
                    h('button', {
                      key: 'start',
                      type: 'button',
                      className: 'dcd-btn dcd-btn-small dcd-btn-primary',
                      onClick: applyUpdate,
                    }, tr('update.confirm')),
                    h('button', {
                      key: 'cancel',
                      type: 'button',
                      className: 'dcd-btn dcd-btn-small dcd-btn-ghost',
                      onClick: cancelUpdate,
                    }, tr('update.cancel')),
                  ]
                  : update.status === 'done' || update.status === 'restart'
                    ? h('button', {
                      type: 'button',
                      className: 'dcd-btn dcd-btn-small',
                      onClick: () => globalThis.location.reload(),
                    }, tr('update.refresh'))
                    : h('button', {
                      type: 'button',
                      className: 'dcd-btn dcd-btn-small',
                      disabled: update.status === 'checking' || update.status === 'updating',
                      onClick: checkForUpdate,
                    }, update.status === 'error' ? tr('update.retry') : tr('update.check')),
            ),
          ),

          h('section', { className: 'dcd-about' },
            h('div', { className: 'dcd-about-heading' }, tr('about.title')),
            h('div', { className: 'dcd-about-head' },
              h('div', { className: 'dcd-about-mark' }, h(CheckIcon, { size: 18 })),
              h('div', { className: 'dcd-about-copy' },
                h('div', { className: 'dcd-about-title' }, tr('about.name')),
                h('div', { className: 'dcd-about-tagline' }, tr('about.tagline')),
              ),
              h('span', { className: 'dcd-about-version' }, `v${PLUGIN_VERSION}`),
            ),
            h('div', { className: 'dcd-about-meta' },
              h('span', { className: 'dcd-about-pill' }, tr('about.license')),
              h('a', {
                className: 'dcd-about-link',
                href: UPDATE_REPO_URL,
                target: '_blank',
                rel: 'noreferrer',
              }, tr('about.repo')),
            ),
            h('p', { className: 'dcd-about-note' }, tr('about.privacy')),
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
      const [floatingHost, setFloatingHost] = React.useState(floatingState.host);
      const machine = React.useRef({
        active: null,
        pending: null,
        leaving: false,
        hideTimer: 0,
        exitTimer: 0,
        gapTimer: 0,
      });
      const desktopMachine = React.useRef({
        active: null,
        notice: null,
        pending: null,
        hideTimer: 0,
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

      React.useEffect(() => subscribeFloating(() => {
        setFloatingHost(floatingState.host);
      }), []);

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

      const desktopPermissionGranted = () => {
        return typeof globalThis.Notification === 'function'
          && globalThis.Notification.permission === 'granted';
      };

      const closeDesktop = () => {
        const state = desktopMachine.current;
        if (state.hideTimer) {
          globalThis.clearTimeout(state.hideTimer);
          state.hideTimer = 0;
        }
        const active = state.active;
        state.active = null;
        state.notice = null;
        if (active) {
          try {
            active.close();
          } catch {
            /* The OS may have already dismissed it. */
          }
        }
      };

      const clearDesktopQueue = () => {
        closeDesktop();
        const state = desktopMachine.current;
        if (state.gapTimer) {
          globalThis.clearTimeout(state.gapTimer);
          state.gapTimer = 0;
        }
        state.pending = null;
      };

      const desktopContent = (next) => {
        const waiting = Boolean(next.waiting);
        const waitingKind = next.waitingKind;
        const title = waiting
          ? waitingKind === 'approval'
            ? tr('toast.waiting.approval')
            : waitingKind === 'plan-review'
              ? tr('toast.waiting.plan')
              : next.questionCount > 1
                ? tr('toast.waiting.many', { count: next.questionCount })
                : tr('toast.waiting.question')
          : next.isError
            ? tr(`toast.error.${next.errorKind}`)
            : tr('toast.title');
        const lines = [];
        if (waiting) {
          if (waitingKind === 'approval') {
            if (next.approvalReason) lines.push(next.approvalReason);
            if (next.approvalTool) lines.push(tr('toast.waiting.tool', { tool: next.approvalTool }));
          } else {
            if (next.questionHeader) lines.push(next.questionHeader);
            if (next.questionText) lines.push(next.questionText);
            if (lines.length === 0 && next.sessionTitle) lines.push(next.sessionTitle);
          }
        } else {
          if (next.showTask && next.task) lines.push(next.task);
          if (next.isError && next.errorMessage) lines.push(next.errorMessage);
        }
        if (next.showWorkspace && next.workspace) lines.push(next.workspace);
        return {
          title: truncate(title, 64),
          body: truncate(lines.filter(Boolean).join('\n'), 260),
        };
      };

      const showDesktop = (next) => {
        if (!desktopPermissionGranted()) return false;
        try {
          const content = desktopContent(next);
          let icon;
          try {
            const link = globalThis.document && globalThis.document.querySelector('link[rel="icon"]');
            icon = link && link.href ? link.href : undefined;
          } catch {
            icon = undefined;
          }
          const notification = new globalThis.Notification(content.title, {
            body: content.body,
            icon,
            silent: true,
            tag: 'dsh-completed-ding',
            requireInteraction: false,
          });
          const state = desktopMachine.current;
          state.active = notification;
          state.notice = next;
          const release = () => {
            if (state.active === notification) {
              state.active = null;
              state.notice = null;
            }
          };
          notification.onclose = release;
          notification.onerror = release;
          notification.onclick = () => {
            release();
            try {
              notification.close();
            } catch {
              /* already closed */
            }
            try {
              globalThis.focus();
            } catch {
              /* focus is best-effort */
            }
            if (next.sessionId && uiWorkspace && typeof uiWorkspace.openSession === 'function') {
              try {
                uiWorkspace.openSession(next.sessionId);
              } catch {
                /* The session may have been archived. */
              }
            }
          };
          state.hideTimer = globalThis.setTimeout(() => {
            state.hideTimer = 0;
            try {
              notification.close();
            } catch {
              /* already closed */
            }
            release();
          }, Math.max(1, settingsRef.current.durationSeconds) * 1000);
          return true;
        } catch {
          return false;
        }
      };

      const enqueueDesktop = (next) => {
        if (!desktopPermissionGranted()) return false;
        const state = desktopMachine.current;
        const gap = Math.max(0, settingsRef.current.gapMs);
        if (state.active) {
          state.pending = next;
          closeDesktop();
          if (state.gapTimer) globalThis.clearTimeout(state.gapTimer);
          state.gapTimer = globalThis.setTimeout(() => {
            state.gapTimer = 0;
            const pending = state.pending;
            state.pending = null;
            if (!pending) return;
            if (!showDesktop(pending)) present(pending);
          }, Math.max(EXIT_MS, gap));
          return true;
        }
        if (state.gapTimer) {
          state.pending = next;
          return true;
        }
        return showDesktop(next);
      };


      const deliverWindows = (next) => {
        if (!desktopPermissionGranted()) return false;
        const show = () => {
          const mode = settingsRef.current.deliveryMode;
          if (mode !== 'desktop' && mode !== 'auto') return;
          if (mode === 'auto' && dshIsForeground()) {
            next.surface = 'inApp';
            present(next);
            return;
          }
          if (mode === 'auto' && floatingState.host) {
            next.surface = 'floating';
            present(next);
            return;
          }
          if (!enqueueDesktop(next)) {
            next.surface = 'inApp';
            present(next);
          }
        };
        if (settingsRef.current.suppressWindowsFullscreen) {
          windowsForegroundFullscreen().then((fullscreen) => {
            if (fullscreen) return;
            show();
          });
        } else {
          show();
        }
        return true;
      };

      const enqueueInApp = (next) => {
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

      const enqueue = (next) => {
        if (!settingsRef.current.enabled) return;
        const mode = settingsRef.current.deliveryMode;
        if (mode === 'auto') {
          if (!dshIsForeground()) {
            if (floatingState.host) {
              next.surface = 'floating';
              enqueueInApp(next);
              return;
            }
            if (deliverWindows(next)) return;
          }
          next.surface = 'inApp';
          enqueueInApp(next);
          return;
        }
        if (mode === 'desktop') {
          if (deliverWindows(next)) return;
        }
        next.surface = mode === 'floating' ? 'floating' : 'inApp';
        enqueueInApp(next);
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
        const desktop = desktopMachine.current;
        if (desktop.notice && desktop.notice.waiting && desktop.notice.sessionId === sessionId) {
          closeDesktop();
        }
        if (desktop.pending && desktop.pending.waiting && desktop.pending.sessionId === sessionId) {
          desktop.pending = null;
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
        clearDesktopQueue();
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

      React.useEffect(() => {
        if (currentSettings.deliveryMode !== 'floating' && currentSettings.deliveryMode !== 'auto') {
          closeFloatingWindow(false);
        }
        if (currentSettings.deliveryMode !== 'desktop' && currentSettings.deliveryMode !== 'auto') {
          clearDesktopQueue();
        }
        const state = machine.current;
        state.pending = null;
        if (state.active) {
          beginExit();
        } else {
          globalThis.clearTimeout(state.hideTimer);
          globalThis.clearTimeout(state.exitTimer);
          globalThis.clearTimeout(state.gapTimer);
          state.hideTimer = 0;
          state.exitTimer = 0;
          state.gapTimer = 0;
        }
      }, [currentSettings.deliveryMode]);

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
        clearDesktopQueue();
        closeFloatingWindow(true);
      }, []);

      if (!notice) {
        if ((currentSettings.deliveryMode === 'floating' || currentSettings.deliveryMode === 'auto')
          && floatingHost && ReactDOM && typeof ReactDOM.createPortal === 'function') {
          return ReactDOM.createPortal(h('div', { className: 'dcd-toast-root dcd-floating-idle' },
            h('div', { className: 'dcd-floating-idle-card' },
              h('div', { className: 'dcd-floating-idle-mark' }, h(CheckIcon, { size: 16 })),
              h('div', {},
                h('div', { className: 'dcd-floating-idle-title' }, tr('floating.idleTitle')),
                h('div', { className: 'dcd-floating-idle-desc' }, tr('floating.idleDesc')),
              ),
            ),
          ), floatingHost);
        }
        return null;
      }

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

      const target = floatingHost
        && (notice.surface === 'floating'
          || (currentSettings.deliveryMode === 'floating' && !notice.surface))
        ? floatingHost
        : portalHost;
      return target && ReactDOM && typeof ReactDOM.createPortal === 'function'
        ? ReactDOM.createPortal(layer, target)
        : layer;
    }

    function UpdatePrompt({ t }) {
      const tr = typeof t === 'function' ? t : (key) => key;
      const state = useUpdatePrompt();
      if (!state.visible) return null;
      const busy = state.status === 'updating';
      const canUpdate = state.status === 'available' || state.status === 'error';
      const dismiss = () => setUpdatePrompt({ visible: false, status: 'idle', message: '' });
      const update = () => {
        if (state.version) void applyAutoUpdate(state.version);
      };
      return h('div', { className: 'dcd-update-prompt-root', role: 'status' },
        h('div', { className: `dcd-update-prompt-card dcd-update-prompt-card--${state.status}` },
          h('div', { className: 'dcd-update-prompt-head' },
            h('div', { className: 'dcd-update-prompt-title' },
              tr('autoUpdate.cardTitle', { version: state.version }),
            ),
            busy
              ? null
              : h('button', {
                type: 'button',
                className: 'dcd-update-prompt-close',
                'aria-label': tr('autoUpdate.close'),
                title: tr('autoUpdate.close'),
                onClick: dismiss,
              }, '×'),
          ),
          h('div', { className: 'dcd-update-prompt-message' }, state.message),
          h('div', { className: 'dcd-update-prompt-actions' },
            canUpdate
              ? h('button', {
                type: 'button',
                className: 'dcd-btn dcd-btn-small dcd-btn-primary',
                onClick: update,
              }, tr(state.status === 'error' ? 'autoUpdate.retry' : 'autoUpdate.update'))
              : null,
            canUpdate
              ? h('button', {
                type: 'button',
                className: 'dcd-btn dcd-btn-small dcd-btn-ghost',
                onClick: dismiss,
              }, tr('autoUpdate.later'))
              : null,
            state.status === 'done'
              ? h('button', {
                type: 'button',
                className: 'dcd-btn dcd-btn-small',
                onClick: () => globalThis.location.reload(),
              }, tr('autoUpdate.refresh'))
              : null,
          ),
        ),
      );
    }

    const CSS = `
.dcd-toast-host {
  display: contents;
}

/* Shared warm honey/peach palette for the card and the settings page. */
.dcd-toast-root,
.dcd-update-prompt-root,
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
body[data-ds-dark-theme] .dcd-update-prompt-root,
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

.dcd-sound-chips {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
}

.dcd-sound-chip {
  height: 28px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--dcd-accent) 22%, transparent);
  border-radius: 999px;
  color: var(--dcd-ink-soft);
  background: color-mix(in srgb, var(--dcd-accent-soft) 7%, transparent);
  font: inherit;
  font-size: 10.5px;
  line-height: 26px;
  white-space: nowrap;
  cursor: pointer;
}

.dcd-sound-chip:hover {
  color: var(--dcd-ink);
  border-color: color-mix(in srgb, var(--dcd-accent) 46%, transparent);
}

.dcd-sound-chip[data-active="true"] {
  color: var(--dcd-accent-deep);
  border-color: color-mix(in srgb, var(--dcd-accent) 58%, transparent);
  background: color-mix(in srgb, var(--dcd-accent) 13%, transparent);
  font-weight: 650;
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

.dcd-delivery-actions {
  display: flex;
  justify-content: flex-end;
  margin: -2px 0 9px;
}

.dcd-delivery-note {
  margin: -1px 0 9px;
  padding: 8px 11px;
  border: 1px solid color-mix(in srgb, var(--dcd-amber) 24%, transparent);
  border-radius: 10px;
  color: var(--dcd-ink-soft);
  background: color-mix(in srgb, var(--dcd-amber) 6%, transparent);
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

.dcd-update {
  margin-bottom: 16px;
  padding: 18px 20px;
  border: 1px solid var(--dcd-hairline);
  border-radius: 22px;
  background:
    radial-gradient(110% 120% at 8% 0%, color-mix(in srgb, var(--dcd-card-glow) 18%, transparent), transparent 52%),
    color-mix(in srgb, var(--dcd-cream) 88%, transparent);
  box-shadow:
    0 12px 30px color-mix(in srgb, var(--dcd-amber-deep) 8%, transparent),
    inset 0 1px 0 var(--dcd-inner-highlight);
  -webkit-backdrop-filter: blur(14px) saturate(1.12);
  backdrop-filter: blur(14px) saturate(1.12);
}

.dcd-update--available {
  border-color: color-mix(in srgb, var(--dcd-amber) 58%, transparent);
  box-shadow:
    0 14px 34px color-mix(in srgb, var(--dcd-amber) 14%, transparent),
    inset 0 1px 0 var(--dcd-inner-highlight);
}

.dcd-update--error {
  border-color: color-mix(in srgb, var(--dcd-coral) 52%, transparent);
}

.dcd-update-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.dcd-update-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.dcd-update-title {
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
  color: var(--dcd-ink);
}

.dcd-update-version {
  padding: 2px 8px;
  border: 1px solid color-mix(in srgb, var(--dcd-amber) 34%, transparent);
  border-radius: 999px;
  color: var(--dcd-accent-deep);
  background: color-mix(in srgb, var(--dcd-amber) 10%, transparent);
  font-size: 10.5px;
  line-height: 16px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.dcd-update-link {
  flex: none;
  color: var(--dcd-accent-deep);
  font-size: 11.5px;
  line-height: 18px;
  text-decoration: none;
  opacity: 0.82;
}

.dcd-update-link:hover {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.dcd-update-desc {
  margin-top: 4px;
  max-width: 62ch;
  color: var(--dcd-ink-soft);
  font-size: 11.5px;
  line-height: 18px;
}

.dcd-update-message,
.dcd-update-confirm {
  margin-top: 9px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--dcd-amber) 24%, transparent);
  border-radius: 11px;
  color: var(--dcd-ink-soft);
  background: color-mix(in srgb, var(--dcd-amber) 7%, transparent);
  font-size: 11.5px;
  line-height: 17px;
}

.dcd-update-message[data-tone="error"] {
  border-color: color-mix(in srgb, var(--dcd-coral) 36%, transparent);
  color: var(--dcd-coral);
  background: color-mix(in srgb, var(--dcd-coral) 8%, transparent);
}

.dcd-update-message[data-tone="done"],
.dcd-update-message[data-tone="restart"] {
  color: var(--dcd-accent-deep);
}

.dcd-update-confirm-title {
  color: var(--dcd-ink);
  font-size: 12.5px;
  line-height: 19px;
  font-weight: 650;
}

.dcd-update-confirm-desc {
  margin-top: 2px;
  color: var(--dcd-ink-soft);
  font-size: 11.5px;
  line-height: 17px;
}

.dcd-update-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.dcd-update-prompt-root {
  position: fixed;
  top: max(18px, env(safe-area-inset-top));
  right: max(22px, env(safe-area-inset-right));
  z-index: 2147483100;
  width: min(392px, calc(100vw - 32px));
  box-sizing: border-box;
  pointer-events: none;
  color: var(--dcd-ink);
  font-family: inherit;
}

.dcd-update-prompt-card {
  pointer-events: auto;
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, var(--dcd-amber) 42%, transparent);
  border-radius: 22px;
  background:
    radial-gradient(110% 120% at 8% 0%, color-mix(in srgb, var(--dcd-card-glow) 34%, transparent), transparent 58%),
    color-mix(in srgb, var(--dcd-cream) 96%, transparent);
  box-shadow:
    0 18px 46px color-mix(in srgb, var(--dcd-amber-deep) 16%, transparent),
    inset 0 1px 0 var(--dcd-inner-highlight);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
  backdrop-filter: blur(18px) saturate(1.12);
  animation: dcd-jelly-in 320ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

.dcd-update-prompt-card--error {
  border-color: color-mix(in srgb, var(--dcd-coral) 46%, transparent);
}

.dcd-update-prompt-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dcd-update-prompt-title {
  font-size: 13px;
  line-height: 19px;
  font-weight: 700;
}

.dcd-update-prompt-close {
  flex: none;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: var(--dcd-ink-soft);
  background: transparent;
  font-size: 17px;
  line-height: 24px;
  cursor: pointer;
}

.dcd-update-prompt-close:hover {
  color: var(--dcd-ink);
  background: color-mix(in srgb, var(--dcd-ink) 7%, transparent);
}

.dcd-update-prompt-message {
  margin-top: 4px;
  color: var(--dcd-ink-soft);
  font-size: 11.5px;
  line-height: 17px;
}

.dcd-update-prompt-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.dcd-about {
  margin-bottom: 16px;
  padding: 17px 20px;
  border: 1px solid var(--dcd-hairline);
  border-radius: 22px;
  background:
    radial-gradient(110% 120% at 8% 0%, color-mix(in srgb, var(--dcd-card-glow) 18%, transparent), transparent 52%),
    color-mix(in srgb, var(--dcd-cream) 88%, transparent);
  box-shadow:
    0 12px 30px color-mix(in srgb, var(--dcd-amber-deep) 8%, transparent),
    inset 0 1px 0 var(--dcd-inner-highlight);
  -webkit-backdrop-filter: blur(14px) saturate(1.12);
  backdrop-filter: blur(14px) saturate(1.12);
}

.dcd-about-heading {
  margin-bottom: 10px;
  color: var(--dcd-ink);
  font-size: 13px;
  line-height: 19px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.dcd-about-head {
  display: flex;
  align-items: center;
  gap: 11px;
}

.dcd-about-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  color: var(--dcd-ink);
  background: color-mix(in srgb, var(--dcd-amber) 20%, transparent);
}

.dcd-about-copy {
  min-width: 0;
  flex: 1;
}

.dcd-about-title {
  color: var(--dcd-ink);
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
}

.dcd-about-tagline {
  margin-top: 1px;
  color: var(--dcd-ink-soft);
  font-size: 11.5px;
  line-height: 17px;
}

.dcd-about-version {
  flex: none;
  padding: 2px 8px;
  border: 1px solid color-mix(in srgb, var(--dcd-amber) 34%, transparent);
  border-radius: 999px;
  color: var(--dcd-accent-deep);
  background: color-mix(in srgb, var(--dcd-amber) 10%, transparent);
  font-size: 10.5px;
  line-height: 16px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.dcd-about-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.dcd-about-pill {
  padding: 2px 8px;
  border: 1px solid var(--dcd-hairline);
  border-radius: 999px;
  color: var(--dcd-ink-soft);
  font-size: 10.5px;
  line-height: 16px;
}

.dcd-about-link {
  color: var(--dcd-accent-deep);
  font-size: 11.5px;
  line-height: 18px;
  text-decoration: none;
}

.dcd-about-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.dcd-about-note {
  margin: 9px 0 0;
  color: var(--dcd-ink-soft);
  font-size: 11px;
  line-height: 16px;
  opacity: 0.86;
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

  .dcd-update-prompt-root {
    top: 12px;
    right: 16px;
    left: 16px;
    width: auto;
  }

  .dcd-sound-chips {
    justify-content: flex-start;
  }

  .dcd-master {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .dcd-master-control {
    justify-content: space-between;
  }

  .dcd-update-head {
    flex-direction: column;
    gap: 6px;
  }

  .dcd-update-actions {
    justify-content: flex-start;
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
    const FLOATING_CSS = `
html.dcd-floating-doc,
html.dcd-floating-doc body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #2b1a10;
}

.dcd-floating-host {
  width: 100vw;
  height: 100vh;
}

.dcd-floating-host .dcd-toast-root {
  position: fixed;
  inset: 0;
  padding: 8px;
  align-items: center;
  justify-content: center;
}

.dcd-floating-host .dcd-toast {
  width: 100%;
  max-width: 100%;
}

.dcd-floating-idle-card {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--dcd-hairline);
  border-radius: 22px;
  color: var(--dcd-ink);
  background:
    radial-gradient(110% 120% at 8% 0%, color-mix(in srgb, var(--dcd-card-glow) 30%, transparent), transparent 58%),
    color-mix(in srgb, var(--dcd-cream) 96%, transparent);
  box-shadow:
    0 12px 30px color-mix(in srgb, var(--dcd-amber-deep) 10%, transparent),
    inset 0 1px 0 var(--dcd-inner-highlight);
}

.dcd-floating-idle-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  color: var(--dcd-ink);
  background: color-mix(in srgb, var(--dcd-amber) 18%, transparent);
}

.dcd-floating-idle-title {
  font-size: 13px;
  line-height: 19px;
  font-weight: 700;
}

.dcd-floating-idle-desc {
  margin-top: 2px;
  color: var(--dcd-ink-soft);
  font-size: 11.5px;
  line-height: 17px;
}
`;

    function openFloatingWindow() {
      if (floatingState.window && !floatingState.window.closed) return Promise.resolve(true);
      const api = globalThis.documentPictureInPicture;
      if (!api || typeof api.requestWindow !== 'function') {
        return Promise.reject(new Error('document-picture-in-picture-unavailable'));
      }
      return api.requestWindow({
        width: 440,
        height: 260,
        disallowReturnToOpener: true,
        preferInitialWindowPlacement: true,
      }).then((pip) => {
        const doc = pip.document;
        doc.title = '完成提醒';
        doc.documentElement.className = 'dcd-floating-doc';
        if (doc.body && globalThis.document && globalThis.document.body && globalThis.document.body.dataset.dsDarkTheme) {
          doc.body.dataset.dsDarkTheme = globalThis.document.body.dataset.dsDarkTheme;
        }
        const style = doc.createElement('style');
        style.dataset.pluginCss = 'dsh-completed-ding-floating';
        style.textContent = `${CSS}\n${FLOATING_CSS}`;
        (doc.head || doc.body).append(style);
        const host = doc.createElement('div');
        host.className = 'dcd-floating-host';
        doc.body.append(host);
        floatingState.window = pip;
        floatingState.host = host;
        floatingState.autoReset = true;
        pip.addEventListener('pagehide', () => {
          if (floatingState.window !== pip) return;
          floatingState.window = null;
          floatingState.host = null;
          notifyFloating();
          if (floatingState.autoReset && getSettings().deliveryMode === 'floating') {
            saveSettings({ deliveryMode: 'inApp' });
          }
        });
        notifyFloating();
        return true;
      });
    }

    function closeFloatingWindow(resetMode = false) {
      const pip = floatingState.window;
      if (!pip) return;
      floatingState.autoReset = false;
      floatingState.window = null;
      floatingState.host = null;
      notifyFloating();
      try {
        pip.close();
      } catch {
        /* The user may have already closed the PiP window. */
      }
      if (resetMode && getSettings().deliveryMode === 'floating') {
        saveSettings({ deliveryMode: 'inApp' });
      }
    }

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
      translate = t;

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

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'completed-ding.update',
        order: 81,
        locale: NS,
      }, UpdatePrompt));

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

      ctx.effect(() => {
        translate = t;
        return startAutoUpdate();
      }, 'completed-ding: daily update check');
    }

    return { inject, apply };
  },
});
