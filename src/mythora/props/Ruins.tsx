"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useFrame } from "@react-three/fiber";
import { mulberry32 } from "../lib/noise";
import { getSurface } from "../lib/textures";
import { useInstances } from "../lib/useInstances";
import { CrystalCluster, EnergyStream, MagicCircle, RuneWall, VoidCore, Beam, useGlowMaterial } from "../effects/Magic";
import { MagicParticles } from "../effects/Particles";
import { ravineZ } from "../data/terrain";
import type { V3 } from "../data/worlds";

export function useStone(color = "#b9b09a", kind: "brick" | "rock" | "marble" = "brick", rep = 2, rough = 0.9) {
  const tex = useMemo(() => getSurface(kind, rep), [kind, rep]);
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, map: tex.map, bumpMap: tex.bump, bumpScale: 1.5, roughness: rough }), [color, tex, rough]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
const ico = new THREE.IcosahedronGeometry(1, 1);

/* ------------------------------------------------ Statue */
export function Statue({ position = [0, 0, 0], rotationY = 0, scale = 1, headless = false, color = "#a9a392", moss = "#4a7a3a" }: { position?: V3; rotationY?: number; scale?: number; headless?: boolean; color?: string; moss?: string }) {
  const st = useStone(color, "marble", 2);
  const mossM = useMemo(() => new THREE.MeshStandardMaterial({ color: moss, roughness: 1, flatShading: true }), [moss]);
  useEffect(() => () => mossM.dispose(), [mossM]);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh material={st} position={[0, 1, 0]} castShadow receiveShadow geometry={box} scale={[13, 2, 13]} />
      <mesh material={st} position={[0, 3, 0]} castShadow receiveShadow geometry={box} scale={[10, 2, 10]} />
      <mesh material={st} position={[0, 9.5, 0]} castShadow>
        <cylinderGeometry args={[3.3, 4.6, 11, 12]} />
      </mesh>
      <mesh material={st} position={[0, 18.8, 0]} castShadow geometry={box} scale={[6.8, 7.6, 3.8]} />
      <mesh material={st} position={[0, 15.2, 0]} castShadow>
        <cylinderGeometry args={[3.1, 3.3, 1.2, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={st} position={[s * 4.2, 22, 0]} castShadow>
            <sphereGeometry args={[2, 12, 10]} />
          </mesh>
          <mesh material={st} position={[s * 4.7, 18, s > 0 ? 1.2 : 0]} rotation={[s > 0 ? -0.35 : 0, 0, s * 0.08]} castShadow geometry={box} scale={[1.9, 7.4, 1.9]} />
        </group>
      ))}
      {/* sword */}
      <mesh material={st} position={[4.9, 12.5, 3.6]} castShadow geometry={box} scale={[0.8, 16, 0.35]} />
      <mesh material={st} position={[4.9, 20.8, 3.6]} castShadow geometry={box} scale={[4.2, 0.7, 0.8]} />
      {/* cape */}
      <mesh material={st} position={[0, 16, -2.5]} castShadow geometry={box} scale={[7.4, 13, 0.7]} />
      <mesh material={st} position={[0, 23.6, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 1.6, 8]} />
      </mesh>
      {headless ? (
        <>
          <mesh material={st} position={[0.2, 24.4, 0]} rotation={[0.2, 0, 0.15]} scale={[1, 0.6, 1]}>
            <dodecahedronGeometry args={[1.3, 0]} />
          </mesh>
          <mesh material={st} position={[9, 2.9, 5]} rotation={[0.4, 0.8, 0.3]} castShadow>
            <sphereGeometry args={[2.2, 14, 12]} />
          </mesh>
          <mesh material={st} position={[9, 3.7, 5]} rotation={[0.4, 0.8, 0.3]}>
            <cylinderGeometry args={[2.3, 2.3, 0.9, 5]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh material={st} position={[0, 25.5, 0]} castShadow>
            <sphereGeometry args={[2.1, 14, 12]} />
          </mesh>
          <mesh material={st} position={[0, 27, 0]}>
            <cylinderGeometry args={[2.3, 2.1, 1.3, 5]} />
          </mesh>
        </>
      )}
      <mesh material={mossM} position={[-3, 22.6, 0.6]} scale={[2.2, 0.8, 1.6]} geometry={ico} />
      <mesh material={mossM} position={[4, 4.1, 3]} scale={[3.6, 0.7, 2.4]} geometry={ico} />
      <mesh material={mossM} position={[-5, 2.1, -4]} scale={[3, 0.8, 3]} geometry={ico} />
    </group>
  );
}

