import { lazy, Suspense, useState } from "react";
import Committees from "./components/Committees";
import Guide from "./components/Guide";
import Header, { canWalk } from "./components/Header";
import Hero from "./components/Hero";
import Pass from "./components/Pass";
import Societies from "./components/Societies";
import Steps from "./components/Steps";
import WhatsOn from "./components/WhatsOn";
import { useApp, useT } from "./store";
import MapStrip from "./ui/MapStrip";
import Pad from "./ui/Pad";
import Prompt from "./ui/Prompt";
import Sheet from "./ui/Sheet";

const World = lazy(() => import("./world/World"));

/** The whole site as a street you walk down. */
function Street() {
  const [coarse] = useState(() => matchMedia("(pointer: coarse)").matches);
  return (
    <div className="world">
      <div className="world-canvas">
        <Suspense fallback={<div className="world-loading">同</div>}>
          <World />
        </Suspense>
      </div>
      <Header />
      <Prompt />
      <Sheet />
      {coarse && <Pad />}
      <MapStrip />
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
