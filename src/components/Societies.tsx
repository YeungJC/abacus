import { SOCS } from "../data";
import { useT } from "../store";

const YOURS = {
  en: ["Your society", "Join for free. Message a founding committee, send one rep to the monthly meeting, then your events appear on the board.", "How to add your lantern"],
  hant: ["你嘅學會", "免費加入。聯絡創始幹事，派一位代表出席每月會議，你嘅活動就會上告示板。", "點樣掛燈籠"],
  hans: ["你的学会", "免费加入。联系创始干事，派一位代表参加每月会议，你的活动就会上告示板。", "怎样挂灯笼"],
};

export default function Societies({ open, toggle, flash }: { open: Set<string>; toggle: (id: string) => void; flash: string | null }) {
  const { t, lang } = useT();
  const roll = (on: boolean) => (on ? (lang === "en" ? "Roll up" : "收起") : lang === "en" ? "Unroll" : lang === "hant" ? "展開" : "展开");
  const y = YOURS[lang];

  return (
    <section className="panel" id="societies">
      <div className="wrap">
        <div className="sec-head">
          <span className="seal">社</span>
          <div><h2>{t("soc.h")}</h2><p>{t("soc.p")}</p></div>
        </div>
        <div className="scrolls">
          {SOCS.map((s) => {
            const on = open.has(s.id);
            return (
              <div key={s.id} id={"scroll-" + s.id} className={"scroll" + (on ? " open" : "") + (flash === s.id ? " flash" : "")} style={{ "--c": `var(${s.color})` } as React.CSSProperties}>
                <div className="rod" />
                <button className="face" aria-expanded={on} onClick={() => toggle(s.id)}>
                  <div className="zh">{lang === "hans" ? s.hans : s.hant}</div>
                  <div className="en">{s.en}</div>
                  <div className="inst">{s.inst}</div>
                  <div className="more"><div>
                    <p>{s.d[lang]}</p>
                    <div className="tagline">{s.tags.map((tg) => <span key={tg} className="chip">{tg}</span>)}</div>
                  </div></div>
                  <div className="pull"><span>{roll(on)}</span><span className="arrow">▾</span></div>
                </button>
                <div className="rod" />
              </div>
            );
          })}
          <div id="scroll-yours" className={"scroll yours" + (open.has("yours") ? " open" : "") + (flash === "yours" ? " flash" : "")}>
            <div className="rod" />
            <button className="face" aria-expanded={open.has("yours")} onClick={() => toggle("yours")}>
              <div className="zh">？</div>
              <div className="en">{y[0]}</div>
              <div className="inst">Any university</div>
              <div className="more"><div><p>{y[1]}</p></div></div>
              <div className="pull"><span>{y[2]}</span><span className="arrow">▾</span></div>
            </button>
            <div className="rod" />
          </div>
        </div>
      </div>
    </section>
  );
}
