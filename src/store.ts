import { create } from "zustand";
import type { Lang } from "./data";
import { tr as translate } from "./i18n";
import { local } from "./lib/storage";
import { STOPS, type StopId } from "./world/stops";

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
  /** the opening fly-in through the gate is still playing */
  intro: boolean;
  /** the "how to walk" card is showing */
  help: boolean;
  setLang: (l: Lang) => void;
  setSound: (on: boolean) => void;
  setMode: (m: "world" | "page") => void;
  setNear: (s: StopId | null) => void;
  setOpen: (s: StopId | null) => void;
  go: (s: StopId) => void;
  arrived: () => void;
  setZ: (z: number) => void;
  fire: () => void;
  finishIntro: () => void;
  /** walk to the next (1) or previous (-1) place along the street */
  step: (dir: 1 | -1) => void;
  setHelp: (on: boolean) => void;
};

const saved = local.get<Lang>("lang", "en");

export const useApp = create<State>((set) => ({
  lang: saved === "hant" || saved === "hans" ? saved : "en",
  sound: false,
  mode: "world",
  near: "gate",
  open: null,
  walkTo: null,
  z: 17,
  fireworks: 0,
  intro: true,
  help: false,
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
  finishIntro: () =>
    set((s) => (s.intro ? { intro: false, open: s.open ?? (s.walkTo ? null : "gate"), help: !local.get("helpSeen", false) } : {})),
  step: (dir) =>
    set((s) => {
      // from where you stand, or from the nearest place along the street
      let i = STOPS.findIndex((x) => x.id === (s.walkTo ?? s.near));
      if (i < 0) {
        const ahead = STOPS.findIndex((x) => x.at[1] < s.z);
        i = dir === 1 ? ahead - 1 : ahead;
        if (ahead < 0) i = dir === 1 ? STOPS.length - 1 : STOPS.length;
      }
      const next = STOPS[Math.max(0, Math.min(STOPS.length - 1, i + dir))];
      return next ? { walkTo: next.id, open: null } : {};
    }),
  setHelp: (help) => {
    if (!help) local.set("helpSeen", true);
    set({ help });
  },
}));

/** Translate with the current language; re-renders the caller when it changes. */
export function useT() {
  const lang = useApp((s) => s.lang);
  return { lang, t: (k: string) => translate(lang, k) };
}
