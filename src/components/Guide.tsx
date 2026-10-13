import { useState } from "react";
import { EXITS } from "../data";
import { pluck } from "../lib/audio";
import { local } from "../lib/storage";
import { useT } from "../store";
import { LangSwitch } from "./Header";

export default function Guide() {
  const { t, lang } = useT();
  const [idx, setIdx] = useState(() => Math.min(EXITS.length - 1, Math.max(0, local.get("exit", 0))));
  const x = EXITS[idx];
  return (
    <section className="panel" id="guide">
      <div className="wrap">
        <div className="sec-head">
          <span className="seal">新</span>
          <div><h2>{t("guide.h")}</h2><p>{t("guide.p")}</p></div>
        </div>
        <div className="script-switch">
          <span>{t("guide.read")}</span>
          <LangSwitch labels={{ en: "English", hant: "繁體 · HK TW MO", hans: "简体 · CN MY" }} />
        </div>
        <div className="exits">
          <div className="exit-list" role="tablist">
            {EXITS.map((e, i) => (
              <button key={e.L} role="tab" aria-selected={i === idx} onClick={() => { setIdx(i); local.set("exit", i); pluck(i); }}>
                <span className="x-letter">{e.L}</span><span className="x-zh">{e.zh}</span><span className="x-name">{e.name[lang]}</span>
              </button>
            ))}
          </div>
          <article className="exit-page" role="tabpanel">
            <span className="watermark" aria-hidden="true">{x.zh}</span>
            <span className="eyebrow">{lang === "en" ? "Exit" : "出口"} {x.L}</span>
            <h3>{x.name[lang]}</h3>
            <p>{x.body[lang]}</p>
            <p className="tip">{x.tip[lang]}</p>
          </article>
        </div>
        <p className="note">{t("guide.note")}</p>
      </div>
    </section>
  );
}
