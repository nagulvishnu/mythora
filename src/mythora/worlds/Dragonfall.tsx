"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { LAVA_LEVEL, dragonHeight, riverX } from "../data/terrain";
import { fbm } from "../lib/noise";
import { camState } from "../lib/env";
import { getState, useStore } from "../store/useStore";
import { Terrain, type ColorFn } from "../props/Terrain";
import { Rocks, TreeField } from "../props/Vegetation";
import { Castle, ASH_CASTLE } from "../props/Castle";
import { CaveMouth, DragonNest, StepTemple } from "../props/Ruins";
import { LavaPlane } from "../effects/Magic";
import { MagicParticles } from "../effects/Particles";
import { Dragon, DRAGON_ASH, DRAGON_BRONZE, DRAGON_RED, loopPath } from "../creatures/Dragon";
import { Guardian } from "../creatures/Creatures";
import { GlbFlock } from "../creatures/Flock";

const rock = new THREE.Color("#3a3431");
const rock2 = new THREE.Color("#5a4a42");
const ash = new THREE.Color("#262322");
const snow = new THREE.Color("#e9eef6");
const scorch = new THREE.Color("#6a2a16");
const colorFn: ColorFn = (h, ny, x, z, out) => {
  const n = fbm(x * 0.04, z * 0.04, 3);
  out.copy(rock).lerp(rock2, n);
  if (h < 8) out.lerp(ash, 0.6);
  const d = Math.abs(x - riverX(z));
  if (d < 22) out.lerp(scorch, (1 - d / 22) * 0.9);
  if (h > 64 + n * 24 && ny > 0.55) out.lerp(snow, Math.min(1, (h - 64) / 18));
  if (ny < 0.6) out.lerp(ash, 0.5);
};
const treeAccept = (x: number, z: number, y: number) => y > 3 && y < 40 && Math.abs(x - riverX(z)) > 30;
const rockAccept = (x: number, z: number, y: number) => y > -3 && Math.hypot(x, z) < 270;

