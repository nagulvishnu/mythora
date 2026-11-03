"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { EVERGREEN, evergreenHeight } from "../data/terrain";
import { fbm, mulberry32 } from "../lib/noise";
import { getSurface } from "../lib/textures";
import { useInstances } from "../lib/useInstances";
import { Terrain, type ColorFn } from "../props/Terrain";
import { Grass, GlowPlants, MushroomField, Rocks, TreeField } from "../props/Vegetation";
import { Colonnade, Obelisk } from "../props/Ruins";
import { Guardian, Butterflies, ForestSpirits } from "../creatures/Creatures";
import { GlbFlock, SpiritStags } from "../creatures/Flock";
import { MagicCircle, Water, Waterfall, useGlowMaterial } from "../effects/Magic";
import { MagicParticles } from "../effects/Particles";

const c1 = new THREE.Color("#2c6a34");
const c2 = new THREE.Color("#68a548");
const rockC = new THREE.Color("#5c5246");
const mud = new THREE.Color("#3d3a2a");
const moss = new THREE.Color("#3f7f4a");
const colorFn: ColorFn = (h, ny, x, z, out) => {
  const n = fbm(x * 0.05, z * 0.05, 3);
  out.copy(c1).lerp(c2, n * 1.4);
  if (h < -1.8) out.lerp(mud, Math.min(1, (-1.8 - h) / 3));
  if (Math.hypot(x, z) < 40) out.lerp(moss, 0.25);
  if (ny < 0.8) out.lerp(rockC, Math.min(1, (0.8 - ny) * 3.2));
};

const dist = (x: number, z: number, cx: number, cz: number) => Math.hypot(x - cx, z - cz);
const forestAccept = (x: number, z: number, y: number) => dist(x, z, 0, 0) > 52 && y > -1.5 && dist(x, z, EVERGREEN.lake.x, EVERGREEN.lake.z) > 44 && dist(x, z, EVERGREEN.cliff.x, EVERGREEN.cliff.z) > 38 && dist(x, z, -40, 40) > 16 && dist(x, z, 61, -32) > 10;
const giantAccept = (x: number, z: number, y: number) => dist(x, z, 0, 0) > 72 && y > -1 && dist(x, z, EVERGREEN.lake.x, EVERGREEN.lake.z) > 50 && dist(x, z, EVERGREEN.cliff.x, EVERGREEN.cliff.z) > 45;
const groundAccept = (x: number, z: number, y: number) => y > -1.6 && dist(x, z, EVERGREEN.lake.x, EVERGREEN.lake.z) > 38 && dist(x, z, 0, 0) > 14;
const meadowAccept = (x: number, z: number, y: number) => y > -1.6 && dist(x, z, 0, 0) > 11 && dist(x, z, EVERGREEN.lake.x, EVERGREEN.lake.z) > 38;

const LEAF_A: [string, string] = ["#2c7a42", "#5fb05a"];
const LEAF_B: [string, string] = ["#1f6a5a", "#3fb09a"];
const LEAF_GIANT: [string, string] = ["#256a3a", "#4fa856"];
const CONIFER: [string, string] = ["#1f5a3a", "#2f7a4a"];

