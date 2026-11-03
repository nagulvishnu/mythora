import * as THREE from "three";
import { mulberry32 } from "./noise";

const cache = new Map<string, { map: THREE.CanvasTexture; bump: THREE.CanvasTexture }>();

type Kind = "brick" | "rock" | "bark" | "marble" | "scale";

function mk(canvas: HTMLCanvasElement, srgb: boolean, rep: number) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Procedural surface textures (original, generated at runtime) */
export function getSurface(kind: Kind, rep = 2) {
  const key = kind + rep;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const b = document.createElement("canvas");
  b.width = b.height = S;
  const g = c.getContext("2d")!;
  const gb = b.getContext("2d")!;
  const rnd = mulberry32(kind.length * 977 + 13);

  const noiseFill = (ctx: CanvasRenderingContext2D, base: number, amp: number, n = 9000) => {
    for (let i = 0; i < n; i++) {
      const v = base + (rnd() - 0.5) * amp;
      ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
      const s = 1 + rnd() * 3;
      ctx.fillRect(rnd() * S, rnd() * S, s, s);
    }
  };

  if (kind === "brick" || kind === "marble") {
    const rows = kind === "brick" ? 8 : 4;
    const bw = kind === "brick" ? 64 : 128;
    const bh = S / rows;
    g.fillStyle = "#8a8a8a";
    g.fillRect(0, 0, S, S);
    gb.fillStyle = "#222";
    gb.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let x = -bw; x < S + bw; x += bw) {
        const v = 150 + rnd() * 70;
        g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
        g.fillRect(x + off + 2, r * bh + 2, bw - 4, bh - 4);
        gb.fillStyle = `rgb(${190 + rnd() * 50},${190 + rnd() * 50},${190 + rnd() * 50})`;
        gb.fillRect(x + off + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
    noiseFill(g, 130, 90);
    noiseFill(gb, 140, 120);
  } else if (kind === "rock") {
    g.fillStyle = "#777";
    g.fillRect(0, 0, S, S);
    gb.fillStyle = "#777";
    gb.fillRect(0, 0, S, S);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const rr = 8 + rnd() * 40;
      const v = 90 + rnd() * 110;
      const grd = g.createRadialGradient(x, y, 0, x, y, rr);
      grd.addColorStop(0, `rgba(${v},${v},${v},0.5)`);
      grd.addColorStop(1, "rgba(120,120,120,0)");
      g.fillStyle = grd;
      g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      const gr2 = gb.createRadialGradient(x, y, 0, x, y, rr);
      gr2.addColorStop(0, `rgba(${v + 40},${v + 40},${v + 40},0.5)`);
      gr2.addColorStop(1, "rgba(120,120,120,0)");
      gb.fillStyle = gr2;
      gb.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    noiseFill(g, 128, 100, 14000);
    noiseFill(gb, 128, 120, 14000);
  } else if (kind === "bark") {
    g.fillStyle = "#6b5a4a";
    g.fillRect(0, 0, S, S);
    gb.fillStyle = "#777";
    gb.fillRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) {
      const x = rnd() * S;
      const w = 2 + rnd() * 6;
      const v = 40 + rnd() * 120;
      g.fillStyle = `rgba(${v},${v * 0.85},${v * 0.7},0.55)`;
      g.fillRect(x, 0, w, S);
      gb.fillStyle = `rgba(${v + 60},${v + 60},${v + 60},0.5)`;
      gb.fillRect(x, 0, w, S);
    }
    noiseFill(g, 120, 90);
  } else {
    // scale
    g.fillStyle = "#999";
    g.fillRect(0, 0, S, S);
    gb.fillStyle = "#333";
    gb.fillRect(0, 0, S, S);
    const n = 12;
    const s = S / n;
    for (let r = 0; r < n * 2; r++) {
      for (let q = -1; q < n + 1; q++) {
        const cx = q * s + (r % 2 ? s / 2 : 0);
        const cy = r * s * 0.5;
        const v = 120 + rnd() * 110;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.beginPath();
        g.arc(cx, cy, s * 0.62, 0, Math.PI);
        g.fill();
        gb.fillStyle = `rgb(${v},${v},${v})`;
        gb.beginPath();
        gb.arc(cx, cy, s * 0.62, 0, Math.PI);
        gb.fill();
      }
    }
  }
  const out = { map: mk(c, true, rep), bump: mk(b, false, rep) };
  cache.set(key, out);
  return out;
}

let softSprite: THREE.CanvasTexture | null = null;
export function getSoftSprite() {
  if (softSprite) return softSprite;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  softSprite = new THREE.CanvasTexture(c);
  return softSprite;
}
