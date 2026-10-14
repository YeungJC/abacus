import { Environment, Html, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { FxClock } from "./Silk";
import { socName, SOCS } from "../data";
import { useApp } from "../store";
import { EmptyLot, EnvelopeStall, GalaStage, Gate, Halls, NoticeBoard, StationExit, TeaHouse } from "./Landmarks";
import Player from "./Player";
import { GROUND } from "./Shophouse";
import { HALF, STOPS, type Stop } from "./stops";
import Street from "./Street";

const ZH: Record<string, [string, string]> = {
  gate: ["牌坊", "牌坊"], yours: ["空舖", "空铺"], board: ["告示板", "告示板"], pass: ["紅包檔", "红包档"],
  exit: ["出口", "出口"], teahouse: ["茶樓", "茶楼"], gala: ["新春晚會", "新春晚会"],
};

/** Name of a place in the current language. */
export function placeName(s: Stop, lang: "en" | "hant" | "hans") {
  const soc = SOCS.find((x) => x.id === s.id);
  if (soc) return socName(soc, lang);
  if (lang === "en") return s.en;
  return ZH[s.id][lang === "hant" ? 0 : 1];
}

/** Floating name tags over the places just ahead of you. Real DOM text, so always crisp. */
function Labels() {
  const z = useApp((s) => s.z);
  const lang = useApp((s) => s.lang);
  const open = useApp((s) => s.open);
  const go = useApp((s) => s.go);
  const intro = useApp((s) => s.intro);
  if (intro) return null;
  return (
    <>
      {STOPS.filter((s) => s.z < z + 1 && s.z > z - 20 && open !== s.id)
        .slice(0, 4)
        .map((s) => {
        const pos: [number, number, number] =
          s.side === 0 ? [0, s.id === "gate" ? 8 : 8.6, s.z] : [s.side * (HALF - 0.4), GROUND + 1.6, s.z];
        const soc = SOCS.find((x) => x.id === s.id);
        return (
          <Html key={s.id} position={pos} center zIndexRange={[10, 0]}>
            <button className="place-label" onClick={() => go(s.id)} style={soc ? { borderColor: `var(${soc.color})` } : undefined}>
              <b>{placeName(s, lang)}</b>
              {lang !== "en" && <span>{s.en}</span>}
            </button>
          </Html>
        );
        })}
    </>
  );
}

const CA = new THREE.Vector2(0.0009, 0.0006);

/** Tells the page the street has drawn a few frames, so the loading veil can lift. */
function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 8) onReady();
  });
  return null;
}

export default function World({ onReady }: { onReady: () => void }) {
  const lang = useApp((s) => s.lang);
  // drop the reflections and resolution on devices that can't keep up
  // ?low starts in low quality, for testing on slow machines
  const startLow = typeof location !== "undefined" && /[?&]low\b/.test(location.search);
  const [quality, setQuality] = useState<"high" | "low">(startLow ? "low" : "high");
  const [dpr, setDpr] = useState(startLow ? 1 : 1.6);
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 6.5, 40], fov: 62, near: 0.1, far: 170 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => {
        gl.domElement.style.touchAction = "none";
        scene.environmentIntensity = 0.35;
      }}
    >
      <PerformanceMonitor
        onDecline={() => { setDpr(1); setQuality("low"); }}
        flipflops={2}
        onFallback={() => { setDpr(1); setQuality("low"); }}
      />
      <color attach="background" args={["#0b0812"]} />
      <fog attach="fog" args={["#1a0d16", 14, 80]} />
      <hemisphereLight args={["#47407a", "#1a0e0a", 0.45]} />
      {/* soft warm reflections for the gold, tiles and wet stone */}
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" color="#ff7a3a" intensity={3} position={[0, 4, -12]} scale={[12, 2, 1]} />
        <Lightformer form="rect" color="#ff4a2a" intensity={2} position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]} scale={[20, 2, 1]} />
        <Lightformer form="rect" color="#ffb060" intensity={2} position={[6, 3, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[20, 2, 1]} />
        <Lightformer form="circle" color="#4a4a9a" intensity={0.8} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={10} />
      </Environment>
      <Street quality={quality} />
      <Gate />
      <Halls />
      <EmptyLot lang={lang} />
      <NoticeBoard lang={lang} />
      <EnvelopeStall />
      <StationExit lang={lang} />
      <TeaHouse />
      <GalaStage lang={lang} />
      <Labels />
      <Player />
      <Ready onReady={onReady} />
      <FxClock />
      <EffectComposer multisampling={quality === "high" ? 4 : 0}>
        <Bloom mipmapBlur luminanceThreshold={0.8} intensity={1.05} radius={0.7} />
        <ChromaticAberration offset={CA} radialModulation modulationOffset={0.35} />
        <Vignette offset={0.3} darkness={0.75} />
        {/* film grain, as shadergradient and liquid-logo both finish with */}
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.55} />
      </EffectComposer>
    </Canvas>
  );
}
