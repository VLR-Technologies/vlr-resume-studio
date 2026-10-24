import { create } from 'zustand';
import { storageError } from '@/services/storage/repository';
interface UiState {
  pending: boolean;
  notice: { text: string; error: boolean } | null;
  dismiss: () => void;
  run: (action: () => Promise<unknown>, success: string) => Promise<boolean>;
}
// Only transient operation feedback lives here. Dexie remains the record authority.
export const useUi = create<UiState>((set, get) => ({
  pending: false,
  notice: null,
  dismiss: () => set({ notice: null }),
  run: async (action, success) => {
    if (get().pending) return false;
    set({ pending: true, notice: null });
    try {
      await action();
      set({ notice: { text: success, error: false } });
      return true;
    } catch (error) {
      set({ notice: { text: storageError(error).message, error: true } });
      return false;
    } finally {
      set({ pending: false });
    }
  },
}));
