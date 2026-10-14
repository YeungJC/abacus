import { CNOISE, LIQUID, SNOISE } from "./glsl";
import ShaderCanvas from "./ShaderCanvas";

const BRUSH = '"LXGW WenKai TC", "Kaiti TC", "KaiTi", serif';

/*
 * Liquid gold poured into a brush-written character: liquid-logo's flow and edge
 * highlights, masked by the glyph instead of a logo image.
 */
const GLYPH_FRAG = SNOISE + LIQUID + /* glsl */ `
uniform float u_glow;
float a(vec2 uv) { return texture2D(u_mask, uv).a; }
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float m = a(uv);
  // edges of the stroke, from the mask's neighbours (liquid-logo's detectEdges)
  vec2 px = 2.0 / u_res;
  float edge = abs(a(uv + vec2(px.x, 0.0)) - a(uv - vec2(px.x, 0.0))) + abs(a(uv + vec2(0.0, px.y)) - a(uv - vec2(0.0, px.y)));
  vec2 p = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float t = u_time * 0.35;
  float f = liquidFlow(p * 1.2, t);
  vec3 col = goldRamp(f * 0.85 + 0.12);
  // a bright rim where the stroke turns, like light catching molten metal
  col += vec3(1.0, 0.9, 0.7) * pow(clamp(edge * 1.4, 0.0, 1.0), 2.0) * 0.6;
  col += grain(gl_FragCoord.xy, floor(u_time * 24.0)) * 0.06;
  // a soft glow around the character
  vec2 g = 6.0 / u_res;
  float halo = (a(uv + vec2(g.x, 0.0)) + a(uv - vec2(g.x, 0.0)) + a(uv + vec2(0.0, g.y)) + a(uv - vec2(0.0, g.y))) * 0.25;
  float alpha = max(m, halo * 0.35 * u_glow);
  gl_FragColor = vec4(mix(vec3(1.0, 0.55, 0.2), col, step(0.02, m)), alpha);
}`;

/** A character (or two) in flowing liquid gold. */
export function LiquidGlyph({ text, className, glow = 1, weight = 700, scale = 0.86 }: { text: string; className?: string; glow?: number; weight?: number; scale?: number }) {
  return (
    <ShaderCanvas
      className={className}
      frag={GLYPH_FRAG}
      uniforms={{ u_glow: glow }}
      maskKey={text}
      label={text}
      mask={(c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = "#fff";
        c.textAlign = "center";
        c.textBaseline = "middle";
        const chars = [...text].length;
        c.font = `${weight} ${Math.min(h * scale, (w * scale) / chars)}px ${BRUSH}`;
        c.fillText(text, w / 2, h * 0.53);
      }}
    />
  );
}

/*
 * A flowing three-colour gradient after shadergradient: Perlin noise ripples a surface,
 * the colours blend across it, light rakes across the ripples, and film grain sits on top.
 */
const FIELD_FRAG = SNOISE + CNOISE + LIQUID + /* glsl */ `
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;
uniform float u_density;
uniform float u_strength;
float h(vec2 p, float t) { return cnoise(vec3(p * u_density, t)) * u_strength; }
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.08;
  float d = h(p, t);
  // the slope of the ripples, for raking light
  float e = 0.004;
  vec3 n = normalize(vec3(h(p - vec2(e, 0.0), t) - h(p + vec2(e, 0.0), t), h(p - vec2(0.0, e), t) - h(p + vec2(0.0, e), t), e * 6.0));
  float light = clamp(dot(n, normalize(vec3(-0.5, 0.6, 0.65))), 0.0, 1.0);
  // shadergradient's mix: one colour across x, another blended in by height
  vec3 col = mix(u_c1, u_c2, smoothstep(-0.6, 0.9, p.x + d * 1.4));
  col = mix(col, u_c3, smoothstep(0.1, 0.9, d + 0.25 * sin(p.y * 2.0 + t * 3.0)));
  col *= 0.55 + 0.75 * light;
  col += pow(light, 18.0) * 0.35; // silk sheen on the crests
  col = mix(u_bg, col, smoothstep(-0.2, 1.0, uv.y * 0.6 + 0.6 - length(p) * 0.25));
  col += grain(gl_FragCoord.xy, floor(u_time * 24.0)) * 0.07;
  gl_FragColor = vec4(col, 1.0);
}`;

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** A slow silk-like gradient for backgrounds. */
export function GradientField({ c1, c2, c3, bg, className, density = 1.3, strength = 0.9 }: { c1: string; c2: string; c3: string; bg: string; className?: string; density?: number; strength?: number }) {
  return <ShaderCanvas className={className} frag={FIELD_FRAG} uniforms={{ u_c1: hex(c1), u_c2: hex(c2), u_c3: hex(c3), u_bg: hex(bg), u_density: density, u_strength: strength }} />;
}
