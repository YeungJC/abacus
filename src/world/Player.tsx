import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useApp } from "../store";
import { EYE, HALF, STOPS, stopById, Z_END, Z_START, type StopId } from "./stops";

/** Analogue input from the on-screen thumbstick (phones), each -1..1. */
export const pad = { move: 0, turn: 0 };

/** Where a click on the street asked to go. */
let pointTarget: { x: number; z: number } | null = null;

const X_MIN = -HALF + 0.75, X_MAX = HALF - 0.75;
const Z_MIN = Z_END + 6.3, Z_MAX = Z_START + 2;

/** Walk to a spot on the street, Street View style. */
export function walkToPoint(x: number, z: number) {
  pointTarget = { x: Math.max(X_MIN, Math.min(X_MAX, x)), z: Math.max(Z_MIN, Math.min(Z_MAX, z)) };
  useApp.setState({ walkTo: null });
}

const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
};

/** Yaw and pitch that look from a stop's standing spot at what it shows. yaw 0 faces down the street (-z). */
export function viewOf(id: StopId) {
  const s = stopById(id);
  const dx = s.look[0] - s.at[0], dz = s.look[2] - s.at[1];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(s.look[1] - EYE, Math.hypot(dx, dz)) };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const NEAR = 3.4; // metres from a stop's standing spot that counts as being there

/** Things you can't walk through: gate pillars and the envelope stall. */
const POSTS: [number, number, number][] = [[-2.7, 10, 0.5], [2.7, 10, 0.5], [-4.25, 10, 0.45], [4.25, 10, 0.45]];
const PASS_Z = stopById("pass").z;
const BOXES: [number, number, number, number][] = [[-3.7, -2.15, PASS_Z - 1.8, PASS_Z + 1.8]]; // x0, x1, z0, z1: the envelope stall

function collide(s: { x: number; z: number }) {
  for (const [px, pz, r] of POSTS) {
    const dx = s.x - px, dz = s.z - pz, d = Math.hypot(dx, dz);
    if (d < r + 0.3 && d > 0.0001) { s.x = px + (dx / d) * (r + 0.3); s.z = pz + (dz / d) * (r + 0.3); }
  }
  for (const [x0, x1, z0, z1] of BOXES) {
    const m = 0.3;
    if (s.x > x0 - m && s.x < x1 + m && s.z > z0 - m && s.z < z1 + m) {
      const push = [s.x - (x0 - m), x1 + m - s.x, s.z - (z0 - m), z1 + m - s.z];
      const i = push.indexOf(Math.min(...push));
      if (i === 0) s.x = x0 - m; else if (i === 1) s.x = x1 + m; else if (i === 2) s.z = z0 - m; else s.z = z1 + m;
    }
  }
  s.x = Math.max(X_MIN, Math.min(X_MAX, s.x));
  s.z = Math.max(Z_MIN, Math.min(Z_MAX, s.z));
}

// the fly-in: from above the street outside the gate, down to where you stand
const INTRO_FROM = new THREE.Vector3(0, 6.5, 40);
const INTRO_LOOK = new THREE.Vector3(0, 4.6, 10);
const INTRO_SECONDS = 4.2;

