import { useRef, useState } from "react";
import { useApp } from "../store";
import { pad } from "../world/Player";

const R = 44; // how far the knob travels, px

/** A thumbstick for touch screens: push up to walk, sideways to turn. */
export default function Stick() {
  const open = useApp((s) => s.open);
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });
  const origin = useRef({ x: 0, y: 0, id: -1 });
  if (open) return null;
  const move = (e: React.PointerEvent) => {
    if (e.pointerId !== origin.current.id) return;
    let dx = e.clientX - origin.current.x, dy = e.clientY - origin.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy, on: true });
    // dead zone, then a gentle curve so small pushes give fine control
    const curve = (v: number) => { const a = Math.abs(v); return a < 0.15 ? 0 : Math.sign(v) * Math.pow((a - 0.15) / 0.85, 1.4); };
    pad.move = curve(-dy / R);
    pad.turn = curve(dx / R) * 0.8;
  };
  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== origin.current.id) return;
    origin.current.id = -1;
    pad.move = 0; pad.turn = 0;
    setKnob({ x: 0, y: 0, on: false });
  };
  return (
    <div
      className={"stick" + (knob.on ? " on" : "")}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId };
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      role="presentation"
    >
      <span className="stick-arrow up">▲</span>
      <span className="stick-arrow down">▼</span>
      <span className="stick-arrow left">◀</span>
      <span className="stick-arrow right">▶</span>
      <div className="stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
