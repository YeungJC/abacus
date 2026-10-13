import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { SOCS, socName } from "../data";
import { pluck } from "../lib/audio";
import { useT } from "../store";

const LanternStreet = lazy(() => import("../scene/LanternStreet"));

/** If WebGL is missing or the scene throws, keep the hero without it. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

const hasWebGL = () => {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
};

export default function Hero({ onPick }: { onPick: (id: string) => void }) {
  const { t, lang } = useT();
  const [hot, setHot] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    // lantern and sign textures are drawn with the brush font, so wait for it (briefly)
    const timeout = new Promise((r) => setTimeout(r, 2500));
    const load = document.fonts?.load('700 100px "LXGW WenKai TC"', "同港算盤韻粥麵茶樓") ?? Promise.resolve();
    Promise.race([load, timeout]).finally(() => setFontsReady(true));
  }, []);

  const all = [...SOCS, { id: "yours", char: "？", color: "--ink-soft", en: "Your society next", hant: "下一個係你", hans: "下一个是你" }];

  return (
    <section className="hero">
      <div className="hero-canvas" aria-hidden="true">
        {fontsReady && hasWebGL() && (
          <SceneBoundary>
            <Suspense fallback={null}>
              <LanternStreet onPick={onPick} onHover={setHot} still={reduce} />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      <div className="hero-scrim" />
      <div className="wrap hero-inner">
        <div className="hero-title">
          <div className="big-tong"><span>同</span></div>
          <div className="vertical">曼徹斯特 · 華人學會聯盟</div>
          <span className="seal" aria-hidden="true">同行</span>
        </div>
        <h1>{t("hero.h")}</h1>
        <p className="lede">{t("hero.p")}</p>
        <div className="cta">
          <a className="btn red" href="#whatson">{t("hero.c1")}</a>
          <a className="btn" href="#pass">{t("hero.c2")}</a>
        </div>
        <div className="soc-chips">
          {all.map((s, i) => (
            <button key={s.id} className={"soc-chip" + (hot === s.id ? " hot" : "")} onMouseEnter={() => pluck(i)} onClick={() => onPick(s.id)}>
              <span className="dot" style={{ background: `var(${s.color})` }}>{s.char}</span>
              {socName(s, lang)}
            </button>
          ))}
        </div>
        <p className="hint">{t("hero.hint")}</p>
      </div>
    </section>
  );
}
