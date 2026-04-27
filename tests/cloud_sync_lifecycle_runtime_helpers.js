import { installCloudSyncService } from '../esm/native/services/cloud_sync.ts';

export { installCloudSyncService };

export function createTimerHarness() {
  let nextId = 1;
  const timers = new Map();
  const original = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };

  const createHandle = (kind, cb, ms) => {
    const id = nextId++;
    timers.set(id, { id, kind, cb, ms: Number(ms) || 0, active: true, runs: 0 });
    return id;
  };

  function install() {
    globalThis.setTimeout = (cb, ms = 0, ...args) =>
      createHandle(
        'timeout',
        () => {
          if (typeof cb === 'function') return cb(...args);
          return undefined;
        },
        ms
      );

    globalThis.setInterval = (cb, ms = 0, ...args) =>
      createHandle(
        'interval',
        () => {
          if (typeof cb === 'function') return cb(...args);
          return undefined;
        },
        ms
      );

    globalThis.clearTimeout = id => {
      const t = timers.get(Number(id));
      if (t) t.active = false;
    };

    globalThis.clearInterval = id => {
      const t = timers.get(Number(id));
      if (t) t.active = false;
    };
  }

  function restore() {
    globalThis.setTimeout = original.setTimeout;
    globalThis.clearTimeout = original.clearTimeout;
    globalThis.setInterval = original.setInterval;
    globalThis.clearInterval = original.clearInterval;
  }

  function activeCount(kind) {
    let n = 0;
    for (const t of timers.values()) {
      if (!t.active) continue;
      if (!kind || t.kind === kind) n++;
    }
    return n;
  }

  function runActive(kind) {
    let ran = 0;
    for (const t of [...timers.values()]) {
      if (!t.active) continue;
      if (kind && t.kind !== kind) continue;
      t.runs++;
      try {
        t.cb();
      } finally {
        if (t.kind === 'timeout') t.active = false;
      }
      ran++;
    }
    return ran;
  }

  return {
    install,
    restore,
    activeCount,
    runActive,
    timers,
  };
}

function createEventTarget(label) {
  const listeners = new Map();
  return {
    __label: label,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      const set = listeners.get(type);
      if (set) set.delete(handler);
    },
    dispatch(type, ev = {}) {
      const set = listeners.get(type);
      if (!set) return 0;
      let n = 0;
      for (const fn of [...set]) {
        fn(ev);
        n++;
      }
      return n;
    },
    listenerCount(type) {
      const set = listeners.get(type);
      return set ? set.size : 0;
    },
    totalListenerCount() {
      let n = 0;
      for (const set of listeners.values()) n += set.size;
      return n;
    },
  };
}

function createStorage() {
  const raw = new Map();
  const storage = {
    KEYS: { SAVED_MODELS: 'savedModels', SAVED_COLORS: 'savedColors' },
    getString(key) {
      const k = String(key);
      return raw.has(k) ? String(raw.get(k)) : null;
    },
    setString(key, value) {
      raw.set(String(key), String(value));
      return true;
    },
    getJSON(key, fallback) {
      const s = raw.has(String(key)) ? raw.get(String(key)) : undefined;
      if (typeof s !== 'string') return fallback;
      try {
        return JSON.parse(s);
      } catch {
        return fallback;
      }
    },
    setJSON(key, value) {
      raw.set(String(key), JSON.stringify(value));
      return true;
    },
    remove(key) {
      raw.delete(String(key));
      return true;
    },
    __raw: raw,
  };
  storage.__origFns = {
    setString: storage.setString,
    setJSON: storage.setJSON,
    remove: storage.remove,
  };
  return storage;
}

export function createFetchStub() {
  const calls = [];
  const original = globalThis.fetch;
  const stub = async (url, init = {}) => {
    calls.push({
      url: String(url || ''),
      method: String((init && init.method) || 'GET'),
    });
    return {
      ok: false,
      status: 404,
      async json() {
        return null;
      },
    };
  };
  return {
    calls,
    install() {
      globalThis.fetch = stub;
    },
    restore() {
      globalThis.fetch = original;
    },
  };
}

export function makeApp({ realtime = false, pollMs = 50, testCreateSupabaseClient = null } = {}) {
  const win = createEventTarget('window');
  win.location = { search: '', href: 'https://example.test/index_pro.html' };
  win.navigator = { onLine: true, userAgent: 'unit-test' };
  const doc = Object.assign(createEventTarget('document'), {
    visibilityState: 'visible',
    defaultView: win,
    body: null,
    createElement(tag) {
      return { tagName: String(tag || '').toUpperCase() };
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  });
  win.document = doc;

  const storage = createStorage();
  const app = {
    deps: {
      browser: { window: win, document: doc, location: win.location, navigator: win.navigator },
      config: {
        supabaseCloudSync: {
          url: 'https://supabase.example.test',
          anonKey: 'anon-key',
          table: 'wp_shared_state',
          publicRoom: 'public',
          roomParam: 'room',
          pollMs,
          realtime,
          diagnostics: false,
        },
      },
    },
    services: {
      uiFeedback: { toast() {}, showToast() {} },
      storage,
    },
    store: {
      getState() {
        return { ui: {} };
      },
    },
    models: { ensureLoaded() {} },
    maps: { setSavedColors() {}, setColorSwatchesOrder() {} },
    platform: { reportError() {} },
  };

  if (typeof testCreateSupabaseClient === 'function') {
    app.services.cloudSync = {
      __testHooks: {
        createSupabaseClient: testCreateSupabaseClient,
      },
    };
  }

  return { app, win, doc, storage };
}
