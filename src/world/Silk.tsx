import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { CNOISE, LIQUID, SNOISE } from "../fx/glsl";
import { BRUSH, canvasTex } from "./textures";

/** One clock for every silk and liquid-gold shader in the street. */
export const fxTime = { value: 0 };
export function FxClock() {
  useFrame((_, dt) => { fxTime.value += Math.min(dt, 0.05); });
  return null;
}

const col = (h: string) => new THREE.Color(h);

/**
 * Silk that moves in the wind. shadergradient's idea, a mesh rippled by animated
 * Perlin noise with colours blended across it, injected into the standard material so
 * the fabric still takes the street's lights, fog and reflections. The top edge is pinned.
 */
export function silkMaterial({ map, c1, c2, c3, seed = 0, strength = 0.22, density = 1.1 }: { map?: THREE.Texture; c1: string; c2: string; c3: string; seed?: number; strength?: number; density?: number }) {
  const m = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.42, metalness: 0.08, emissive: col(c1), emissiveIntensity: 0.12 });
  const uniforms = { uTime: fxTime, uSeed: { value: seed }, uC1: { value: col(c1) }, uC2: { value: col(c2) }, uC3: { value: col(c3) }, uStrength: { value: strength }, uDensity: { value: density } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
${SNOISE}
${CNOISE}
uniform float uTime; uniform float uSeed; uniform float uStrength; uniform float uDensity;
varying float vDisp; varying vec2 vSilkUv;
float silkD(vec2 p, float pin) {
  float t = uTime * 0.6;
  float n = cnoise(vec3(p * uDensity + uSeed, t));
  float wave = sin(p.y * 2.3 - t * 3.0 + uSeed) * 0.35;
  return (n + wave) * uStrength * pin;
}`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `float pin = pow(1.0 - uv.y, 1.3); // the top edge hangs from its pole
float e = 0.02;
float dX = silkD(position.xy + vec2(e, 0.0), pin) - silkD(position.xy - vec2(e, 0.0), pin);
float dY = silkD(position.xy + vec2(0.0, e), pin) - silkD(position.xy - vec2(0.0, e), pin);
vec3 objectNormal = normalize(vec3(-dX / (2.0 * e), -dY / (2.0 * e), 1.0));
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
vDisp = silkD(position.xy, pin);
transformed.z += vDisp;
transformed.x += sin(uTime * 1.1 + uSeed + position.y) * 0.04 * pin;
vSilkUv = uv;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
varying float vDisp; varying vec2 vSilkUv;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// shadergradient's colour mix: across the cloth, then by how far it billows
vec3 silkCol = mix(uC1, uC2, smoothstep(-0.2, 1.2, vSilkUv.y + vDisp * 2.0));
silkCol = mix(silkCol, uC3, smoothstep(0.05, 0.35, abs(vDisp)));
diffuseColor.rgb *= silkCol;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
// lit from within by the lanterns around it; painted ink stays dark
totalEmissiveRadiance += diffuseColor.rgb * 0.62;`,
      )
      .replace(
        "#include <opaque_fragment>",
        `// a silk sheen where the cloth turns away from you
float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
outgoingLight += uC2 * rim * 0.35;
#include <opaque_fragment>`,
      );
  };
  // the shader edits are the same for every silk; let three share one program
  m.customProgramCacheKey = () => "silk";
  return m;
}

/** A hanging silk banner with one painted character, pinned to a short pole. */
export function Banner({ char, position, c1, c2, c3, seed, rotationY = 0, w = 0.75, h = 2.5 }: { char: string; position: [number, number, number]; c1: string; c2: string; c3: string; seed: number; rotationY?: number; w?: number; h?: number }) {
  const { geo, mat } = useMemo(() => {
    const tex = canvasTex(128, 448, (c, W, H) => {
      c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H);
      // trim and the swallow-tail cut at the bottom
      c.strokeStyle = "#c8b48a"; c.lineWidth = 8; c.strokeRect(8, 8, W - 16, H - 16);
      c.fillStyle = "#1a0a06"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = `700 104px ${BRUSH}`;
      c.fillText(char, W / 2, H * 0.36);
      c.beginPath(); c.moveTo(0, H); c.lineTo(W / 2, H - 46); c.lineTo(W, H); c.closePath();
      c.globalCompositeOperation = "destination-out"; c.fill();
    });
    const geo = new THREE.PlaneGeometry(w, h, 6, 28).translate(0, -h / 2, 0);
    const mat = silkMaterial({ map: tex, c1, c2, c3, seed });
    mat.transparent = true;
    mat.alphaTest = 0.5;
    return { geo, mat };
  }, [char, c1, c2, c3, seed, w, h]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.03, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.025, 0.025, w + 0.25, 8]} />
        <meshStandardMaterial color="#8a5a2a" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh geometry={geo} material={mat} raycast={() => null} />
    </group>
  );
}

/**
 * Liquid gold poured into characters on a board: liquid-logo's flow, masked by text.
 * Unlit and brighter than white, so the bloom makes it glow.
 */
export function liquidGoldMaterial(mask: THREE.Texture, aspect: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    uniforms: { uTime: fxTime, uMask: { value: mask }, uAspect: { value: aspect } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform sampler2D uMask; uniform float uAspect;
      varying vec2 vUv;
      ${SNOISE}
      ${LIQUID}
      float a(vec2 uv) { return texture2D(uMask, uv).a; }
      void main() {
        float m = a(vUv);
        if (m < 0.04) discard;
        vec2 px = vec2(0.003 / uAspect, 0.003);
        float edge = abs(a(vUv + vec2(px.x, 0.0)) - a(vUv - vec2(px.x, 0.0))) + abs(a(vUv + vec2(0.0, px.y)) - a(vUv - vec2(0.0, px.y)));
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.2;
        float f = liquidFlow(p, uTime * 0.35);
        vec3 c = goldRamp(f * 0.72 + 0.08);
        c += vec3(1.0, 0.9, 0.7) * clamp(edge, 0.0, 1.0) * 0.5;
        gl_FragColor = vec4(c * 0.92, m);
      }`,
  });
}