/* ------------------------------------------------ Colonnade */
export function Colonnade({ position = [0, 0, 0], rotationY = 0, count = 8, spacing = 7, height = 10, radius = 1, broken = 0.2, color = "#cfc7b0", seed = 1, lintel = true }: { position?: V3; rotationY?: number; count?: number; spacing?: number; height?: number; radius?: number; broken?: number; color?: string; seed?: number; lintel?: boolean }) {
  const st = useStone(color, "marble", 2);
  const cols = useMemo(() => {
    const rnd = mulberry32(seed * 313);
    return Array.from({ length: count }, (_, i) => ({ x: (i - (count - 1) / 2) * spacing, h: rnd() < broken ? height * (0.3 + rnd() * 0.5) : height, tilt: rnd() < broken ? (rnd() - 0.5) * 0.12 : 0 }));
  }, [count, spacing, height, broken, seed]);
  const sref = useInstances(count, (i, o) => {
    const c = cols[i];
    o.position.set(c.x, c.h / 2, 0);
    o.rotation.z = c.tilt;
    o.scale.set(radius, c.h, radius);
  }, [cols, radius]);
  const cap = useInstances(count, (i, o) => {
    const c = cols[i];
    o.position.set(c.x, c.h + 0.3, 0);
    o.scale.set(radius * 2.6, 0.7, radius * 2.6);
  }, [cols, radius]);
  const base = useInstances(count, (i, o) => {
    o.position.set(cols[i].x, 0.4, 0);
    o.scale.set(radius * 2.4, 0.8, radius * 2.4);
  }, [cols, radius]);
  const beams = cols.slice(0, -1).map((c, i) => (c.h >= height && cols[i + 1].h >= height ? c.x + spacing / 2 : null)).filter((v) => v !== null) as number[];
  const bref = useInstances(beams.length, (i, o) => {
    o.position.set(beams[i], height + 1.4, 0);
    o.scale.set(spacing + 1, 1.4, radius * 2.4);
  }, [beams, height, spacing, radius]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <instancedMesh ref={sref} args={[cyl, st, count]} castShadow receiveShadow />
      <instancedMesh ref={cap} args={[box, st, count]} castShadow />
      <instancedMesh ref={base} args={[box, st, count]} receiveShadow />
      {lintel && beams.length > 0 && <instancedMesh ref={bref} args={[box, st, beams.length]} castShadow />}
    </group>
  );
}

/* ------------------------------------------------ Stepped temple */
export function StepTemple({ position = [0, 0, 0], rotationY = 0, scale = 1, color = "#bdb39c", glow = "#ffd48a", fire = false, dark = false, kind = "marble" as "marble" | "rock" }: { position?: V3; rotationY?: number; scale?: number; color?: string; glow?: string; fire?: boolean; dark?: boolean; kind?: "marble" | "rock" }) {
  const st = useStone(color, kind, 2);
  const g = useGlowMaterial(glow, 1.4, { flatShading: false });
  const ring = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2 })), []);
  const cref = useInstances(12, (i, o) => {
    const a = ring[i].a;
    o.position.set(Math.cos(a) * 11.5, 6 + 6, Math.sin(a) * 11.5);
    o.scale.set(1.1, 12, 1.1);
  }, [ring]);
  const hornRef = useInstances(4, (i, o) => {
    const a = i * 1.571 + 0.785;
    o.position.set(Math.cos(a) * 17, 5.5, Math.sin(a) * 17);
    o.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    o.scale.set(1.6, 9, 1.6);
  }, []);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh material={st} position={[0, 1, 0]} castShadow receiveShadow geometry={box} scale={[42, 2, 42]} />
      <mesh material={st} position={[0, 3, 0]} castShadow receiveShadow geometry={box} scale={[36, 2, 36]} />
      <mesh material={st} position={[0, 5, 0]} castShadow receiveShadow geometry={box} scale={[30, 2, 30]} />
      <instancedMesh ref={cref} args={[cyl, st, 12]} castShadow receiveShadow />
      <mesh material={st} position={[0, 18.8, 0]} castShadow>
        <cylinderGeometry args={[14.5, 14.5, 1.6, 12]} />
      </mesh>
      <mesh material={st} position={[0, 21.6, 0]} castShadow>
        <cylinderGeometry args={[9, 13, 4, 12]} />
      </mesh>
      <mesh material={st} position={[0, 7.5, 0]} castShadow geometry={box} scale={[4, 3, 4]} />
      <mesh material={g} position={[0, 10.2, 0]}>
        <icosahedronGeometry args={[1.2, 1]} />
      </mesh>
      <pointLight color={glow} intensity={dark ? 40 : 25} distance={45} decay={2} position={[0, 11, 0]} />
      {/* glowing step edges */}
      {[1.1, 3.1, 5.1].map((y, i) => (
        <mesh key={i} material={g} position={[0, y + 1, 0]} scale={[42 - i * 6 + 0.2, 0.12, 42 - i * 6 + 0.2]} geometry={box} visible={dark} />
      ))}
      {dark && <instancedMesh ref={hornRef} args={[new THREE.ConeGeometry(1, 1, 6, 1), st, 4]} castShadow />}
      {fire &&
        [0, 1, 2, 3].map((i) => {
          const a = i * 1.571 + 0.785;
          return (
            <group key={i} position={[Math.cos(a) * 17, 6.2, Math.sin(a) * 17]}>
              <mesh material={st} position={[0, 0.8, 0]} geometry={cyl} scale={[0.9, 1.6, 0.9]} />
              <MagicParticles count={34} area={[1.6, 3, 1.6]} position={[0, 1.8, 0]} color="#ff9a30" color2="#ffe08a" size={0.9} speed={1.5} amp={0.3} rise={2.2} seed={i + 3} />
              <pointLight color="#ff8a30" intensity={14} distance={24} decay={2} position={[0, 3, 0]} />
            </group>
          );
        })}
    </group>
  );
}

