import { useEffect } from "react";
import { useApp } from "../store";

const coarse = () => matchMedia("(pointer: coarse)").matches;

const TEXT = {
  en: {
    title: "How to get around",
    walk: ["Walk", coarse() ? "Push the stick in the corner. Or tap the street where you want to go." : "W A S D or the arrow keys. Or click the street where you want to go."],
    look: ["Look around", coarse() ? "Drag anywhere on the street." : "Drag with the mouse. Scroll to stroll forwards and back."],
    go: ["Visit a place", coarse() ? "Tap a shop, a name tag, or a station on the line at the bottom. ‹ › take you to the previous or next one." : "Click a shop, a name tag, or a station on the line at the bottom. ‹ › or [ ] step to the previous or next place."],
    ok: "Start exploring",
  },
  hant: {
    title: "點樣行",
    walk: ["行路", coarse() ? "推角落嘅搖桿，或者撳街上想去嘅位置。" : "W A S D 或方向鍵，或者撳街上想去嘅位置。"],
    look: ["四圍望", coarse() ? "喺街景上拖動。" : "用滑鼠拖動，碌滑鼠前後行。"],
    go: ["去一個地方", "撳舖頭、名牌，或者底部路線圖嘅站。‹ › 去上一個或者下一個。"],
    ok: "開始",
  },
  hans: {
    title: "怎样走",
    walk: ["走路", coarse() ? "推角落的摇杆，或点街上想去的位置。" : "W A S D 或方向键，或点街上想去的位置。"],
    look: ["四处看", coarse() ? "在街景上拖动。" : "用鼠标拖动，滚动滚轮前后走。"],
    go: ["去一个地方", "点店铺、名牌，或底部路线图的站点。‹ › 去上一个或下一个。"],
    ok: "开始",
  },
};

function Icon({ kind }: { kind: "walk" | "look" | "go" }) {
  if (kind === "walk")
    return coarse() ? (
      <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" /><circle cx="24" cy="18" r="8" fill="currentColor" /></svg>
    ) : (
      <svg viewBox="0 0 64 48" aria-hidden="true">
        {[[22, 4, "W"], [4, 24, "A"], [22, 24, "S"], [40, 24, "D"]].map(([x, y, l]) => (
          <g key={l as string}><rect x={x as number} y={y as number} width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" /><text x={(x as number) + 9} y={(y as number) + 13.5} textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="ui-monospace, monospace">{l}</text></g>
        ))}
      </svg>
    );
  if (kind === "look")
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 24h32M8 24l7-7M8 24l7 7M40 24l-7-7M40 24l-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="24" cy="24" r="4" fill="currentColor" /></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 30h40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /><circle cx="12" cy="30" r="5" fill="currentColor" /><circle cx="24" cy="30" r="5" fill="currentColor" /><circle cx="36" cy="30" r="7" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M36 8v10M31 13l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

/** The one-time card that shows how to walk the street. "?" brings it back. */
export default function Help() {
  const help = useApp((s) => s.help);
  const lang = useApp((s) => s.lang);
  const setHelp = useApp((s) => s.setHelp);
  useEffect(() => {
    if (!help) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") setHelp(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [help, setHelp]);
  if (!help) return null;
  const t = TEXT[lang];
  return (
    <div className="help-scrim" onClick={() => setHelp(false)}>
      <div className="help" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="help-title">{t.title}</h2>
        <ul>
          {(["walk", "look", "go"] as const).map((k) => (
            <li key={k}><span className="help-icon"><Icon kind={k} /></span><div><b>{t[k][0]}</b><p>{t[k][1]}</p></div></li>
          ))}
        </ul>
        <button className="btn red" autoFocus onClick={() => setHelp(false)}>{t.ok}</button>
      </div>
    </div>
  );
}
