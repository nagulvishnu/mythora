"use client";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mulberry32, noise2 } from "../lib/noise";
import { getSurface } from "../lib/textures";
import { useInstances } from "../lib/useInstances";
import { useQ } from "../lib/useQ";
import { TreeField } from "./Vegetation";
import type { V3 } from "../data/worlds";

export interface IslandPalette {
  grass: string;
  grass2: string;
  dirt: string;
  rock: string;
  rock2: string;
}
export const SKY_PALETTE: IslandPalette = { grass: "#6fae58", grass2: "#93c46a", dirt: "#7a6149", rock: "#8d8a86", rock2: "#5b5a60" };
export const SHADOW_PALETTE: IslandPalette = { grass: "#2a2144", grass2: "#3b2c63", dirt: "#241c3a", rock: "#2b2640", rock2: "#15112a" };

function islandGeometry(r: number, depth: number, seed: number, pal: IslandPalette, segs: number) {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const uv: number[] = [];
  const c = new THREE.Color();
  const g1 = new THREE.Color(pal.grass);
  const g2 = new THREE.Color(pal.grass2);
  const dirt = new THREE.Color(pal.dirt);
  const rock = new THREE.Color(pal.rock);
  const rock2 = new THREE.Color(pal.rock2);
  const outline = (a: number) => r * (0.9 + 0.14 * noise2(Math.cos(a) * 1.6 + seed, Math.sin(a) * 1.6 + seed * 0.7));
  const push = (x: number, y: number, z: number, color: THREE.Color) => {
    pos.push(x, y, z);
    col.push(color.r, color.g, color.b);
    uv.push(x / r, z / r);
    return pos.length / 3 - 1;
  };
  // top disc: centre + rings
  const topRings = 4;
  const centre = push(0, 0, 0, g2);
  const ringStart: number[] = [];
  for (let j = 1; j <= topRings; j++) {
    ringStart.push(pos.length / 3);
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      const rad = outline(a) * (j / topRings);
      c.copy(g1).lerp(g2, noise2(Math.cos(a) * rad * 0.2 + seed, Math.sin(a) * rad * 0.2));
      if (j === topRings) c.lerp(dirt, 0.25);
      push(Math.cos(a) * rad, 0, Math.sin(a) * rad, c);
    }
  }
  for (let k = 0; k < segs; k++) idx.push(centre, ringStart[0] + ((k + 1) % segs), ringStart[0] + k);
  for (let j = 0; j < topRings - 1; j++)
    for (let k = 0; k < segs; k++) {
      const a = ringStart[j] + k;
      const b = ringStart[j] + ((k + 1) % segs);
      const c2 = ringStart[j + 1] + k;
      const d = ringStart[j + 1] + ((k + 1) % segs);
      idx.push(a, b, c2, b, d, c2);
    }
  // sides
  const rings = 10;
  const sideStart: number[] = [];
  for (let j = 0; j <= rings; j++) {
    sideStart.push(pos.length / 3);
    const t = j / rings;
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      const rad = j === rings ? 0.02 : outline(a) * Math.pow(1 - t, 0.72) * (0.88 + 0.28 * noise2(Math.cos(a) * 3 + t * 4 + seed, Math.sin(a) * 3 - t * 3));
      const y = -depth * Math.pow(t, 0.92) * (0.85 + 0.3 * noise2(a * 2 + seed, t * 3));
      if (j === 0) c.copy(g1).lerp(dirt, 0.4);
      else if (j <= 1) c.copy(dirt);
      else c.copy(dirt).lerp(rock, Math.min(1, t * 2.2)).lerp(rock2, Math.max(0, t - 0.5));
      c.multiplyScalar(0.8 + 0.4 * noise2(a * 5 + seed, t * 8));
      push(Math.cos(a) * rad, y, Math.sin(a) * rad, c);
    }
  }
  for (let j = 0; j < rings; j++)
    for (let k = 0; k < segs; k++) {
      const a = sideStart[j] + k;
      const b = sideStart[j] + ((k + 1) % segs);
      const c2 = sideStart[j + 1] + k;
      const d = sideStart[j + 1] + ((k + 1) % segs);
      idx.push(a, c2, b, b, c2, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const spikeGeo = (() => {
  const g = new THREE.ConeGeometry(0.6, 1, 6);
  g.rotateX(Math.PI);
  g.translate(0, -0.5, 0);
  return g;
})();

export function FloatingIsland({ x, y, z, r, seed = 1, palette = SKY_PALETTE, trees = 0, treeLeaves, children, depthMul = 1.5, glow }: { x: number; y: number; z: number; r: number; seed?: number; palette?: IslandPalette; trees?: number; treeLeaves?: [string, string]; children?: ReactNode; depthMul?: number; glow?: string }) {
  const q = useQ();
  const segs = Math.max(20, Math.floor(44 * q.seg));
  const geo = useMemo(() => islandGeometry(r, r * depthMul, seed, palette, segs), [r, seed, palette, segs, depthMul]);
  useEffect(() => () => geo.dispose(), [geo]);
  const tex = useMemo(() => getSurface("rock", 3), []);
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.rock2, roughness: 0.9, flatShading: true, emissive: glow ?? "#000000", emissiveIntensity: glow ? 0.5 : 0 }), [palette, glow]);
  useEffect(() => () => rockMat.dispose(), [rockMat]);
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.position.y = y + Math.sin(s.clock.elapsedTime * 0.35 + seed * 3) * 0.7;
  });
  const spikes = 9;
  const sref = useInstances(spikes, (i, o) => {
    const rnd = mulberry32(seed * 31 + i);
    const a = rnd() * 6.28;
    const d = rnd() * r * 0.45;
    const dp = r * depthMul;
    o.position.set(Math.cos(a) * d, -dp * (0.55 + rnd() * 0.2), Math.sin(a) * d);
    const s = 0.8 + rnd() * 1.2;
    o.scale.set(s * (r / 18), (6 + rnd() * 8) * (r / 18) * 1.3, s * (r / 18));
  }, [r, seed, depthMul]);
  const treeAccept = useMemo(() => () => true, []);
  const flat = useMemo(() => () => 0, []);
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} bumpMap={tex.bump} bumpScale={2.5} />
      </mesh>
      <instancedMesh ref={sref} args={[spikeGeo, rockMat, spikes]} castShadow />
      {trees > 0 && <TreeField count={trees} radius={r * 0.7} heightAt={flat} accept={treeAccept} seed={seed + 40} minS={0.5} maxS={1} leaves={treeLeaves ?? ["#4b9a54", "#76bb62"]} />}
      {children}
    </group>
  );
}

