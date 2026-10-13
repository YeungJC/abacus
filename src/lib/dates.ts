import type { Lang } from "../data";

const WD = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], zh: ["日", "一", "二", "三", "四", "五", "六"] };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** [main line, sub line] for a date, e.g. ["Sat 24 Oct", "2026"] or ["10月24日", "星期六 · 2026"] */
export function fmtDate(s: string, lang: Lang): [string, string] {
  const d = parseISO(s), w = d.getUTCDay();
  if (lang === "en") return [`${WD.en[w]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`, String(d.getUTCFullYear())];
  return [`${d.getUTCMonth() + 1}月${d.getUTCDate()}日`, `${lang === "hant" ? "星期" : "周"}${WD.zh[w]} · ${d.getUTCFullYear()}`];
}
