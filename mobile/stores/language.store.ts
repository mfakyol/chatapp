import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { create } from "zustand";

export type Language = "en" | "tr" | "de";
export type LanguagePreference = "system" | Language;

const STORAGE_KEY = "language-preference";

export function resolveLanguage(preference: LanguagePreference): Language {
  if (preference !== "system") return preference;
  const code = Localization.getLocales()[0]?.languageCode;
  if (code === "tr") return "tr";
  if (code === "de") return "de";
  return "en";
}

interface LanguageState {
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  preference: "system",

  setPreference: (preference) => {
    set({ preference });
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  },
}));

AsyncStorage.getItem(STORAGE_KEY)
  .then((value) => {
    if (value === "en" || value === "tr" || value === "de" || value === "system") {
      useLanguageStore.setState({ preference: value });
    }
  })
  .catch(() => {});
