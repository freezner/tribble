export type SocialPlatform = 'instagram' | 'x' | 'facebook' | 'tiktok';
export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = ['instagram', 'x', 'facebook', 'tiktok'];
export const SOCIAL_PLATFORM_NAMES: Readonly<Record<SocialPlatform, string>> = {
  instagram: 'Instagram', x: 'X', facebook: 'Facebook', tiktok: 'TikTok',
};

export interface SocialProfile { platform: SocialPlatform; handle: string; url: string; }

const hosts: Record<SocialPlatform, readonly string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'mbasic.facebook.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'],
};
const reserved: Record<SocialPlatform, readonly string[]> = {
  instagram: ['accounts', 'explore', 'direct', 'reels', 'stories', 'p', 'reel'],
  x: ['home', 'explore', 'notifications', 'messages', 'i', 'intent', 'settings', 'search', 'compose', 'login', 'signup', 'share'],
  facebook: ['login', 'login.php', 'share', 'share.php', 'sharer', 'sharer.php', 'dialog', 'watch', 'groups', 'events', 'pages', 'settings', 'marketplace', 'home.php', 'profile.php'],
  tiktok: [],
};
const invalid = (): never => { throw new Error('invalid-social-profile'); };

/** Validate a profile address locally. This does not verify account existence or ownership. */
export function parseSocialProfile(platform: SocialPlatform, input: string): SocialProfile {
  if (!SOCIAL_PLATFORMS.includes(platform) || typeof input !== 'string' || input.length > 2048
    || /[\u0000-\u001f\u007f\\]/.test(input)) return invalid();
  let handle = input.trim();
  if (!handle) return invalid();
  if (/^https:\/\//i.test(handle)) {
    let parsed: URL;
    try { parsed = new URL(handle); } catch { return invalid(); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port
      || !hosts[platform].includes(parsed.hostname)) return invalid();
    if (platform === 'facebook' && parsed.pathname === '/profile.php') {
      const ids = parsed.searchParams.getAll('id');
      if (ids.length !== 1 || !/^\d{1,30}$/.test(ids[0])) return invalid();
      handle = ids[0];
    } else {
      const match = /^\/([^/]+)\/?$/.exec(parsed.pathname);
      if (!match) return invalid();
      try { handle = decodeURIComponent(match[1]); } catch { return invalid(); }
      if (platform === 'tiktok') {
        if (!handle.startsWith('@')) return invalid();
        handle = handle.slice(1);
      }
    }
  } else if (handle.startsWith('@')) {
    handle = handle.slice(1);
  }
  // Do not apply new-account minimum lengths: existing short handles remain valid.
  const pattern = platform === 'x' ? /^[A-Za-z0-9_]{1,15}$/
    : platform === 'instagram' ? /^[A-Za-z0-9._]{1,30}$/
      : platform === 'facebook' ? /^[A-Za-z0-9._-]{1,100}$/ : /^[A-Za-z0-9._]{1,100}$/;
  if (!pattern.test(handle) || handle === '.' || handle === '..' || reserved[platform].includes(handle.toLowerCase())) return invalid();
  if (platform === 'facebook' && /^\d+$/.test(handle) && handle.length > 30) return invalid();
  const url = platform === 'instagram' ? `https://www.instagram.com/${handle}/`
    : platform === 'x' ? `https://x.com/${handle}`
      : platform === 'tiktok' ? `https://www.tiktok.com/@${handle}`
        : /^\d+$/.test(handle) ? `https://www.facebook.com/profile.php?id=${handle}` : `https://www.facebook.com/${handle}`;
  return { platform, handle, url };
}
