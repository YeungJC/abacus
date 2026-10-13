import { useEffect, useRef, useState } from "react";
import { SOCS, socById, socName } from "../data";
import { pluck } from "../lib/audio";
import { local } from "../lib/storage";
import { useT } from "../store";

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/** Decorative stand-in for the wallet pass's code; not scannable. */
function FakeCode({ seed }: { seed: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const x = ref.current!.getContext("2d")!, N = 21;
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    x.fillStyle = css("--paper"); x.fillRect(0, 0, N, N);
    x.fillStyle = css("--ink");
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { h = (h * 1103515245 + 12345) >>> 0; if ((h >> 16) & 1) x.fillRect(i, j, 1, 1); }
    for (const [a, b] of [[0, 0], [14, 0], [0, 14]]) {
      x.fillStyle = css("--ink"); x.fillRect(a, b, 7, 7);
      x.fillStyle = css("--paper"); x.fillRect(a + 1, b + 1, 5, 5);
      x.fillStyle = css("--ink"); x.fillRect(a + 2, b + 2, 3, 3);
    }
  }, [seed]);
  return <canvas ref={ref} width={21} height={21} aria-hidden="true" />;
}

export default function Pass() {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(() => local.get<{ name: string; soc: string | null }>("pass", { name: "", soc: null }));
  const [name, setName] = useState(saved.name);
  const [soc, setSoc] = useState(saved.soc ?? SOCS[0].id);
  const [stampKey, setStampKey] = useState(0);
  const [pct, setPct] = useState(70);

  const sealed = saved.soc ? socById(saved.soc) : undefined;

  function seal(e: React.FormEvent) {
    e.preventDefault();
    const next = { name: name.trim(), soc };
    const wasOpen = open;
    setOpen(true);
    setTimeout(() => { setSaved(next); local.set("pass", next); setStampKey((k) => k + 1); pluck(0, 0.25); }, wasOpen ? 0 : 900);
  }

  return (
    <section className="panel" id="pass">
      <div className="wrap">
        <div className="sec-head">
          <span className="seal">通</span>
          <div><h2>{t("pass.h")}</h2><p>{t("pass.p")}</p></div>
        </div>
        <div className="pass-grid">
          <div className="envelope-stage">
            <button className={"envelope" + (open ? " open" : "")} aria-label={open ? "Close the red envelope" : "Open the red envelope"} onClick={() => { setOpen(!open); pluck(open ? 1 : 4); }}>
              <div className="env-back" />
              <div className="pass-card">
                <div><div className="pc-title">同 TONG Joint Pass</div><div className="pc-sub">26/27 · MANCHESTER</div></div>
                <FakeCode seed={(saved.name || "tong") + (saved.soc ?? "")} />
                <div className="pc-name">{name || (lang === "en" ? "Your name" : "你的名字")}</div>
                <div className="pc-foot">
                  <span>{sealed ? (lang === "en" ? "Sealed by " : "蓋印：") + socName(sealed, lang) : lang === "en" ? "Home society: not sealed" : "未蓋印"}</span>
                  <span>DEMO</span>
                </div>
                {sealed && (
                  <span key={stampKey} className="seal stamp down" style={{ background: `var(${sealed.color})`, boxShadow: `inset 0 0 0 2px var(${sealed.color}), inset 0 0 0 3.5px var(--cinnabar-ink)` }}>
                    {sealed.char}
                  </span>
                )}
              </div>
              <div className="env-flap" />
              <div className="env-front"><div className="fu"><span>福</span></div></div>
            </button>
            <p className="hint">{t("pass.tap")}</p>
            <form className="pass-form" onSubmit={seal}>
              <label htmlFor="pName"><span>{t("pass.name")}</span><input id="pName" maxLength={28} placeholder="Chan Tai Man" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label htmlFor="pSoc"><span>{t("pass.soc")}</span>
                <select id="pSoc" value={soc} onChange={(e) => setSoc(e.target.value)}>
                  {SOCS.map((s) => <option key={s.id} value={s.id}>{socName(s, lang)}</option>)}
                </select>
              </label>
              <button className="btn red" type="submit">{t("pass.seal")}</button>
            </form>
          </div>
          <div>
            <ul className="benefits">
              {(["價", "惠", "先", "回"] as const).map((c, i) => (
                <li key={c}><b>{c}</b><span dangerouslySetInnerHTML={{ __html: t(`b${i + 1}`) }} /></li>
              ))}
            </ul>
            <div className="split">
              <h3>{t("split.h")}</h3>
              <div className="coins" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => <span key={i} className={"coin " + (i < pct / 10 ? "soc" : "pot")} />)}
              </div>
              <div className="split-legend">
                <span><i style={{ background: "var(--cinnabar)" }} />{t("split.soc")} <b>£{((5 * pct) / 100).toFixed(2)} ({pct}%)</b></span>
                <span><i style={{ background: "var(--gold)" }} />{t("split.pot")} <b>£{((5 * (100 - pct)) / 100).toFixed(2)} ({100 - pct}%)</b></span>
              </div>
              <label htmlFor="splitRange" className="hint" style={{ display: "block", marginTop: 12 }}>{t("split.try")}</label>
              <input type="range" id="splitRange" min={50} max={90} step={10} value={pct} onChange={(e) => { setPct(+e.target.value); pluck(+e.target.value / 10 - 5); }} />
              <p className="note">{t("split.note")}</p>
            </div>
            <div className="compare">
              <table>
                <thead><tr><th /><th>{t("cmp.d")}</th><th>{t("cmp.p")}</th></tr></thead>
                <tbody>
                  <tr><td>{t("cmp.r1")}</td><td>£0</td><td>{t("cmp.r1p")}</td></tr>
                  <tr><td>{t("cmp.r2")}</td><td>{t("cmp.r2d")}</td><td>{t("cmp.r2p")}</td></tr>
                  <tr><td>{t("cmp.r3")}</td><td>{t("cmp.r3d")}</td><td>{t("cmp.r3p")}</td></tr>
                  <tr><td>{t("cmp.r4")}</td><td><b>{t("cmp.r4d")}</b></td><td>{t("cmp.r4p")}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
