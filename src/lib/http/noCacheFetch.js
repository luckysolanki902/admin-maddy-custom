const DEFAULT_NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export default async function noCacheFetch(input, init = {}) {
  const mergedHeaders = {
    ...DEFAULT_NO_CACHE_HEADERS,
    ...(init.headers || {}),
  };

  return fetch(input, {
    ...init,
    cache: 'no-store',
    headers: mergedHeaders,
  });
}
