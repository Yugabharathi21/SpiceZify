import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'system' | 'light' | 'dark';

type SettingsState = {
  theme: Theme;
  accentColor: string;
  animations: boolean;
  autoScan: boolean;
  audioQuality: 'low' | 'normal' | 'high' | 'lossless';
  crossfade: number; // seconds
  normalizeVolume: boolean;
  autoplay: boolean;
  setTheme: (t: Theme) => void;
  setAccentColor: (c: string) => void;
  setAnimations: (v: boolean) => void;
  setAutoScan: (v: boolean) => void;
  setAudioQuality: (q: SettingsState['audioQuality']) => void;
  setCrossfade: (s: number) => void;
  setNormalizeVolume: (v: boolean) => void;
  setAutoplay: (v: boolean) => void;
  reset: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      accentColor: '#1DB954',
      animations: true,
      autoScan: false,
      audioQuality: 'high',
      crossfade: 6,
      normalizeVolume: true,
      autoplay: false,
  setTheme: (t: Theme) => set({ theme: t }),
  setAccentColor: (c: string) => set({ accentColor: c }),
  setAnimations: (v: boolean) => set({ animations: v }),
  setAutoScan: (v: boolean) => set({ autoScan: v }),
  setAudioQuality: (q: SettingsState['audioQuality']) => set({ audioQuality: q }),
  setCrossfade: (s: number) => set({ crossfade: s }),
  setNormalizeVolume: (v: boolean) => set({ normalizeVolume: v }),
  setAutoplay: (v: boolean) => set({ autoplay: v }),
      reset: () =>
        set({
          theme: 'dark',
          accentColor: '#1DB954',
          animations: true,
          autoScan: false,
          audioQuality: 'high',
          crossfade: 6,
          normalizeVolume: true,
          autoplay: false,
        }),
    }),
    {
      name: 'spicezify-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useSettingsStore;