function Cliff() {
  const tex = useMemo(() => getSurface("rock", 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6f675c", map: tex.map, bumpMap: tex.bump, bumpScale: 3, roughness: 0.95, flatShading: true }), [tex]);
  const mossM = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4a8a42", roughness: 1, flatShading: true }), []);
  useEffect(() => () => { mat.dispose(); mossM.dispose(); }, [mat, mossM]);
  const rocks = useMemo(() => {
    const rnd = mulberry32(31);
    const out: { x: number; y: number; z: number; s: number; r: number }[] = [];
    for (let row = 0; row < 6; row++)
      for (let k = 0; k < 8; k++) {
        const s = 6 + rnd() * 5;
        out.push({ x: -126 + k * 5.4 + (rnd() - 0.5) * 2, y: row * 5.8 + 2 + (rnd() - 0.5), z: -92 - row * 0.8 + (rnd() - 0.5) * 3, s, r: rnd() * 6 });
      }
    // side buttresses
    for (let k = 0; k < 10; k++) out.push({ x: -128 + (k % 2) * 46 + (rnd() - 0.5) * 4, y: 4 + (k >> 1) * 5, z: -86 + rnd() * 3, s: 6 + rnd() * 3, r: rnd() * 6 });
    return out;
  }, []);
  const ref = useInstances(rocks.length, (i, o) => {
    const r = rocks[i];
    o.position.set(r.x, r.y, r.z);
    o.rotation.set(r.r, r.r * 2, r.r * 0.5);
    o.scale.set(r.s, r.s * 0.85, r.s);
  }, [rocks]);
  const mref = useInstances(rocks.length, (i, o) => {
    const r = rocks[i];
    o.position.set(r.x, r.y + r.s * 0.7, r.z + 2);
    o.scale.set(r.s * 0.6, 0.5, r.s * 0.5);
  }, [rocks]);
  return (
    <>
      <instancedMesh ref={ref} args={[new THREE.DodecahedronGeometry(1, 0), mat, rocks.length]} castShadow receiveShadow />
      <instancedMesh ref={mref} args={[new THREE.IcosahedronGeometry(1, 1), mossM, rocks.length]} />
    </>
  );
}

function SacredTree() {
  const bark = useMemo(() => getSurface("bark", 2), []);
  const barkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6a5642", map: bark.map, bumpMap: bark.bump, bumpScale: 3, roughness: 0.95 }), [bark]);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, flatShading: true }), []);
  const lantern = useGlowMaterial("#b8ffd0", 1.8, { flatShading: false });
  useEffect(() => () => { barkMat.dispose(); leafMat.dispose(); }, [barkMat, leafMat]);
  const trunkGeo = useMemo(() => {
    const prof = [[10.5, 0], [8.2, 4], [7, 12], [6, 26], [5.2, 42], [4.4, 56], [3.6, 70], [2.6, 82]].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(prof, 20);
  }, []);
  const tubes = useMemo(() => {
    const rnd = mulberry32(11);
    const out: THREE.TubeGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283 + rnd() * 0.4;
      const pts = [new THREE.Vector3(Math.cos(a) * 5, 1.5, Math.sin(a) * 5), new THREE.Vector3(Math.cos(a) * 14, 0.6, Math.sin(a) * 14), new THREE.Vector3(Math.cos(a + 0.3) * 26, -0.8, Math.sin(a + 0.3) * 26), new THREE.Vector3(Math.cos(a + 0.5) * 38, -2.5, Math.sin(a + 0.5) * 38)];
      out.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 2.6, 8));
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283 + rnd();
      const y0 = 44 + rnd() * 18;
      const pts = [new THREE.Vector3(Math.cos(a) * 3, y0, Math.sin(a) * 3), new THREE.Vector3(Math.cos(a) * 14, y0 + 6, Math.sin(a) * 14), new THREE.Vector3(Math.cos(a + 0.2) * 28, y0 + 14, Math.sin(a + 0.2) * 28), new THREE.Vector3(Math.cos(a + 0.3) * 40, y0 + 18 + rnd() * 6, Math.sin(a + 0.3) * 40)];
      out.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 2.2, 7));
    }
    return out;
  }, []);
  useEffect(() => () => { trunkGeo.dispose(); tubes.forEach((t) => t.dispose()); }, [trunkGeo, tubes]);
  const blobs = useMemo(() => {
    const rnd = mulberry32(13);
    return Array.from({ length: 48 }, () => {
      const a = rnd() * 6.283;
      const d = Math.sqrt(rnd()) * 46;
      return { x: Math.cos(a) * d, y: 64 + rnd() * 34 - d * 0.18, z: Math.sin(a) * d, s: 11 + rnd() * 10, t: rnd() };
    });
  }, []);
  const lantFill = useMemo(() => Array.from({ length: 70 }, (_, i) => { const rnd = mulberry32(i * 3 + 100); const a = rnd() * 6.283; const d = 6 + Math.sqrt(rnd()) * 40; return { x: Math.cos(a) * d, y: 50 + rnd() * 22 - d * 0.1, z: Math.sin(a) * d, s: 0.35 + rnd() * 0.5 }; }), []);
  const bref = useInstances(blobs.length, (i, o, c) => {
    const b = blobs[i];
    o.position.set(b.x, b.y, b.z);
    o.scale.set(b.s, b.s * 0.6, b.s);
    o.rotation.y = i;
    c.set("#2f8a4a").lerp(new THREE.Color("#7fdc8a"), b.t);
    return true;
  }, [blobs]);
  const lref = useInstances(lantFill.length, (i, o) => {
    const l = lantFill[i];
    o.position.set(l.x, l.y, l.z);
    o.scale.setScalar(l.s);
  }, [lantFill]);
  return (
    <group>
      <mesh geometry={trunkGeo} material={barkMat} castShadow receiveShadow />
      {tubes.map((t, i) => (
        <mesh key={i} geometry={t} material={barkMat} castShadow />
      ))}
      <instancedMesh ref={bref} args={[new THREE.IcosahedronGeometry(1, 1), leafMat, blobs.length]} castShadow />
      <instancedMesh ref={lref} args={[new THREE.IcosahedronGeometry(1, 1), lantern, lantFill.length]} />
      <MagicCircle position={[0, 0.15, 0]} radius={22} color="#9dffb8" />
      <MagicParticles count={160} area={[90, 50, 90]} position={[0, 50, 0]} color="#caffd8" color2="#fff3a0" size={0.5} speed={0.3} amp={4} rise={0.8} alpha={0.9} seed={5} />
      <pointLight color="#9dffb8" intensity={160} distance={120} decay={2} position={[0, 58, 0]} />
      <pointLight color="#b8ffd0" intensity={50} distance={50} decay={2} position={[0, 6, 14]} />
    </group>
  );
}

