import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { EVENTS, EXITS, GALA_AT, SOCS, socById, type Lang } from "../data";
import { fmtDate } from "../lib/dates";
import { useApp } from "../store";
import Lantern from "./Lantern";
import Shophouse, { GROUND, ridgeMat, tileMat } from "./Shophouse";
import { stopById, type StopId } from "./stops";
import { liquidGoldMaterial, silkMaterial } from "./Silk";
import { BRUSH, canvasTex, fitText, SERIF, shade, signTex } from "./textures";

/** Clicking anything inside walks you to that place. A drag to look around doesn't count. */
export function Place({ id, children }: { id: StopId; children: ReactNode }) {
  const go = useApp((s) => s.go);
  const gl = useThree((s) => s.gl);
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => { if (e.delta > 6) return; e.stopPropagation(); go(id); }}
      onPointerOver={(e) => { e.stopPropagation(); gl.domElement.style.cursor = "pointer"; }}
      onPointerOut={() => { gl.domElement.style.cursor = "grab"; }}
    >
      {children}
    </group>
  );
}

/** A flat textured board. Lit just enough to read at night. */
function Board({ tex, w, h, position, rotation = [0, Math.PI / 2, 0], glow = 0.6 }: { tex: THREE.Texture; w: number; h: number; position: [number, number, number]; rotation?: [number, number, number]; glow?: number }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={glow} roughness={0.8} />
    </mesh>
  );
}

/* ── 牌坊: the gate ─────────────────────────────── */

function gateRoofGeo(len: number, d: number) {
  const s = new THREE.Shape();
  s.moveTo(-0.8, 0.45);
  s.quadraticCurveTo(-0.3, -0.02, 0.2, 0.05);
  s.quadraticCurveTo(d * 0.35, 0.3, d / 2, 0.95);
  s.quadraticCurveTo(d * 0.65, 0.3, d - 0.2, 0.05);
  s.quadraticCurveTo(d + 0.3, -0.02, d + 0.8, 0.45);
  s.lineTo(d + 0.8, 0.3);
  s.quadraticCurveTo(d + 0.3, -0.16, d - 0.2, -0.14);
  s.lineTo(0.2, -0.14);
  s.quadraticCurveTo(-0.3, -0.16, -0.8, 0.3);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 12 });
  g.translate(-d / 2, 0, -len / 2);
  g.rotateY(Math.PI / 2); // ridge runs across the street
  return g;
}