export function FloatingRocks({ count, inner, outer, yMin, yMax, color = "#8d8a86", emissive, seed = 3, size = [1.5, 6], speed = 0.04 }: { count: number; inner: number; outer: number; yMin: number; yMax: number; color?: string; emissive?: string; seed?: number; size?: [number, number]; speed?: number }) {
  const q = useQ();
  const n = Math.floor(count * q.density);
  const tex = useMemo(() => getSurface("rock", 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, map: tex.map, bumpMap: tex.bump, roughness: 0.9, flatShading: true, emissive: emissive ?? "#000", emissiveIntensity: emissive ? 0.4 : 0 }), [color, emissive, tex]);
  useEffect(() => () => mat.dispose(), [mat]);
  const data = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: n }, () => ({
      a: rnd() * 6.28,
      d: inner + rnd() * (outer - inner),
      y: yMin + rnd() * (yMax - yMin),
      s: size[0] + rnd() * rnd() * (size[1] - size[0]),
      sp: (0.4 + rnd()) * speed * (rnd() > 0.5 ? 1 : -1),
      ph: rnd() * 6,
      rx: rnd() * 3,
      ry: rnd() * 3,
    }));
  }, [n, inner, outer, yMin, yMax, seed, size, speed]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((s) => {
    const m = ref.current;
    if (!m) return;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const d = data[i];
      const a = d.a + t * d.sp;
      o.position.set(Math.cos(a) * d.d, d.y + Math.sin(t * 0.5 + d.ph) * 1.4, Math.sin(a) * d.d);
      o.rotation.set(d.rx + t * 0.05, d.ry + t * 0.07, 0);
      o.scale.set(d.s, d.s * 0.7, d.s * 0.9);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  if (n === 0) return null;
  return <instancedMesh ref={ref} args={[new THREE.DodecahedronGeometry(1, 0), mat, n]} castShadow frustumCulled={false} />;
}

/** Arched stone bridge between two points */
export function StoneBridge({ from, to, width = 5, color = "#cfc8b8", rail = true }: { from: V3; to: V3; width?: number; color?: string; rail?: boolean }) {
  const tex = useMemo(() => getSurface("brick", 3), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, map: tex.map, bumpMap: tex.bump, bumpScale: 1.5, roughness: 0.85 }), [color, tex]);
  useEffect(() => () => mat.dispose(), [mat]);
  const { pieces, len, yaw } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const n = Math.max(6, Math.floor(len / 2));
    const pieces = Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n;
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const h = (tt: number) => a.y + (b.y - a.y) * tt + Math.sin(Math.PI * tt) * len * 0.07;
      const pitch = Math.atan2(h(t1) - h(t0), len / n);
      return { t, y: h(t), pitch };
    });
    return { pieces, len, yaw };
  }, [from, to]);
  const n = pieces.length;
  const seg = len / n;
  const dref = useInstances(n, (i, o) => {
    const p = pieces[i];
    o.position.set(0, p.y, -len / 2 + p.t * len);
    o.rotation.x = -p.pitch;
    o.scale.set(width, 0.9, seg * 1.08);
  }, [pieces, len, width]);
  const rref = useInstances(rail ? n * 2 : 0, (i, o) => {
    const p = pieces[i >> 1];
    const side = i & 1 ? 1 : -1;
    o.position.set(side * (width / 2 - 0.15), p.y + 0.8, -len / 2 + p.t * len);
    o.rotation.x = -p.pitch;
    o.scale.set(0.3, 0.9, seg * 1.08);
  }, [pieces, len, width, rail]);
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[2] + to[2]) / 2;
  return (
    <group position={[cx, 0, cz]} rotation={[0, yaw, 0]}>
      <instancedMesh ref={dref} args={[new THREE.BoxGeometry(1, 1, 1), mat, n]} castShadow receiveShadow />
      {rail && <instancedMesh ref={rref} args={[new THREE.BoxGeometry(1, 1, 1), mat, n * 2]} castShadow />}
    </group>
  );
}
