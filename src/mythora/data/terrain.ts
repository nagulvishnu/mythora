import { fbm, flatten, lerp, noise2, ridged, smooth } from "../lib/noise";
import type { SceneId } from "./worlds";

export interface Island {
  x: number;
  y: number;
  z: number;
  r: number;
}
export interface Collider {
  x: number;
  y: number;
  z: number;
  r: number;
}
export interface Physics {
  walk: boolean;
  eye: number;
  bounds: number;
  minY: number;
  maxY: number;
  groundAt: (x: number, z: number) => number;
  colliders: Collider[];
}

/* ------------------------------ AETHERIA ------------------------------ */
export const AETHERIA_ISLANDS: Island[] = [
  { x: 0, y: 0, z: 0, r: 46 },
  { x: -110, y: -12, z: 40, r: 20 },
  { x: 95, y: 8, z: 70, r: 24 },
  { x: 130, y: -6, z: -60, r: 18 },
  { x: -70, y: 14, z: -120, r: 22 },
  { x: 20, y: -18, z: 150, r: 16 },
  { x: -160, y: 20, z: -20, r: 14 },
  { x: 60, y: 30, z: -150, r: 12 },
];

/* ------------------------------ UMBRACIA ------------------------------ */
export const UMBRACIA_ISLANDS: Island[] = [
  { x: 0, y: 0, z: 0, r: 42 },
  { x: 90, y: 10, z: -50, r: 20 },
  { x: -100, y: -5, z: 60, r: 18 },
  { x: 60, y: -30, z: 140, r: 12 },
  { x: -60, y: 25, z: -130, r: 16 },
  { x: 150, y: 30, z: 40, r: 14 },
  { x: -170, y: 10, z: -40, r: 12 },
];

function islandTop(islands: Island[], x: number, z: number) {
  let best = -Infinity;
  for (const i of islands) {
    if (Math.hypot(x - i.x, z - i.z) < i.r * 0.86) best = Math.max(best, i.y);
  }
  return best;
}

/* ------------------------------ EVERGREEN ------------------------------ */
export const EVERGREEN = {
  lake: { x: 95, z: -50, r: 40, level: -2.6 },
  cliff: { x: -105, z: -95 },
  pond: { x: -100, z: -74 },
};
export function evergreenHeight(x: number, z: number) {
  let h = (fbm(x * 0.008 + 10, z * 0.008 + 3, 4) - 0.45) * 34 + (noise2(x * 0.05, z * 0.05) - 0.5) * 2.5;
  const r = Math.hypot(x, z);
  h += smooth(120, 230, r) * 40 * fbm(x * 0.01, z * 0.01 + 7, 3);
  h = flatten(h, x, z, 0, 0, 0, 38, 24);
  h = flatten(h, x, z, EVERGREEN.cliff.x, EVERGREEN.cliff.z, 0, 25, 20);
  h = flatten(h, x, z, EVERGREEN.lake.x, EVERGREEN.lake.z, -7, 18, 24);
  h = flatten(h, x, z, EVERGREEN.pond.x, EVERGREEN.pond.z, -4, 6, 10);
  return h;
}

/* ------------------------------ DRAGONFALL ------------------------------ */
export const riverX = (z: number) => 30 * Math.sin(z * 0.011) + 14 * Math.sin(z * 0.027 + 1);
export const LAVA_LEVEL = -6;
export function dragonHeight(x: number, z: number) {
  const d = Math.abs(x - riverX(z));
  const m = ridged(x * 0.006 + 3, z * 0.006 + 9, 6);
  let h = m * 120 * smooth(30, 150, d) + fbm(x * 0.03, z * 0.03, 3) * 9 * smooth(5, 30, d) + 1;
  const r = Math.hypot(x, z);
  h += smooth(210, 300, r) * 130;
  const dv = Math.hypot(x + 180, z + 250);
  const cone = Math.max(0, 1 - dv / 150);
  h = Math.max(h, cone * 175 - (dv < 24 ? (24 - dv) * 3.2 : 0));
  h = flatten(h, x, z, -70, 30, 22, 30, 22);
  h = flatten(h, x, z, 110, -40, 34, 26, 22);
  h = flatten(h, x, z, -120, -90, 45, 16, 20);
  h = lerp(-8, h, smooth(6, 26, d));
  return h;
}

