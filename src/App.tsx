import { lazy, Suspense, useEffect, useState } from "react";
import Committees from "./components/Committees";
import Guide from "./components/Guide";
import Header, { canWalk } from "./components/Header";
import Hero from "./components/Hero";
import Pass from "./components/Pass";
import Societies from "./components/Societies";
import Steps from "./components/Steps";
import WhatsOn from "./components/WhatsOn";
import { useApp, useT } from "./store";
import { LiquidGlyph } from "./fx/Liquid";
import Help from "./ui/Help";
import MapStrip from "./ui/MapStrip";
import Prompt from "./ui/Prompt";
import Sheet from "./ui/Sheet";
import Stick from "./ui/Stick";

const World = lazy(() => import("./world/World"));

/** The whole site as a street you walk down. */
function Street() {
  const [coarse] = useState(() => matchMedia("(pointer: coarse)").matches);
  const [ready, setReady] = useState(false);
  // once the veil has faded, take it out of the page so its shader stops running
  const [veil, setVeil] = useState(true);
  useEffect(() => { if (ready) { const id = setTimeout(() => setVeil(false), 1800); return () => clearTimeout(id); } }, [ready]);
  const intro = useApp((s) => s.intro);
  const lang = useApp((s) => s.lang);
  return (
    <div className={"world" + (intro ? " intro" : "")}>
      <div className="world-canvas">
        <Suspense fallback={null}>
          <World onReady={() => setReady(true)} />
        </Suspense>
      </div>
      {veil && <div className={"veil" + (ready ? " gone" : "")} aria-hidden={ready}>
        <LiquidGlyph text="同" className="veil-tong" glow={1.4} />
        <p>{lang === "en" ? "Lighting the lanterns…" : lang === "hant" ? "點燈中…" : "点灯中…"}</p>
      </div>}
      <Header />
      <Prompt />
      <Sheet />
      {coarse && <Stick />}
      <MapStrip />
      <Help />
    </div>
  );
}

/** The same content as a plain scrolling page. */
function Page() {
  const { t } = useT();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Steps />
        <Societies open={open} toggle={toggle} flash={null} />
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

export default function App() {
  const mode = useApp((s) => s.mode);
  return mode === "world" && canWalk ? <Street /> : <Page />;
}
