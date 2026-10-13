import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useApp } from "../store";
import { EYE, HALF, STOPS, stopById, Z_END, Z_START, type StopId } from "./stops";

/** Inputs from the on-screen pad (phones). -1, 0 or 1. */
export const pad = { move: 0, turn: 0 };

const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
};

/** Yaw and pitch that look from `at` towards `look`. yaw 0 faces down the street (-z). */
export function viewOf(id: StopId) {
  const s = stopById(id);
  const dx = s.look[0] - s.at[0], dz = s.look[2] - s.at[1];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(s.look[1] - EYE, Math.hypot(dx, dz)) };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const NEAR = 3.4; // metres from a stop's standing spot that counts as being there

export default function Player() {
  const { camera, gl } = useThree();
  const st = useRef({
    x: 0, z: STOPS[0].at[1], ...viewOf("gate"),
    keys: new Set<string>(),
    wheel: 0,
    drag: null as null | { x: number; y: number; id: number },
    bob: 0,
    lastSync: 0,
    offX: 0,
    offY: 0,
  });

  useEffect(() => {
    const s = st.current;
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        s.keys.add(k);
        if (k.startsWith("arrow")) e.preventDefault();
      }
      if (k === "enter" || k === " ") {
        const app = useApp.getState();
        if (app.near && app.open !== app.near && document.activeElement === document.body) { e.preventDefault(); app.setOpen(app.near); }
      }
      if (k === "escape") useApp.getState().setOpen(null);
    };
    const up = (e: KeyboardEvent) => s.keys.delete(e.key.toLowerCase());
    const blur = () => s.keys.clear();
    const el = gl.domElement;
    const pd = (e: PointerEvent) => { s.drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
    const pm = (e: PointerEvent) => {
      if (!s.drag || s.drag.id !== e.pointerId) return;
      const dx = e.clientX - s.drag.x, dy = e.clientY - s.drag.y;
      s.drag.x = e.clientX; s.drag.y = e.clientY;
      // grab the world: drag right turns you left
      s.yaw += dx * 0.0042;
      s.pitch = Math.max(-0.55, Math.min(0.6, s.pitch + dy * 0.0035));
      if (Math.abs(dx) + Math.abs(dy) > 2 && useApp.getState().walkTo) useApp.setState({ walkTo: null });
    };
    const pu = (e: PointerEvent) => { if (s.drag?.id === e.pointerId) s.drag = null; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); s.wheel += -e.deltaY * 0.012; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    el.addEventListener("pointerdown", pd);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    window.addEventListener("pointercancel", pu);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      el.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      window.removeEventListener("pointercancel", pu);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = st.current;
    const app = useApp.getState();
    const k = s.keys;
    let fwd = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0) + pad.move;
    const strafe = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
    const turn = (k.has("arrowleft") || k.has("q") ? 1 : 0) - (k.has("arrowright") || k.has("e") ? 1 : 0) - pad.turn;
    fwd += Math.max(-2.5, Math.min(2.5, s.wheel));
    s.wheel *= Math.pow(0.04, dt);
    if (Math.abs(s.wheel) < 0.01) s.wheel = 0;

    const manual = Math.abs(fwd) > 0.01 || strafe !== 0 || turn !== 0;
    if (manual && app.walkTo) useApp.setState({ walkTo: null });

    let moving = manual;
    if (app.walkTo && !manual) {
      // glide to the place, turning to face it
      const stop = stopById(app.walkTo);
      const v = viewOf(app.walkTo);
      const dx = stop.at[0] - s.x, dz = stop.at[1] - s.z;
      const dist = Math.hypot(dx, dz);
      const step = Math.min(dist, (2.5 + dist * 0.9) * dt);
      if (dist > 0.001) { s.x += (dx / dist) * step; s.z += (dz / dist) * step; }
      // face where you're going while far, then turn to the place
      const travelYaw = Math.atan2(-dx, -dz);
      const wantYaw = dist > 4 ? travelYaw : v.yaw;
      const wantPitch = dist > 4 ? -0.02 : v.pitch;
      s.yaw += wrap(wantYaw - s.yaw) * Math.min(1, dt * 3.2);
      s.pitch += (wantPitch - s.pitch) * Math.min(1, dt * 3);
      moving = dist > 0.05;
      if (dist < 0.05 && Math.abs(wrap(v.yaw - s.yaw)) < 0.03) {
        s.x = stop.at[0]; s.z = stop.at[1];
        app.arrived();
      }
    } else {
      const speed = k.has("shift") ? 7 : 4;
      s.yaw += turn * 1.8 * dt;
      const sin = Math.sin(s.yaw), cos = Math.cos(s.yaw);
      s.x += (-sin * fwd + cos * strafe) * speed * dt;
      s.z += (-cos * fwd - sin * strafe) * speed * dt;
    }
    // stay on the street, out of the shopfronts and off the stage
    s.x = Math.max(-HALF + 0.7, Math.min(HALF - 0.7, s.x));
    s.z = Math.max(Z_END + 6.3, Math.min(Z_START + 2, s.z));

    s.bob += moving ? dt * 9 : 0;
    camera.position.set(s.x, EYE + (moving ? Math.sin(s.bob) * 0.03 : 0), s.z);
    camera.rotation.set(s.pitch, s.yaw, 0, "YXZ");

    // keep the place you're reading about in view: beside the panel on wide screens, above it on phones
    const { width: W, height: H } = state.size;
    const wide = W > 760;
    const wantX = app.open && wide ? (Math.min(580, W - 32) + 16) / 2 : 0;
    const wantY = app.open && !wide ? H * 0.2 : 0;
    s.offX += (wantX - s.offX) * Math.min(1, dt * 5);
    s.offY += (wantY - s.offY) * Math.min(1, dt * 5);
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(s.offX) > 0.5 || Math.abs(s.offY) > 0.5) cam.setViewOffset(W, H, s.offX, s.offY, W, H);
    else if (cam.view?.enabled) cam.clearViewOffset();

    // which place are you standing at?
    if (state.clock.elapsedTime - s.lastSync > 0.15) {
      s.lastSync = state.clock.elapsedTime;
      let best: StopId | null = null, bd = NEAR;
      for (const stop of STOPS) {
        const d = Math.hypot(stop.at[0] - s.x, stop.at[1] - s.z);
        if (d < bd) { bd = d; best = stop.id; }
      }
      if (best !== app.near) app.setNear(best);
      // walking away from an open place closes it
      if (app.open && !app.walkTo && best !== app.open) app.setOpen(null);
      if (Math.abs(app.z - s.z) > 0.2) app.setZ(s.z);
    }
  });
  return null;
}
