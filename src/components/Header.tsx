import { useEffect, useState } from "react";
import type { Lang } from "../data";
import { enableSound, pluck } from "../lib/audio";
import { useApp, useT } from "../store";

export function LangSwitch({ labels }: { labels?: Record<Lang, string> }) {
  const { lang } = useT();
  const setLang = useApp((s) => s.setLang);
  const l = labels ?? { en: "EN", hant: "繁", hans: "简" };
  return (
    <div className="seg" role="group" aria-label="Language">
      {(["en", "hant", "hans"] as Lang[]).map((k) => (
        <button key={k} aria-pressed={lang === k} onClick={() => setLang(k)}>{l[k]}</button>
      ))}
    </div>
  );
}

/** Can this browser draw the 3D street? */
export const canWalk = (() => {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
})();

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

export default function Header() {
  const { t, lang } = useT();
  const mode = useApp((s) => s.mode);
  const narrow = typeof window !== "undefined" && window.innerWidth < 560;
  const setMode = useApp((s) => s.setMode);
  const setHelp = useApp((s) => s.setHelp);
  const sound = useApp((s) => s.sound);
  const setSound = useApp((s) => s.setSound);
  const [dark, setDark] = useState(() => {
    const th = document.documentElement.dataset.theme;
    return th ? th === "dark" : systemDark();
  });

  useEffect(() => {
    // follow the viewer's theme changes made outside the page
    const sync = () => {
      const th = document.documentElement.dataset.theme;
      setDark(th ? th === "dark" : systemDark());
    };
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mq.removeEventListener("change", sync); mo.disconnect(); };
  }, []);

  return (
    <header className={"bar" + (mode === "world" ? " bar-world" : "")}>
      <div className="wrap">
        <a className="logo" href="#top"><span className="seal">同</span><b>TONG Manchester</b></a>
        {mode === "page" && <nav className="nav" aria-label="Sections">
          <a href="#societies">{t("nav.soc")}</a>
          <a href="#whatson">{t("nav.ev")}</a>
          <a href="#pass">{t("nav.pass")}</a>
          <a href="#guide">{t("nav.guide")}</a>
          <a href="#committees">{t("nav.com")}</a>
        </nav>}
        <div className="tools">
          {canWalk && (
            <button className="icon-btn mode-btn" onClick={() => { setMode(mode === "world" ? "page" : "world"); window.scrollTo(0, 0); }}>
              {mode === "world" ? (lang === "en" ? (narrow ? "Page" : "Read as a page") : "頁面版") : lang === "en" ? (narrow ? "3D" : "Walk the street") : "行條街"}
            </button>
          )}
          <LangSwitch />
          <button
            className="icon-btn"
            aria-pressed={sound}
            title={sound ? "Sound on: lantern chimes" : "Sound off"}
            aria-label={sound ? "Turn sound off" : "Turn sound on"}
            onClick={() => {
              const on = !sound && enableSound();
              setSound(on);
              if (on) setTimeout(() => pluck(3), 0);
            }}
          >{sound ? "♪ 五音" : "五音"}</button>
          {mode === "world" ? (
            <button className="icon-btn help-btn" title={lang === "en" ? "How to get around" : "點樣行"} aria-label="How to get around" onClick={() => setHelp(true)}>?</button>
          ) : (
            <button
              className="icon-btn"
              title={dark ? "Switch to day" : "Switch to lantern night"}
              onClick={() => { document.documentElement.dataset.theme = dark ? "light" : "dark"; setDark(!dark); }}
            >{dark ? "晝" : "夜"}</button>
          )}
        </div>
      </div>
    </header>
  );
}