function StoneRing() {
  const stones = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * 6.283, h: 6 + (i % 3) * 1.4 })), []);
  const gy = evergreenHeight(-40, 40);
  return (
    <group position={[-40, gy, 40]}>
      {stones.map((s, i) => (
        <Obelisk key={i} position={[Math.cos(s.a) * 10, 0, Math.sin(s.a) * 10]} rotationY={-s.a} height={s.h} color="#5b6460" glow="#7affd5" rock />
      ))}
      <MagicCircle position={[0, 0.2, 0]} radius={11.5} color="#7affd5" />
      <mesh position={[0, 0.6, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3.4, 1.2, 10]} />
        <meshStandardMaterial color="#6a6f68" roughness={0.9} />
      </mesh>
      <MagicParticles count={60} area={[22, 8, 22]} position={[0, 0.5, 0]} color="#7affd5" size={0.2} speed={0.5} amp={1} rise={0.6} seed={4} />
    </group>
  );
}

function LakeShrine() {
  const gy = evergreenHeight(61, -32);
  return (
    <group position={[61, gy, -32]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[4.6, 5, 0.9, 12]} />
        <meshStandardMaterial color="#7a8078" roughness={0.9} />
      </mesh>
      <Obelisk position={[-3.2, 0.4, 0]} height={5.5} color="#6a736c" glow="#a0e8ff" rock />
      <Obelisk position={[3.2, 0.4, 0]} height={4.2} color="#6a736c" glow="#a0e8ff" rock />
      <MagicCircle position={[0, 0.8, 0]} radius={4.2} color="#a0e8ff" />
    </group>
  );
}

