import { SOCS, socName } from "../data";
import { useApp, useT } from "../store";
import { canWalk } from "./Header";

/** The page view's opener. The 3D street is the other way in. */
export default function Hero() {
  const { t, lang } = useT();
  const setMode = useApp((s) => s.setMode);
  return (
    <section className="hero page-hero">
      <div className="wrap hero-inner">
        <div className="hero-title">
          <div className="big-tong"><span>同</span></div>
          <div className="vertical">曼徹斯特 · 華人學會聯盟</div>
          <span className="seal" aria-hidden="true">同行</span>
        </div>
        <h1>{t("hero.h")}</h1>
        <p className="lede">{t("hero.p")}</p>
        <div className="cta">
          {canWalk && <button className="btn red" onClick={() => { setMode("world"); window.scrollTo(0, 0); }}>{lang === "en" ? "Walk the street in 3D" : "行入 3D 街道"}</button>}
          <a className={"btn" + (canWalk ? "" : " red")} href="#whatson">{t("hero.c1")}</a>
          <a className="btn" href="#pass">{t("hero.c2")}</a>
        </div>
        <div className="soc-chips">
          {SOCS.map((s) => (
            <a key={s.id} className="soc-chip" href="#societies">
              <span className="dot" style={{ background: `var(${s.color})` }}>{s.char}</span>
              {socName(s, lang)}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
