import { useState } from "react";
import Committees from "./components/Committees";
import Guide from "./components/Guide";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Pass from "./components/Pass";
import Societies from "./components/Societies";
import Steps from "./components/Steps";
import WhatsOn from "./components/WhatsOn";
import { useT } from "./store";

export default function App() {
  const { t } = useT();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);

  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /** A lantern was picked in the street: unroll that society's scroll and bring it into view. */
  const pick = (id: string) => {
    setOpen((o) => new Set(o).add(id));
    setFlash(id);
    requestAnimationFrame(() => {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("scroll-" + id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
    setTimeout(() => setFlash(null), 1300);
  };

  return (
    <>
      <Header />
      <main id="top">
        <Hero onPick={pick} />
        <Steps />
        <Societies open={open} toggle={toggle} flash={flash} />
        <WhatsOn />
        <Pass />
        <Guide />
        <Committees />
      </main>
      <footer>
        <div className="wrap">
          <span><span className="seal" style={{ width: 24, height: 24, fontSize: 14, verticalAlign: "middle", marginRight: 8 }}>同</span>{t("foot")}</span>
          <span>EN · 繁 · 简</span>
        </div>
      </footer>
    </>
  );
}
