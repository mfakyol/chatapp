import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme-preference";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",

  setPreference: (preference) => {
    set({ preference });
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  },
}));

AsyncStorage.getItem(STORAGE_KEY)
  .then((value) => {
    if (value === "light" || value === "dark" || value === "system") {
      useThemeStore.setState({ preference: value });
    }
  })
  .catch(() => {});
