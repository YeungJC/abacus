import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SOCS } from "../data";
import { pluck } from "../lib/audio";

const HALF = 4.5; // half the street's width; shopfronts stand at ±HALF
const BRUSH = '"LXGW WenKai TC", "Kaiti TC", "KaiTi", serif';

/** Seeded random so the street looks the same on every visit. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A Chinese lantern's silhouette, spun around its axis. */
const lanternGeo = (() => {
  const pts = [[0.05, -0.5], [0.3, -0.45], [0.46, -0.28], [0.52, 0], [0.46, 0.28], [0.3, 0.45], [0.05, 0.5]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 24);
})();

const ribTex = () =>
  canvasTex(256, 64, (c) => {
    c.fillStyle = "#fff"; c.fillRect(0, 0, 256, 64);
    c.fillStyle = "rgba(0,0,0,.28)";
    for (let i = 0; i < 16; i++) c.fillRect(i * 16, 0, 2, 64);
  });

/* ── the hanging society lanterns ──────────────────── */

type PickProps = { onPick: (id: string) => void; onHover: (id: string | null) => void };

function SocietyLantern({ id, char, hex, x, phase, i, onPick, onHover }: { id: string; char: string; hex: string; x: number; phase: number; i: number } & PickProps) {
  const group = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const [hot, setHot] = useState(false);
  const ghost = id === "yours";
  const rib = useMemo(ribTex, []);
  const face = useMemo(
    () =>
      canvasTex(256, 256, (c) => {
        c.fillStyle = ghost ? "#f3e6c8" : "#ffeab4";
        c.font = `700 170px ${BRUSH}`;
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(char, 128, 140);
      }),
    [char, ghost],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const amp = hot ? 0.16 : 0.05;
    group.current.rotation.z = Math.sin(t * (hot ? 4 : 1.1) + phase) * amp;
    const target = ghost ? (hot ? 0.9 : 0.25) : hot ? 3.2 : 1.6;
    mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * 0.12;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHot(true); onHover(id); pluck(i);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHot(false); onHover(null);
    document.body.style.cursor = "";
  };

  return (
    // pivot at the wire; the lantern hangs below it
    <group ref={group} position={[x, 4.15, 2]}>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.7]} />
        <meshBasicMaterial color="#2a1a14" />
      </mesh>
      <group position={[0, -1.25, 0]} onPointerOver={over} onPointerOut={out} onClick={(e) => { e.stopPropagation(); pluck(i + 2, 0.25); onPick(id); }}>
        <mesh geometry={lanternGeo} scale={[1, 1.15, 1]}>
          <meshStandardMaterial
            ref={mat}
            map={rib}
            color={ghost ? "#3a2a22" : hex}
            emissive={ghost ? "#c8a878" : hex}
            emissiveMap={rib}
            emissiveIntensity={1.6}
            roughness={0.6}
            transparent={ghost}
            opacity={ghost ? 0.55 : 1}
            wireframe={ghost}
          />
        </mesh>
        {[0.6, -0.6].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.09, 20]} />
            <meshStandardMaterial color="#c99a3a" metalness={0.8} roughness={0.35} emissive="#5a3a08" />
          </mesh>
        ))}
        <mesh position={[0, -0.95, 0]}>
          <cylinderGeometry args={[0.03, 0.06, 0.6, 8]} />
          <meshStandardMaterial color="#c0392b" emissive="#7a1a10" />
        </mesh>
        <mesh position={[0, 0, 0.535]}>
          <planeGeometry args={[0.62, 0.62]} />
          <meshBasicMaterial map={face} transparent toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ── the street ───────────────────────────────────── */

