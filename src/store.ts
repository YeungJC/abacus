import { create } from "zustand";
import type { Lang } from "./data";
import { tr as translate } from "./i18n";
import { local } from "./lib/storage";
import type { StopId } from "./world/stops";

type State = {
  lang: Lang;
  sound: boolean;
  /** "world": walk the 3D street. "page": the same content as a plain scrolling page. */
  mode: "world" | "page";
  /** the place you are standing at, if any */
  near: StopId | null;
  /** the place whose panel is open */
  open: StopId | null;
  /** where the auto-walk is heading */
  walkTo: StopId | null;
  /** player z, for the map strip (updated a few times a second) */
  z: number;
  /** bumps when someone lights the firecrackers, so the 3D sky can burst */
  fireworks: number;
  setLang: (l: Lang) => void;
  setSound: (on: boolean) => void;
  setMode: (m: "world" | "page") => void;
  setNear: (s: StopId | null) => void;
  setOpen: (s: StopId | null) => void;
  go: (s: StopId) => void;
  arrived: () => void;
  setZ: (z: number) => void;
  fire: () => void;
};

const saved = local.get<Lang>("lang", "en");

export const useApp = create<State>((set) => ({
  lang: saved === "hant" || saved === "hans" ? saved : "en",
  sound: false,
  mode: "world",
  near: "gate",
  open: "gate",
  walkTo: null,
  z: 17,
  fireworks: 0,
  setLang: (lang) => {
    local.set("lang", lang);
    document.documentElement.lang = lang === "en" ? "en-GB" : lang === "hant" ? "zh-Hant-HK" : "zh-Hans";
    set({ lang });
  },
  setSound: (sound) => set({ sound }),
  setMode: (mode) => set({ mode }),
  setNear: (near) => set({ near }),
  setOpen: (open) => set({ open }),
  // walking somewhere closes whatever you were reading; arriving opens the new place
  go: (walkTo) => set({ walkTo, open: null }),
  arrived: () => set((s) => ({ open: s.walkTo, walkTo: null })),
  setZ: (z) => set({ z }),
  fire: () => set((s) => ({ fireworks: s.fireworks + 1 })),
}));

/** Translate with the current language; re-renders the caller when it changes. */
export function useT() {
  const lang = useApp((s) => s.lang);
  return { lang, t: (k: string) => translate(lang, k) };
}