export function Gate() {
  const z = stopById("gate").z;
  const plaque = useMemo(
    () =>
      canvasTex(1024, 400, (c, w, h) => {
        // black lacquer with a gold frame; the lettering is poured in liquid gold on top
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#0f2c29"); g.addColorStop(1, "#071816");
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.strokeStyle = "#d8ad4e"; c.lineWidth = 16; c.strokeRect(14, 14, w - 28, h - 28);
        c.strokeStyle = "rgba(216,173,78,.5)"; c.lineWidth = 4; c.strokeRect(40, 40, w - 80, h - 80);
      }),
    [],
  );
  const lettering = useMemo(() => {
    const mask = canvasTex(1024, 400, (c, w, h) => {
      c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = `700 210px ${BRUSH}`;
      c.fillText("同  行", w / 2, h * 0.43);
      c.font = `600 44px ${SERIF}`;
      c.fillText("T O N G   M A N C H E S T E R", w / 2, h * 0.8);
    });
    return liquidGoldMaterial(mask, 1024 / 400);
  }, []);
  const back = useMemo(
    () =>
      canvasTex(1024, 400, (c, w, h) => {
        c.fillStyle = "#123a35"; c.fillRect(0, 0, w, h);
        c.strokeStyle = "#d8ad4e"; c.lineWidth = 16; c.strokeRect(14, 14, w - 28, h - 28);
        c.fillStyle = "#f6cf6e"; c.textAlign = "center"; c.textBaseline = "middle";
        c.font = `700 190px ${BRUSH}`;
        c.fillText("曼徹斯特", w / 2, h / 2);
      }),
    [],
  );
  const big = useMemo(() => gateRoofGeo(7.2, 2.2), []);
  const small = useMemo(() => gateRoofGeo(2.6, 1.6), []);
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a3221a", roughness: 0.5, emissive: "#3a0603" }), []);
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6c6560", roughness: 0.9 }), []);
  const bracket = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f6e63", roughness: 0.6, emissive: "#0a1e1a" }), []);

  return (
    <Place id="gate">
      <group position={[0, 0, z]}>
        {/* pillars on stone plinths */}
        {[-2.7, 2.7].map((x) => (
          <group key={x}>
            <mesh position={[x, 3.1, 0]} material={red}><cylinderGeometry args={[0.24, 0.28, 6.2, 20]} /></mesh>
            <mesh position={[x, 0.35, 0]} material={stone}><boxGeometry args={[0.9, 0.7, 0.9]} /></mesh>
          </group>
        ))}
        {[-4.25, 4.25].map((x) => (
          <group key={x}>
            <mesh position={[x, 2.3, 0]} material={red}><cylinderGeometry args={[0.18, 0.22, 4.6, 16]} /></mesh>
            <mesh position={[x, 0.3, 0]} material={stone}><boxGeometry args={[0.7, 0.6, 0.7]} /></mesh>
          </group>
        ))}
        {/* beams */}
        <mesh position={[0, 4.55, 0]} material={red}><boxGeometry args={[6, 0.32, 0.4]} /></mesh>
        <mesh position={[0, 6.05, 0]} material={red}><boxGeometry args={[6.4, 0.32, 0.4]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 3.5, 3.95, 0]} material={red}><boxGeometry args={[1.8, 0.26, 0.34]} /></mesh>)}
        {/* plaque */}
        <Board tex={plaque} w={3.4} h={1.33} position={[0, 5.3, 0.22]} rotation={[0, 0, 0]} glow={0.6} />
        <mesh position={[0, 5.3, 0.23]} material={lettering} raycast={() => null}>
          <planeGeometry args={[3.4, 1.33]} />
        </mesh>
        <Board tex={back} w={3.4} h={1.33} position={[0, 5.3, -0.22]} rotation={[0, Math.PI, 0]} glow={0.6} />
        {/* dougong brackets under the eaves */}
        {Array.from({ length: 11 }, (_, i) => (
          <mesh key={i} position={[-3 + i * 0.6, 6.32, 0]} material={i % 2 ? bracket : ridgeMat}>
            <boxGeometry args={[0.26, 0.2, 0.7]} />
          </mesh>
        ))}
        {/* roofs: tall centre, lower wings */}
        <mesh geometry={big} material={tileMat} position={[0, 6.45, 0]} />
        <mesh position={[0, 7.42, 0]} rotation={[0, 0, Math.PI / 2]} material={ridgeMat}><cylinderGeometry args={[0.1, 0.1, 7.4, 8]} /></mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh geometry={small} material={tileMat} position={[s * 3.9, 4.15, 0]} />
            <mesh position={[s * 3.9, 4.9, 0]} rotation={[0, 0, Math.PI / 2]} material={ridgeMat}><cylinderGeometry args={[0.07, 0.07, 2.6, 8]} /></mesh>
          </group>
        ))}
        {/* 歡迎: welcome */}
        <Lantern char="歡" paper="#d8321e" position={[-1.5, 4.4, 0.3]} size={0.95} drop={0.25} phase={0.3} />
        <Lantern char="迎" paper="#d8321e" position={[1.5, 4.4, 0.3]} size={0.95} drop={0.25} phase={1.4} />
      </group>
    </Place>
  );
}

/* ── society halls ─────────────────────────────── */

export function SocietyHall({ id, seed }: { id: "hk" | "mabc" | "uabc" | "echo"; seed: number }) {
  const s = socById(id)!;
  const stop = stopById(id);
  const sign = useMemo(() => signTex(s.hant, s.en, s.hex), [s]);
  const wall = useMemo(() => shade(s.hex, -0.62), [s]);
  return (
    <Place id={id}>
      <Shophouse side={stop.side as -1 | 1} z={stop.z} w={stop.w} floors={2} wall={wall} seed={seed} awning={shade(s.hex, -0.2)} interior={shade(s.hex, 0.45)}>
        <Board tex={sign} w={stop.w - 0.8} h={(stop.w - 0.8) / 4} position={[0.2, GROUND + 0.62, 0]} glow={0.9} />
        <Lantern char={s.char} paper={s.hex} position={[1.25, GROUND + 0.1, stop.w / 2 - 0.85]} size={0.9} drop={0.3} phase={seed} />
        <Lantern char={s.char} paper={s.hex} position={[1.25, GROUND + 0.1, -stop.w / 2 + 0.85]} size={0.9} drop={0.3} phase={seed + 1} />
      </Shophouse>
    </Place>
  );
}

