import { useMemo, useState } from "react";
import { EVENTS, PHASES, SOCS, socById, socName } from "../data";
import { pluck } from "../lib/audio";
import { fmtDate, iso, MONTHS } from "../lib/dates";
import { useSharedDrafts, type Draft } from "../lib/sharedDrafts";
import { useT } from "../store";

type CalEvent = { key: string; date: string; title: string; soc: string; eve: boolean; draft?: Draft };

export default function Committees() {
  const { t, lang } = useT();
  const { drafts, mode, add, remove, canRemove } = useSharedDrafts();
  const [month, setMonth] = useState({ y: 2026, m: 10 });
  const [sel, setSel] = useState("2026-11-21");
  const [title, setTitle] = useState("");
  const [soc, setSoc] = useState(SOCS[0].id);
  const [eve, setEve] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Flagship nights involve every society, so they're shown but never count as a clash.
  const flagships = EVENTS.filter((e) => e.socs.length === SOCS.length);
  const events: CalEvent[] = useMemo(
    () => [
      ...EVENTS.flatMap((e, k) => (e.socs.length === SOCS.length ? [] : e.socs.map((s) => ({ key: "e" + k, date: e.date, title: e.t[lang], soc: s, eve: true })))),
      ...drafts.map((d) => ({ key: d.id, date: d.date, title: d.title, soc: d.soc, eve: d.eve, draft: d })),
    ],
    [drafts, lang],
  );

  /** Two separate evening events from different societies on one day. A joint event is one night, not a clash. */
  const clashOn = (date: string) => {
    const evs = events.filter((e) => e.date === date && e.eve);
    const keys = new Set(evs.map((e) => e.key));
    return keys.size > 1 && new Set(evs.map((e) => e.soc)).size > 1 ? evs : null;
  };
  const clashDays = [...new Set(events.map((e) => e.date))].filter((d) => clashOn(d)).sort();

  const { y, m } = month;
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = Math.ceil((lead + days) / 7) * 7;
  const dows = lang === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["一", "二", "三", "四", "五", "六", "日"];
  const step = (d: number) => setMonth(({ y, m }) => { const n = m + d; return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 }; });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const problem = await add({ date: sel, title: title.trim().slice(0, 40), soc, eve });
    setBusy(false);
    setErr(problem);
    if (!problem) { setTitle(""); pluck(4); }
  }

  const selDrafts = drafts.filter((d) => d.date === sel);
  const [selLabel] = fmtDate(sel, lang);
  const now = new Date().toISOString().slice(0, 10);
  const cur = PHASES.findIndex((p) => now >= p.from && now <= p.to);
  const [openPhase, setOpenPhase] = useState(cur >= 0 ? cur : 0);
  const pillText = { connecting: t("cal.connecting"), shared: t("cal.shared"), readonly: t("cal.readonly"), local: t("cal.local") }[mode];

  return (
    <section className="panel" id="committees">
      <div className="wrap">
        <div className="sec-head">
          <span className="seal">幹</span>
          <div>
            <h2>{t("com.h")}</h2>
            <p>{t("com.p")}</p>
            <p style={{ marginTop: 10 }}><span className={"share-pill" + (mode === "shared" ? " shared" : "")}><i />{pillText}</span></p>
          </div>
        </div>
        <div className="almanac">
          <div>
            <div className="cal-head">
              <h3>{lang === "en" ? `${MONTHS[m]} ${y}` : `${y}年${m + 1}月`}</h3>
              <div className="cal-nav"><button aria-label="Previous month" onClick={() => step(-1)}>‹</button><button aria-label="Next month" onClick={() => step(1)}>›</button></div>
            </div>
            <div className="cal">
              {dows.map((d) => <div key={d} className="dow">{d}</div>)}
              {Array.from({ length: cells }, (_, i) => {
                const dn = i - lead + 1;
                if (dn < 1 || dn > days) return <div key={i} className="day out" />;
                const date = iso(y, m, dn);
                const clash = clashOn(date);
                return (
                  <button key={i} className={"day" + (i % 7 >= 5 ? " wk" : "") + (date === sel ? " sel" : "")} aria-label={date + (clash ? ", clash" : "")} onClick={() => setSel(date)}>
                    <span className="n">{dn}</span>
                    {flagships.filter((e) => e.date === date).map((e) => <span key={e.t.en} className="ev" style={{ background: "var(--ink)", color: "var(--paper)" }}>{e.t[lang]}</span>)}
                    {events.filter((e) => e.date === date).map((e) => {
                      const s = socById(e.soc);
                      return s ? <span key={e.key + e.soc} className="ev" style={{ background: `var(${s.color})`, outline: e.draft ? "1px dashed var(--ink)" : undefined }} title={`${s.en}: ${e.title}`}>{e.title}</span> : null;
                    })}
                    {clash && <span className="seal ji" title="Clash">忌</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="cal-side">
            <div>
              {clashDays.length ? clashDays.map((d) => {
                const list = clashOn(d)!;
                return (
                  <div key={d} className="warn">
                    <h4><span className="seal" style={{ width: 24, height: 24, fontSize: ".85rem" }}>忌</span>{lang === "en" ? "Clash on " : "撞期："}{fmtDate(d, lang)[0]}</h4>
                    <p>{list.map((e, i) => <span key={e.key + e.soc}>{i > 0 && (lang === "en" ? " and " : "，")}<b>{socName(socById(e.soc)!, lang)}</b>: {e.title}</span>)}.</p>
                    <p className="hint">{lang === "en" ? "Move one, or merge them into a joint night." : lang === "hant" ? "改期，或者合辦一晚。" : "改期，或者合办一晚。"}</p>
                  </div>
                );
              }) : <div className="ok">宜 · {lang === "en" ? "No clashes. Every evening has one society." : lang === "hant" ? "冇撞期。" : "没有撞期。"}</div>}
            </div>
            <div className="day-drafts">
              <h4>{t("cal.drafts")} · {selLabel}</h4>
              {selDrafts.length ? (
                <ul>
                  {selDrafts.map((d) => {
                    const s = socById(d.soc);
                    return (
                      <li key={d.id}>
                        <span className="dot" style={{ background: s ? `var(${s.color})` : "var(--ink-soft)" }}>{s?.char ?? "?"}</span>
                        <span className="t">{d.title} · {d.eve ? (lang === "en" ? "evening" : "晚上") : lang === "en" ? "daytime" : "日間"}</span>
                        {canRemove(d) && <button onClick={() => remove(d.id)}>{t("cal.remove")}</button>}
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="hint">{t("cal.none")}</p>}
            </div>
            {mode !== "readonly" && (
              <form className="cal-form" onSubmit={submit}>
                <h4>{(lang === "en" ? "Add a draft for " : "新增草稿：") + selLabel}</h4>
                <label htmlFor="cfTitle"><span>{t("cf.t")}</span><input id="cfTitle" maxLength={40} placeholder="Hotpot social" required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <div className="row">
                  <label htmlFor="cfSoc"><span>{t("cf.s")}</span>
                    <select id="cfSoc" value={soc} onChange={(e) => setSoc(e.target.value)}>{SOCS.map((s) => <option key={s.id} value={s.id}>{socName(s, lang)}</option>)}</select>
                  </label>
                  <label htmlFor="cfTime"><span>{t("cf.w")}</span>
                    <select id="cfTime" value={eve ? "eve" : "day"} onChange={(e) => setEve(e.target.value === "eve")}>
                      <option value="eve">{lang === "en" ? "Evening" : "晚上"}</option>
                      <option value="day">{lang === "en" ? "Daytime" : "日間"}</option>
                    </select>
                  </label>
                </div>
                {err && <p className="form-err">{err}</p>}
                <button className="btn red" type="submit" disabled={busy || mode === "connecting"}>{t("cf.add")}</button>
              </form>
            )}
            <p className="note">{t("com.note").replace(/ Drafts live only in this browser\.| 草稿只存喺呢個瀏覽器。| 草稿只保存在这个浏览器。/, "")}</p>
          </div>
        </div>

        <div className="phases">
          {PHASES.map((p, i) => (
            <button key={p.zh} className="phase" aria-expanded={i === openPhase} onClick={() => { setOpenPhase(i); pluck(i * 2); }}>
              <span className="ph-zh">{p.zh}</span>
              {i === cur && <span className="now">{lang === "en" ? "NOW" : "現在"}</span>}
              <h4>{p.en}</h4>
              <span className="when">{p.when}</span>
              <ul>{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
