import { create } from "zustand";
import type { Lang } from "./data";
import { tr as translate } from "./i18n";
import { local } from "./lib/storage";

type State = {
  lang: Lang;
  sound: boolean;
  setLang: (l: Lang) => void;
  setSound: (on: boolean) => void;
};

const saved = local.get<Lang>("lang", "en");

export const useApp = create<State>((set) => ({
  lang: saved === "hant" || saved === "hans" ? saved : "en",
  sound: false,
  setLang: (lang) => {
    local.set("lang", lang);
    document.documentElement.lang = lang === "en" ? "en-GB" : lang === "hant" ? "zh-Hant-HK" : "zh-Hans";
    set({ lang });
  },
  setSound: (sound) => set({ sound }),
}));

/** Translate with the current language; re-renders the caller when it changes. */
export function useT() {
  const lang = useApp((s) => s.lang);
  return { lang, t: (k: string) => translate(lang, k) };
}