/** The empty shop where the next society moves in. */
export function EmptyLot({ lang }: { lang: Lang }) {
  const stop = stopById("yours");
  const toLet = useMemo(
    () =>
      canvasTex(512, 640, (c, w, h) => {
        c.fillStyle = "#e9dcc0"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#b3261e"; c.textAlign = "center"; c.textBaseline = "middle";
        c.font = `700 150px ${BRUSH}`; c.fillText("招租", w / 2, 150);
        c.fillStyle = "#1e1a16";
        fitText(c, lang === "en" ? "YOUR SOCIETY" : lang === "hant" ? "你嘅學會" : "你的学会", w / 2, 330, w - 60, 64, lang === "en" ? SERIF : BRUSH);
        fitText(c, lang === "en" ? "NEXT" : lang === "hant" ? "下一個" : "下一个", w / 2, 410, w - 60, 64, lang === "en" ? SERIF : BRUSH);
        c.font = `400 30px ${SERIF}`; c.fillStyle = "#5b5045";
        c.fillText(lang === "en" ? "Free to join · ask inside" : lang === "hant" ? "免費加入" : "免费加入", w / 2, 540);
      }),
    [lang],
  );
  const ply = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6b5236", roughness: 0.95 }), []);
  return (
    <Place id="yours">
      <Shophouse
        side={-1}
        z={stop.z}
        w={stop.w}
        floors={2}
        wall="#3a3430"
        seed={41}
        shop={
          <group>
            {[-1.3, 0, 1.3].map((pz) => (
              <mesh key={pz} position={[0.02, 1.5, pz]} material={ply}><boxGeometry args={[0.06, 3, 1.25]} /></mesh>
            ))}
          </group>
        }
      >
        <Board tex={toLet} w={1.4} h={1.75} position={[0.07, 1.7, 0]} glow={0.55} />
        <Lantern char="？" paper="#c8a878" position={[1.2, GROUND + 0.1, 1.4]} size={0.85} drop={0.3} ghost />
      </Shophouse>
    </Place>
  );
}

/* ── notice board: What's on ─────────────────────── */

