import { useEffect, useRef, type CSSProperties } from "react";

type Uniforms = Record<string, number | [number, number] | [number, number, number]>;

type Props = {
  /** fragment shader body; gets u_time, u_res and, with `mask`, u_mask */
  frag: string;
  uniforms?: Uniforms;
  /** draws an alpha mask (white on transparent) at the canvas's pixel size */
  mask?: (c: CanvasRenderingContext2D, w: number, h: number) => void;
  /** changes when the mask's content changes */
  maskKey?: string;
  className?: string;
  style?: CSSProperties;
  label?: string;
};

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

/**
 * A small WebGL canvas that runs one fragment shader over its whole area. It animates
 * only while on screen, draws a single still frame for people who prefer less motion,
 * and gives its GPU context back when it unmounts.
 */
export default function ShaderCanvas({ frag, uniforms = {}, mask, maskKey, className, style, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const uni = useRef(uniforms);
  uni.current = uniforms;

  useEffect(() => {
    const cv = ref.current!;
    const gl = cv.getContext("webgl", { premultipliedAlpha: false, alpha: true, antialias: false });
    if (!gl) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, "precision highp float;\nuniform float u_time;\nuniform vec2 u_res;\nuniform sampler2D u_mask;\n" + frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    let maskW = 0, maskH = 0;
    const drawMask = () => {
      if (!mask) return;
      const m = document.createElement("canvas");
      m.width = cv.width; m.height = cv.height;
      mask(m.getContext("2d")!, m.width, m.height);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      maskW = cv.width; maskH = cv.height;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h);
      if (mask && (maskW !== w || maskH !== h)) drawMask();
    };

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, visible = true, t0 = performance.now();
    const frame = () => {
      resize();
      gl.uniform1f(gl.getUniformLocation(prog, "u_time"), still ? 12 : (performance.now() - t0) / 1000);
      gl.uniform2f(gl.getUniformLocation(prog, "u_res"), cv.width, cv.height);
      gl.uniform1i(gl.getUniformLocation(prog, "u_mask"), 0);
      for (const [k, v] of Object.entries(uni.current)) {
        const l = gl.getUniformLocation(prog, k);
        if (typeof v === "number") gl.uniform1f(l, v);
        else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
        else gl.uniform3f(l, v[0], v[1], v[2]);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && visible) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && !still) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
    });
    io.observe(cv);
    // fonts change what the mask draws, so redraw it once they're in
    document.fonts?.ready.then(() => { maskW = 0; });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // the shader and mask painter are fixed for a mounted canvas; maskKey forces a fresh one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frag, maskKey]);

  return <canvas ref={ref} className={className} style={style} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
