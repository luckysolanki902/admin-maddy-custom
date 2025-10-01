const GLOBAL_CACHE_KEY = Symbol.for('maddy.server.ttlCache');

function getGlobalCacheRoot() {
  if (!globalThis[GLOBAL_CACHE_KEY]) {
    globalThis[GLOBAL_CACHE_KEY] = new Map();
  }
  return globalThis[GLOBAL_CACHE_KEY];
}

function getNamespaceStore(namespace) {
  const root = getGlobalCacheRoot();
  if (!root.has(namespace)) {
    root.set(namespace, new Map());
  }
  return root.get(namespace);
}

export function getCachedValue(namespace, key) {
  const store = getNamespaceStore(namespace);
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiry && entry.expiry < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedValue(namespace, key, value, ttlMs = 5 * 60 * 1000) {
  const store = getNamespaceStore(namespace);
  store.set(key, {
    value,
    expiry: ttlMs > 0 ? Date.now() + ttlMs : null,
  });
}

export function deleteCachedValue(namespace, key) {
  const store = getNamespaceStore(namespace);
  store.delete(key);
}

export function clearNamespace(namespace) {
  const store = getNamespaceStore(namespace);
  store.clear();
}

export function clearAllCaches() {
  const root = getGlobalCacheRoot();
  root.forEach((store) => store.clear());
}

export function getNamespaceStats(namespace) {
  const store = getNamespaceStore(namespace);
  const now = Date.now();
  let valid = 0;
  let expired = 0;
  store.forEach((entry) => {
    if (entry.expiry && entry.expiry < now) expired += 1;
    else valid += 1;
  });
  return { valid, expired };
}