export function NoticeBoard({ lang }: { lang: Lang }) {
  const stop = stopById("board");
  const tex = useMemo(
    () =>
      canvasTex(2048, 1024, (c, w, h) => {
        // cork and timber
        c.fillStyle = "#4a2c1a"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#8a6440"; c.fillRect(30, 30, w - 60, h - 60);
        for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
        c.fillStyle = "#170c0a"; c.fillRect(30, 30, w - 60, 140);
        c.fillStyle = "#f2c766"; c.textBaseline = "middle"; c.textAlign = "left";
        c.font = `700 92px ${BRUSH}`; c.fillText("告示", 70, 102);
        c.font = `600 54px ${SERIF}`; c.fillText(lang === "en" ? "WHAT'S ON" : lang === "hant" ? "活動告示" : "活动告示", 290, 104);
        c.textAlign = "right"; c.font = `400 34px ${SERIF}`; c.fillStyle = "#c9b48e";
        c.fillText(lang === "en" ? "Example listings · pass price first" : "示例活動 · 持證價", w - 70, 104);
        // one paper per event
        const cols = 3, pw = (w - 60 - 40 * (cols + 1)) / cols, ph = 250;
        EVENTS.forEach((e, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          const x = 30 + 40 + col * (pw + 40), y = 200 + row * (ph + 30);
          const tilt = ((i * 37) % 7 - 3) * 0.006;
          c.save(); c.translate(x + pw / 2, y + ph / 2); c.rotate(tilt);
          c.fillStyle = e.flag ? "#c4291e" : i % 2 ? "#efe3c8" : "#f3d98a";
          c.fillRect(-pw / 2, -ph / 2, pw, ph);
          const ink = e.flag ? "#fbefe0" : "#1e1a16";
          const [d1, d2] = fmtDate(e.date, lang);
          c.fillStyle = ink; c.textAlign = "left"; c.textBaseline = "alphabetic";
          c.font = `700 58px ${BRUSH}`; c.fillText(d1, -pw / 2 + 26, -ph / 2 + 74);
          c.font = `400 28px ${SERIF}`; c.globalAlpha = 0.75; c.fillText(d2, -pw / 2 + 26, -ph / 2 + 112); c.globalAlpha = 1;
          fitText(c, e.t[lang], -pw / 2 + 26, -ph / 2 + 172, pw - 52, 50, BRUSH);
          c.font = `600 32px ${SERIF}`;
          c.fillText((e.price ? "£" + e.price : lang === "en" ? "Free" : "免費") + `  ·  ${e.where}`, -pw / 2 + 26, -ph / 2 + 224);
          // society seals
          e.socs.forEach((id, k) => {
            const s = socById(id)!;
            c.fillStyle = s.hex; c.fillRect(pw / 2 - 66 - k * 52, -ph / 2 + 24, 44, 44);
            c.fillStyle = "#fff6df"; c.font = `700 32px ${BRUSH}`; c.textAlign = "center"; c.textBaseline = "middle";
            c.fillText(s.char, pw / 2 - 44 - k * 52, -ph / 2 + 47);
            c.textAlign = "left"; c.textBaseline = "alphabetic";
          });
          // pin
          c.fillStyle = "#d8ad4e"; c.beginPath(); c.arc(0, -ph / 2 + 10, 9, 0, Math.PI * 2); c.fill();
          c.restore();
        });
      }),
    [lang],
  );
  const bw = stop.w - 0.9, bh = bw / 2;
  return (
    <Place id="board">
      <Shophouse
        side={1}
        z={stop.z}
        w={stop.w}
        floors={2}
        wall="#4a3a2e"
        seed={53}
        shop={
          <mesh position={[-0.05, GROUND / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[stop.w, GROUND]} />
            <meshStandardMaterial color="#5a4636" roughness={0.95} />
          </mesh>
        }
      >
        <Board tex={tex} w={bw} h={bh} position={[0.06, 0.6 + bh / 2, 0]} glow={0.7} />
        {/* a little tiled hood over the board */}
        <mesh position={[0.35, 0.75 + bh, 0]} rotation={[0, 0, -0.35]} material={tileMat}>
          <boxGeometry args={[0.9, 0.08, bw + 0.4]} />
        </mesh>
      </Shophouse>
    </Place>
  );
}

/* ── red envelope stall: the Joint Pass ─────────── */

export function EnvelopeStall() {
  const stop = stopById("pass");
  const sign = useMemo(() => signTex("紅包 · 聯合通行證", "Joint Pass · £5 a year", "#d4473a"), []);
  const canvasStripe = useMemo(
    () => canvasTex(256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#f1e3c6" : "#b3261e"; c.fillRect((i * w) / 8, 0, w / 8, h); } }),
    [],
  );
  const env = useMemo(
    () =>
      canvasTex(128, 180, (c, w, h) => {
        c.fillStyle = "#c4291e"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#d8ad4e"; c.save(); c.translate(w / 2, h / 2 + 10); c.rotate(Math.PI / 4); c.fillRect(-30, -30, 60, 60); c.restore();
        c.fillStyle = "#c4291e"; c.font = `700 52px ${BRUSH}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("福", w / 2, h / 2 + 12);
      }),
    [],
  );
  const envelopes = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < 18; i++) out.push([1.35 + (i % 3) * 0.28, 1.04 + Math.floor(i / 9) * 0.02, -1 + ((i * 7) % 9) * 0.25, ((i * 13) % 7) * 0.2 - 0.6]);
    return out;
  }, []);
  return (
    <Place id="pass">
      <Shophouse side={-1} z={stop.z} w={stop.w} floors={2} wall="#4a1a16" seed={67} interior="#ff6a4a">
        {/* stall in front of the shop */}
        <mesh position={[1.6, 0.5, 0]}><boxGeometry args={[1.1, 1, 3]} /><meshStandardMaterial color="#8a1a12" roughness={0.8} /></mesh>
        {envelopes.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2, 0, r]}>
            <planeGeometry args={[0.2, 0.28]} />
            <meshStandardMaterial map={env} emissive="#ffffff" emissiveMap={env} emissiveIntensity={0.25} />
          </mesh>
        ))}
        {[-1.4, 1.4].map((z) => <mesh key={z} position={[2.1, 1.25, z]}><cylinderGeometry args={[0.04, 0.04, 2.5]} /><meshStandardMaterial color="#2a1a14" /></mesh>)}
        <mesh position={[1.75, 2.55, 0]} rotation={[0, 0, -0.28]}>
          <boxGeometry args={[1.5, 0.04, 3.2]} />
          <meshStandardMaterial map={canvasStripe} roughness={0.8} />
        </mesh>
        <Board tex={sign} w={3.2} h={0.8} position={[2.2, 2.05, 0]} glow={0.9} />
        <Lantern char="福" paper="#d8321e" position={[2.1, 2.45, 1.7]} size={0.7} drop={0.15} phase={2} />
      </Shophouse>
    </Place>
  );
}

/* ── station exit: the freshers guide ────────────── */

export function StationExit({ lang }: { lang: Lang }) {
  const stop = stopById("exit");
  const sign = useMemo(
    () =>
      canvasTex(1024, 256, (c, w, h) => {
        c.fillStyle = "#f2c230"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#151515"; c.textBaseline = "middle"; c.textAlign = "left";
        c.font = `700 150px ${BRUSH}`; c.fillText("出口", 50, h / 2 + 6);
        c.font = `700 92px ${SERIF}`; c.fillText("EXIT", 400, h / 2 - 20);
        c.font = `600 40px ${SERIF}`;
        c.fillText(lang === "en" ? "Freshers guide A–F" : lang === "hant" ? "新生指南 A–F" : "新生指南 A–F", 404, h / 2 + 64);
      }),
    [lang],
  );
  const list = useMemo(
    () =>
      canvasTex(512, 900, (c, w) => {
        c.fillStyle = "#151515"; c.fillRect(0, 0, w, 900);
        EXITS.forEach((x, i) => {
          const y = 40 + i * 140;
          c.fillStyle = "#f2c230"; c.fillRect(30, y, 100, 100);
          c.fillStyle = "#151515"; c.font = `700 72px ${SERIF}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(x.L, 80, y + 54);
          c.fillStyle = "#f2c230"; c.font = `700 60px ${BRUSH}`; c.textAlign = "left"; c.fillText(x.zh, 156, y + 50);
          c.fillStyle = "#f4f0e6"; fitText(c, x.name[lang], 232, y + 52, w - 252, 38, lang === "en" ? SERIF : BRUSH, 600);
        });
      }),
    [lang],
  );
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#050404" }), []);
  const step = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a3634", roughness: 0.9 }), []);
  return (
    <Place id="exit">
      <Shophouse
        side={1}
        z={stop.z}
        w={stop.w}
        floors={2}
        wall="#3e3c3a"
        seed={79}
        shop={
          <group>
            {/* stairwell going down */}
            <mesh position={[-1.8, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} material={dark}><planeGeometry args={[3, 3.2]} /></mesh>
            {Array.from({ length: 6 }, (_, i) => (
              <mesh key={i} position={[-0.3 - i * 0.28, 0.05 - i * 0.18, 0]} material={step}><boxGeometry args={[0.28, 0.1, 2.6]} /></mesh>
            ))}
            {[-1.45, 1.45].map((z) => (
              <mesh key={z} position={[-0.8, 0.9, z]}><boxGeometry args={[1.8, 0.06, 0.06]} /><meshStandardMaterial color="#b8b4ac" metalness={0.8} roughness={0.3} /></mesh>
            ))}
          </group>
        }
      >
        <Board tex={sign} w={3.6} h={0.9} position={[0.2, GROUND + 0.6, 0]} glow={1} />
        {/* lit totem listing the exits */}
        <mesh position={[0.6, 1.3, -stop.w / 2 + 0.6]}><boxGeometry args={[0.3, 2.6, 0.62]} /><meshStandardMaterial color="#151515" /></mesh>
        <Board tex={list} w={0.56} h={0.98} position={[0.76, 1.6, -stop.w / 2 + 0.6]} glow={0.9} />
      </Shophouse>
    </Place>
  );
}

/* ── tea house: the committee almanac ────────────── */

export function TeaHouse() {
  const stop = stopById("teahouse");
  const vert = useMemo(() => signTex("茶樓", "", "#f2c766", true), []);
  const sign = useMemo(() => signTex("幹事通勝", "Committee almanac · upstairs", "#3f9a76"), []);
  const rail = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8e1d16", roughness: 0.6 }), []);
  return (
    <Place id="teahouse">
      <Shophouse side={-1} z={stop.z} w={stop.w} floors={3} wall="#2e3a32" seed={97} awning="#2f6e63" interior="#ffc77a">
        <Board tex={sign} w={stop.w - 1} h={(stop.w - 1) / 4} position={[0.2, GROUND + 0.62, 0]} glow={0.9} />
        {/* balcony */}
        <mesh position={[0.55, GROUND + 1.1, 0]}><boxGeometry args={[1.1, 0.12, stop.w - 0.3]} /><meshStandardMaterial color="#2a1a14" /></mesh>
        <mesh position={[1.08, GROUND + 1.95, 0]} material={rail}><boxGeometry args={[0.06, 0.06, stop.w - 0.3]} /></mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[1.08, GROUND + 1.55, -stop.w / 2 + 0.3 + (i * (stop.w - 0.6)) / 11]} material={rail}><boxGeometry args={[0.05, 0.8, 0.05]} /></mesh>
        ))}
        <Board tex={vert} w={0.62} h={1.98} position={[0.3, GROUND + 4.1, stop.w / 2 - 0.55]} glow={1} />
        {[-1.6, 0, 1.6].map((pz, i) => <Lantern key={pz} char="茶" paper="#d8321e" position={[0.95, GROUND + 3.3, pz]} size={0.55} drop={0.2} phase={i} />)}
      </Shophouse>
    </Place>
  );
}