/* ------------------------------------------------ Obelisk */
export function Obelisk({ position = [0, 0, 0], height = 16, color = "#4a4a58", glow = "#7fd8ff", rotationY = 0, rock = false }: { position?: V3; height?: number; color?: string; glow?: string; rotationY?: number; rock?: boolean }) {
  const st = useStone(color, rock ? "rock" : "marble", 1);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={st} position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.6, height, 4]} />
      </mesh>
      <mesh position={[0, height + 0.8, 0]} castShadow material={st}>
        <coneGeometry args={[0.9, 1.8, 4]} />
      </mesh>
      <RuneWall position={[0, height * 0.5, 1.28]} cols={1} rows={Math.max(2, Math.floor(height / 2.2))} cell={1.4} color={glow} seed={Math.floor(height * 13)} />
      <RuneWall position={[1.28, height * 0.5, 0]} rotation={[0, Math.PI / 2, 0]} cols={1} rows={Math.max(2, Math.floor(height / 2.2))} cell={1.4} color={glow} seed={Math.floor(height * 7)} />
    </group>
  );
}

/* ------------------------------------------------ Ruined houses */
export function RuinedCity({ seed = 1, count = 24, heightAt, accept, colors = ["#a8a08c", "#c9c0aa"], mossy = "#4a7a3a", center = [0, 0] as [number, number], radius = 80 }: { seed?: number; count?: number; heightAt: (x: number, z: number) => number; accept: (x: number, z: number) => boolean; colors?: [string, string]; mossy?: string; center?: [number, number]; radius?: number }) {
  const st = useStone("#ffffff", "brick", 1);
  const mossM = useMemo(() => new THREE.MeshStandardMaterial({ color: mossy, roughness: 1, flatShading: true }), [mossy]);
  useEffect(() => () => mossM.dispose(), [mossM]);
  const walls = useMemo(() => {
    const rnd = mulberry32(seed * 5);
    const out: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number; t: number }[] = [];
    let tries = 0;
    let houses = 0;
    while (houses < count && tries < count * 20) {
      tries++;
      const a = rnd() * 6.283;
      const d = Math.sqrt(rnd()) * radius;
      const cx = center[0] + Math.cos(a) * d;
      const cz = center[1] + Math.sin(a) * d;
      if (!accept(cx, cz)) continue;
      houses++;
      const w = 7 + rnd() * 6;
      const dd = 7 + rnd() * 6;
      const base = heightAt(cx, cz);
      const ry = Math.round(rnd() * 3) * 0.25 * Math.PI * 0 + (rnd() - 0.5) * 0.12;
      const sides = [
        { dx: 0, dz: -dd / 2, sx: w, sz: 0.9 },
        { dx: 0, dz: dd / 2, sx: w, sz: 0.9 },
        { dx: -w / 2, dz: 0, sx: 0.9, sz: dd },
        { dx: w / 2, dz: 0, sx: 0.9, sz: dd },
      ];
      sides.forEach((s, si) => {
        const pieces = 3;
        for (let p = 0; p < pieces; p++) {
          if (rnd() < 0.18) continue;
          const h = (si === 0 ? 4 : 2) + rnd() * 4.5;
          const horizontal = s.sx > s.sz;
          const len = (horizontal ? s.sx : s.sz) / pieces;
          const off = (p - 1) * len;
          const lx = horizontal ? off : 0;
          const lz = horizontal ? 0 : off;
          const cs = Math.cos(ry);
          const sn = Math.sin(ry);
          const px = s.dx + lx;
          const pz = s.dz + lz;
          out.push({ x: cx + px * cs + pz * sn, y: base + h / 2 - 0.3, z: cz - px * sn + pz * cs, sx: horizontal ? len : s.sx, sy: h, sz: horizontal ? s.sz : len, ry, t: rnd() });
        }
      });
    }
    return out;
  }, [seed, count, heightAt, accept, center, radius]);
  const a = useMemo(() => new THREE.Color(colors[0]), [colors]);
  const b = useMemo(() => new THREE.Color(colors[1]), [colors]);
  const n = walls.length;
  const ref = useInstances(n, (i, o, c) => {
    const w = walls[i];
    o.position.set(w.x, w.y, w.z);
    o.rotation.y = w.ry;
    o.scale.set(w.sx, w.sy, w.sz);
    c.copy(a).lerp(b, w.t);
    return true;
  }, [walls, a, b]);
  const mref = useInstances(n, (i, o) => {
    const w = walls[i];
    o.position.set(w.x, w.y + w.sy / 2, w.z);
    o.scale.set(Math.max(0.6, w.sx * 0.6), 0.45, Math.max(0.6, w.sz * 0.6));
  }, [walls]);
  if (n === 0) return null;
  return (
    <>
      <instancedMesh ref={ref} args={[box, st, n]} castShadow receiveShadow />
      <instancedMesh ref={mref} args={[ico, mossM, n]} />
    </>
  );
}

