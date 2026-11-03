"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "../lib/noise";
import { getSurface } from "../lib/textures";
import { useInstances } from "../lib/useInstances";
import { useQ } from "../lib/useQ";
import { windify } from "../lib/wind";
import { useGlowMaterial } from "../effects/Magic";

export interface Spot {
  x: number;
  y: number;
  z: number;
  r1: number;
  r2: number;
}
export type Accept = (x: number, z: number, y: number) => boolean;

export function scatter(n: number, radius: number, seed: number, heightAt: (x: number, z: number) => number, accept?: Accept, center: [number, number] = [0, 0]): Spot[] {
  const rnd = mulberry32(seed);
  const out: Spot[] = [];
  let tries = 0;
  while (out.length < n && tries < n * 14) {
    tries++;
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * radius;
    const x = center[0] + Math.cos(a) * d;
    const z = center[1] + Math.sin(a) * d;
    const y = heightAt(x, z);
    if (!isFinite(y)) continue;
    if (accept && !accept(x, z, y)) continue;
    out.push({ x, y, z, r1: rnd(), r2: rnd() });
  }
  return out;
}

const trunkGeo = (() => {
  const g = new THREE.CylinderGeometry(0.32, 0.62, 1, 7);
  g.translate(0, 0.5, 0);
  return g;
})();
const blobGeo = new THREE.IcosahedronGeometry(1, 1);
const coneGeo = (() => {
  const g = new THREE.ConeGeometry(1, 1, 7);
  g.translate(0, 0.5, 0);
  return g;
})();

export interface TreeFieldProps {
  count: number;
  radius: number;
  heightAt: (x: number, z: number) => number;
  accept?: Accept;
  seed?: number;
  minS?: number;
  maxS?: number;
  trunk?: string;
  leaves?: [string, string];
  style?: "broad" | "conifer" | "bare";
  center?: [number, number];
}

export function TreeField({ count, radius, heightAt, accept, seed = 1, minS = 0.8, maxS = 1.6, trunk = "#5b4636", leaves = ["#2f7a45", "#4aa05a"], style = "broad", center }: TreeFieldProps) {
  const q = useQ();
  const n = Math.floor(count * q.density);
  const spots = useMemo(() => scatter(n, radius, seed, heightAt, accept, center), [n, radius, seed, heightAt, accept, center]);
  const bark = useMemo(() => getSurface("bark", 1), []);
  const trunkMat = useMemo(() => windify(new THREE.MeshStandardMaterial({ color: trunk, map: bark.map, bumpMap: bark.bump, bumpScale: 1, roughness: 0.95 }), 0.2, 8), [trunk, bark]);
  const leafMat = useMemo(() => windify(new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), 0.9, 12), []);
  useEffect(() => () => { trunkMat.dispose(); leafMat.dispose(); }, [trunkMat, leafMat]);
  const m = spots.length;
  const c1 = useMemo(() => new THREE.Color(leaves[0]), [leaves]);
  const c2 = useMemo(() => new THREE.Color(leaves[1]), [leaves]);

  const trunkRef = useInstances(
    m,
    (i, o) => {
      const s = spots[i];
      const sc = minS + s.r1 * (maxS - minS);
      o.position.set(s.x, s.y - 0.4, s.z);
      o.rotation.set((s.r2 - 0.5) * 0.12, s.r1 * 6, 0);
      const h = (style === "conifer" ? 9 : 7) * sc;
      o.scale.set(sc * 1.1, h, sc * 1.1);
    },
    [spots, style, minS, maxS],
  );
  const per = style === "conifer" ? 3 : style === "bare" ? 0 : 3;
  const leafRef = useInstances(
    m * per,
    (i, o, c) => {
      const t = Math.floor(i / per);
      const k = i % per;
      const s = spots[t];
      const sc = minS + s.r1 * (maxS - minS);
      c.copy(c1).lerp(c2, ((s.r2 * 3 + k * 0.31) % 1));
      if (style === "conifer") {
        const base = (3.2 + k * 3.0) * sc;
        o.position.set(s.x, s.y + base, s.z);
        const r = (4.2 - k * 1.2) * sc;
        o.scale.set(r, (5.2 - k * 0.6) * sc, r);
      } else {
        const hh = 7 * sc;
        const ang = s.r2 * 6.28 + k * 2.1;
        const off = k === 0 ? 0 : 1.8 * sc;
        o.position.set(s.x + Math.cos(ang) * off, s.y + hh + (k === 0 ? 1.8 : 0.4 + k * 0.5) * sc, s.z + Math.sin(ang) * off);
        const r = (k === 0 ? 3.6 : 2.7) * sc;
        o.scale.set(r, r * 0.85, r);
        o.rotation.y = ang;
      }
      return true;
    },
    [spots, style, c1, c2, per, minS, maxS],
  );
  if (m === 0) return null;
  return (
    <>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, m]} castShadow receiveShadow />
      {per > 0 && <instancedMesh ref={leafRef} args={[style === "conifer" ? coneGeo : blobGeo, leafMat, m * per]} castShadow receiveShadow />}
    </>
  );
}

