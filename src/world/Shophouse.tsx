import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HALF } from "./stops";
import { clothTex, facadeTex, paintFacade, rng, shutterTex } from "./textures";

export const GROUND = 3.4; // ground-floor height
export const FLOOR = 2.6; // each upper floor
export const DEPTH = 7;

/**
 * Cross-section of a tiled roof with an upturned eave over the street. x runs away from
 * the street, y up; it is extruded along the street.
 */
function roofShape(depth: number) {
  const s = new THREE.Shape();
  s.moveTo(-0.9, 0.42); // eave tip, flicked up
  s.quadraticCurveTo(-0.4, -0.02, 0.15, 0.02);
  s.quadraticCurveTo(depth * 0.3, 0.55, depth * 0.48, 1.9); // concave sweep up to the ridge
  s.lineTo(depth * 0.52, 1.9);
  s.quadraticCurveTo(depth * 0.7, 0.55, depth + 0.3, 0);
  s.lineTo(depth + 0.3, -0.18);
  s.lineTo(0.15, -0.16);
  s.quadraticCurveTo(-0.45, -0.18, -0.9, 0.3);
  s.closePath();
  return s;
}

export function roofGeo(len: number, depth = DEPTH) {
  const g = new THREE.ExtrudeGeometry(roofShape(depth), { depth: len, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -len / 2);
  return g;
}

/* ── materials, shared by every building ─────────── */

export const tileMat = new THREE.MeshStandardMaterial({ color: "#20453f", roughness: 0.4, metalness: 0.25, side: THREE.DoubleSide });
export const ridgeMat = new THREE.MeshStandardMaterial({ color: "#c99a3a", metalness: 0.8, roughness: 0.3, emissive: "#3a2406" });

const cache = new Map<string, THREE.Material>();
/** Materials by key, e.g. "wall" or "interior:#ffb067". */
function mat(key: string): THREE.Material {
  let m = cache.get(key);
  if (m) return m;
  const [kind, col] = key.split(":");
  switch (kind) {
    case "wall": m = new THREE.MeshStandardMaterial({ color: "#1d1416", roughness: 0.95 }); break;
    case "eave": m = new THREE.MeshStandardMaterial({ color: "#14100e", roughness: 0.8 }); break;
    case "tile": m = tileMat; break;
    case "ridge": m = ridgeMat; break;
    case "timber": m = new THREE.MeshStandardMaterial({ color: "#3a1a12", roughness: 0.7 }); break;
    case "pipe": m = new THREE.MeshStandardMaterial({ color: "#3a3634", metalness: 0.5, roughness: 0.5 }); break;
    case "metal": m = new THREE.MeshStandardMaterial({ color: "#8a8680", metalness: 0.6, roughness: 0.45 }); break;
    case "bamboo": m = new THREE.MeshStandardMaterial({ color: "#b89a5a", roughness: 0.7 }); break;
    case "counter": m = new THREE.MeshStandardMaterial({ color: "#2a1610", roughness: 0.6 }); break;
    case "shelf": m = new THREE.MeshStandardMaterial({ color: "#120a08" }); break;
    case "interior": m = new THREE.MeshStandardMaterial({ color: "#000", emissive: col, emissiveIntensity: 0.5 }); break;
    case "shopfloor": m = new THREE.MeshStandardMaterial({ color: "#3a2418", emissive: col, emissiveIntensity: 0.08 }); break;
    case "awning": m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, emissive: col, emissiveIntensity: 0.08 }); break;
    case "shutter": m = new THREE.MeshStandardMaterial({ map: shutterTex(7), metalness: 0.5, roughness: 0.5 }); break;
    case "cloth": m = new THREE.MeshStandardMaterial({ map: clothTex(11), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }); break;
    default: throw new Error("unknown material " + key);
  }
  cache.set(key, m);
  return m;
}

/* ── the parts of one building ───────────────────── */

export type Spec = {
  side: -1 | 1;
  z: number;
  /** frontage along the street */
  w: number;
  floors: number;
  wall: string;
  seed: number;
  awning?: string;
  /** colour of the warm light inside the shop */
  interior?: string;
  /** shop shut for the night: roller shutter down */
  closed?: boolean;
  /** washing drying on a bamboo pole outside an upper window */
  laundry?: boolean;
  /** leave the ground floor empty for a custom shop */
  customShop?: boolean;
};

