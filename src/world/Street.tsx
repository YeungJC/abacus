import { MeshReflectorMaterial } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useApp } from "../store";
import { lanternGeo } from "./Lantern";
import People from "./People";
import { Banner } from "./Silk";
import { walkToPoint } from "./Player";
import { buildRow, type Spec } from "./Shophouse";
import { HALF, STOPS } from "./stops";
import { canvasTex, flagstoneTex, haloTex, lanternTex, neonTex, puddleTex, rng } from "./textures";

const WALLS = ["#4a2420", "#3e3a30", "#2f3b36", "#463424", "#3a2a32", "#2e2a28", "#4e3a28", "#3a3a44"];
const SIGNS = ["粥麵", "燒臘", "麻雀", "點心", "糖水", "裁縫", "金行", "雲吞", "藥材", "書局", "茶餐廳", "海味", "涼茶", "髮型"];
const NEON = ["#ff4a3d", "#3fe0a8", "#ffc24a", "#ff6fae", "#7fb3ff", "#ffffff"];

const Z_FROM = 26, Z_TO = -45;
const STREET_LEN = 86, STREET_MID = -14;

/* ── sky ─────────────────────────────────────────── */

/** A rainy city night: low cloud lit orange from below, darker overhead. */
function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          uniform float uTime;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
          }
          float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
          void main() {
            float h = clamp(vDir.y, -0.1, 1.0);
            vec3 zenith = vec3(0.025, 0.02, 0.05);
            vec3 horizon = vec3(0.22, 0.09, 0.11);
            vec3 col = mix(horizon, zenith, pow(smoothstep(0.0, 0.55, h), 0.7));
            // cloud deck, lit by the city
            vec2 uv = vDir.xz / max(vDir.y + 0.25, 0.08) * 1.4 + vec2(uTime * 0.006, uTime * 0.01);
            float c = fbm(uv);
            col += vec3(0.16, 0.07, 0.07) * smoothstep(0.45, 0.85, c) * (1.0 - smoothstep(0.1, 0.8, h));
            col += vec3(0.04, 0.03, 0.06) * smoothstep(0.5, 0.9, c);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame(({ camera }, dt) => {
    mat.uniforms.uTime.value += dt;
    mesh.current.position.copy(camera.position);
  });
  return (
    <mesh ref={mesh} material={mat} scale={150} raycast={() => null} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

function Moon() {
  return (
    <group position={[22, 52, -140]}>
      <mesh raycast={() => null}><circleGeometry args={[3.4, 48]} /><meshBasicMaterial color="#f8ecd0" fog={false} toneMapped={false} /></mesh>
      <sprite scale={[30, 30, 1]} position={[0, 0, -0.5]} raycast={() => null}>
        <spriteMaterial map={haloTex()} color="#ffe9c4" transparent opacity={0.35} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/* ── the street surface ──────────────────────────── */

/** Wet granite with puddles that mirror the lanterns. Click it to walk there. */
function Ground({ quality }: { quality: "high" | "low" }) {
  const map = useMemo(() => { const t = flagstoneTex(); t.repeat.set(2, 18); return t; }, []);
  const rough = useMemo(() => { const t = puddleTex(); t.repeat.set(1, 4); return t; }, []);
  const cursor = useRef<THREE.Mesh>(null!);
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType !== "mouse") return;
    cursor.current.visible = true;
    cursor.current.position.set(e.point.x, 0.02, e.point.z);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    walkToPoint(e.point.x, e.point.z);
  };
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, STREET_MID]} onPointerMove={move} onPointerOut={() => (cursor.current.visible = false)} onClick={click}>
        <planeGeometry args={[HALF * 2, STREET_LEN]} />
        {quality === "high" ? (
          <MeshReflectorMaterial
            map={map}
            roughnessMap={rough}
            blur={[160, 40]}
            resolution={512}
            mixBlur={0.8}
            mixStrength={7}
            mirror={0.9}
            roughness={0.9}
            depthScale={0.5}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.2}
            color="#8a8084"
            metalness={0.4}
          />
        ) : (
          <meshStandardMaterial map={map} roughness={0.42} metalness={0.25} color="#9a8e90" />
        )}
      </mesh>
      {/* where a click will take you */}
      <mesh ref={cursor} rotation={[-Math.PI / 2, 0, 0]} visible={false} raycast={() => null}>
        <ringGeometry args={[0.26, 0.34, 40]} />
        <meshBasicMaterial color="#f6cf6e" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* kerbs and pavement */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (HALF - 0.35), 0.06, STREET_MID]} raycast={() => null}>
            <boxGeometry args={[0.7, 0.12, STREET_LEN]} />
            <meshStandardMaterial color="#4a4446" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[s * (HALF - 0.71), 0.07, STREET_MID]} raycast={() => null}>
            <boxGeometry args={[0.06, 0.14, STREET_LEN]} />
            <meshStandardMaterial color="#7a7070" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Raindrops landing in the puddles around you. */