/** Scripted dragon encounter: a giant dragon sweeps past the visitor's camera */
function Encounter() {
  const nonce = useStore((s) => s.encounterNonce);
  const [curve, setCurve] = useState<THREE.CatmullRomCurve3 | null>(null);
  const [run, setRun] = useState(0);
  const last = useRef(0);
  const first = useRef(true);
  const launch = (auto: boolean) => {
    const p = camState.position;
    const f = camState.forward.clone();
    f.y = 0;
    if (f.lengthSq() < 0.01) f.set(0, 0, -1);
    f.normalize();
    const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
    const lift = Math.max(0, 40 - (p.y - Math.max(0, dragonHeight(p.x, p.z)))) * 0.2;
    const pt = (fw: number, rt: number, up: number) => new THREE.Vector3(p.x + f.x * fw + r.x * rt, p.y + up + lift, p.z + f.z * fw + r.z * rt);
    setCurve(new THREE.CatmullRomCurve3([pt(300, -90, 36), pt(150, -42, 22), pt(40, -15, 8), pt(-70, 20, 20), pt(-200, 55, 48), pt(-340, 90, 80)], false, "centripetal"));
    setRun((n) => n + 1);
    last.current = performance.now();
    void auto;
  };
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    launch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  useEffect(() => {
    const t0 = setTimeout(() => launch(true), 9000);
    const iv = setInterval(() => {
      if (performance.now() - last.current > 60000 && getState().camMode === "cinematic") launch(true);
    }, 5000);
    return () => {
      clearTimeout(t0);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!curve) return null;
  return <Dragon key={run} path={curve} speed={62} scale={3.4} colors={DRAGON_RED} loop={false} breath roar flapRate={0.5} phase={run * 0.7} />;
}

function Lights() {
  const zs = useMemo(() => [-240, -160, -80, 0, 80, 160, 240], []);
  return (
    <>
      {zs.map((z) => (
        <pointLight key={z} color="#ff6a1a" intensity={140} distance={90} decay={2} position={[riverX(z), 2, z]} />
      ))}
    </>
  );
}

export default function Dragonfall() {
  const loopA = useMemo(() => loopPath([0, 0, 0], 150, 190, 108, 0.12, 1), []);
  const loopB = useMemo(() => loopPath([-20, 0, -40], 210, 130, 88, 0.12, 2), []);
  const loopC = useMemo(() => loopPath([-70, 0, 30], 70, 60, 50, 0.2, 3, 7), []);
  const loopD = useMemo(() => loopPath([110, 0, -40], 60, 70, 62, 0.2, 4, 7), []);
  const loopE = useMemo(() => loopPath([-120, 0, -90], 55, 55, 70, 0.2, 5, 7), []);
  const loopF = useMemo(() => loopPath([30, 0, 120], 90, 60, 44, 0.2, 6, 7), []);
  const guardY = dragonHeight(20, -150);
  const caveY = dragonHeight(150, 100);
  return (
    <>
      <Terrain size={600} seg={256} height={dragonHeight} color={colorFn} rep={40} bump={2.2} />
      <LavaPlane position={[0, LAVA_LEVEL, 0]} size={[700, 700]} />
      <LavaPlane position={[-180, 101, -250]} size={[44, 44]} />
      <Lights />
      <pointLight color="#ff5a14" intensity={400} distance={160} decay={2} position={[-180, 112, -250]} />

      <StepTemple position={[-70, 22, 30]} rotationY={0.3} color="#2c2523" glow="#ff7a3a" fire dark kind="rock" />
      <Castle position={[110, 34, -40]} rotationY={0.8} scale={0.8} ruined={0.75} palette={ASH_CASTLE} kind="brick" seed={5} />
      <DragonNest position={[-120, 45, -90]} />
      <CaveMouth position={[150, caveY, 100]} rotationY={Math.atan2(-150, -100)} />
      <Guardian position={[20, guardY, -150]} rotationY={Math.atan2(-20, 150)} scale={3.2} kind="basalt" seed={3} />

      <Rocks count={180} radius={280} heightAt={dragonHeight} accept={rockAccept} seed={2} colors={["#2f2a28", "#4a3d36"]} minS={1} maxS={7} tint="#a09088" />
      <TreeField count={70} radius={260} heightAt={dragonHeight} accept={treeAccept} seed={4} style="bare" minS={0.8} maxS={1.5} trunk="#1c1614" />

      {/* burning sky, embers, ash and volcano plume */}
      <MagicParticles count={520} area={[420, 70, 420]} position={[0, -5, 0]} color="#ff8a30" color2="#ffd08a" size={0.5} speed={0.7} amp={3} rise={4} alpha={0.95} seed={1} />
      <MagicParticles count={140} area={[160, 120, 160]} position={[-180, 100, -250]} color="#ff7a30" size={1.4} speed={0.4} amp={6} rise={9} alpha={0.9} seed={2} />
      <MagicParticles count={70} area={[180, 80, 180]} position={[-180, 150, -250]} color="#2a2220" size={46} speed={0.1} amp={14} rise={1.2} alpha={0.35} soft seed={3} />
      <MagicParticles count={90} area={[40, 14, 500]} position={[0, -4, 0]} color="#ff8a30" size={5} speed={0.2} amp={5} rise={0.8} alpha={0.12} soft seed={4} />

      {/* the living sky: elders, wyverns and ash-wings */}
      <Dragon path={loopA} speed={26} scale={3.2} colors={DRAGON_RED} breath roar phase={0.3} />
      <Dragon path={loopB} speed={22} scale={2.6} colors={DRAGON_BRONZE} breath roar phase={2.4} />
      <Dragon path={loopC} speed={17} scale={0.85} colors={DRAGON_ASH} phase={1} />
      <Dragon path={loopD} speed={18} scale={0.75} colors={DRAGON_ASH} phase={2} />
      <Dragon path={loopE} speed={16} scale={0.95} colors={DRAGON_RED} phase={3} />
      <Dragon path={loopF} speed={19} scale={0.7} colors={DRAGON_BRONZE} phase={4} />
      <GlbFlock model="stork" count={7} center={[0, 0, 0]} rx={120} rz={100} y={60} bob={8} speed={13} size={3.4} seed={5} tint="#3a2a26" emissive="#ff4a1a" />
      <Encounter />
    </>
  );
}
