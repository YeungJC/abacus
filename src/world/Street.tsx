import { MeshReflectorMaterial } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useApp } from "../store";
import { lanternGeo } from "./Lantern";
import Shophouse from "./Shophouse";
import { HALF, STOPS } from "./stops";
import { canvasTex, flagstoneTex, lanternTex, neonTex, rng } from "./textures";

const WALLS = ["#4a2420", "#3e3a30", "#2f3b36", "#463424", "#3a2a32", "#2e2a28", "#4e3a28"];
const SIGNS = ["粥麵", "燒臘", "麻雀", "點心", "糖水", "裁縫", "金行", "雲吞", "藥材", "書局", "茶餐廳", "海味"];
const NEON = ["#ff4a3d", "#3fe0a8", "#ffc24a", "#ff6fae", "#7fb3ff", "#ffffff"];

const Z_FROM = 25, Z_TO = -45;

/** Shophouses that fill the street between the places you can visit. */
function Filler() {
  const items = useMemo(() => {
    const r = rng(5);
    const out: JSX.Element[] = [];
    let n = 0;
    for (const side of [-1, 1] as const) {
      const taken = STOPS.filter((s) => s.side === side).map((s) => [s.z + s.w / 2, s.z - s.w / 2]);
      let z = Z_FROM;
      while (z > Z_TO) {
        const hit = taken.find(([a, b]) => z > b && z - 0.01 <= a);
        if (hit) { z = hit[1]; continue; }
        const next = taken.filter(([a]) => a < z).reduce((m, [a]) => Math.max(m, a), -Infinity);
        let w = 3.2 + r() * 2.4;
        if (z - w < next) w = z - next;
        if (w < 0.6) { z -= w; continue; }
        const cz = z - w / 2;
        const floors = 2 + Math.floor(r() * 3);
        out.push(<Shophouse key={`f${n}`} side={side} z={cz} w={w} floors={floors} wall={WALLS[n % WALLS.length]} seed={200 + n} awning={r() > 0.5 ? (r() > 0.5 ? "#7a2018" : "#24463f") : undefined} interior={r() > 0.3 ? "#ffb067" : "#ffd6a0"} />);
        if (w > 2.4 && r() > 0.3) {
          const col = NEON[n % NEON.length];
          out.push(<NeonBlade key={`n${n}`} text={SIGNS[n % SIGNS.length]} col={col} position={[side * (HALF - 0.55), 3.6 + r() * 1.6, cz + (r() - 0.5) * (w - 1)]} />);
        }
        n++;
        z -= w;
      }
    }
    return out;
  }, []);
  return <>{items}</>;
}