function Ripples() {
  const N = 140;
  const inst = useRef<THREE.InstancedMesh>(null!);
  const drops = useMemo(() => {
    const r = rng(17);
    return Array.from({ length: N }, () => ({ x: (r() - 0.5) * (HALF * 2 - 1.6), z: 17 - r() * 22, t: r() }));
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(({ camera }, dt) => {
    drops.forEach((d, i) => {
      d.t += Math.min(dt, 0.05) * 1.6;
      if (d.t > 1) { d.t -= 1; d.x = (Math.random() - 0.5) * (HALF * 2 - 1.6); d.z = camera.position.z - 1 - Math.random() * 22; }
      dummy.position.set(d.x, 0.015, d.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(0.03 + d.t * 0.2);
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
      inst.current.setColorAt(i, col.setScalar((1 - d.t) * (1 - d.t) * 0.4));
    });
    inst.current.instanceMatrix.needsUpdate = true;
    if (inst.current.instanceColor) inst.current.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, N]} raycast={() => null} frustumCulled={false}>
      <ringGeometry args={[0.8, 1, 24]} />
      <meshBasicMaterial color="#c8d6ff" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

/* ── buildings that fill the street ───────────────── */

function Filler() {
  const { row, blades } = useMemo(() => {
    const r = rng(5);
    const specs: Spec[] = [];
    const blades: { text: string; col: string; flicker: boolean; position: [number, number, number] }[] = [];
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
        specs.push({
          side, z: cz, w, floors,
          wall: WALLS[n % WALLS.length],
          seed: 200 + n,
          awning: r() > 0.5 ? (r() > 0.5 ? "#7a2018" : "#24463f") : undefined,
          interior: r() > 0.3 ? "#ffb067" : "#ffd6a0",
          closed: r() > 0.72,
          laundry: floors > 2 && r() > 0.45,
        });
        if (w > 2.4 && r() > 0.25) {
          blades.push({ text: SIGNS[n % SIGNS.length], col: NEON[n % NEON.length], flicker: r() > 0.85, position: [side * (HALF - 0.55), 3.6 + r() * 1.6, cz + (r() - 0.5) * (w - 1)] });
        }
        n++;
        z -= w;
      }
    }
    return { row: buildRow(specs), blades };
  }, []);
  return (
    <>
      {row.map((m) => <mesh key={m.key} geometry={m.geo} material={m.material} raycast={() => null} />)}
      {blades.map((b, i) => <NeonBlade key={i} {...b} />)}
    </>
  );
}

/** A neon blade sign sticking out over the pavement; a few of them flicker. */
function NeonBlade({ text, col, position, flicker }: { text: string; col: string; position: [number, number, number]; flicker?: boolean }) {
  const tex = useMemo(() => neonTex(text, col), [text, col]);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const glow = useRef<THREE.SpriteMaterial>(null!);
  useFrame(({ clock }) => {
    if (!flicker) return;
    const t = clock.elapsedTime;
    const on = Math.sin(t * 13) + Math.sin(t * 3.1) > -1.4 ? 1 : 0.25;
    mat.current.color.setScalar(on);
    glow.current.opacity = 0.3 * on;
  });
  const h = 0.45 * [...text].length + 0.3;
  return (
    <group position={position}>
      <mesh raycast={() => null}>
        <planeGeometry args={[0.5, h]} />
        <meshBasicMaterial ref={mat} map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <sprite scale={[1.8, h + 1.4, 1]} raycast={() => null}>
        <spriteMaterial ref={glow} map={haloTex()} color={col} transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

/* ── lanterns strung across the street ────────────── */

function LanternStrings() {
  const { geo, items, haloGeo } = useMemo(() => {
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
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute("position", new THREE.Float32BufferAttribute(items.flatMap((l) => [l.x, l.y - 0.1, l.z]), 3));
    return { geo, items, haloGeo };
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
    <group>
      <lineSegments geometry={geo} raycast={() => null}><lineBasicMaterial color="#2a1e1a" /></lineSegments>
      <instancedMesh ref={inst} args={[lanternGeo, undefined, items.length]} raycast={() => null}>
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={1.5} />
      </instancedMesh>
      <points geometry={haloGeo} raycast={() => null}>
        <pointsMaterial map={haloTex()} color="#ff5a30" size={1.5} sizeAttenuation transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
    </group>
  );
}

/* ── weather and sky ─────────────────────────────── */

function Rain() {
  const N = 1500;
  const group = useRef<THREE.Group>(null!);
  const { geo, speed } = useMemo(() => {
    const r = rng(3);
    const p = new Float32Array(N * 6), speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * 10, y = r() * 10, z = 10 - r() * 34;
      p.set([x, y, z, x + 0.015, y - 0.3, z], i * 6);
      speed[i] = 7 + r() * 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return { geo, speed };
  }, []);
  useFrame(({ camera }, dt) => {
    // the rain moves with you, so 1,500 drops cover the whole street
    group.current.position.z = camera.position.z - 8;
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
    <group ref={group}>
      <lineSegments geometry={geo} raycast={() => null} frustumCulled={false}>
        <lineBasicMaterial color="#b4c6e6" transparent opacity={0.26} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

/** 孔明燈: paper sky lanterns drifting up over the far end of the street. */
function SkyLanterns() {
  const N = 46;
  const inst = useRef<THREE.InstancedMesh>(null!);
  const seeds = useMemo(() => { const r = rng(9); return Array.from({ length: N }, () => [(r() - 0.5) * 40, r() * 40, -48 - r() * 60, 0.25 + r() * 0.35, r() * 6]); }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pos = useMemo(() => new Float32Array(N * 3), []);
  const glowGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); return g; }, [pos]);
  const tex = useMemo(
    () =>
      canvasTex(64, 64, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, "#ffcf7a"); g.addColorStop(1, "#ff7a2a");
        c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      }),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    seeds.forEach(([x, y0, z, v, ph], i) => {
      const y = 9 + ((y0 + t * v) % 40);
      const px = x + Math.sin(t * 0.25 + ph) * 1.2;
      dummy.position.set(px, y, z);
      dummy.rotation.set(0, ph, Math.sin(t * 0.5 + ph) * 0.08);
      dummy.scale.set(0.55, 0.7, 0.55);
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
      pos.set([px, y, z], i * 3);
    });
    inst.current.instanceMatrix.needsUpdate = true;
    glowGeo.attributes.position.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={inst} args={[undefined, undefined, N]} raycast={() => null} frustumCulled={false}>
        <cylinderGeometry args={[0.45, 0.32, 0.9, 8, 1, true]} />
        <meshBasicMaterial map={tex} toneMapped={false} fog={false} side={THREE.DoubleSide} />
      </instancedMesh>
      <points geometry={glowGeo} raycast={() => null} frustumCulled={false}>
        <pointsMaterial map={haloTex()} color="#ff9a40" size={3.2} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </points>
    </group>
  );
}

/** Firecracker bursts over the stage: soft sparks with gravity that twinkle as they die. */
function Fireworks() {
  const N = 3000;
  const state = useMemo(() => ({ pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N), col: new Float32Array(N * 3), base: new Float32Array(N * 3), next: 0 }), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(state.pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(state.col, 3));
    return g;
  }, [state]);
  const count = useApp((s) => s.fireworks);
  useEffect(() => {
    if (!count) return;
    const palette = [[1, 0.25, 0.15], [1, 0.8, 0.3], [1, 0.5, 0.2], [1, 0.95, 0.85], [0.95, 0.35, 0.55]];
    const timers: number[] = [];
    for (let b = 0; b < 6; b++) {
      timers.push(window.setTimeout(() => {
        const cx = (Math.random() - 0.5) * 9, cy = 9 + Math.random() * 4.5, cz = -53 + Math.random() * 5;
        const col = palette[b % palette.length];
        const ring = b % 3 === 2; // every third burst is a flat ring
        for (let k = 0; k < 420; k++) {
          const i = state.next; state.next = (state.next + 1) % N;
          let vx, vy, vz;
          if (ring) { const th = (k / 420) * Math.PI * 2; vx = Math.cos(th); vy = Math.sin(th); vz = (Math.random() - 0.5) * 0.15; }
          else { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); vx = s * Math.cos(th); vy = u; vz = s * Math.sin(th); }
          const sp = 4.5 + Math.random() * 1.6;
          state.pos.set([cx, cy, cz], i * 3);
          state.vel.set([vx * sp, vy * sp, vz * sp], i * 3);
          state.base.set(col, i * 3);
          state.life[i] = 1.4 + Math.random() * 0.8;
        }
      }, b * 300));
    }
    return () => timers.forEach(clearTimeout);
  }, [count, state]);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < N; i++) {
      if (state.life[i] <= 0) { state.pos[i * 3 + 1] = -100; continue; }
      state.life[i] -= d;
      state.vel[i * 3 + 1] -= 2.6 * d;
      for (let k = 0; k < 3; k++) { state.vel[i * 3 + k] *= 1 - 1.3 * d; state.pos[i * 3 + k] += state.vel[i * 3 + k] * d; }
      const f = Math.min(1, state.life[i]) * (state.life[i] < 0.5 ? (Math.random() > 0.5 ? 1 : 0.2) : 1);
      for (let k = 0; k < 3; k++) state.col[i * 3 + k] = state.base[i * 3 + k] * f;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });
  return (
    <points geometry={geo} frustumCulled={false} raycast={() => null}>
      <pointsMaterial map={haloTex()} size={0.55} vertexColors toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
    </points>
  );
}

