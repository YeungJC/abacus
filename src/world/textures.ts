import * as THREE from "three";

export const BRUSH = '"LXGW WenKai TC", "Kaiti TC", "KaiTi", serif';
export const SERIF = '"Noto Serif TC", "Songti TC", Georgia, serif';

/** Seeded random so the street is the same on every visit. */
export function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Fit text to a width by shrinking the font. */
export function fitText(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, font: string, weight = 700) {
  let s = size;
  do {
    c.font = `${weight} ${s}px ${font}`;
    s -= 2;
  } while (c.measureText(text).width > maxW && s > 8);
  c.fillText(text, x, y);
}

/**
 * Lantern paper, unwrapped around the lantern (u = around, v = up).
 * Glowing paper with dark ribs, gold bands, and a black brush character on the front
 * and back, as on real lanterns. Used as both map and emissiveMap, so the character
 * stays dark while the paper glows.
 */
export function lanternTex(char: string, paper: string, ghost = false) {
  return canvasTex(1024, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(paper, -0.35));
    g.addColorStop(0.5, paper);
    g.addColorStop(1, shade(paper, -0.35));
    c.fillStyle = ghost ? "#2a2018" : g;
    c.fillRect(0, 0, w, h);
    // bamboo ribs run top to bottom, so they are horizontal bands in this unwrap
    c.fillStyle = "rgba(0,0,0,.22)";
    for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 3);
    c.fillStyle = "rgba(0,0,0,.12)";
    for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 2, h);
    if (!char) return;
    // the circumference is ~2.2× the height on screen, so squash glyphs horizontally to keep them square
    for (const cx of [w * 0.25, w * 0.75]) {
      c.save();
      c.translate(cx, h * 0.53);
      c.scale(0.64, 1);
      c.font = `700 360px ${BRUSH}`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineJoin = "round";
      if (ghost) {
        c.strokeStyle = "#e8d6b0"; c.lineWidth = 8; c.strokeText(char, 0, 0);
      } else {
        c.fillStyle = "#140805";
        c.fillText(char, 0, 0);
      }
      c.restore();
    }
  });
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour. */
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Upper-floor facade of a shophouse: plaster, floor lines, shuttered or lit windows.
 * Returns colour and emissive (lit windows only) textures.
 */
export function facadeTex(seed: number, wall: string, floors: number) {
  const r = rng(seed);
  const W = 256, H = 128 * floors;
  const lit: [number, number, number, number, string][] = [];
  const map = canvasTex(W, H, (c) => {
    c.fillStyle = wall; c.fillRect(0, 0, W, H);
    // weathering
    for (let i = 0; i < 260; i++) {
      c.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
      c.fillRect(r() * W, r() * H, 2 + r() * 30, 2 + r() * 40);
    }
    const cols = r() > 0.5 ? 3 : 2;
    for (let f = 0; f < floors; f++) {
      const y0 = f * 128;
      // floor band
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, y0 + 122, W, 6);
      for (let k = 0; k < cols; k++) {
        const ww = cols === 3 ? 52 : 70, gap = (W - cols * ww) / (cols + 1);
        const x = gap + k * (ww + gap), y = y0 + 26, hh = 74;
        const on = r() > 0.4;
        c.fillStyle = "#0c0606"; c.fillRect(x - 4, y - 4, ww + 8, hh + 8);
        if (on) {
          const col = r() > 0.3 ? "#ffb35c" : "#ffd9a0";
          c.fillStyle = col; c.fillRect(x, y, ww, hh);
          lit.push([x, y, ww, hh, col]);
          // lattice
          c.strokeStyle = "rgba(60,20,10,.85)"; c.lineWidth = 3;
          for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(x + (ww * i) / 3, y); c.lineTo(x + (ww * i) / 3, y + hh); c.stroke(); }
          for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x, y + (hh * i) / 4); c.lineTo(x + ww, y + (hh * i) / 4); c.stroke(); }
        } else {
          // closed shutters
          c.fillStyle = r() > 0.5 ? "#3d5a4c" : "#5a2a22"; c.fillRect(x, y, ww, hh);
          c.fillStyle = "rgba(0,0,0,.3)";
          for (let yy = y + 4; yy < y + hh; yy += 7) c.fillRect(x, yy, ww, 2);
          c.fillRect(x + ww / 2 - 1, y, 2, hh);
        }
        // sill
        c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(x - 6, y + hh + 4, ww + 12, 4);
      }
      // a hanging air-con unit or a pot plant now and then
      if (r() > 0.6) { c.fillStyle = "#9a9590"; c.fillRect(W * r() * 0.7, y0 + 100, 34, 18); }
    }
  });
  const emissive = canvasTex(W, H, (c) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
    for (const [x, y, ww, hh, col] of lit) {
      c.fillStyle = col; c.fillRect(x, y, ww, hh);
      c.strokeStyle = "#000"; c.lineWidth = 3;
      for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(x + (ww * i) / 3, y); c.lineTo(x + (ww * i) / 3, y + hh); c.stroke(); }
      for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x, y + (hh * i) / 4); c.lineTo(x + ww, y + (hh * i) / 4); c.stroke(); }
    }
  });
  return { map, emissive };
}

