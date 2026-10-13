/** Per-viewer conveniences only. Storage can be missing or throw in previews and private windows. */
export const local = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem("tong." + k);
      return v == null ? d : (JSON.parse(v) as T);
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem("tong." + k, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  },
};