/* ── silk banners ───────────────────────────────── */

const BANNER_CHARS = ["福", "春", "喜", "和", "樂", "安", "壽", "祥", "興", "同"];
const SILKS: [string, string, string][] = [
  ["#b3201a", "#f2c46a", "#5a0a0a"], // cinnabar and gold
  ["#1f5a4c", "#e6c47a", "#0c2a24"], // jade
  ["#2a3a7a", "#d8c8a0", "#10183a"], // indigo
  ["#c45a1a", "#ffd890", "#5a1a06"], // persimmon
  ["#6a1a3a", "#f0b0c0", "#2a0816"], // plum
];

/** Silk banners hung from short poles along both sides of the street. */
function Banners() {
  return (
    <>
      {BANNER_CHARS.map((ch, k) => {
        const side = k % 2 ? 1 : -1;
        const [c1, c2, c3] = SILKS[k % SILKS.length];
        return <Banner key={k} char={ch} c1={c1} c2={c2} c3={c3} seed={k * 3.7} position={[side * (HALF - 1.05), 6.7, 21 - k * 6.4]} />;
      })}
    </>
  );
}

export default function Street({ quality }: { quality: "high" | "low" }) {
  return (
    <>
      <Sky />
      <Moon />
      <Ground quality={quality} />
      <Ripples />
      <Filler />
      <LanternStrings />
      <Banners />
      <Rain />
      <SkyLanterns />
      <Fireworks />
      <People />
      {/* lantern light pooling on the street, every ten metres */}
      {[12, -2, -16, -30].map((z, i) => (
        <pointLight key={z} position={[i % 2 ? 1.2 : -1.2, 5, z]} color="#ff8a50" intensity={80} distance={19} decay={2} />
      ))}
    </>
  );
}