function Wires() {
  // a catenary wire across the street every few metres, plus the front wire for the society lanterns
  const { geo, lanterns } = useMemo(() => {
    const pts: number[] = [];
    const lanterns: { x: number; y: number; z: number; ph: number }[] = [];
    const rows = [2, ...Array.from({ length: 14 }, (_, k) => -2 - k * 4.2)];
    rows.forEach((z, r) => {
      const top = r === 0 ? 4.25 : 5.6;
      const sag = r === 0 ? 0.25 : 0.7;
      const N = 24;
      for (let i = 0; i < N; i++) {
        const a = i / N, b = (i + 1) / N;
        const xa = -HALF + a * HALF * 2, xb = -HALF + b * HALF * 2;
        pts.push(xa, top - 4 * sag * a * (1 - a), z, xb, top - 4 * sag * b * (1 - b), z);
      }
      if (r > 0) for (let k = 1; k <= 5; k++) {
        const a = k / 6;
        lanterns.push({ x: -HALF + a * HALF * 2, y: top - 4 * sag * a * (1 - a) - 0.45, z, ph: r * 1.7 + k });
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return { geo, lanterns };
  }, []);

  const inst = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rib = useMemo(ribTex, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lanterns.forEach((l, i) => {
      const sw = Math.sin(t * 1.2 + l.ph) * 0.06;
      dummy.position.set(l.x + sw, l.y, l.z);
      dummy.rotation.set(0, t * 0.1 + l.ph, sw * 1.5);
      dummy.scale.set(0.36, 0.42, 0.36);
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    });
    inst.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color="#3a2a24" />
      </lineSegments>
      <instancedMesh ref={inst} args={[lanternGeo, undefined, lanterns.length]}>
        <meshStandardMaterial map={rib} color="#e0402c" emissive="#ff3a1c" emissiveMap={rib} emissiveIntensity={2.2} />
      </instancedMesh>
    </>
  );
}

const SIGNS = ["粥麵", "茶樓", "燒臘", "藥房", "酒家", "麻雀", "點心", "糖水", "書法", "裁縫", "金行", "雲吞"];
const NEON = ["#ff4a3d", "#3fe0a8", "#ffc24a", "#ff6fae", "#7fb3ff"];

function Buildings() {
  const items = useMemo(() => {
    const r = rng(7);
    const out: JSX.Element[] = [];
    const winTex = canvasTex(64, 128, (c) => {
      c.fillStyle = "#000"; c.fillRect(0, 0, 64, 128);
      for (let y = 10; y < 128; y += 22) for (let x = 8; x < 64; x += 18)
        if (r() > 0.55) { c.fillStyle = r() > 0.5 ? "#ffb35c" : "#ffd89a"; c.fillRect(x, y, 8, 9); }
    });
    winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
    let n = 0;
    for (const side of [-1, 1]) {
      let z = 30;
      while (z > -64) {
        const w = 3 + r() * 3, h = 4.5 + r() * 6, d = 5;
        const cz = z - w / 2;
        const tex = winTex.clone();
        tex.repeat.set(w / 1.6, h / 2.6);
        tex.needsUpdate = true;
        out.push(
          <group key={`b${n++}`} position={[side * (HALF + d / 2), 0, cz]}>
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[d, h, w * 0.96]} />
              <meshStandardMaterial color="#1c1214" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.32} roughness={0.9} />
            </mesh>
            {/* hipped tile roof with upturned eaves */}
            <mesh position={[0, h + 0.55, 0]} rotation={[0, Math.PI / 4, 0]} scale={[d * 0.78, 1.1, w * 0.78]}>
              <coneGeometry args={[1, 1, 4]} />
              <meshStandardMaterial color="#1d2f2c" roughness={0.7} />
            </mesh>
            <mesh position={[0, h + 0.04, 0]}>
              <boxGeometry args={[d + 0.5, 0.12, w + 0.4]} />
              <meshStandardMaterial color="#8a6420" emissive="#3a2408" />
            </mesh>
          </group>,
        );
        if (r() > 0.35) {
          const text = SIGNS[n % SIGNS.length], col = NEON[n % NEON.length];
          const tex2 = canvasTex(96, 256, (c) => {
            c.fillStyle = "#120a0a"; c.fillRect(0, 0, 96, 256);
            c.strokeStyle = col; c.lineWidth = 5; c.strokeRect(6, 6, 84, 244);
            c.fillStyle = col; c.font = `700 74px ${BRUSH}`; c.textAlign = "center"; c.textBaseline = "middle";
            [...text].forEach((ch, k) => c.fillText(ch, 48, 74 + k * 106));
          });
          out.push(
            <mesh key={`s${n}`} position={[side * (HALF - 0.45), 2.6 + r() * 1.2, cz + 0.4]}>
              <planeGeometry args={[0.6, 1.6]} />
              <meshBasicMaterial map={tex2} toneMapped={false} />
            </mesh>,
          );
        }
        z -= w;
      }
    }
    return out;
  }, []);
  return <>{items}</>;
}

/** The 牌坊 gate that frames Chinatown, with 同 on its plaque. */
function Paifang() {
  const plaque = useMemo(
    () =>
      canvasTex(512, 200, (c) => {
        c.fillStyle = "#14302c"; c.fillRect(0, 0, 512, 200);
        c.strokeStyle = "#d8ad4e"; c.lineWidth = 10; c.strokeRect(10, 10, 492, 180);
        c.fillStyle = "#f2c766"; c.font = `700 130px ${BRUSH}`; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("同 行", 256, 108);
      }),
    [],
  );
  const red = <meshStandardMaterial color="#9e1f17" roughness={0.5} emissive="#2a0402" />;
  return (
    <group position={[0, 0, -3.5]}>
      {[-3.4, 3.4].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.6, 0]}><cylinderGeometry args={[0.2, 0.24, 5.2, 16]} />{red}</mesh>
          <mesh position={[x, 0.25, 0]}><boxGeometry args={[0.7, 0.5, 0.7]} /><meshStandardMaterial color="#5a5450" /></mesh>
        </group>
      ))}
      <mesh position={[0, 4.4, 0]}><boxGeometry args={[7.6, 0.3, 0.34]} />{red}</mesh>
      <mesh position={[0, 5.15, 0]}><boxGeometry args={[7.9, 0.3, 0.34]} />{red}</mesh>
      <mesh position={[0, 4.78, 0.2]}>
        <planeGeometry args={[2, 0.78]} />
        <meshBasicMaterial map={plaque} toneMapped={false} />
      </mesh>
      {/* roof: tiles, gold ridge, and flared ends */}
      <mesh position={[0, 5.62, 0]} scale={[1, 1, 1]}>
        <boxGeometry args={[8.8, 0.32, 1.5]} />
        <meshStandardMaterial color="#1f4a44" roughness={0.6} />
      </mesh>
      <mesh position={[0, 5.86, 0]}>
        <boxGeometry args={[7.4, 0.14, 0.24]} />
        <meshStandardMaterial color="#c99a3a" metalness={0.7} roughness={0.3} emissive="#4a3008" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4.4, 5.82, 0]} rotation={[0, 0, s * -0.5]}>
          <boxGeometry args={[0.9, 0.18, 1.5]} />
          <meshStandardMaterial color="#1f4a44" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Manchester drizzle, lit by the lanterns. */