export default function Evergreen() {
  const guardianY = evergreenHeight(36, -36);
  const arch = useMemo(() => 0, []);
  void arch;
  return (
    <>
      <Terrain size={470} seg={200} height={evergreenHeight} color={colorFn} rep={30} />
      <Water position={[EVERGREEN.lake.x, EVERGREEN.lake.level, EVERGREEN.lake.z]} size={[96, 96]} deep="#08323a" shallow="#2c8f86" opacity={0.86} />
      <Water position={[EVERGREEN.pond.x, -2.4, EVERGREEN.pond.z]} size={[34, 34]} deep="#08323a" shallow="#2c8f86" opacity={0.86} />
      <Cliff />
      <Waterfall position={[-100, -3, -83]} width={9} height={33} tint="#d8f4ff" />
      <SacredTree />
      <StoneRing />
      <LakeShrine />
      <Colonnade position={[56, evergreenHeight(56, 62), 62]} rotationY={0.4} count={5} spacing={6} height={8} broken={0.5} color="#a8b0a0" seed={7} />
      <Guardian position={[36, guardianY, -36]} rotationY={-Math.PI / 4} scale={0.85} kind="wood" seed={1} />
      <Guardian position={[-30, evergreenHeight(-30, -38), -38]} rotationY={0.67} scale={0.75} kind="wood" seed={2} />

      <TreeField count={250} radius={225} heightAt={evergreenHeight} accept={forestAccept} seed={1} minS={0.9} maxS={1.7} leaves={LEAF_A} />
      <TreeField count={90} radius={225} heightAt={evergreenHeight} accept={forestAccept} seed={2} minS={1} maxS={1.8} leaves={LEAF_B} trunk="#4a3a34" />
      <TreeField count={70} radius={225} heightAt={evergreenHeight} accept={forestAccept} seed={3} style="conifer" minS={1.1} maxS={2} leaves={CONIFER} />
      <TreeField count={14} radius={200} heightAt={evergreenHeight} accept={giantAccept} seed={4} minS={3} maxS={4.4} leaves={LEAF_GIANT} trunk="#5a4636" />

      <Grass count={3200} radius={120} heightAt={evergreenHeight} accept={meadowAccept} seed={5} colors={["#2f7a3a", "#8cc454"]} />
      <MushroomField count={90} radius={130} heightAt={evergreenHeight} accept={groundAccept} seed={6} color="#ff6ad0" />
      <MushroomField count={70} radius={150} heightAt={evergreenHeight} accept={groundAccept} seed={7} color="#5ad8ff" />
      <MushroomField count={12} radius={170} heightAt={evergreenHeight} accept={forestAccept} seed={8} color="#c88aff" sizeMin={2.6} sizeMax={4.6} />
      <GlowPlants count={240} radius={150} heightAt={evergreenHeight} accept={groundAccept} seed={9} color="#6affc8" />
      <GlowPlants count={140} radius={150} heightAt={evergreenHeight} accept={groundAccept} seed={10} color="#c28aff" />
      <Rocks count={70} radius={200} heightAt={evergreenHeight} accept={forestAccept} seed={11} colors={["#5a5a50", "#6f6f60"]} tint="#8fa88a" />

      <MagicParticles count={420} area={[260, 22, 260]} position={[0, -1, 0]} color="#ffef9a" color2="#9affd0" size={0.32} speed={0.5} amp={3} alpha={0.95} nightOnly={0.55} seed={1} />
      <MagicParticles count={120} area={[90, 10, 90]} position={[EVERGREEN.lake.x, 0, EVERGREEN.lake.z]} color="#a0f0ff" size={0.26} speed={0.4} amp={2.4} nightOnly={0.4} seed={2} />

      <Butterflies count={44} center={[0, 0, 20]} radius={110} heightAt={evergreenHeight} seed={1} />
      <ForestSpirits count={7} center={[0, 0, 0]} radius={90} heightAt={evergreenHeight} seed={2} />
      <SpiritStags count={4} center={[-20, 0, 60]} radius={60} heightAt={evergreenHeight} seed={3} />
      <GlbFlock model="parrot" count={6} center={[0, 0, 0]} rx={95} rz={80} y={34} bob={5} speed={9} size={2.4} seed={4} tint="#8affd0" emissive="#1ad0a0" />
    </>
  );
}
