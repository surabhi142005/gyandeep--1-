const PROD_API_FALLBACK = 'https://gyandeep-1.onrender.com';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getApiBase(): string {
  const envBase = import.meta.env.VITE_API_URL?.trim();
  if (envBase) {
    return trimTrailingSlash(envBase);
  }

  if (!import.meta.env.PROD) {
    return '';
  }

  return PROD_API_FALLBACK;
}

export function getWsBase(): string {
  const envWsBase = import.meta.env.VITE_WS_URL?.trim();
  if (envWsBase) {
    return trimTrailingSlash(envWsBase);
  }

  const apiBase = getApiBase();
  return apiBase ? apiBase.replace(/^http/i, 'ws') : '';
}
