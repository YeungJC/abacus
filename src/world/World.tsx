import { Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
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

export default function World() {
  const lang = useApp((s) => s.lang);
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 1.65, 17], fov: 62, near: 0.1, far: 160 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.domElement.style.touchAction = "none"; }}
    >
      <color attach="background" args={["#0b0812"]} />
      <fog attach="fog" args={["#0b0812", 16, 78]} />
      <hemisphereLight args={["#47407a", "#1a0e0a", 0.55]} />
      <Street />
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
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.85} intensity={0.9} radius={0.65} />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