const stemGeo = (() => {
  const g = new THREE.CylinderGeometry(0.14, 0.22, 1, 7);
  g.translate(0, 0.5, 0);
  return g;
})();
const capGeo = (() => {
  const g = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, 0.62, 1);
  return g;
})();

export function MushroomField({ count, radius, heightAt, accept, seed = 2, color = "#ff6ad0", sizeMin = 0.6, sizeMax = 2.2, center }: { count: number; radius: number; heightAt: (x: number, z: number) => number; accept?: Accept; seed?: number; color?: string; sizeMin?: number; sizeMax?: number; center?: [number, number] }) {
  const q = useQ();
  const n = Math.floor(count * q.density);
  const spots = useMemo(() => scatter(n, radius, seed, heightAt, accept, center), [n, radius, seed, heightAt, accept, center]);
  const cap = useGlowMaterial(color, 1.0, { flatShading: false, roughness: 0.5 });
  const stem = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8dfd0", roughness: 0.9 }), []);
  useEffect(() => () => stem.dispose(), [stem]);
  const m = spots.length;
  const sref = useInstances(m, (i, o) => {
    const s = spots[i];
    const sc = sizeMin + s.r1 * s.r1 * (sizeMax - sizeMin);
    o.position.set(s.x, s.y - 0.05, s.z);
    o.scale.set(sc, sc * (1.2 + s.r2), sc);
  }, [spots, sizeMin, sizeMax]);
  const cref = useInstances(m, (i, o) => {
    const s = spots[i];
    const sc = sizeMin + s.r1 * s.r1 * (sizeMax - sizeMin);
    o.position.set(s.x, s.y - 0.05 + sc * (1.2 + s.r2), s.z);
    o.scale.set(sc * 1.3, sc * 1.3, sc * 1.3);
  }, [spots, sizeMin, sizeMax]);
  if (m === 0) return null;
  return (
    <>
      <instancedMesh ref={sref} args={[stemGeo, stem, m]} />
      <instancedMesh ref={cref} args={[capGeo, cap, m]} />
    </>
  );
}

const bulbGeo = new THREE.IcosahedronGeometry(0.22, 1);
const thinGeo = (() => {
  const g = new THREE.ConeGeometry(0.05, 1, 4);
  g.translate(0, 0.5, 0);
  return g;
})();

export function GlowPlants({ count, radius, heightAt, accept, seed = 3, color = "#6affc8", center }: { count: number; radius: number; heightAt: (x: number, z: number) => number; accept?: Accept; seed?: number; color?: string; center?: [number, number] }) {
  const q = useQ();
  const n = Math.floor(count * q.density);
  const spots = useMemo(() => scatter(n, radius, seed, heightAt, accept, center), [n, radius, seed, heightAt, accept, center]);
  const bulb = useGlowMaterial(color, 1.6, { flatShading: false });
  const stem = useMemo(() => windify(new THREE.MeshStandardMaterial({ color: "#2a6a4a", roughness: 0.8 }), 0.5, 1.5), []);
  useEffect(() => () => stem.dispose(), [stem]);
  const m = spots.length;
  const sref = useInstances(m, (i, o) => {
    const s = spots[i];
    o.position.set(s.x, s.y - 0.05, s.z);
    o.scale.set(1, 0.9 + s.r1 * 1.4, 1);
    o.rotation.set((s.r2 - 0.5) * 0.3, 0, (s.r1 - 0.5) * 0.3);
  }, [spots]);
  const bref = useInstances(m, (i, o) => {
    const s = spots[i];
    const h = 0.9 + s.r1 * 1.4;
    o.position.set(s.x + (s.r1 - 0.5) * 0.3 * h, s.y - 0.05 + h, s.z - (s.r2 - 0.5) * 0.3 * h);
    o.scale.setScalar(0.8 + s.r2 * 0.9);
  }, [spots]);
  if (m === 0) return null;
  return (
    <>
      <instancedMesh ref={sref} args={[thinGeo, stem, m]} />
      <instancedMesh ref={bref} args={[bulbGeo, bulb, m]} />
    </>
  );
}

