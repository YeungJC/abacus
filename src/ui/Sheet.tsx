import { useEffect, useRef } from "react";
import { SOCS, socById, socName } from "../data";
import { pluck } from "../lib/audio";
import { useApp, useT } from "../store";
import Committees from "../components/Committees";
import Guide from "../components/Guide";
import Pass from "../components/Pass";
import Steps from "../components/Steps";
import WhatsOn, { Gala } from "../components/WhatsOn";
import { placeName } from "../world/World";
import { STOPS, stopById, type StopId } from "../world/stops";

const coarse = () => matchMedia("(pointer: coarse)").matches;

function Welcome() {
  const { t, lang } = useT();
  const go = useApp((s) => s.go);
  const how = {
    en: coarse()
      ? ["Drag the street to look around.", "Hold ▲ to walk, ◀ ▶ to turn.", "Tap a name tag or a station on the line below to walk there."]
      : ["W A S D or the arrow keys to walk. Hold Shift to hurry.", "Drag to look around. Scroll to stroll.", "Click a shop, a name tag or a station on the line below to walk there."],
    hant: coarse() ? ["拖動街景四圍望。", "按住 ▲ 行，◀ ▶ 轉身。", "撳名牌或者下面路線圖嘅站就會行過去。"] : ["W A S D 或方向鍵行路，按住 Shift 行快啲。", "拖動滑鼠四圍望，碌滑鼠慢慢行。", "撳舖頭、名牌或者下面路線圖嘅站就會行過去。"],
    hans: coarse() ? ["拖动街景四处看。", "按住 ▲ 前进，◀ ▶ 转身。", "点名牌或下方路线图的站点就会走过去。"] : ["W A S D 或方向键走路，按住 Shift 走快些。", "拖动鼠标四处看，滚动滚轮慢慢走。", "点店铺、名牌或下方路线图的站点就会走过去。"],
  }[lang];
  return (
    <div className="welcome">
      <div className="hero-title">
        <div className="big-tong"><span>同</span></div>
        <div className="vertical">曼徹斯特 · 華人學會聯盟</div>
      </div>
      <h1>{t("hero.h")}</h1>
      <p className="lede">{t("hero.p")}</p>
      <ul className="how">{how.map((h) => <li key={h}>{h}</li>)}</ul>
      <div className="cta">
        <button className="btn red" onClick={() => go("hk")}>{lang === "en" ? "Start walking" : lang === "hant" ? "開始行" : "开始走"}</button>
        <button className="btn" onClick={() => go("pass")}>{t("hero.c2")}</button>
      </div>
      <Steps />
    </div>
  );
}

const YOURS = {
  en: ["Your society next", "Any university", "This shop is free. Message a founding committee, send one rep to the monthly meeting, and your lantern goes up on the street with your events on the notice board."],
  hant: ["下一個係你", "任何大學", "呢間舖免費。聯絡創始幹事，派一位代表出席每月會議，你嘅燈籠就會掛上條街，活動上告示板。"],
  hans: ["下一个是你", "任何大学", "这间铺免费。联系创始干事，派一位代表参加每月会议，你的灯笼就会挂上街，活动上告示板。"],
};

function SocietyPanel({ id }: { id: StopId }) {
  const { lang } = useT();
  const go = useApp((s) => s.go);
  const s = socById(id);
  const y = YOURS[lang];
  return (
    <div className="soc-panel" style={{ "--c": s ? `var(${s.color})` : "var(--ink-soft)" } as React.CSSProperties}>
      <div className="soc-hero">
        <span className="soc-char">{s?.char ?? "？"}</span>
        <div>
          <div className="zh">{s ? (lang === "hans" ? s.hans : s.hant) : y[0]}</div>
          <div className="en">{s ? s.en : lang === "en" ? "" : "Your society next"}</div>
          <div className="inst">{s ? s.inst : y[1]}</div>
        </div>
      </div>
      <p>{s ? s.d[lang] : y[2]}</p>
      {s && <div className="tagline">{s.tags.map((tg) => <span key={tg} className="chip">{tg}</span>)}</div>}
      <div className="soc-others">
        {SOCS.filter((o) => o.id !== id).map((o) => (
          <button key={o.id} className="soc-chip light" onClick={() => go(o.id as StopId)}>
            <span className="dot" style={{ background: `var(${o.color})` }}>{o.char}</span>{socName(o, lang)}
          </button>
        ))}
      </div>
    </div>
  );
}

function GalaPanel() {
  const { t } = useT();
  const fire = useApp((s) => s.fire);
  return (
    <div>
      <Gala onLight={() => { fire(); [6, 5, 4, 3, 2].forEach((n, i) => setTimeout(() => pluck(n, 0.12), i * 260)); }} />
      <p className="note" style={{ marginTop: 16 }}>{t("foot")}</p>
    </div>
  );
}

function Content({ id }: { id: StopId }) {
  switch (id) {
    case "gate": return <Welcome />;
    case "board": return <WhatsOn gala={false} />;
    case "pass": return <Pass />;
    case "exit": return <Guide />;
    case "teahouse": return <Committees />;
    case "gala": return <GalaPanel />;
    default: return <SocietyPanel id={id} />;
  }
}

/** The reading panel for the place you're standing at. */
export default function Sheet() {
  const open = useApp((s) => s.open);
  const lang = useApp((s) => s.lang);
  const go = useApp((s) => s.go);
  const setOpen = useApp((s) => s.setOpen);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [open]);
  if (!open) return null;
  const stop = stopById(open);
  const i = STOPS.findIndex((s) => s.id === open);
  const next = STOPS[i + 1];
  return (
    <aside className="sheet" aria-label={placeName(stop, lang)}>
      <header className="sheet-head">
        <span className="seal">{(socById(open)?.char ?? stop.zh)[0]}</span>
        <div>
          <b>{placeName(stop, lang)}</b>
          <span>{lang === "en" ? stop.zh : stop.en}</span>
        </div>
        <button className="sheet-x" onClick={() => setOpen(null)} aria-label="Close">×</button>
      </header>
      <div className="sheet-body" ref={body}>
        <Content id={open} />
      </div>
      {next && (
        <footer className="sheet-foot">
          <button className="btn" onClick={() => go(next.id)}>
            {lang === "en" ? "Next: " : "下一站："}{placeName(next, lang)} →
          </button>
        </footer>
      )}
    </aside>
  );
}
