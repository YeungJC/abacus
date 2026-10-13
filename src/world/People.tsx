import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HALF, stopById } from "./stops";
import { canvasTex, rng } from "./textures";

/*
 * People out in the rain. Each person is a small jointed figure (legs, arms, coat, head,
 * hair, umbrella) animated with a walk cycle. Every body part is one InstancedMesh shared by
 * everyone, so the whole crowd is about twenty draw calls.
 */

const SKIN = ["#f0d2b4", "#e6c09c", "#d9a982", "#c4906a", "#a8744e"];
const HAIR = ["#141012", "#1e1612", "#2a1c14", "#3a2618", "#5a4030"];
const COATS = ["#a8322a", "#2c3e6a", "#b08a5a", "#d8cbb0", "#3d7a62", "#6a3a5a", "#c49a3a", "#5a5e6a", "#24242a", "#8a4a2a", "#e0dcd2", "#3a5a8a"];
const TROUSERS = ["#1c1c22", "#2a2a34", "#3a3028", "#20283a", "#4a4440"];
const BROLLIES = ["#c4291e", "#d89a3a", "#2c4a8a", "#2f7a63", "#e8dcc4", "#8a2a4a", "#d6688a", "#1e1e24"];
const SCARVES = ["#c4291e", "#e0b84a", "#f2efe6", "#3a6a9a"];

type Person = {
  x: number; z: number; lane: number;
  dir: 1 | -1 | 0; // 1 walks down the street (-z), -1 up it, 0 stands still
  face: number; // yaw when standing
  speed: number; ph: number; h: number; build: number;
  skin: THREE.Color; hair: THREE.Color; coat: THREE.Color; trousers: THREE.Color; brolly: THREE.Color; scarf: THREE.Color;
  hasScarf: boolean; bun: boolean; bag: 0 | 1 | 2; // 0 none, 1 backpack, 2 shopping bag
};

/* ── geometry: each limb hangs from its joint at the origin ── */

const limb = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 4, 10).translate(0, -len / 2, 0);

function coatGeo() {
  // a long coat, waist nipped in, flaring at the hem
  const pts = [[0.001, 0.52], [0.23, 0.52], [0.215, 0.7], [0.18, 0.92], [0.17, 1.05], [0.2, 1.24], [0.225, 1.36], [0.18, 1.44], [0.08, 1.49], [0.001, 1.5]];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 18).scale(1, 1, 0.72);
}

