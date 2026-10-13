import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { HALF } from "./stops";
import { facadeTex } from "./textures";

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

const roofCache = new Map<number, THREE.ExtrudeGeometry>();
export function roofGeo(len: number, depth = DEPTH) {
  const key = Math.round(len * 100) * 1000 + Math.round(depth * 10);
  let g = roofCache.get(key);
  if (!g) {
    g = new THREE.ExtrudeGeometry(roofShape(depth), { depth: len, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -len / 2);
    roofCache.set(key, g);
  }
  return g;
}

export const tileMat = new THREE.MeshStandardMaterial({ color: "#20453f", roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide });
export const ridgeMat = new THREE.MeshStandardMaterial({ color: "#c99a3a", metalness: 0.75, roughness: 0.3, emissive: "#3a2406" });
const wallSide = new THREE.MeshStandardMaterial({ color: "#1d1416", roughness: 0.95 });
const timber = new THREE.MeshStandardMaterial({ color: "#3a1a12", roughness: 0.7 });
const eaveMat = new THREE.MeshStandardMaterial({ color: "#14100e", roughness: 0.8 });

type Props = {
  side: -1 | 1;
  z: number;
  /** frontage along the street */
  w: number;
  floors: number;
  wall: string;
  seed: number;
  /** what fills the ground floor; defaults to a lit shop interior */
  shop?: ReactNode;
  /** extra things in the building's local frame: x = into the street, y up, z along the street */
  children?: ReactNode;
  awning?: string;
  /** colour of the warm light inside the shop */
  interior?: string;
};

/**
 * A Chinatown shophouse. Its local frame faces the street: +x points into the street,
 * so children can be placed without caring which side it stands on.
 */
export default function Shophouse({ side, z, w, floors, wall, seed, shop, children, awning, interior = "#ffb067" }: Props) {
  const tex = useMemo(() => facadeTex(seed, wall, floors), [seed, wall, floors]);
  const H = GROUND + floors * FLOOR;
  const upper = floors * FLOOR;
  return (
    // the street-facing frame: x into the street; left side faces +x, right side faces -x
    <group position={[side * HALF, 0, z]} rotation={[0, side === -1 ? 0 : Math.PI, 0]}>
      {/* body */}
      <mesh position={[-DEPTH / 2, H / 2, 0]} material={wallSide}>
        <boxGeometry args={[DEPTH, H, w]} />
      </mesh>
      {/* upper facade */}
      <mesh position={[0.01, GROUND + upper / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w, upper]} />
        <meshStandardMaterial map={tex.map} emissive="#ffffff" emissiveMap={tex.emissive} emissiveIntensity={0.55} roughness={0.9} />
      </mesh>
      {/* floor eaves: a little tiled lip at every floor line */}
      {Array.from({ length: floors }, (_, f) => (
        <mesh key={f} position={[0.22, GROUND + f * FLOOR - 0.04, 0]} material={eaveMat}>
          <boxGeometry args={[0.45, 0.1, w + 0.02]} />
        </mesh>
      ))}
      {/* roof with upturned eave; mirrored so the eave hangs over the street */}
      <group position={[0, H, 0]} scale={[-1, 1, 1]}>
        <mesh geometry={roofGeo(w + 0.02)} material={tileMat} />
        <mesh position={[DEPTH * 0.5, 1.94, 0]} rotation={[Math.PI / 2, 0, 0]} material={ridgeMat}>
          <cylinderGeometry args={[0.09, 0.09, w + 0.02, 8]} />
        </mesh>
      </group>
      {/* ground floor: pillars, lintel, and whatever the shop is */}
      {[-w / 2 + 0.18, w / 2 - 0.18].map((pz) => (
        <mesh key={pz} position={[0.05, GROUND / 2, pz]} material={timber}>
          <boxGeometry args={[0.3, GROUND, 0.3]} />
        </mesh>
      ))}
      <mesh position={[0.05, GROUND - 0.15, 0]} material={timber}>
        <boxGeometry args={[0.32, 0.3, w]} />
      </mesh>
      {shop ?? <ShopInterior w={w} color={interior} />}
      {awning && (
        <mesh position={[0.75, GROUND - 0.55, 0]} rotation={[0, 0, -0.32]}>
          <boxGeometry args={[1.6, 0.05, w - 0.5]} />
          <meshStandardMaterial color={awning} roughness={0.8} emissive={awning} emissiveIntensity={0.08} />
        </mesh>
      )}
      {children}
    </group>
  );
}

/** A recessed, warmly lit shop: back wall glow, counter, shelves. */
export function ShopInterior({ w, color = "#ffb067" }: { w: number; color?: string }) {
  return (
    <group>
      <mesh position={[-1.6, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w - 0.6, 2.8]} />
        <meshStandardMaterial color="#000" emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.9, 0.5, 0]}>
        <boxGeometry args={[0.6, 1, w * 0.55]} />
        <meshStandardMaterial color="#2a1610" roughness={0.6} />
      </mesh>
      {[0.9, 1.6, 2.3].map((y) => (
        <mesh key={y} position={[-1.5, y, 0]}>
          <boxGeometry args={[0.15, 0.05, w - 1]} />
          <meshStandardMaterial color="#120a08" />
        </mesh>
      ))}
      {/* floor of the shop */}
      <mesh position={[-0.9, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, w - 0.4]} />
        <meshStandardMaterial color="#3a2418" emissive={color} emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}