/** Granite flagstones for the street. */
export function flagstoneTex() {
  const r = rng(11);
  const map = canvasTex(512, 512, (c) => {
    c.fillStyle = "#2a2426"; c.fillRect(0, 0, 512, 512);
    let y = 0;
    while (y < 512) {
      const hh = 48 + Math.floor(r() * 3) * 16;
      let x = -Math.floor(r() * 60);
      while (x < 512) {
        const ww = 60 + Math.floor(r() * 4) * 20;
        const v = 30 + Math.floor(r() * 18);
        c.fillStyle = `rgb(${v + 6},${v},${v + 2})`;
        c.fillRect(x + 2, y + 2, ww - 4, hh - 4);
        x += ww;
      }
      y += hh;
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

/** A shop signboard: black lacquer with gold calligraphy, English underneath. */
export function signTex(zh: string, en: string, accent: string, vertical = false) {
  if (vertical) {
    return canvasTex(160, 512, (c, w, h) => {
      c.fillStyle = "#130909"; c.fillRect(0, 0, w, h);
      c.strokeStyle = accent; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = accent; c.textAlign = "center"; c.textBaseline = "middle";
      const chars = [...zh];
      const step = (h - 60) / chars.length;
      c.font = `700 ${Math.min(112, step * 0.9)}px ${BRUSH}`;
      chars.forEach((ch, i) => c.fillText(ch, w / 2, 30 + step * (i + 0.5)));
    });
  }
  return canvasTex(1024, 256, (c, w, h) => {
    c.fillStyle = "#170c0a"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#c99a3a"; c.lineWidth = 10; c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = accent; c.fillRect(24, 24, 18, h - 48); c.fillRect(w - 42, 24, 18, h - 48);
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#f2c766";
    fitText(c, zh, w / 2, h * 0.42, w - 140, 132, BRUSH);
    c.fillStyle = "#f4e6c6";
    fitText(c, en.toUpperCase(), w / 2, h * 0.8, w - 160, 36, SERIF, 600);
  });
}

/** Spinning-ish neon blade sign, the kind that sticks out over the pavement. */
export function neonTex(text: string, col: string) {
  return canvasTex(128, 384, (c, w, h) => {
    c.fillStyle = "#0e0808"; c.fillRect(0, 0, w, h);
    c.shadowColor = col; c.shadowBlur = 18;
    c.strokeStyle = col; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "middle";
    const chars = [...text];
    const step = (h - 40) / chars.length;
    c.font = `700 ${Math.min(96, step * 0.82)}px ${BRUSH}`;
    chars.forEach((ch, i) => c.fillText(ch, w / 2, 20 + step * (i + 0.5)));
  });
}
