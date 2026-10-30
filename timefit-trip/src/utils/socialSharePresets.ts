import { SocialPlatform } from './socialProfiles';
import { TripShareFormat } from './tripShareLayout';

// Export presets are chosen for readable trip cards. They do not select a posting
// account or force the destination in the operating system's share sheet.
export const SOCIAL_SHARE_FORMATS: Record<SocialPlatform, readonly TripShareFormat[]> = {
  instagram: ['instagram-feed', 'instagram-story'],
  x: ['x-post'],
  facebook: ['facebook-feed', 'facebook-story'],
  tiktok: ['tiktok-photo'],
};

export const SOCIAL_SHARE_PRESET_DETAILS: Partial<Record<TripShareFormat, { label: string; ratio: string }>> = {
  'instagram-feed': { label: 'social.post', ratio: '3:4' },
  'instagram-story': { label: 'social.storyPlacement', ratio: '9:16' },
  'facebook-feed': { label: 'social.post', ratio: '4:5' },
  'facebook-story': { label: 'social.storyPlacement', ratio: '9:16' },
  'x-post': { label: 'social.post', ratio: '1:1' },
  'tiktok-photo': { label: 'social.photoPost', ratio: '9:16' },
};

// Keep every page available for saving; only explain when a post must be split.
export const SOCIAL_POST_IMAGE_LIMITS: Partial<Record<SocialPlatform, number>> = { x: 4, tiktok: 35 };
