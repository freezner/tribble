import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { parseSocialProfile, SOCIAL_PLATFORMS, SocialPlatform, SocialProfile } from '../utils/socialProfiles';

export const SOCIAL_PROFILES_KEY = 'tribble:social-profiles:v1';
type Profiles = Partial<Record<SocialPlatform, SocialProfile>>;
interface SocialStore {
  profiles: Profiles;
  initialized: boolean;
  isSaving: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  saveProfile: (platform: SocialPlatform, input: string) => Promise<void>;
  removeProfile: (platform: SocialPlatform) => Promise<void>;
  clearError: () => void;
}

function readProfiles(raw: string): Profiles {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || parsed.version !== 1
      || Object.keys(parsed).some(key => key !== 'version' && key !== 'profiles')
      || !parsed.profiles || typeof parsed.profiles !== 'object' || Array.isArray(parsed.profiles)) throw new Error();
    const profiles: Profiles = {};
    for (const [key, value] of Object.entries(parsed.profiles)) {
      if (!SOCIAL_PLATFORMS.includes(key as SocialPlatform) || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      const stored = value as Record<string, unknown>;
      if (stored.platform !== key || typeof stored.handle !== 'string' || typeof stored.url !== 'string'
        || Object.keys(stored).some(field => !['platform', 'handle', 'url'].includes(field))) throw new Error();
      const profile = parseSocialProfile(key as SocialPlatform, stored.url);
      if (profile.handle !== stored.handle || profile.url !== stored.url) throw new Error();
      profiles[profile.platform] = profile;
    }
    return profiles;
  } catch { throw new Error('social-profiles-corrupt'); }
}

export const useSocialStore = create<SocialStore>((set, get) => {
  let queue: Promise<void> = Promise.resolve();
  let initialization: Promise<void> | null = null;
  let pendingWrites = 0;
  const serialize = (operation: () => Promise<void>): Promise<void> => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  const report = (error: unknown): never => {
    const code = error instanceof Error ? error.message : 'social-profiles-write-failed';
    set({ error: code });
    throw error;
  };
  const ensureInitialized = async () => {
    if (get().initialized) return;
    let raw: string | null;
    try { raw = await AsyncStorage.getItem(SOCIAL_PROFILES_KEY); }
    catch { throw new Error('social-profiles-read-failed'); }
    // Parse completely before publishing; corrupt storage is never silently replaced.
    const profiles = raw === null ? {} : readProfiles(raw);
    set({ profiles, initialized: true, error: null });
  };
  const mutate = (transform: (profiles: Profiles) => Profiles): Promise<void> => {
    pendingWrites++;
    set({ isSaving: true });
    return serialize(async () => {
      await ensureInitialized();
      const profiles = transform(get().profiles);
      try { await AsyncStorage.setItem(SOCIAL_PROFILES_KEY, JSON.stringify({ version: 1, profiles })); }
      catch { throw new Error('social-profiles-write-failed'); }
      // Do not show a successful save/remove until storage has acknowledged it.
      set({ profiles, error: null });
    }).catch(report).finally(() => {
      pendingWrites--;
      set({ isSaving: pendingWrites > 0 });
    });
  };
  return {
    profiles: {}, initialized: false, isSaving: false, error: null,
    initialize: () => {
      if (get().initialized) return Promise.resolve();
      if (initialization) return initialization;
      initialization = serialize(ensureInitialized).catch(report).finally(() => { initialization = null; });
      return initialization;
    },
    saveProfile: async (platform, input) => {
      let profile: SocialProfile;
      try { profile = parseSocialProfile(platform, input); } catch (error) { return report(error); }
      return mutate(profiles => ({ ...profiles, [platform]: profile }));
    },
    removeProfile: async platform => {
      if (!SOCIAL_PLATFORMS.includes(platform)) return report(new Error('invalid-social-profile'));
      return mutate(profiles => { const next = { ...profiles }; delete next[platform]; return next; });
    },
    clearError: () => set({ error: null }),
  };
});
