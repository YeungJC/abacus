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

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

export default function Header() {
  const { t } = useT();
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
    <header className="bar">
      <div className="wrap">
        <a className="logo" href="#top"><span className="seal">同</span><b>TONG Manchester</b></a>
        <nav className="nav" aria-label="Sections">
          <a href="#societies">{t("nav.soc")}</a>
          <a href="#whatson">{t("nav.ev")}</a>
          <a href="#pass">{t("nav.pass")}</a>
          <a href="#guide">{t("nav.guide")}</a>
          <a href="#committees">{t("nav.com")}</a>
        </nav>
        <div className="tools">
          <LangSwitch />
          <button
            className="icon-btn"
            aria-pressed={sound}
            title="Lantern chimes (pentatonic 五音)"
            onClick={() => {
              const on = !sound && enableSound();
              setSound(on);
              if (on) setTimeout(() => pluck(3), 0);
            }}
          >五音</button>
          <button
            className="icon-btn"
            title={dark ? "Switch to day" : "Switch to lantern night"}
            onClick={() => { document.documentElement.dataset.theme = dark ? "light" : "dark"; setDark(!dark); }}
          >{dark ? "晝" : "夜"}</button>
        </div>
      </div>
    </header>
  );
}
