import { useApp } from "../store";
import { pad } from "../world/Player";

/** Hold-to-walk buttons for touch screens. Drag anywhere on the street to look around. */
export default function Pad() {
  const open = useApp((s) => s.open);
  const hold = (key: "move" | "turn", v: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); pad[key] = v; },
    onPointerUp: () => { pad[key] = 0; },
    onPointerCancel: () => { pad[key] = 0; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  if (open) return null;
  return (
    <div className="pad" aria-hidden="true">
      <button {...hold("turn", -1)} aria-label="Turn left">◀</button>
      <div className="pad-col">
        <button {...hold("move", 1)} aria-label="Walk forward">▲</button>
        <button {...hold("move", -1)} aria-label="Walk back">▼</button>
      </div>
      <button {...hold("turn", 1)} aria-label="Turn right">▶</button>
    </div>
  );
}