/* ------------------------------ ELDORIA ------------------------------ */
export const ravineZ = (x: number) => 100 + 10 * Math.sin(x * 0.02);
export function eldoriaHeight(x: number, z: number) {
  let h = (fbm(x * 0.01 + 20, z * 0.01 + 5, 4) - 0.45) * 22 + (noise2(x * 0.06, z * 0.06) - 0.5) * 1.2;
  const r = Math.hypot(x, z);
  h += smooth(150, 240, r) * 30;
  h = flatten(h, x, z, 0, -10, 0, 70, 50);
  h = flatten(h, x, z, 0, -115, 8, 45, 30);
  h = flatten(h, x, z, 120, 40, 0, 40, 25);
  h = flatten(h, x, z, -34, 100, 0, 14, 14);
  h = flatten(h, x, z, 34, 100, 0, 14, 14);
  const d = Math.abs(z - ravineZ(x));
  h = lerp(-24, h, smooth(8, 20, d));
  // stair trench into the vault
  if (x > 66 && x < 109) {
    const depth = -12 * Math.min(1, Math.max(0, (x - 70) / 38));
    const t = smooth(5.5, 7.5, Math.abs(z - 40));
    h = lerp(depth, h, t);
  }
  // vault chamber
  if (x >= 108 && x <= 132) {
    const t = smooth(11, 13, Math.abs(z - 40));
    h = lerp(-12, h, t);
  }
  return h;
}
export function eldoriaBridge(x: number, z: number) {
  const ax = Math.abs(x);
  if (ax > 8 && ax < 28 && Math.abs(z - ravineZ(x)) < 4.5) return 0.6;
  return -Infinity;
}

/* ------------------------------ PHYSICS ------------------------------ */
const col = (x: number, y: number, z: number, r: number): Collider => ({ x, y, z, r });

const aetheriaTowers: Collider[] = Array.from({ length: 6 }, (_, i) => {
  const a = Math.PI / 2 + Math.PI / 6 + (i * Math.PI * 2) / 6;
  return col(Math.cos(a) * 30, 18, Math.sin(a) * 30, 7);
});

const PHYS: Record<SceneId, Physics> = {
  hub: {
    walk: true,
    eye: 3.4,
    bounds: 42,
    minY: 0,
    maxY: 60,
    groundAt: () => 0,
    colliders: [col(0, 2, 0, 3.5)],
  },
  aetheria: {
    walk: false,
    eye: 0,
    bounds: 270,
    minY: -40,
    maxY: 170,
    groundAt: (x, z) => islandTop(AETHERIA_ISLANDS, x, z),
    colliders: [col(0, 22, 0, 26), col(0, 55, 0, 12), ...aetheriaTowers, col(-110, -4, 40, 4), col(95, 14, 70, 5)],
  },
  evergreen: {
    walk: true,
    eye: 2.4,
    bounds: 215,
    minY: -20,
    maxY: 140,
    groundAt: evergreenHeight,
    colliders: [col(0, 4, 0, 10), col(0, 22, 0, 8), col(0, 45, 0, 6), col(-105, 14, -95, 24)],
  },
  dragonfall: {
    walk: false,
    eye: 0,
    bounds: 285,
    minY: -2,
    maxY: 260,
    groundAt: (x, z) => Math.max(dragonHeight(x, z), LAVA_LEVEL),
    colliders: [col(-70, 28, 30, 10), col(110, 44, -40, 14)],
  },
  eldoria: {
    walk: true,
    eye: 2.4,
    bounds: 215,
    minY: -40,
    maxY: 140,
    groundAt: (x, z) => Math.max(eldoriaHeight(x, z), eldoriaBridge(x, z)),
    colliders: [col(22, 18, -35, 9), col(-22, 18, -35, 9), col(0, 20, -115, 22)],
  },
  umbracia: {
    walk: false,
    eye: 0,
    bounds: 285,
    minY: -48,
    maxY: 230,
    groundAt: (x, z) => islandTop(UMBRACIA_ISLANDS, x, z),
    colliders: [col(0, 42, 0, 20)],
  },
};

export function getPhysics(id: SceneId) {
  return PHYS[id];
}