function Rain() {
  const N = 900;
  const ref = useRef<THREE.LineSegments>(null!);
  const { geo, speed } = useMemo(() => {
    const r = rng(3);
    const p = new Float32Array(N * 6), speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * 14, y = r() * 9, z = 6 - r() * 40;
      p.set([x, y, z, x + 0.02, y - 0.35, z], i * 6);
      speed[i] = 8 + r() * 5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return { geo, speed };
  }, []);
  useFrame((_, dt) => {
    const a = geo.attributes.position as THREE.BufferAttribute;
    const p = a.array as Float32Array;
    for (let i = 0; i < N; i++) {
      const dy = speed[i] * Math.min(dt, 0.05);
      p[i * 6 + 1] -= dy; p[i * 6 + 4] -= dy;
      if (p[i * 6 + 4] < 0) { p[i * 6 + 1] += 9; p[i * 6 + 4] += 9; }
    }
    a.needsUpdate = true;
  });
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#9fb6d8" transparent opacity={0.28} />
    </lineSegments>
  );
}

function CameraRig() {
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, pointer, clock, size }) => {
    const t = clock.elapsedTime;
    const aspect = size.width / size.height;
    // wide screens: turn left so the street sits right of the headline; tall screens: step back and tilt down
    const wide = aspect > 1.15;
    // step back until the five society lanterns (±4.2m at z=2) fit the screen's width
    const back = Math.max(0, 2 + 4.7 / (Math.tan((26 * Math.PI) / 180) * aspect) - 9.5);
    camera.position.x += ((wide ? 0.8 : 0) + pointer.x * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (1.8 + pointer.y * 0.5 + Math.sin(t * 0.4) * 0.05 - camera.position.y) * 0.04;
    camera.position.z = 9.5 + back;
    look.set((wide ? -9 : 0) + pointer.x * 2.5, 2.9 - back * 0.72 + pointer.y * 0.8, -24);
    camera.lookAt(look);
  });
  return null;
}

export default function LanternStreet({ onPick, onHover, still }: PickProps & { still?: boolean }) {
  const socs = [...SOCS, { id: "yours", char: "？", hex: "#c8a878" }];
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={still ? "demand" : "always"}
      camera={{ position: [0, 1.8, 9.5], fov: 52, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => onHover(null)}
    >
      <color attach="background" args={["#0d0810"]} />
      <fog attach="fog" args={["#0d0810", 12, 58]} />
      <hemisphereLight args={["#3a3060", "#1a0c08", 0.45]} />
      <pointLight position={[0, 3.6, 3]} color="#ff7a4a" intensity={22} distance={14} />
      <pointLight position={[0, 4.5, -10]} color="#ff5a30" intensity={30} distance={18} />
      <pointLight position={[0, 4.5, -26]} color="#ff5a30" intensity={30} distance={18} />
      {/* the moon over Chinatown */}
      <mesh position={[9, 15, -70]}>
        <circleGeometry args={[4, 48]} />
        <meshBasicMaterial color="#f6e7c4" fog={false} toneMapped={false} />
      </mesh>
      {/* wet flagstones */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -18]}>
        <planeGeometry args={[HALF * 2, 100]} />
        <meshStandardMaterial color="#1a1214" roughness={0.18} metalness={0.55} />
      </mesh>
      <Buildings />
      <Paifang />
      <Wires />
      <Rain />
      {socs.map((s, i) => (
        <SocietyLantern key={s.id} id={s.id} char={s.char} hex={s.hex} i={i} phase={i * 0.9} x={-3.4 + i * 1.7} onPick={onPick} onHover={onHover} />
      ))}
      <CameraRig />
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.55} intensity={1.15} radius={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
