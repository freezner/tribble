import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export const CARD_PREFERENCES_KEY = 'tribble:card-preferences:v1';
// Matches React Native TextInput.maxLength (UTF-16 code units).
export const CARD_TITLE_MAX_LENGTH = 40;

interface CardPreferencesStore {
  /** Empty means the card uses its default title, tribble. */
  title: string;
  initialized: boolean;
  isSaving: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  saveTitle: (input: string) => Promise<void>;
  clearError: () => void;
}

function normalizeTitle(input: string): string {
  if (typeof input !== 'string' || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(input)) {
    throw new Error('invalid-card-title');
  }
  const title = input.trim();
  if (title.length > CARD_TITLE_MAX_LENGTH) throw new Error('invalid-card-title');
  return title;
}

function readTitle(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || parsed.version !== 1
      || Object.keys(parsed).some(key => key !== 'version' && key !== 'title')
      || typeof parsed.title !== 'string' || normalizeTitle(parsed.title) !== parsed.title) throw new Error();
    return parsed.title;
  } catch { throw new Error('card-preferences-corrupt'); }
}

export const useCardPreferencesStore = create<CardPreferencesStore>((set, get) => {
  let queue: Promise<void> = Promise.resolve();
  let initialization: Promise<void> | null = null;
  let pendingWrites = 0;
  const serialize = (operation: () => Promise<void>): Promise<void> => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  const report = (error: unknown): never => {
    set({ error: error instanceof Error ? error.message : 'card-preferences-write-failed' });
    throw error;
  };
  const ensureInitialized = async () => {
    if (get().initialized) return;
    let raw: string | null;
    try { raw = await AsyncStorage.getItem(CARD_PREFERENCES_KEY); }
    catch { throw new Error('card-preferences-read-failed'); }
    // Do not replace unreadable storage with an empty/default preference.
    const title = raw === null ? '' : readTitle(raw);
    set({ title, initialized: true, error: null });
  };
  return {
    title: '', initialized: false, isSaving: false, error: null,
    initialize: () => {
      if (get().initialized) return Promise.resolve();
      if (initialization) return initialization;
      initialization = serialize(ensureInitialized).catch(report).finally(() => { initialization = null; });
      return initialization;
    },
    saveTitle: async input => {
      let title: string;
      try { title = normalizeTitle(input); } catch (error) { return report(error); }
      pendingWrites++;
      set({ isSaving: true });
      return serialize(async () => {
        await ensureInitialized();
        try { await AsyncStorage.setItem(CARD_PREFERENCES_KEY, JSON.stringify({ version: 1, title })); }
        catch { throw new Error('card-preferences-write-failed'); }
        set({ title, error: null });
      }).catch(report).finally(() => {
        pendingWrites--;
        set({ isSaving: pendingWrites > 0 });
      });
    },
    clearError: () => set({ error: null }),
  };
});