function NeonBlade({ text, col, position }: { text: string; col: string; position: [number, number, number] }) {
  const tex = useMemo(() => neonTex(text, col), [text, col]);
  const h = 0.45 * [...text].length + 0.3;
  return (
    <mesh position={position}>
      <planeGeometry args={[0.5, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Strings of 福 lanterns across the street. */
function LanternStrings() {
  const { geo, items } = useMemo(() => {
    const pts: number[] = [];
    const items: { x: number; y: number; z: number; ph: number }[] = [];
    for (let z = 5; z > -44; z -= 4.6) {
      const top = 6.2, sag = 0.65, N = 24;
      for (let i = 0; i < N; i++) {
        const a = i / N, b = (i + 1) / N;
        pts.push(-HALF + 0.3 + a * (HALF - 0.3) * 2, top - 4 * sag * a * (1 - a), z, -HALF + 0.3 + b * (HALF - 0.3) * 2, top - 4 * sag * b * (1 - b), z);
      }
      for (let k = 1; k <= 6; k++) {
        const a = k / 7;
        items.push({ x: -HALF + 0.3 + a * (HALF - 0.3) * 2, y: top - 4 * sag * a * (1 - a) - 0.42, z, ph: z * 0.7 + k * 1.3 });
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return { geo, items };
  }, []);
  const tex = useMemo(() => lanternTex("福", "#d8321e"), []);
  const inst = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    items.forEach((l, i) => {
      const sw = Math.sin(t * 1.2 + l.ph) * 0.05;
      dummy.position.set(l.x + sw * 0.4, l.y, l.z);
      dummy.rotation.set(0, Math.sin(l.ph) * 0.4, sw);
      dummy.scale.set(0.42, 0.48, 0.42);
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    });
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <lineSegments geometry={geo}><lineBasicMaterial color="#2a1e1a" /></lineSegments>
      <instancedMesh ref={inst} args={[lanternGeo, undefined, items.length]}>
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={1.5} />
      </instancedMesh>
    </>
  );
}

/** Manchester drizzle. */
function Rain() {
  const N = 1400;
  const { geo, speed } = useMemo(() => {
    const r = rng(3);
    const p = new Float32Array(N * 6), speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * 10, y = r() * 10, z = 22 - r() * 70;
      p.set([x, y, z, x + 0.015, y - 0.28, z], i * 6);
      speed[i] = 7 + r() * 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return { geo, speed };
  }, []);
  useFrame((_, dt) => {
    const a = geo.attributes.position as THREE.BufferAttribute;
    const p = a.array as Float32Array;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < N; i++) {
      const dy = speed[i] * d;
      p[i * 6 + 1] -= dy; p[i * 6 + 4] -= dy;
      if (p[i * 6 + 4] < 0) { p[i * 6 + 1] += 10; p[i * 6 + 4] += 10; }
    }
    a.needsUpdate = true;
  });
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#a9bedc" transparent opacity={0.22} depthWrite={false} />
    </lineSegments>
  );
}

/** Sky lanterns drifting up over the gala end of the street. */
function SkyLanterns() {
  const N = 40;
  const inst = useRef<THREE.InstancedMesh>(null!);
  const seeds = useMemo(() => { const r = rng(9); return Array.from({ length: N }, () => [(r() - 0.5) * 30, r() * 30, -50 - r() * 40, 0.3 + r() * 0.4, r() * 6]); }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    seeds.forEach(([x, y0, z, v, ph], i) => {
      const y = 8 + ((y0 + t * v) % 30);
      dummy.position.set(x + Math.sin(t * 0.3 + ph) * 0.8, y, z);
      dummy.scale.setScalar(0.5);
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    });
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, N]}>
      <cylinderGeometry args={[0.4, 0.3, 0.7, 6]} />
      <meshBasicMaterial color="#ffb45a" toneMapped={false} fog={false} />
    </instancedMesh>
  );
}

function Moon() {
  const halo = useMemo(
    () =>
      canvasTex(256, 256, (c) => {
        const g = c.createRadialGradient(128, 128, 30, 128, 128, 128);
        g.addColorStop(0, "rgba(255,240,210,.55)"); g.addColorStop(1, "rgba(255,240,210,0)");
        c.fillStyle = g; c.fillRect(0, 0, 256, 256);
      }),
    [],
  );
  return (
    <group position={[16, 46, -140]}>
      <mesh><circleGeometry args={[3.6, 48]} /><meshBasicMaterial color="#f6e7c4" fog={false} toneMapped={false} /></mesh>
      <mesh position={[0, 0, -0.1]}><planeGeometry args={[24, 24]} /><meshBasicMaterial map={halo} transparent fog={false} depthWrite={false} /></mesh>
    </group>
  );
}

/** Firecracker bursts in the sky above the stage. */
function Fireworks() {
  const N = 2400;
  const pts = useRef<THREE.Points>(null!);
  const state = useMemo(() => ({ pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N), col: new Float32Array(N * 3), next: 0 }), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(state.pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(state.col, 3));
    return g;
  }, [state]);
  const count = useApp((s) => s.fireworks);
  useEffect(() => {
    if (!count) return;
    const palette = [[1, 0.3, 0.2], [1, 0.82, 0.35], [1, 0.55, 0.25], [1, 0.95, 0.8]];
    for (let b = 0; b < 5; b++) {
      setTimeout(() => {
        const cx = (Math.random() - 0.5) * 9, cy = 8.5 + Math.random() * 4, cz = -52 + Math.random() * 5;
        const col = palette[b % palette.length];
        for (let k = 0; k < 320; k++) {
          const i = state.next; state.next = (state.next + 1) % N;
          const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 3;
          const s = Math.sqrt(1 - u * u);
          state.pos.set([cx, cy, cz], i * 3);
          state.vel.set([s * Math.cos(th) * sp, u * sp, s * Math.sin(th) * sp], i * 3);
          state.col.set(col, i * 3);
          state.life[i] = 1.6 + Math.random() * 0.6;
        }
      }, b * 260);
    }
  }, [count, state]);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    let any = false;
    for (let i = 0; i < N; i++) {
      if (state.life[i] <= 0) { state.pos[i * 3 + 1] = -100; continue; }
      any = true;
      state.life[i] -= d;
      state.vel[i * 3 + 1] -= 3 * d;
      for (let k = 0; k < 3; k++) { state.vel[i * 3 + k] *= 0.985; state.pos[i * 3 + k] += state.vel[i * 3 + k] * d; }
      const f = Math.max(0, Math.min(1, state.life[i]));
      state.col[i * 3] *= 0.995; state.col[i * 3 + 1] *= 0.99 + 0.005 * f; state.col[i * 3 + 2] *= 0.98;
    }
    if (any || count) { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; }
  });
  return (
    <points ref={pts} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.22} vertexColors toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
    </points>
  );
}

/** Wet granite street that mirrors the lanterns, with kerbs either side. */
function Ground() {
  const map = useMemo(() => { const t = flagstoneTex(); t.repeat.set(2, 16); return t; }, []);
  const small = useThree((s) => s.size.width < 700);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -14]}>
        <planeGeometry args={[HALF * 2, 84]} />
        <MeshReflectorMaterial
          map={map}
          blur={[200, 60]}
          resolution={small ? 256 : 512}
          mixBlur={1}
          mixStrength={small ? 6 : 9}
          mirror={0.85}
          roughness={0.55}
          depthScale={0.6}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.2}
          color="#8a8084"
          metalness={0.35}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HALF - 0.35), 0.06, -14]}>
          <boxGeometry args={[0.7, 0.12, 84]} />
          <meshStandardMaterial color="#4a4446" roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

export default function Street() {
  return (
    <>
      <Ground />
      <Filler />
      <LanternStrings />
      <Rain />
      <SkyLanterns />
      <Moon />
      <Fireworks />
      {/* lantern light pooling on the street, every ten metres */}
      {[14, 4, -6, -16, -26, -36].map((z, i) => (
        <pointLight key={z} position={[i % 2 ? 1.5 : -1.5, 4.8, z]} color="#ff8a50" intensity={55} distance={15} decay={2} />
      ))}
    </>
  );
}
