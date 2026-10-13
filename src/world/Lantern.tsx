import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { lanternTex } from "./textures";

/** A Chinese paper lantern's silhouette, spun around its axis. */
export const lanternGeo = (() => {
  const pts = [[0.06, -0.5], [0.3, -0.46], [0.46, -0.3], [0.52, 0], [0.46, 0.3], [0.3, 0.46], [0.06, 0.5]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 32);
  // the painted characters sit at u = .25 and .75; turn them to face ±z
  g.rotateY(-Math.PI / 2);
  return g;
})();

const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20);
const tasselGeo = new THREE.CylinderGeometry(0.025, 0.07, 0.55, 8);
const cordGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 4);
const gold = new THREE.MeshStandardMaterial({ color: "#c99a3a", metalness: 0.8, roughness: 0.35, emissive: "#4a3008" });
const tassel = new THREE.MeshStandardMaterial({ color: "#b8261a", emissive: "#5a0c06" });
const cord = new THREE.MeshBasicMaterial({ color: "#1c120e" });

type Props = {
  char: string;
  paper: string;
  position: [number, number, number];
  /** height of the lantern body in metres */
  size?: number;
  /** length of cord above the lantern */
  drop?: number;
  ghost?: boolean;
  glow?: number;
  phase?: number;
  rotationY?: number;
};

/** A hanging lantern that sways from its cord. `position` is the hook. */
export default function Lantern({ char, paper, position, size = 1, drop = 0.4, ghost, glow = 1.5, phase = 0, rotationY = 0 }: Props) {
  const swing = useRef<THREE.Group>(null!);
  const tex = useMemo(() => lanternTex(char, paper, ghost), [char, paper, ghost]);
  useFrame(({ clock }) => {
    swing.current.rotation.z = Math.sin(clock.elapsedTime * 1.1 + phase) * 0.045;
    swing.current.rotation.x = Math.sin(clock.elapsedTime * 0.8 + phase * 1.7) * 0.025;
  });
  const h = 1.1 * size;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group ref={swing}>
        <mesh geometry={cordGeo} material={cord} position={[0, -drop / 2, 0]} scale={[1, drop, 1]} />
        <group position={[0, -drop - h / 2, 0]} scale={size}>
          <mesh geometry={lanternGeo} scale={[1, 1.1, 1]}>
            <meshStandardMaterial
              map={tex}
              emissive="#ffffff"
              emissiveMap={tex}
              emissiveIntensity={ghost ? 0.35 : glow}
              roughness={0.7}
              transparent={ghost}
              opacity={ghost ? 0.6 : 1}
              side={ghost ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
          <mesh geometry={capGeo} material={gold} position={[0, 0.58, 0]} />
          <mesh geometry={capGeo} material={gold} position={[0, -0.58, 0]} />
          <mesh geometry={tasselGeo} material={tassel} position={[0, -0.9, 0]} />
        </group>
      </group>
    </group>
  );
}