const bladeGeo = (() => {
  const g = new THREE.ConeGeometry(0.1, 1, 3);
  g.translate(0, 0.5, 0);
  return g;
})();

export function Grass({ count, radius, heightAt, accept, seed = 4, colors = ["#3f8a3a", "#79b84a"], height = 0.9, center }: { count: number; radius: number; heightAt: (x: number, z: number) => number; accept?: Accept; seed?: number; colors?: [string, string]; height?: number; center?: [number, number] }) {
  const q = useQ();
  const n = Math.floor(count * q.density);
  const spots = useMemo(() => scatter(n, radius, seed, heightAt, accept, center), [n, radius, seed, heightAt, accept, center]);
  const mat = useMemo(() => windify(new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), 0.35, 1.0), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const a = useMemo(() => new THREE.Color(colors[0]), [colors]);
  const b = useMemo(() => new THREE.Color(colors[1]), [colors]);
  const m = spots.length;
  const ref = useInstances(m, (i, o, c) => {
    const s = spots[i];
    o.position.set(s.x, s.y - 0.05, s.z);
    o.rotation.set((s.r2 - 0.5) * 0.4, s.r1 * 6, (s.r1 - 0.5) * 0.4);
    const h = height * (0.6 + s.r2 * 1.2);
    o.scale.set(1, h, 1);
    c.copy(a).lerp(b, s.r1);
    return true;
  }, [spots, a, b, height]);
  if (m === 0) return null;
  return <instancedMesh ref={ref} args={[bladeGeo, mat, m]} receiveShadow />;
}

const rockGeo = new THREE.DodecahedronGeometry(1, 0);
export function Rocks({ count, radius, heightAt, accept, seed = 5, colors = ["#6b6a68", "#8b8780"], minS = 0.6, maxS = 3, center, tint = "#ffffff" }: { count: number; radius: number; heightAt: (x: number, z: number) => number; accept?: Accept; seed?: number; colors?: [string, string]; minS?: number; maxS?: number; center?: [number, number]; tint?: string }) {
  const q = useQ();
  const n = Math.floor(count * q.density);
  const spots = useMemo(() => scatter(n, radius, seed, heightAt, accept, center), [n, radius, seed, heightAt, accept, center]);
  const tex = useMemo(() => getSurface("rock", 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: tint, map: tex.map, bumpMap: tex.bump, bumpScale: 2, roughness: 0.95, flatShading: true }), [tex, tint]);
  useEffect(() => () => mat.dispose(), [mat]);
  const a = useMemo(() => new THREE.Color(colors[0]), [colors]);
  const b = useMemo(() => new THREE.Color(colors[1]), [colors]);
  const m = spots.length;
  const ref = useInstances(m, (i, o, c) => {
    const s = spots[i];
    const sc = minS + s.r1 * s.r1 * (maxS - minS);
    o.position.set(s.x, s.y + sc * 0.2, s.z);
    o.rotation.set(s.r1 * 5, s.r2 * 6, s.r1 * 3);
    o.scale.set(sc * (0.8 + s.r2 * 0.6), sc * (0.6 + s.r1 * 0.5), sc * (0.8 + s.r1 * 0.5));
    c.copy(a).lerp(b, s.r2);
    return true;
  }, [spots, a, b, minS, maxS]);
  if (m === 0) return null;
  return <instancedMesh ref={ref} args={[rockGeo, mat, m]} castShadow receiveShadow />;
}
