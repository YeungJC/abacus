import { useEffect, useRef, useState } from "react";
import { EVENTS, GALA_AT, SOCS, socById, socName } from "../data";
import { pluck } from "../lib/audio";
import { fmtDate } from "../lib/dates";
import { local } from "../lib/storage";
import { useT } from "../store";

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function useCountdown(at: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  let s = Math.max(0, Math.floor((at - now) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return { d, h, m, s };
}

type Spark = { x: number; y: number; vx: number; vy: number; life: number; c: string; s: number; paper?: boolean };

/** Firecrackers: sparks plus spinning scraps of red paper. */
function useFirecrackers() {
  const cv = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Spark[]>([]);
  const running = useRef(false);

  function loop() {
    const c = cv.current!, x = c.getContext("2d")!;
    const w = (c.width = innerWidth), h = (c.height = innerHeight);
    x.clearRect(0, 0, w, h);
    for (const p of parts.current) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.985; p.life -= p.paper ? 0.008 : 0.016;
      x.globalAlpha = Math.max(0, p.life); x.fillStyle = p.c;
      if (p.paper) { x.save(); x.translate(p.x, p.y); x.rotate(p.life * 9); x.fillRect(-p.s / 2, -p.s, p.s, p.s * 2); x.restore(); }
      else { x.beginPath(); x.arc(p.x, p.y, p.s * p.life, 0, Math.PI * 2); x.fill(); }
    }
    parts.current = parts.current.filter((p) => p.life > 0 && p.y < h + 20);
    if (parts.current.length) requestAnimationFrame(loop);
    else { running.current = false; x.clearRect(0, 0, w, h); }
  }

  function burst(px: number, py: number) {
    const cols = [css("--cinnabar"), css("--gold"), "#ffd36b", "#ff7a4d"];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
      parts.current.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, c: cols[i % cols.length], s: 2 + Math.random() * 2.5 });
    }
    for (let i = 0; i < 6; i++) parts.current.push({ x: px, y: py, vx: (Math.random() - 0.5) * 3, vy: -3 - Math.random() * 3, life: 1.4, c: css("--cinnabar"), s: 7, paper: true });
    if (!running.current) { running.current = true; requestAnimationFrame(loop); }
  }
  return { cv, burst };
}

export default function WhatsOn({ gala = true }: { gala?: boolean }) {
  const { t, lang } = useT();
  const [filter, setFilter] = useState(() => local.get("filter", "all"));
  const { cv, burst } = useFirecrackers();

  const pick = (id: string) => { setFilter(id); local.set("filter", id); };
  const light = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    [0, 180, 360, 540, 720].forEach((ms, i) =>
      setTimeout(() => { burst(r.left + r.width / 2 + (Math.random() - 0.5) * 260, r.top - 40 - Math.random() * 160); pluck(6 - i, 0.12); }, ms),
    );
  };

  return (
    <section className="panel" id="whatson">
      <div className="wrap">
        <div className="sec-head">
          <span className="seal">榜</span>
          <div><h2>{t("ev.h")}</h2><p>{t("ev.p")}</p></div>
        </div>
        <div className="filters" role="group" aria-label="Filter by society">
          <button aria-pressed={filter === "all"} onClick={() => pick("all")}>{lang === "en" ? "All" : "全部"}</button>
          {SOCS.map((s) => <button key={s.id} aria-pressed={filter === s.id} onClick={() => pick(s.id)}>{socName(s, lang)}</button>)}
        </div>
        <div className="board">
          <table>
            <thead><tr><th>{t("ev.date")}</th><th>{t("ev.event")}</th><th>{t("ev.lines")}</th><th>{t("ev.where")}</th><th>{t("ev.price")}</th></tr></thead>
            <tbody>
              {EVENTS.filter((e) => filter === "all" || e.socs.includes(filter)).map((e) => {
                const [d1, d2] = fmtDate(e.date, lang);
                return (
                  <tr key={e.date + e.t.en}>
                    <td className="date">{d1}<small>{d2}</small></td>
                    <td><div className="title">{e.t[lang]}</div>{e.flag && <div className="flag">{lang === "en" ? "FLAGSHIP · ALL SOCIETIES" : "旗艦活動"}</div>}</td>
                    <td><div className="dots">{e.socs.map((id) => { const s = socById(id)!; return <span key={id} className="dot" style={{ background: `var(${s.color})` }} title={s.en}>{s.char}</span>; })}</div></td>
                    <td>{e.where}</td>
                    <td className="price">{e.price ? "£" + e.price : lang === "en" ? "Free" : "免費"} <s>£{e.full}</s></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">{t("ev.note")}</p>

        {gala && <Gala onLight={light} />}
      </div>
      <canvas id="fx" ref={cv} aria-hidden="true" />
    </section>
  );
}

/** The gala banner: countdown to the Lunar New Year Gala and a button to set off firecrackers. */
export function Gala({ onLight }: { onLight: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const { t } = useT();
  const cd = useCountdown(GALA_AT);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="gala">
      <div>
        <span className="eyebrow" style={{ color: "inherit", opacity: 0.8 }}>丁未 · Year of the Goat</span>
        <h3>{t("gala.h")}</h3>
        <p>{t("gala.p")}</p>
        <button className="btn" onClick={onLight}>{t("gala.btn")}</button>
      </div>
      <div className="clock">
        <div><b>{cd.d}</b><span>{t("t.d")}</span></div>
        <div><b>{pad(cd.h)}</b><span>{t("t.h")}</span></div>
        <div><b>{pad(cd.m)}</b><span>{t("t.m")}</span></div>
        <div><b>{pad(cd.s)}</b><span>{t("t.s")}</span></div>
      </div>
    </div>
  );
}
