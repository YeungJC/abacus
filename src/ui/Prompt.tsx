import { useApp } from "../store";
import { placeName } from "../world/World";
import { stopById } from "../world/stops";

/** When you're standing at a place with its panel closed, offer to open it. */
export default function Prompt() {
  const near = useApp((s) => s.near);
  const open = useApp((s) => s.open);
  const walkTo = useApp((s) => s.walkTo);
  const lang = useApp((s) => s.lang);
  const setOpen = useApp((s) => s.setOpen);
  if (!near || open === near || walkTo) return null;
  return (
    <button className="prompt" onClick={() => setOpen(near)}>
      {lang === "en" ? "Open " : "打開 "}<b>{placeName(stopById(near), lang)}</b> <kbd>↵</kbd>
    </button>
  );
}
