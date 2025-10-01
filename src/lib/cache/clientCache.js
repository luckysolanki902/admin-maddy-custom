const GLOBAL_CLIENT_CACHE_KEY = '__maddy_client_cache__';

function getClientRoot() {
  if (typeof window === 'undefined') return null;
  if (!window[GLOBAL_CLIENT_CACHE_KEY]) {
    window[GLOBAL_CLIENT_CACHE_KEY] = new Map();
  }
  return window[GLOBAL_CLIENT_CACHE_KEY];
}

function ensureNamespace(namespace) {
  const root = getClientRoot();
  if (!root) return null;
  if (!root.has(namespace)) {
    root.set(namespace, new Map());
  }
  return root.get(namespace);
}

function buildEntry(value, ttlMs) {
  return {
    value,
    expiry: ttlMs > 0 ? Date.now() + ttlMs : null,
  };
}

export function getClientCache(namespace, key) {
  const store = ensureNamespace(namespace);
  if (!store) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiry && entry.expiry < Date.now()) {
    store.delete(key);
    try {
      sessionStorage.removeItem(`${namespace}:${key}`);
    } catch (_) {
      /* ignore */
    }
    return null;
  }
  return entry.value;
}

export function setClientCache(namespace, key, value, ttlMs = 5 * 60 * 1000) {
  const store = ensureNamespace(namespace);
  if (!store) return;
  const entry = buildEntry(value, ttlMs);
  store.set(key, entry);
  try {
    sessionStorage.setItem(`${namespace}:${key}`, JSON.stringify(entry));
  } catch (_) {
    /* ignore storage errors */
  }
}

export function hydrateClientCache(namespace) {
  if (typeof window === 'undefined') return;
  const store = ensureNamespace(namespace);
  if (!store) return;
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (!key.startsWith(`${namespace}:`)) return;
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && (!parsed.expiry || parsed.expiry > Date.now())) {
        store.set(key.replace(`${namespace}:`, ''), parsed);
      } else {
        sessionStorage.removeItem(key);
      }
    });
  } catch (_) {
    /* ignore */
  }
}

export function clearClientCache(namespace) {
  const store = ensureNamespace(namespace);
  if (store) store.clear();
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith(`${namespace}:`)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (_) {
      /* ignore */
    }
  }
}

export function clearAllClientCaches() {
  if (typeof window === 'undefined') return;
  const root = getClientRoot();
  if (root) root.clear();
  try {
    sessionStorage.clear();
  } catch (_) {
    /* ignore */
  }
}