/* ------------------------------------------------ Library */
export function Library({ position = [0, 0, 0], rotationY = 0 }: { position?: V3; rotationY?: number }) {
  const st = useStone("#b3aa94", "brick", 2);
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5a3d28", roughness: 0.8 }), []);
  const bookMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7 }), []);
  const glow = useGlowMaterial("#ffd48a", 1.3, { flatShading: false });
  useEffect(() => () => { wood.dispose(); bookMat.dispose(); }, [wood, bookMat]);
  const shelves = useMemo(() => {
    const list: { x: number; z: number; ry: number }[] = [];
    for (let i = 0; i < 6; i++) list.push({ x: -10.4, z: -6 + i * 2.4, ry: 0 });
    for (let i = 0; i < 4; i++) list.push({ x: -8 + i * 3.4, z: -7.6, ry: Math.PI / 2 });
    for (let i = 0; i < 4; i++) list.push({ x: -8 + i * 3.4, z: 7.6, ry: Math.PI / 2 });
    return list;
  }, []);
  const sref = useInstances(shelves.length, (i, o) => {
    const s = shelves[i];
    o.position.set(s.x, 3, s.z);
    o.rotation.y = s.ry;
    o.scale.set(1, 6, 2.2);
  }, [shelves]);
  const books = useMemo(() => {
    const rnd = mulberry32(77);
    const out: { x: number; y: number; z: number; ry: number; c: number }[] = [];
    shelves.forEach((s) => {
      for (let row = 0; row < 4; row++)
        for (let k = 0; k < 6; k++) {
          const off = (k - 2.5) * 0.34;
          const ca = Math.cos(s.ry);
          const sa = Math.sin(s.ry);
          out.push({ x: s.x + 0.5 * ca + (s.ry ? 0 : 0) + (s.ry === 0 ? 0.35 : 0) * 0, y: 0.9 + row * 1.35, z: s.z + off * ca - 0 * sa, ry: s.ry, c: rnd() });
        }
    });
    return out;
  }, [shelves]);
  const bref = useInstances(books.length, (i, o, c) => {
    const b = books[i];
    const along = s_off(i);
    o.position.set(b.x + (b.ry ? along : 0), b.y, b.z + (b.ry ? 0 : along));
    o.rotation.y = b.ry;
    o.scale.set(0.9, 1.1, 0.26);
    c.setHSL(b.c * 0.12 + 0.02, 0.5, 0.3 + b.c * 0.2);
    return true;
  }, [books]);
  function s_off(i: number) {
    return ((i % 6) - 2.5) * 0.34;
  }
  const floating = useRef<THREE.InstancedMesh>(null);
  const o2 = useMemo(() => new THREE.Object3D(), []);
  useFrame((s) => {
    const m = floating.current;
    if (!m) return;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < 12; i++) {
      const a = t * 0.3 + (i / 12) * 6.283;
      const r = 3.2 + (i % 3) * 0.7;
      o2.position.set(Math.cos(a) * r, 3.5 + Math.sin(t + i) * 0.4 + (i % 4) * 0.5, Math.sin(a) * r);
      o2.rotation.set(0.4 * Math.sin(t + i), -a, Math.sin(t * 2 + i) * 0.6);
      o2.scale.set(0.8, 0.12, 1.1);
      o2.updateMatrix();
      m.setMatrixAt(i, o2.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={st} position={[0, -0.1, 0]} receiveShadow geometry={box} scale={[27, 0.4, 19]} />
      <mesh material={st} position={[-13, 4.5, 0]} castShadow geometry={box} scale={[1, 9, 19]} />
      <mesh material={st} position={[0, 3.8, -9.2]} castShadow geometry={box} scale={[27, 7.6, 1]} />
      <mesh material={st} position={[0, 5, 9.2]} castShadow geometry={box} scale={[27, 10, 1]} />
      <mesh material={st} position={[13, 4.5, -5.8]} castShadow geometry={box} scale={[1, 9, 7.2]} />
      <mesh material={st} position={[13, 4.5, 5.8]} castShadow geometry={box} scale={[1, 9, 7.2]} />
      <mesh material={st} position={[13, 8.3, 0]} castShadow geometry={box} scale={[1, 1.8, 4.6]} />
      {/* collapsed roof */}
      <mesh material={wood} position={[-8, 9.4, -3]} rotation={[0.3, 0, 0.15]} castShadow geometry={box} scale={[10, 0.5, 8]} />
      <mesh material={wood} position={[5, 9, 4]} rotation={[-0.4, 0.2, -0.1]} castShadow geometry={box} scale={[9, 0.5, 8]} />
      <mesh material={wood} position={[-1, 3.3, 2]} rotation={[0.6, 0.4, 0.2]} castShadow geometry={box} scale={[7, 0.4, 2]} />
      <instancedMesh ref={sref} args={[box, wood, shelves.length]} castShadow />
      <instancedMesh ref={bref} args={[box, bookMat, books.length]} />
      <mesh material={wood} position={[0, 1.2, 0]} castShadow geometry={box} scale={[5, 0.3, 2.4]} />
      <mesh material={wood} position={[0, 0.6, 0]} geometry={box} scale={[4.4, 1.2, 1.8]} />
      <mesh material={glow} position={[0, 1.5, 0]} rotation={[0, 0.2, 0]} geometry={box} scale={[1.8, 0.14, 1.3]} />
      <instancedMesh ref={floating} args={[box, glow, 12]} frustumCulled={false} />
      <RuneWall position={[-12.4, 5, 0]} rotation={[0, Math.PI / 2, 0]} cols={7} rows={2} cell={1.6} color="#ffd48a" seed={4} />
      <MagicCircle position={[0, 0.2, 0]} radius={5.5} color="#ffd48a" />
      <pointLight color="#ffcf86" intensity={40} distance={30} decay={2} position={[0, 6, 0]} />
      <MagicParticles count={40} area={[22, 8, 14]} position={[0, 0.5, 0]} color="#ffe2a0" size={0.14} speed={0.4} amp={1} rise={0.3} seed={12} />
    </group>
  );
}

/* ------------------------------------------------ Broken bridge */
export function BrokenBridge() {
  const st = useStone("#bdb49c", "brick", 2);
  const pieces = useMemo(() => {
    const rnd = mulberry32(8);
    const out: { x: number; z: number; len: number; y: number; rz: number }[] = [];
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 5; i++) {
        const ax = 8 + i * 4;
        if (i === 4 && rnd() < 0.7) continue;
        const x = side * (ax + 2);
        out.push({ x, z: ravineZ(x), len: 4.05, y: 0.0 - (i === 4 ? 0.6 : 0), rz: i === 4 ? side * 0.08 : 0 });
      }
    });
    return out;
  }, []);
  const dref = useInstances(pieces.length, (i, o) => {
    const p = pieces[i];
    o.position.set(p.x, p.y, p.z);
    o.rotation.z = p.rz;
    o.scale.set(p.len, 1.2, 9);
  }, [pieces]);
  const rails = useInstances(pieces.length * 2, (i, o) => {
    const p = pieces[i >> 1];
    const s = i & 1 ? 1 : -1;
    o.position.set(p.x, p.y + 1.1, p.z + s * 4.2);
    o.scale.set(p.len, 1.0 + ((i * 7) % 3) * 0.2, 0.5);
  }, [pieces]);
  const piers = [-26, -14, 14, 26];
  const rub = useInstances(14, (i, o) => {
    const rnd = mulberry32(i * 3 + 1);
    const x = (rnd() - 0.5) * 18;
    o.position.set(x, -22 + rnd() * 2, ravineZ(x) + (rnd() - 0.5) * 6);
    o.rotation.set(rnd() * 4, rnd() * 4, rnd());
    const s = 1 + rnd() * 2.5;
    o.scale.set(s, s * 0.7, s);
  }, []);
  return (
    <group>
      <instancedMesh ref={dref} args={[box, st, pieces.length]} castShadow receiveShadow />
      <instancedMesh ref={rails} args={[box, st, pieces.length * 2]} castShadow />
      {piers.map((x) => (
        <mesh key={x} material={st} position={[x, -12, ravineZ(x)]} castShadow>
          <cylinderGeometry args={[1.7, 2.2, 24, 8]} />
        </mesh>
      ))}
      <instancedMesh ref={rub} args={[ico, st, 14]} castShadow />
    </group>
  );
}