type Part = { key: string; geo: THREE.BufferGeometry };
const m4 = new THREE.Matrix4();
const place = (geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
  geo.applyMatrix4(m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
  return geo;
};

/**
 * Every static piece of a shophouse in its own street-facing frame (+x into the street,
 * y up, z along the street), tagged with its material. The facade comes back as a plane
 * tagged "facade" for the caller to texture.
 */
function parts(s: Spec): Part[] {
  const { w, floors } = s;
  const H = GROUND + floors * FLOOR, upper = floors * FLOOR;
  const r = rng(s.seed * 7 + 3);
  const out: Part[] = [];
  const add = (key: string, geo: THREE.BufferGeometry) => out.push({ key, geo });

  add("wall", place(new THREE.BoxGeometry(DEPTH, H, w), -DEPTH / 2, H / 2, 0));
  add("facade", place(new THREE.PlaneGeometry(w, upper), 0.01, GROUND + upper / 2, 0, 0, Math.PI / 2));
  for (let f = 0; f < floors; f++) add("eave", place(new THREE.BoxGeometry(0.45, 0.1, w + 0.02), 0.22, GROUND + f * FLOOR - 0.04, 0));

  // roof, mirrored so the upturned eave hangs over the street
  const mirror = new THREE.Matrix4().makeTranslation(0, H, 0).multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
  add("tile", roofGeo(w + 0.02).applyMatrix4(mirror));
  add("ridge", place(new THREE.CylinderGeometry(0.09, 0.09, w + 0.02, 8), DEPTH * 0.5, 1.94, 0, Math.PI / 2).applyMatrix4(mirror));
  for (const e of [-1, 1]) add("ridge", place(new THREE.ConeGeometry(0.1, 0.5, 6), DEPTH * 0.5, 2.08, e * (w / 2 - 0.05), e * -0.7).applyMatrix4(mirror));

  // drainpipe and air-con units
  add("pipe", place(new THREE.CylinderGeometry(0.05, 0.05, H, 6), 0.08, H / 2, (r() > 0.5 ? 1 : -1) * (w / 2 - 0.12)));
  // air-con hangs from the upper floors only, clear of shop signs
  for (let f = 1; f < floors; f++) {
    if (r() > 0.5) add("metal", place(new THREE.BoxGeometry(0.42, 0.42, 0.75), 0.22, GROUND + f * FLOOR + 0.45, (r() - 0.5) * (w - 1.2)));
  }
  const laundryFloor = 1 + Math.floor(r() * Math.max(1, floors - 1));
  const shutterUp = 0.15 + r() * 0.5;
  if (s.laundry) {
    const ly = GROUND + laundryFloor * FLOOR + 1.05;
    add("bamboo", place(new THREE.CylinderGeometry(0.025, 0.025, w - 0.4, 6), 0.7, ly, 0, Math.PI / 2));
    add("cloth", place(new THREE.PlaneGeometry(w - 0.6, 0.62), 0.7, ly - 0.32, 0, 0, Math.PI / 2));
  }

  // ground floor: pillars and lintel
  for (const pz of [-w / 2 + 0.18, w / 2 - 0.18]) add("timber", place(new THREE.BoxGeometry(0.3, GROUND, 0.3), 0.05, GROUND / 2, pz));
  add("timber", place(new THREE.BoxGeometry(0.32, 0.3, w), 0.05, GROUND - 0.15, 0));

  if (!s.customShop) {
    const col = s.interior ?? "#ffb067";
    add("interior:" + col, place(new THREE.PlaneGeometry(w - 0.6, 2.8), -1.6, 1.4, 0, 0, Math.PI / 2));
    add("counter", place(new THREE.BoxGeometry(0.6, 1, w * 0.55), -0.9, 0.5, 0));
    for (const y of [0.9, 1.6, 2.3]) add("shelf", place(new THREE.BoxGeometry(0.15, 0.05, w - 1), -1.5, y, 0));
    add("shopfloor:" + col, place(new THREE.PlaneGeometry(1.8, w - 0.4), -0.9, 0.01, 0, -Math.PI / 2));
    if (s.closed) {
      const h = (GROUND - 0.3) * (1 - shutterUp);
      add("shutter", place(new THREE.PlaneGeometry(w - 0.6, h), 0.12, GROUND - 0.3 - h / 2, 0, 0, Math.PI / 2));
    }
  }
  if (s.awning) add("awning:" + s.awning, place(new THREE.BoxGeometry(1.6, 0.05, w - 0.5), 0.75, GROUND - 0.55, 0, 0, 0, -0.32));
  return out;
}

/** The transform from a building's street-facing frame to the world. */
const frame = (s: Spec) =>
  new THREE.Matrix4().compose(new THREE.Vector3(s.side * HALF, 0, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.side === -1 ? 0 : Math.PI, 0)), new THREE.Vector3(1, 1, 1));

