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
 * Paint the upper-floor facade of a shophouse (plaster, floor lines, shuttered or lit
 * windows) into a colour canvas and an emissive canvas (lit windows only), at (ox, oy).
 * Size: 256 × 128 per floor.
 */
export function paintFacade(seed: number, wall: string, floors: number, c: CanvasRenderingContext2D, e: CanvasRenderingContext2D, ox = 0, oy = 0) {
  const r = rng(seed);
  const W = 256, H = 128 * floors;
  c.save(); c.translate(ox, oy);
  c.beginPath(); c.rect(0, 0, W, H); c.clip();
  e.save(); e.translate(ox, oy);
  e.fillStyle = "#000"; e.fillRect(0, 0, W, H);
  c.fillStyle = wall; c.fillRect(0, 0, W, H);
  // weathering
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
    c.fillRect(r() * W, r() * H, 2 + r() * 30, 2 + r() * 40);
  }
  const lattice = (g: CanvasRenderingContext2D, x: number, y: number, ww: number, hh: number) => {
    for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(x + (ww * i) / 3, y); g.lineTo(x + (ww * i) / 3, y + hh); g.stroke(); }
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x, y + (hh * i) / 4); g.lineTo(x + ww, y + (hh * i) / 4); g.stroke(); }
  };
  const cols = r() > 0.5 ? 3 : 2;
  for (let f = 0; f < floors; f++) {
    const y0 = f * 128;
    c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, y0 + 122, W, 6);
    for (let k = 0; k < cols; k++) {
      const ww = cols === 3 ? 52 : 70, gap = (W - cols * ww) / (cols + 1);
      const x = gap + k * (ww + gap), y = y0 + 26, hh = 74;
      const on = r() > 0.4;
      c.fillStyle = "#0c0606"; c.fillRect(x - 4, y - 4, ww + 8, hh + 8);
      if (on) {
        const col = r() > 0.3 ? "#ffb35c" : "#ffd9a0";
        c.fillStyle = col; c.fillRect(x, y, ww, hh);
        c.strokeStyle = "rgba(60,20,10,.85)"; c.lineWidth = 3; lattice(c, x, y, ww, hh);
        e.fillStyle = col; e.fillRect(x, y, ww, hh);
        e.strokeStyle = "#000"; e.lineWidth = 3; lattice(e, x, y, ww, hh);
        // a curtain half drawn
        if (r() > 0.6) { c.fillStyle = "rgba(120,30,20,.55)"; c.fillRect(x, y, ww * 0.4, hh); e.fillStyle = "rgba(0,0,0,.6)"; e.fillRect(x, y, ww * 0.4, hh); }
      } else {
        c.fillStyle = r() > 0.5 ? "#3d5a4c" : "#5a2a22"; c.fillRect(x, y, ww, hh);
        c.fillStyle = "rgba(0,0,0,.3)";
        for (let yy = y + 4; yy < y + hh; yy += 7) c.fillRect(x, yy, ww, 2);
        c.fillRect(x + ww / 2 - 1, y, 2, hh);
      }
      c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(x - 6, y + hh + 4, ww + 12, 4);
    }
  }
  c.restore(); e.restore();
}

/** A shophouse facade as its own pair of textures. */
export function facadeTex(seed: number, wall: string, floors: number) {
  const W = 256, H = 128 * floors;
  const cm = document.createElement("canvas"), ce = document.createElement("canvas");
  cm.width = ce.width = W; cm.height = ce.height = H;
  paintFacade(seed, wall, floors, cm.getContext("2d")!, ce.getContext("2d")!);
  const map = new THREE.CanvasTexture(cm), emissive = new THREE.CanvasTexture(ce);
  map.colorSpace = emissive.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = emissive.anisotropy = 8;
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

/** Soft radial glow, for light scattering in wet air around lanterns and sparks. */
let halo: THREE.CanvasTexture | null = null;
export function haloTex() {
  halo ??= canvasTex(128, 128, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,.55)");
    g.addColorStop(0.45, "rgba(255,255,255,.14)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
  return halo;
}

/**
 * Roughness for the street: dark = smooth standing water, light = rough stone.
 * Puddles gather in the middle of the lane and along the kerbs.
 */
export function puddleTex() {
  const r = rng(21);
  const t = canvasTex(512, 1024, (c, w, h) => {
    c.fillStyle = "#d8d8d8"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = r() < 0.35 ? (r() < 0.5 ? 30 + r() * 60 : w - 30 - r() * 60) : 100 + r() * (w - 200);
      const y = r() * h, rx = 20 + r() * 90, ry = 30 + r() * 160;
      const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      g.addColorStop(0, "rgba(10,10,10,.95)"); g.addColorStop(0.6, "rgba(40,40,40,.6)"); g.addColorStop(1, "rgba(216,216,216,0)");
      c.save(); c.translate(x, y); c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); c.translate(-x, -y);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); c.fill(); c.restore();
    }
    // stone joints hold water too
    c.strokeStyle = "rgba(30,30,30,.5)"; c.lineWidth = 2;
    for (let y = 0; y < h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A pulled-down roller shutter, with a sticker or two. */
export function shutterTex(seed: number) {
  const r = rng(seed);
  return canvasTex(256, 256, (c, w, h) => {
    const base = 120 + Math.floor(r() * 40);
    c.fillStyle = `rgb(${base},${base + 2},${base + 6})`; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      c.fillStyle = "rgba(0,0,0,.28)"; c.fillRect(0, y, w, 2);
      c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(0, y + 2, w, 1);
    }
    c.fillStyle = "rgba(60,30,10,.25)";
    for (let i = 0; i < 6; i++) c.fillRect(r() * w, r() * h, 4 + r() * 20, 30 + r() * 80);
    if (r() > 0.4) {
      c.fillStyle = "#c4291e"; c.fillRect(w * 0.6, h * 0.3, 60, 80);
      c.fillStyle = "#f6e7c4"; c.font = `700 40px ${BRUSH}`; c.textAlign = "center"; c.fillText("吉", w * 0.6 + 30, h * 0.3 + 54);
    }
  });
}

/** Washing on a bamboo pole. */
export function clothTex(seed: number) {
  const r = rng(seed);
  const cols = ["#e8e2d4", "#4a6fa5", "#c84a3a", "#2e2e34", "#e0b84a", "#8fb0a0", "#d68aa0"];
  return canvasTex(256, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    let x = 4;
    while (x < w - 20) {
      const cw = 18 + r() * 34, ch = 26 + r() * 34;
      c.fillStyle = cols[Math.floor(r() * cols.length)];
      c.fillRect(x, 0, cw, ch);
      c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(x, ch - 4, cw, 4);
      x += cw + 3 + r() * 8;
    }
  });
}