export default function Player() {
  const { camera, gl } = useThree();
  const gate = viewOf("gate");
  const st = useRef({
    x: 0, z: STOPS[0].at[1],
    yaw: gate.yaw, pitch: gate.pitch, // what you see
    tYaw: gate.yaw, tPitch: gate.pitch, // where you're turning to
    keys: new Set<string>(),
    wheel: 0,
    drag: null as null | { x: number; y: number; id: number; moved: number },
    bob: 0,
    lastSync: 0,
    offX: 0,
    offY: 0,
    // play the fly-in once per visit, and never for people who prefer less motion
    intro: matchMedia("(prefers-reduced-motion: reduce)").matches || !useApp.getState().intro ? 1 : 0,
  });

  useEffect(() => {
    const s = st.current;
    const el = gl.domElement;
    el.style.cursor = "grab";
    const skipIntro = () => { if (s.intro < 1) s.intro = 1; };
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const app = useApp.getState();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        skipIntro();
        s.keys.add(k);
        if (k.startsWith("arrow")) e.preventDefault();
      }
      if ((k === "enter" || k === " ") && app.near && app.open !== app.near && document.activeElement === document.body) { e.preventDefault(); app.setOpen(app.near); }
      if (k === "escape") app.setOpen(null);
      if (k === "]" || k === "n") app.step(1);
      if (k === "[" || k === "p") app.step(-1);
    };
    const up = (e: KeyboardEvent) => s.keys.delete(e.key.toLowerCase());
    const blur = () => s.keys.clear();
    const pd = (e: PointerEvent) => {
      skipIntro();
      s.drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 };
    };
    const pm = (e: PointerEvent) => {
      if (!s.drag || s.drag.id !== e.pointerId) return;
      const dx = e.clientX - s.drag.x, dy = e.clientY - s.drag.y;
      s.drag.x = e.clientX; s.drag.y = e.clientY;
      s.drag.moved += Math.abs(dx) + Math.abs(dy);
      if (s.drag.moved > 4) el.style.cursor = "grabbing";
      // grab the world: drag right swings the view left, like a photo sphere
      const k = e.pointerType === "touch" ? 0.006 : 0.0045;
      s.tYaw += dx * k;
      s.tPitch = Math.max(-0.6, Math.min(0.65, s.tPitch + dy * k * 0.8));
      if (s.drag.moved > 6 && useApp.getState().walkTo) useApp.setState({ walkTo: null });
    };
    const pu = (e: PointerEvent) => {
      if (s.drag?.id !== e.pointerId) return;
      s.drag = null;
      el.style.cursor = "grab";
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); skipIntro(); s.wheel += -e.deltaY * 0.01; };
    const menu = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    el.addEventListener("pointerdown", pd);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    window.addEventListener("pointercancel", pu);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("contextmenu", menu);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      el.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      window.removeEventListener("pointercancel", pu);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", menu);
    };
  }, [gl]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = st.current;
    const app = useApp.getState();
    const cam = camera as THREE.PerspectiveCamera;

    // ── the fly-in ──
    if (s.intro < 1) {
      // real time, so a slow device doesn't get a slow fly-in
      s.intro = Math.min(1, s.intro + Math.min(dtRaw, 0.25) / INTRO_SECONDS);
      const e = 1 - Math.pow(1 - s.intro, 3);
      const to = new THREE.Vector3(s.x, EYE, s.z);
      cam.position.lerpVectors(INTRO_FROM, to, e);
      const lookEnd = new THREE.Vector3(s.x - Math.sin(s.yaw) * 10, EYE + Math.tan(s.pitch) * 10, s.z - Math.cos(s.yaw) * 10);
      cam.lookAt(new THREE.Vector3().lerpVectors(INTRO_LOOK, lookEnd, e * e));
      if (s.intro >= 1) app.finishIntro();
      return;
    }
    if (app.intro) app.finishIntro();

    const k = s.keys;
    let fwd = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0) + pad.move;
    const strafe = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
    const turn = (k.has("arrowleft") ? 1 : 0) - (k.has("arrowright") ? 1 : 0) - pad.turn;
    fwd += Math.max(-2.2, Math.min(2.2, s.wheel));
    s.wheel *= Math.pow(0.03, dt);
    if (Math.abs(s.wheel) < 0.01) s.wheel = 0;

    const manual = Math.abs(fwd) > 0.02 || strafe !== 0 || Math.abs(turn) > 0.02;
    if (manual) {
      pointTarget = null;
      if (app.walkTo) useApp.setState({ walkTo: null });
    }

    let moving = false;
    if (app.walkTo && !manual) {
      // glide to the place, turning to face it as you arrive
      const stop = stopById(app.walkTo);
      const v = viewOf(app.walkTo);
      const dx = stop.at[0] - s.x, dz = stop.at[1] - s.z;
      const dist = Math.hypot(dx, dz);
      const step = Math.min(dist, Math.min(9, 2.4 + dist * 0.9) * dt);
      if (dist > 0.001) { s.x += (dx / dist) * step; s.z += (dz / dist) * step; }
      const far = dist > 3.5;
      if (far) { s.tYaw = s.yaw + wrap(Math.atan2(-dx, -dz) - s.yaw); s.tPitch = -0.03; }
      else { s.tYaw = s.yaw + wrap(v.yaw - s.yaw); s.tPitch = v.pitch; }
      moving = dist > 0.05;
      if (dist < 0.05 && Math.abs(wrap(v.yaw - s.yaw)) < 0.04) {
        s.x = stop.at[0]; s.z = stop.at[1];
        app.arrived();
      }
    } else if (pointTarget && !manual) {
      const dx = pointTarget.x - s.x, dz = pointTarget.z - s.z;
      const dist = Math.hypot(dx, dz);
      const step = Math.min(dist, Math.min(6, 2 + dist * 0.8) * dt);
      if (dist > 0.001) { s.x += (dx / dist) * step; s.z += (dz / dist) * step; }
      if (dist > 1.2) s.tYaw = s.yaw + wrap(Math.atan2(-dx, -dz) - s.yaw) * 0.6;
      moving = dist > 0.05;
      if (dist < 0.05) pointTarget = null;
    } else if (manual) {
      const speed = k.has("shift") ? 7 : 3.8;
      s.tYaw += turn * 1.9 * dt;
      const sin = Math.sin(s.yaw), cos = Math.cos(s.yaw);
      s.x += (-sin * fwd + cos * strafe) * speed * dt;
      s.z += (-cos * fwd - sin * strafe) * speed * dt;
      // drift your gaze back to the horizon as you walk
      if (Math.abs(fwd) > 0.1 && !s.drag) s.tPitch += (0 - s.tPitch) * damp(1.2, dt);
      moving = Math.abs(fwd) > 0.05 || strafe !== 0;
    }
    collide(s);

    // smooth turning: the view eases towards where you're looking
    s.yaw += wrap(s.tYaw - s.yaw) * damp(app.walkTo ? 3.2 : 12, dt);
    s.pitch += (s.tPitch - s.pitch) * damp(app.walkTo ? 3 : 12, dt);

    s.bob += moving ? dt * 8.5 : 0;
    cam.position.set(s.x, EYE + (moving ? Math.sin(s.bob) * 0.025 : 0), s.z);
    cam.rotation.set(s.pitch, s.yaw, 0, "YXZ");

    // keep the place you're reading about in view: beside the panel on wide screens, above it on phones
    const { width: W, height: H } = state.size;
    const wide = W > 760;
    const wantX = app.open && wide ? (Math.min(560, W - 32) + 16) / 2 : 0;
    const wantY = app.open && !wide ? H * 0.2 : 0;
    s.offX += (wantX - s.offX) * damp(5, dt);
    s.offY += (wantY - s.offY) * damp(5, dt);
    if (Math.abs(s.offX) > 0.5 || Math.abs(s.offY) > 0.5) cam.setViewOffset(W, H, s.offX, s.offY, W, H);
    else if (cam.view?.enabled) cam.clearViewOffset();

    // which place are you standing at?
    if (state.clock.elapsedTime - s.lastSync > 0.12) {
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
