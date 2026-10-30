/** Public proxy address only. Provider credentials never belong in the app bundle. */
export const getMapsApiUrl = (resource: 'route' | 'places'): string | null => {
  const base = process.env.EXPO_PUBLIC_KAKAO_API_URL?.trim();
  if (!base) return null;
  try {
    const url = new URL(base);
    const localDevelopment = typeof __DEV__ !== 'undefined' && __DEV__ && url.protocol === 'http:'
      && /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(url.hostname);
    if ((url.protocol !== 'https:' && !localDevelopment) || url.username || url.password || url.search || url.hash) return null;
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${resource}`;
    return url.toString();
  } catch { return null; }
};
