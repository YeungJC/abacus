import { useEffect, useRef } from "react";
import { SOCS } from "../data";
import { useApp } from "../store";
import { placeName } from "../world/World";
import { STOPS } from "../world/stops";

const CHAR: Record<string, string> = { gate: "坊", yours: "？", board: "榜", pass: "包", exit: "出", teahouse: "茶", gala: "春" };
/** Short station names, so eleven fit on one line. */
const SHORT: Record<string, [string, string, string]> = {
  gate: ["Gate", "牌坊", "牌坊"], hk: ["HK Soc", "港學會", "港学会"], mabc: ["MMU ABACUS", "都大算盤", "都大算盘"], uabc: ["UoM ABACUS", "曼大算盤", "曼大算盘"],
  echo: ["Echoes", "華韻社", "华韵社"], yours: ["Your society", "空舖", "空铺"], board: ["What's on", "告示板", "告示板"], pass: ["Joint Pass", "通行證", "通行证"],
  exit: ["Guide", "出口", "出口"], teahouse: ["Committees", "茶樓", "茶楼"], gala: ["Gala", "晚會", "晚会"],
};

/** The street as a metro line: every place is a station, and the marker is you. */
export default function MapStrip() {
  const z = useApp((s) => s.z);
  const lang = useApp((s) => s.lang);
  const near = useApp((s) => s.near);
  const go = useApp((s) => s.go);
  const nav = useRef<HTMLElement>(null);
  // keep the station you're at in view when the line is wider than the screen
  useEffect(() => {
    const el = nav.current?.querySelector(".map-stop.here") as HTMLElement | null;
    if (el && nav.current && nav.current.scrollWidth > nav.current.clientWidth) {
      nav.current.scrollTo({ left: el.offsetLeft - nav.current.clientWidth / 2, behavior: "smooth" });
    }
  }, [near]);
  const n = STOPS.length;
  // position along the line, interpolated between the stations either side of you
  let f = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = STOPS[i].at[1], b = STOPS[i + 1].at[1];
    if (z <= a && z >= b) { f = i + (a - z) / (a - b); break; }
    if (z < b) f = i + 1;
  }
  const pct = (i: number) => `${(i / (n - 1)) * 100}%`;
  return (
    <nav className="map" aria-label="Places on the street" ref={nav}>
      <div className="map-line">
        <div className="map-track" />
        <div className="map-you" style={{ left: pct(f) }} title="You are here" />
        {STOPS.map((s, i) => {
          const soc = SOCS.find((x) => x.id === s.id);
          return (
            <button key={s.id} className={"map-stop" + (near === s.id ? " here" : "")} style={{ left: pct(i), ...(soc ? { background: `var(${soc.color})` } : {}) }} onClick={() => go(s.id)} title={placeName(s, lang)} aria-label={placeName(s, lang)}>
              <span className="map-char">{soc?.char ?? CHAR[s.id]}</span>
              <span className="map-name">{SHORT[s.id][lang === "en" ? 0 : lang === "hant" ? 1 : 2]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