function canopyGeo() {
  // an oil-paper umbrella seen from above: a shallow dome with scalloped edges between the ribs
  const R = 0.62, RIBS = 16;
  const g = new THREE.RingGeometry(0.001, R, RIBS * 2, 5);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const r = Math.hypot(x, y) / R, a = Math.atan2(y, x);
    const sag = r > 0.9 ? 0.03 * Math.abs(Math.sin((a * RIBS) / 2)) : 0;
    p.setXYZ(i, x, y, 0.2 * (1 - Math.pow(r, 1.6)) - sag);
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Painted paper in light greys, so each umbrella's own colour tints it. */
function canopyTex() {
  return canvasTex(256, 256, (c, w) => {
    const cx = w / 2;
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, w);
    // a darker border band and an inner ring
    c.strokeStyle = "#8a8a8a"; c.lineWidth = 10; c.beginPath(); c.arc(cx, cx, 118, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = "#b0b0b0"; c.lineWidth = 4; c.beginPath(); c.arc(cx, cx, 96, 0, Math.PI * 2); c.stroke();
    // ribs
    c.strokeStyle = "rgba(60,60,60,.55)"; c.lineWidth = 2;
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; c.beginPath(); c.moveTo(cx, cx); c.lineTo(cx + Math.cos(a) * 128, cx + Math.sin(a) * 128); c.stroke(); }
    // plum blossoms on a branch
    c.strokeStyle = "#5a5a5a"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(60, 170); c.quadraticCurveTo(110, 120, 175, 95); c.stroke();
    const r = rng(2);
    for (let k = 0; k < 9; k++) {
      const t = k / 8, x = 60 + t * 115 + (r() - 0.5) * 20, y = 170 - t * 75 + (r() - 0.5) * 20;
      c.fillStyle = "#e8e8e8";
      for (let q = 0; q < 5; q++) { const a = (q / 5) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#9a9a9a"; c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill();
    }
    // the cap where the ribs meet
    c.fillStyle = "#6a6a6a"; c.beginPath(); c.arc(cx, cx, 10, 0, Math.PI * 2); c.fill();
  });
}

/* ── the crowd ──────────────────────────────────── */

function makePeople(): Person[] {
  const r = rng(71);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const base = (): Omit<Person, "x" | "z" | "lane" | "dir" | "face" | "speed"> => ({
    ph: r() * 10, h: 0.9 + r() * 0.18, build: 0.92 + r() * 0.16,
    skin: new THREE.Color(pick(SKIN)), hair: new THREE.Color(pick(HAIR)), coat: new THREE.Color(pick(COATS)),
    trousers: new THREE.Color(pick(TROUSERS)), brolly: new THREE.Color(pick(BROLLIES)), scarf: new THREE.Color(pick(SCARVES)),
    hasScarf: r() > 0.55, bun: r() > 0.7, bag: (r() > 0.6 ? 1 : r() > 0.6 ? 2 : 0) as 0 | 1 | 2,
  });
  const out: Person[] = [];
  // walkers in two lanes each way
  for (let i = 0; i < 14; i++) {
    const lane = (i % 2 ? 1 : -1) * (1.2 + r() * 1.6);
    out.push({ ...base(), x: lane, lane, z: 22 - r() * 62, dir: r() > 0.5 ? 1 : -1, face: 0, speed: 0.75 + r() * 0.5 });
  }
  // a few standing about: reading the notice board, at the envelope stall, chatting outside a hall
  const board = stopById("board"), pass = stopById("pass"), echo = stopById("echo");
  const still = (x: number, z: number, face: number) => out.push({ ...base(), x, z, lane: x, dir: 0, face, speed: 0 });
  still(HALF - 1.3, board.z + 0.8, -Math.PI / 2);
  still(HALF - 1.2, board.z - 1.1, -Math.PI / 2 + 0.3);
  still(-HALF + 2.75, pass.z + 0.4, Math.PI / 2);
  still(HALF - 1.6, echo.z - 2.6, Math.PI * 0.9);
  still(HALF - 2.3, echo.z - 3.2, -0.3);
  return out;
}

const PARTS = ["coat", "head", "hair", "bun", "scarf", "thighL", "thighR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "shaft", "canopy", "backpack", "bag"] as const;
type PartName = (typeof PARTS)[number];

export default function People() {
  const people = useMemo(makePeople, []);
  const N = people.length;

  const kit = useMemo(() => {
    const std = (color?: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: color ?? "#ffffff", roughness: 0.75, ...extra });
    const g: Record<PartName, [THREE.BufferGeometry, THREE.Material]> = {
      coat: [coatGeo(), std(undefined, { roughness: 0.85 })],
      head: [new THREE.SphereGeometry(0.105, 16, 12).scale(0.92, 1.05, 1), std(undefined, { roughness: 0.6 })],
      hair: [new THREE.SphereGeometry(0.113, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58).scale(0.95, 1.05, 1.05).translate(0, 0.012, 0.012), std(undefined, { roughness: 0.5 })],
      bun: [new THREE.SphereGeometry(0.05, 10, 8), std(undefined, { roughness: 0.5 })],
      scarf: [new THREE.TorusGeometry(0.085, 0.035, 8, 16).rotateX(Math.PI / 2).scale(1, 1, 0.8), std(undefined, { roughness: 0.9 })],
      thighL: [limb(0.072, 0.3), std()], thighR: [limb(0.072, 0.3), std()],
      shinL: [limb(0.062, 0.3), std()], shinR: [limb(0.062, 0.3), std()],
      shoeL: [new THREE.BoxGeometry(0.1, 0.07, 0.22).translate(0, -0.035, -0.04), std("#141414", { roughness: 0.4 })],
      shoeR: [new THREE.BoxGeometry(0.1, 0.07, 0.22).translate(0, -0.035, -0.04), std("#141414", { roughness: 0.4 })],
      armL: [limb(0.05, 0.24), std(undefined, { roughness: 0.85 })], armR: [limb(0.05, 0.24), std(undefined, { roughness: 0.85 })],
      foreL: [limb(0.044, 0.22), std(undefined, { roughness: 0.85 })], foreR: [limb(0.044, 0.22), std(undefined, { roughness: 0.85 })],
      handL: [new THREE.SphereGeometry(0.045, 10, 8), std(undefined, { roughness: 0.6 })],
      handR: [new THREE.SphereGeometry(0.045, 10, 8), std(undefined, { roughness: 0.6 })],
      shaft: [new THREE.CylinderGeometry(0.01, 0.01, 0.78).translate(0, 0.39, 0), std("#3a2a1a")],
      canopy: [canopyGeo(), new THREE.MeshStandardMaterial({ map: canopyTex(), side: THREE.DoubleSide, roughness: 0.55, emissive: "#ffffff", emissiveIntensity: 0.06 })],
      backpack: [new THREE.BoxGeometry(0.26, 0.32, 0.13).translate(0, 0, 0.13), std("#2a2a30", { roughness: 0.7 })],
      bag: [new THREE.BoxGeometry(0.2, 0.24, 0.08).translate(0, -0.14, 0), std("#c4291e", { roughness: 0.4 })],
    };
    return g;
  }, []);

  const refs = useRef<Partial<Record<PartName, THREE.InstancedMesh>>>({});

  // colours never change, so set them once
  useEffect(() => {
    const colourOf: Partial<Record<PartName, (p: Person) => THREE.Color>> = {
      coat: (p) => p.coat, head: (p) => p.skin, hair: (p) => p.hair, bun: (p) => p.hair, scarf: (p) => p.scarf,
      thighL: (p) => p.trousers, thighR: (p) => p.trousers, shinL: (p) => p.trousers, shinR: (p) => p.trousers,
      armL: (p) => p.coat, armR: (p) => p.coat, foreL: (p) => p.coat, foreR: (p) => p.coat,
      handL: (p) => p.skin, handR: (p) => p.skin, canopy: (p) => p.brolly,
    };
    for (const [name, f] of Object.entries(colourOf) as [PartName, (p: Person) => THREE.Color][]) {
      const m = refs.current[name];
      if (!m) continue;
      people.forEach((p, i) => m.setColorAt(i, f(p)));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [people]);

  // scratch objects, reused every frame
  const tmp = useMemo(() => ({
    root: new THREE.Matrix4(), m: new THREE.Matrix4(), joint: new THREE.Matrix4(),
    q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3(), sc2: new THREE.Vector3(), one: new THREE.Vector3(1, 1, 1), zero: new THREE.Vector3(0, 0, 0),
  }), []);

  useFrame(({ clock, camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = clock.elapsedTime;
    const { root, m, joint, q, e, v, sc, sc2, one, zero } = tmp;

    /** a transform: translate, then rotate (x, y, z), then scale */
    const trs = (out: THREE.Matrix4, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: THREE.Vector3 = one) =>
      out.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s);
    const put = (name: PartName, i: number, local: THREE.Matrix4) => refs.current[name]?.setMatrixAt(i, m.multiplyMatrices(root, local));
    const hide = (name: PartName, i: number) => refs.current[name]?.setMatrixAt(i, m.makeScale(0, 0, 0).setPosition(zero));

    people.forEach((p, i) => {
      // ── move ──
      if (p.dir !== 0) {
        p.z -= p.dir * p.speed * dt;
        if (p.z < -40) p.dir = -1;
        if (p.z > 22) p.dir = 1;
        // step aside rather than walk through you
        const dz = p.z - camera.position.z, dx = p.x - camera.position.x;
        const want = Math.abs(dz) < 1.8 && Math.abs(dx) < 1.1 ? p.lane + Math.sign(dx || p.lane) * 1.1 : p.lane;
        p.x += (Math.max(-HALF + 0.9, Math.min(HALF - 0.9, want)) - p.x) * Math.min(1, dt * 3);
      }
      const walking = p.dir !== 0;
      const yaw = walking ? (p.dir === 1 ? 0 : Math.PI) : p.face + Math.sin(t * 0.4 + p.ph) * 0.08;
      const phase = walking ? t * p.speed * 6.2 + p.ph : 0;
      const s = Math.sin(phase), c = Math.cos(phase);
      const bob = walking ? Math.abs(c) * 0.035 : Math.sin(t * 1.3 + p.ph) * 0.006;
      root.compose(v.set(p.x, bob, p.z), q.setFromEuler(e.set(0, yaw, walking ? s * 0.03 : 0)), sc.set(p.build * p.h, p.h, p.h));

      // ── limbs: each joint is placed at the end of the limb above it ──
      // forward is -z, so a positive x rotation swings a limb forward
      const LEG = 0.4, ARM = 0.33, FORE = 0.29;
      const tip = (local: THREE.Matrix4, len: number) => new THREE.Vector3(0, -len, 0).applyMatrix4(local);

      const hipY = 0.86, hipX = 0.09;
      for (const [side, sign] of [["L", 1], ["R", -1]] as const) {
        const a = walking ? sign * s * 0.42 : 0; // thigh
        const knee = walking ? Math.max(0, -sign * c) * 0.75 + 0.05 : 0.03; // bends on the back-swing
        const x = side === "L" ? -hipX : hipX;
        trs(joint, x, hipY, 0, a);
        put(`thigh${side}`, i, joint);
        const k = tip(joint, LEG);
        trs(joint, k.x, k.y, k.z, a - knee);
        put(`shin${side}`, i, joint);
        const f = tip(joint, LEG);
        put(`shoe${side}`, i, trs(joint, f.x, Math.max(0.035, f.y), f.z));
      }

      // ── body ──
      put("coat", i, trs(joint, 0, 0, 0));
      if (p.bag === 1) put("backpack", i, trs(joint, 0, 1.18, 0.06)); else hide("backpack", i);
      if (p.hasScarf) put("scarf", i, trs(joint, 0, 1.47, 0)); else hide("scarf", i);
      const nod = walking ? c * 0.03 : Math.sin(t * 0.7 + p.ph) * 0.05;
      put("head", i, trs(joint, 0, 1.62, 0, nod));
      put("hair", i, trs(joint, 0, 1.62, 0, nod));
      if (p.bun) put("bun", i, trs(joint, 0, 1.69, 0.1)); else hide("bun", i);

      const shY = 1.37, shX = 0.2;

      // ── left arm swings opposite the left leg, and may carry a shopping bag ──
      const la = walking ? -s * 0.38 : 0.04;
      trs(joint, -shX, shY, 0, la, 0, -0.1);
      put("armL", i, joint);
      const el = tip(joint, ARM);
      trs(joint, el.x, el.y, el.z, la + (walking ? 0.25 + Math.max(0, -s) * 0.3 : 0.15), 0, -0.05);
      put("foreL", i, joint);
      const hl = tip(joint, FORE);
      put("handL", i, trs(joint, hl.x, hl.y, hl.z));
      if (p.bag === 2) put("bag", i, trs(joint, hl.x, hl.y, hl.z, 0, 0, walking ? s * 0.15 : 0)); else hide("bag", i);

      // ── right hand holds the umbrella in front of the chest ──
      trs(joint, shX, shY, 0, 0.12, 0, 0.06); // elbow tucked in at the side
      put("armR", i, joint);
      const er = tip(joint, ARM);
      trs(joint, er.x, er.y, er.z, 2.25, 0, -0.3); // forearm up towards the chest
      put("foreR", i, joint);
      const hr = tip(joint, FORE);
      put("handR", i, trs(joint, hr.x, hr.y, hr.z));
      // the shaft rises from the hand and leans back so the canopy sits over the head
      const top = 2.02;
      const back = -hr.z + 0.02; // how far the head is behind the hand
      const lean = Math.atan2(back, top - hr.y);
      const shaftLen = Math.hypot(back, top - hr.y);
      put("shaft", i, trs(joint, hr.x, hr.y, hr.z, lean, 0, 0, sc2.set(1, shaftLen / 0.78, 1)));
      put("canopy", i, trs(joint, hr.x, top - 0.06, hr.z + back, lean * 0.5, t * 0.12 + p.ph, walking ? s * 0.03 : 0));
    });
    for (const name of PARTS) {
      const mesh = refs.current[name];
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {PARTS.map((name) => {
        const [geo, material] = kit[name];
        return (
          <instancedMesh
            key={name}
            ref={(mesh) => { if (mesh) refs.current[name] = mesh; }}
            args={[geo, material, N]}
            raycast={() => null}
            frustumCulled={false}
          />
        );
      })}
    </>
  );
}