/* ── the gala stage at the end of the street ───────── */

function countdownText(lang: Lang) {
  let s = Math.max(0, Math.floor((GALA_AT - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return { d, rest: `${p(h)}:${p(m)}:${p(s)}`, label: lang === "en" ? "DAYS TO GO" : lang === "hant" ? "日後開鑼" : "天后开幕" };
}

export function GalaStage({ lang }: { lang: Lang }) {
  const stop = stopById("gala");
  const z = stop.z;
  const { tex, draw } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 1536; cv.height = 1024;
    const c = cv.getContext("2d")!;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const draw = (lang: Lang) => {
      const w = cv.width, h = cv.height;
      const g = c.createRadialGradient(w / 2, h * 0.45, 50, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, "#c4291e"); g.addColorStop(1, "#5e0d08");
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // gold cloud scrolls in the corners
      c.strokeStyle = "rgba(216,173,78,.5)"; c.lineWidth = 8;
      for (const [x, y] of [[120, 120], [w - 120, 120], [120, h - 120], [w - 120, h - 120]]) {
        for (let r = 30; r < 100; r += 26) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 1.5); c.stroke(); }
      }
      c.strokeStyle = "#d8ad4e"; c.lineWidth = 14; c.strokeRect(24, 24, w - 48, h - 48);
      c.fillStyle = "#f6cf6e"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = `700 150px ${BRUSH}`; c.fillText(lang === "hans" ? "2027 新春晚会" : "2027 新春晚會", w / 2, 190);
      c.font = `600 50px ${SERIF}`;
      c.fillText(lang === "en" ? "LUNAR NEW YEAR GALA · SAT 13 FEB · YEAR OF THE GOAT 丁未" : "二〇二七年二月十三日（六）· 丁未羊年", w / 2, 320);
      const cd = countdownText(lang);
      c.fillStyle = "#170c0a"; c.fillRect(w / 2 - 520, 400, 1040, 420);
      c.strokeStyle = "#d8ad4e"; c.lineWidth = 6; c.strokeRect(w / 2 - 520, 400, 1040, 420);
      c.fillStyle = "#ffd36b"; c.font = `700 250px ${SERIF}`; c.fillText(String(cd.d), w / 2, 560);
      c.font = `700 46px ${lang === "en" ? SERIF : BRUSH}`; c.fillStyle = "#f4e6c6"; c.fillText(cd.label, w / 2, 700);
      c.font = `600 70px ui-monospace, Menlo, monospace`; c.fillStyle = "#ffb35c"; c.fillText(cd.rest, w / 2, 775);
      c.fillStyle = "#f6cf6e"; c.font = `700 60px ${BRUSH}`;
      c.fillText(lang === "en" ? "Tap the stage to light the firecrackers" : lang === "hant" ? "撳舞台燒炮仗" : "点舞台放鞭炮", w / 2, 920);
      tex.needsUpdate = true;
    };
    return { tex, draw };
  }, []);
  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => {
    draw(lang);
    const id = setInterval(() => draw(langRef.current), 1000);
    return () => clearInterval(id);
  }, [draw, lang]);

  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a3221a", roughness: 0.5, emissive: "#3a0603" }), []);
  const roof = useMemo(() => gateRoofGeo(10, 2.4), []);
  const fire = useApp((s) => s.fire);
  const { drapeGeo, drapeL, drapeR, valanceGeo, valance } = useMemo(() => ({
    drapeGeo: new THREE.PlaneGeometry(1.5, 5.4, 8, 30).translate(0, -2.7, 0),
    drapeL: silkMaterial({ c1: "#9e1410", c2: "#e0a040", c3: "#5a0608", seed: 3, strength: 0.18, density: 1.4 }),
    drapeR: silkMaterial({ c1: "#9e1410", c2: "#e0a040", c3: "#5a0608", seed: 11, strength: 0.18, density: 1.4 }),
    valanceGeo: new THREE.PlaneGeometry(8.2, 0.8, 40, 6).translate(0, -0.4, 0),
    valance: silkMaterial({ c1: "#c4291e", c2: "#f0c060", c3: "#7a0c0a", seed: 7, strength: 0.08, density: 2.2 }),
  }), []);
  return (
    <Place id="gala">
      <group position={[0, 0, z]} onClick={(e) => { if (e.delta > 6 || useApp.getState().open !== "gala") return; e.stopPropagation(); fire(); }}>
        {/* platform with steps */}
        <mesh position={[0, 0.45, 0]}><boxGeometry args={[8.6, 0.9, 4.4]} /><meshStandardMaterial color="#3a1410" roughness={0.7} /></mesh>
        <mesh position={[0, 0.91, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8.4, 4.2]} /><meshStandardMaterial color="#8a1a12" roughness={0.9} /></mesh>
        {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.15 + i * 0.3, 2.5 - i * 0.3]}><boxGeometry args={[3, 0.3, 0.3]} /><meshStandardMaterial color="#4a1c14" /></mesh>)}
        {/* backdrop */}
        <Board tex={tex} w={7.2} h={4.8} position={[0, 3.5, -1.9]} rotation={[0, 0, 0]} glow={0.95} />
        {[-3.9, 3.9].map((x) => <mesh key={x} position={[x, 3.6, -1.9]} material={red}><cylinderGeometry args={[0.24, 0.28, 7.2, 16]} /></mesh>)}
        <mesh position={[0, 6.4, -1.9]} material={red}><boxGeometry args={[8.4, 0.36, 0.4]} /></mesh>
        <mesh geometry={roof} material={tileMat} position={[0, 6.75, -1.9]} />
        <mesh position={[0, 7.75, -1.9]} rotation={[0, 0, Math.PI / 2]} material={ridgeMat}><cylinderGeometry args={[0.1, 0.1, 10.2, 8]} /></mesh>
        {/* silk drapes framing the stage, and a valance across the top */}
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 3.2, 6.22, -1.55]} geometry={drapeGeo} material={sd < 0 ? drapeL : drapeR} raycast={() => null} />
        ))}
        <mesh position={[0, 6.24, -1.5]} geometry={valanceGeo} material={valance} raycast={() => null} />
        <Lantern char="春" paper="#d8321e" position={[-3.1, 6.2, -1.3]} size={1.15} drop={0.3} phase={0.5} />
        <Lantern char="福" paper="#d8321e" position={[3.1, 6.2, -1.3]} size={1.15} drop={0.3} phase={1.5} />
        <pointLight position={[0, 5.5, 3.5]} intensity={30} color="#ffd9a0" distance={12} />
        {/* the building across the end of the street */}
        <mesh position={[0, 7, -6]}><boxGeometry args={[12, 14, 6]} /><meshStandardMaterial color="#1a1214" roughness={0.95} /></mesh>
      </group>
    </Place>
  );
}

/** Society halls, in street order. */
export function Halls() {
  return <>{SOCS.map((s, i) => <SocietyHall key={s.id} id={s.id as "hk" | "mabc" | "uabc" | "echo"} seed={13 + i * 7} />)}</>;
}