/* ------------------------------------------------ Underground vault */
export function Vault() {
  const st = useStone("#8f8672", "brick", 2);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e6b84a", metalness: 0.95, roughness: 0.25, emissive: "#7a5a10", emissiveIntensity: 0.35 }), []);
  useEffect(() => () => gold.dispose(), [gold]);
  const steps = useInstances(20, (i, o) => {
    const x = 71 + i * 1.9;
    const top = (-12 * (x - 70)) / 38;
    o.position.set(x, top - 0.5, 40);
    o.scale.set(1.9, 1, 11);
  }, []);
  const coins = useInstances(140, (i, o) => {
    const rnd = mulberry32(i * 11 + 5);
    const pile = i % 4;
    const cx = [116, 118, 126, 128][pile];
    const cz = [33, 47, 34, 46][pile];
    const a = rnd() * 6.28;
    const d = Math.sqrt(rnd()) * 2.6;
    const h = Math.max(0, 1.6 - d * 0.6);
    o.position.set(cx + Math.cos(a) * d, -12 + h + rnd() * 0.3, cz + Math.sin(a) * d);
    o.rotation.set(rnd() * 1.5, rnd() * 3, 0);
    o.scale.set(0.45, 0.07, 0.45);
  }, []);
  return (
    <group>
      <instancedMesh ref={steps} args={[box, st, 20]} receiveShadow />
      {/* roof slab + walls */}
      <mesh material={st} position={[120, -2.9, 40]} receiveShadow castShadow geometry={box} scale={[28, 6.2, 28]} />
      <mesh material={st} position={[120, -12.4, 40]} receiveShadow geometry={box} scale={[24.4, 0.8, 24.4]} />
      <mesh material={st} position={[120, -9, 28]} castShadow geometry={box} scale={[24, 6, 1.2]} />
      <mesh material={st} position={[120, -9, 52]} castShadow geometry={box} scale={[24, 6, 1.2]} />
      <mesh material={st} position={[132, -9, 40]} castShadow geometry={box} scale={[1.2, 6, 24]} />
      <mesh material={st} position={[108, -9, 32.5]} castShadow geometry={box} scale={[1.2, 6, 9]} />
      <mesh material={st} position={[108, -9, 47.5]} castShadow geometry={box} scale={[1.2, 6, 9]} />
      {/* pillars */}
      {[-1, 1].map((s) => [-1, 1].map((t) => <mesh key={`${s}${t}`} material={st} position={[120 + s * 8, -9, 40 + t * 8]} castShadow geometry={cyl} scale={[1.1, 6, 1.1]} />))}
      {/* chests + pedestal */}
      {[[116, 33], [128, 46], [127, 34]].map(([x, z], i) => (
        <group key={i} position={[x, -12, z]} rotation={[0, i, 0]}>
          <mesh material={st} position={[0, 0.6, 0]} geometry={box} scale={[2.4, 1.2, 1.5]} castShadow />
          <mesh material={gold} position={[0, 1.4, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}>
            <cylinderGeometry args={[0.75, 0.75, 2.4, 10, 1, false, 0, Math.PI]} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={coins} args={[cyl, gold, 140]} castShadow />
      <mesh material={st} position={[122, -11, 40]} castShadow geometry={cyl} scale={[1.8, 2, 1.8]} />
      <CrystalCluster position={[130, -12, 31]} count={6} color="#ffd24a" height={0.9} spread={1.6} seed={21} />
      <CrystalCluster position={[130, -12, 49]} count={6} color="#7fe3d0" height={0.8} spread={1.6} seed={22} />
      <RuneWall position={[131.3, -9, 40]} rotation={[0, -Math.PI / 2, 0]} cols={8} rows={3} cell={1.4} color="#ffd48a" seed={9} />
      <MagicCircle position={[120, -11.5, 40]} radius={8} color="#ffd48a" />
      <pointLight color="#ffd48a" intensity={60} distance={34} decay={2} position={[120, -8, 40]} />
      <pointLight color="#ffd48a" intensity={14} distance={20} decay={2} position={[90, -5, 40]} />
      <MagicParticles count={50} area={[22, 6, 22]} position={[120, -12, 40]} color="#ffe6a0" size={0.14} speed={0.4} amp={0.8} rise={0.3} seed={31} />
    </group>
  );
}

/* ------------------------------------------------ Dragon nest */
export function DragonNest({ position = [0, 0, 0] as V3 }) {
  const bone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8cdb4", roughness: 0.8 }), []);
  const twig = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b1d14", roughness: 1 }), []);
  const egg = useGlowMaterial("#ff7a3a", 0.8, { flatShading: false, roughness: 0.4, color: "#3a1a10" });
  useEffect(() => () => { bone.dispose(); twig.dispose(); }, [bone, twig]);
  const tref = useInstances(70, (i, o) => {
    const rnd = mulberry32(i * 5 + 2);
    const a = rnd() * 6.28;
    const d = 4 + rnd() * 4;
    o.position.set(Math.cos(a) * d, 0.5 + rnd() * 1.4 * (1 - Math.abs(d - 5.5) / 3), Math.sin(a) * d);
    o.rotation.set(rnd() * 3, a + 1.57 + (rnd() - 0.5), rnd() * 1.2);
    o.scale.set(0.35, 5 + rnd() * 4, 0.35);
  }, []);
  const eggs: V3[] = [[0, 1.3, 0], [2.2, 1.0, 0.8], [-1.8, 1.0, 1.5], [0.4, 1.0, -2.3], [-2.3, 1.0, -1.1]];
  return (
    <group position={position}>
      <instancedMesh ref={tref} args={[cyl, twig, 70]} castShadow />
      {eggs.map((p, i) => (
        <mesh key={i} material={egg} position={p} scale={[1.2, 1.7, 1.2]} castShadow>
          <sphereGeometry args={[1, 16, 14]} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} material={bone} position={[Math.cos(i * 1.3) * 6.5, 0.4, Math.sin(i * 1.3) * 6.5]} rotation={[1.4, i, 0.3]} scale={[0.3, 3, 0.3]} geometry={cyl} />
      ))}
      <pointLight color="#ff7a3a" intensity={22} distance={26} decay={2} position={[0, 3, 0]} />
      <MagicParticles count={40} area={[10, 7, 10]} position={[0, 0.5, 0]} color="#ff9a30" size={0.3} speed={0.8} amp={1} rise={1.2} seed={51} />
    </group>
  );
}

/* ------------------------------------------------ Cave mouth */
export function CaveMouth({ position = [0, 0, 0] as V3, rotationY = 0 }: { position?: V3; rotationY?: number }) {
  const st = useStone("#4a423e", "rock", 2);
  const ref = useInstances(26, (i, o) => {
    const rnd = mulberry32(i * 9 + 4);
    const t = i / 25;
    const a = Math.PI * t;
    const r = 9 + (rnd() - 0.5) * 1.2;
    o.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.95, (rnd() - 0.5) * 3);
    const s = 2.4 + rnd() * 1.8;
    o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    o.scale.set(s, s, s * 1.3);
  }, []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <instancedMesh ref={ref} args={[new THREE.DodecahedronGeometry(1, 0), st, 26]} castShadow receiveShadow />
      <mesh position={[0, 4.2, -2]}>
        <circleGeometry args={[8.4, 24, 0, Math.PI]} />
        <meshBasicMaterial color="#090403" />
      </mesh>
      <mesh position={[0, 0.5, -2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[16.8, 8]} />
        <meshBasicMaterial color="#090403" />
      </mesh>
      <CrystalCluster position={[-3, 0, 2]} count={7} color="#ff9a4a" height={1.2} spread={2} seed={61} base={1.6} />
      <CrystalCluster position={[3.5, 0, 1]} count={5} color="#ff6a2a" height={0.9} spread={1.6} seed={62} base={1.6} />
      <pointLight color="#ff7a30" intensity={30} distance={30} decay={2} position={[0, 3, 4]} />
    </group>
  );
}

/* ------------------------------------------------ Shadow tower */
export function ShadowTower({ position = [0, 0, 0] as V3, height = 150, radius = 12, seed = 1 }: { position?: V3; height?: number; radius?: number; seed?: number }) {
  const { body, seams } = useMemo(() => {
    const rnd = mulberry32(seed * 101);
    const segs = 9;
    const bodyParts: THREE.BufferGeometry[] = [];
    const seamParts: THREE.BufferGeometry[] = [];
    let y = 0;
    let r = radius;
    let twist = 0;
    for (let i = 0; i < segs; i++) {
      const h = (height / segs) * (0.8 + rnd() * 0.5);
      const r2 = r * (0.78 + rnd() * 0.12);
      const g = new THREE.CylinderGeometry(r2, r, h, 5 + Math.floor(rnd() * 3), 1);
      g.rotateY(twist);
      g.translate((rnd() - 0.5) * r * 0.2, y + h / 2, (rnd() - 0.5) * r * 0.2);
      const colors: number[] = [];
      const c = new THREE.Color().setHSL(0.74 + rnd() * 0.05, 0.4, 0.07 + i * 0.008);
      for (let k = 0; k < g.attributes.position.count; k++) colors.push(c.r, c.g, c.b);
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      bodyParts.push(g);
      const s = new THREE.TorusGeometry(r2 * 1.02, 0.35, 5, 14);
      s.rotateX(Math.PI / 2);
      s.translate(0, y + h, 0);
      seamParts.push(s);
      for (let k = 0; k < 3; k++) {
        const sp = new THREE.ConeGeometry(r2 * 0.12, r2 * (0.5 + rnd()), 4);
        const a = rnd() * 6.28;
        sp.rotateZ(-Math.PI / 2 + (rnd() - 0.5) * 0.6);
        sp.rotateY(a);
        sp.translate(Math.cos(a) * r2 * 0.95, y + h * rnd(), -Math.sin(a) * r2 * 0.95);
        const cc: number[] = [];
        for (let q = 0; q < sp.attributes.position.count; q++) cc.push(0.05, 0.03, 0.1);
        sp.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
        bodyParts.push(sp);
      }
      y += h * 0.92;
      r = r2;
      twist += (rnd() - 0.5) * 0.9;
    }
    const top = new THREE.ConeGeometry(r * 0.8, r * 4, 5);
    top.translate(0, y + r * 2, 0);
    const cc: number[] = [];
    for (let q = 0; q < top.attributes.position.count; q++) cc.push(0.05, 0.03, 0.1);
    top.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
    bodyParts.push(top);
    const body = mergeGeometries(bodyParts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
    const seams = mergeGeometries(seamParts)!;
    bodyParts.forEach((g) => g.dispose());
    seamParts.forEach((g) => g.dispose());
    return { body, seams };
  }, [height, radius, seed]);
  useEffect(() => () => { body.dispose(); seams.dispose(); }, [body, seams]);
  const glow = useGlowMaterial("#a46bff", 1.8, { flatShading: false });
  return (
    <group position={position}>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial vertexColors roughness={0.5} metalness={0.5} flatShading />
      </mesh>
      <mesh geometry={seams} material={glow} />
    </group>
  );
}

/* ------------------------------------------------ Rift Engine */
export function RiftEngine({ position = [0, 42, 0] as V3 }) {
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1a1330", metalness: 0.8, roughness: 0.35 }), []);
  const glow = useGlowMaterial("#b07cff", 1.6, { flatShading: false });
  const glow2 = useGlowMaterial("#5ad0ff", 1.6, { flatShading: false });
  useEffect(() => () => dark.dispose(), [dark]);
  const r1 = useRef<THREE.Group>(null);
  const r2 = useRef<THREE.Group>(null);
  const r3 = useRef<THREE.Group>(null);
  const frags = useRef<THREE.InstancedMesh>(null);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (r1.current) r1.current.rotation.set(t * 0.3, t * 0.2, 0);
    if (r2.current) r2.current.rotation.set(Math.PI / 2 + Math.sin(t * 0.2) * 0.4, t * 0.35, t * 0.1);
    if (r3.current) r3.current.rotation.set(t * -0.15, 0, Math.PI / 3 + t * 0.12);
    const m = frags.current;
    if (m) {
      for (let i = 0; i < 40; i++) {
        const a = t * (0.15 + (i % 5) * 0.03) + i;
        const rr = 18 + (i % 7) * 2.2;
        o.position.set(Math.cos(a) * rr, Math.sin(a * 1.3 + i) * 7, Math.sin(a) * rr);
        o.rotation.set(t * 0.4 + i, t * 0.3, 0);
        const sc = 0.8 + (i % 4) * 0.5;
        o.scale.set(sc, sc * 1.4, sc);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });
  const rune = (c: number, speed: number) => ({ c, speed });
  void rune;
  return (
    <group position={position}>
      <VoidCore radius={7} />
      <group ref={r1}>
        <mesh material={dark} castShadow>
          <torusGeometry args={[14, 0.9, 10, 64]} />
        </mesh>
        <mesh material={glow}>
          <torusGeometry args={[14, 0.25, 6, 64]} />
        </mesh>
      </group>
      <group ref={r2}>
        <mesh material={dark} castShadow>
          <torusGeometry args={[19, 1.1, 10, 72]} />
        </mesh>
        <mesh material={glow2}>
          <torusGeometry args={[19, 0.28, 6, 72]} />
        </mesh>
      </group>
      <group ref={r3}>
        <mesh material={dark} castShadow>
          <torusGeometry args={[25, 1.3, 10, 80]} />
        </mesh>
        <mesh material={glow}>
          <torusGeometry args={[25, 0.3, 6, 80]} />
        </mesh>
      </group>
      <instancedMesh ref={frags} args={[new THREE.OctahedronGeometry(1, 0), dark, 40]} frustumCulled={false} castShadow />
      <Beam position={[0, 6, 0]} height={160} radius={2.2} color="#b07cff" intensity={1.4} />
      <Beam position={[0, -160, 0]} height={156} radius={2.2} color="#5ad0ff" intensity={0.9} />
      <pointLight color="#b07cff" intensity={160} distance={120} decay={2} />
      <EnergyStream points={[[0, -40, 0], [14, -24, 10], [10, -10, -6], [0, -5, 0]]} color="#5ad0ff" radius={0.3} />
      <EnergyStream points={[[0, -40, 0], [-12, -22, -10], [-8, -8, 8], [0, -5, 0]]} color="#b07cff" radius={0.3} />
      <EnergyStream points={[[0, -40, 0], [4, -22, 14], [-6, -9, 10], [0, -5, 0]]} color="#5ad0ff" radius={0.3} />
    </group>
  );
}