/** Merge geometries that share a material into one, so each material is one draw call. */
function mergeByKey(list: Part[]) {
  const groups = new Map<string, THREE.BufferGeometry[]>();
  for (const p of list) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    g.clearGroups();
    if (!groups.has(p.key)) groups.set(p.key, []);
    groups.get(p.key)!.push(g);
  }
  return [...groups].map(([key, gs]) => ({ key, geo: mergeGeometries(gs)! }));
}

/* ── one building, for the places you can visit ──── */

type Props = Omit<Spec, "customShop"> & {
  /** what fills the ground floor; defaults to a lit shop interior */
  shop?: ReactNode;
  /** extra things in the building's local frame: x = into the street, y up, z along the street */
  children?: ReactNode;
};

/**
 * A Chinatown shophouse. Its local frame faces the street: +x points into the street,
 * so children can be placed without caring which side it stands on.
 */
export default function Shophouse({ shop, children, ...spec }: Props) {
  const { meshes, facade } = useMemo(() => {
    const all = parts({ ...spec, customShop: !!shop });
    const merged = mergeByKey(all.filter((p) => p.key !== "facade"));
    const tex = facadeTex(spec.seed, spec.wall, spec.floors);
    const facade = {
      geo: all.find((p) => p.key === "facade")!.geo,
      mat: new THREE.MeshStandardMaterial({ map: tex.map, emissive: "#ffffff", emissiveMap: tex.emissive, emissiveIntensity: 0.55, roughness: 0.9 }),
    };
    return { meshes: merged, facade };
    // the spec is fixed for a building's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <group position={[spec.side * HALF, 0, spec.z]} rotation={[0, spec.side === -1 ? 0 : Math.PI, 0]}>
      {meshes.map((m) => <mesh key={m.key} geometry={m.geo} material={mat(m.key)} />)}
      <mesh geometry={facade.geo} material={facade.mat} />
      {shop}
      {children}
    </group>
  );
}

/* ── the whole row of ordinary buildings, in a dozen draw calls ── */

/**
 * Builds every filler shophouse as merged geometry: one mesh per material across the whole
 * street, and all facades painted into one texture atlas.
 */
export function buildRow(specs: Spec[]) {
  const AW = 2048, CELL_W = 256;
  const perRow = AW / CELL_W;
  const rowH = 128 * Math.max(...specs.map((s) => s.floors));
  const AH = THREE.MathUtils.ceilPowerOfTwo(Math.ceil(specs.length / perRow) * rowH);
  const cm = document.createElement("canvas"), ce = document.createElement("canvas");
  cm.width = ce.width = AW; cm.height = ce.height = AH;
  const c = cm.getContext("2d")!, e = ce.getContext("2d")!;
  e.fillStyle = "#000"; e.fillRect(0, 0, AW, AH);

  const all: Part[] = [];
  specs.forEach((s, i) => {
    const ox = (i % perRow) * CELL_W, oy = Math.floor(i / perRow) * rowH, h = 128 * s.floors;
    paintFacade(s.seed, s.wall, s.floors, c, e, ox, oy);
    const world = frame(s);
    for (const p of parts(s)) {
      p.geo.applyMatrix4(world);
      if (p.key === "facade") {
        // point the plane's UVs at this building's cell in the atlas
        const uv = p.geo.attributes.uv as THREE.BufferAttribute;
        for (let k = 0; k < uv.count; k++) {
          uv.setXY(k, (ox + uv.getX(k) * CELL_W) / AW, 1 - (oy + (1 - uv.getY(k)) * h) / AH);
        }
      }
      all.push(p);
    }
  });
  const map = new THREE.CanvasTexture(cm), emissive = new THREE.CanvasTexture(ce);
  map.colorSpace = emissive.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = emissive.anisotropy = 8;
  const facadeMat = new THREE.MeshStandardMaterial({ map, emissive: "#ffffff", emissiveMap: emissive, emissiveIntensity: 0.55, roughness: 0.9 });
  return mergeByKey(all).map(({ key, geo }) => ({ key, geo, material: key === "facade" ? facadeMat : mat(key) }));
}
