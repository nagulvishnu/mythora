"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { eldoriaHeight, ravineZ } from "../data/terrain";
import { fbm } from "../lib/noise";
import { Terrain, type ColorFn } from "../props/Terrain";
import { Grass, Rocks, TreeField } from "../props/Vegetation";
import { Castle, OLD_CASTLE } from "../props/Castle";
import { BrokenBridge, Colonnade, Library, Obelisk, RuinedCity, StepTemple, Statue, Vault } from "../props/Ruins";
import { MagicCircle, RuneWall } from "../effects/Magic";
import { MagicParticles } from "../effects/Particles";
import { Butterflies, ForestSpirits } from "../creatures/Creatures";
import { GlbFlock } from "../creatures/Flock";

const g1 = new THREE.Color("#5f7a3c");
const g2 = new THREE.Color("#8a9a52");
const dirt = new THREE.Color("#6a5a40");
const paved = new THREE.Color("#a79f88");
const rockC = new THREE.Color("#6a6258");
const colorFn: ColorFn = (h, ny, x, z, out) => {
  const n = fbm(x * 0.05, z * 0.05, 3);
  out.copy(g1).lerp(g2, n * 1.5);
  if (Math.abs(x) < 7 && z > -100 && z < 92) out.lerp(paved, 0.8);
  if (h < -3) out.lerp(dirt, Math.min(1, (-3 - h) / 8));
  if (ny < 0.75) out.lerp(rockC, Math.min(1, (0.75 - ny) * 3));
};

const cityAccept = (x: number, z: number) => Math.abs(x) > 13 && z < 84 && Math.hypot(x + 75, z - 10) > 24 && Math.hypot(x - 70, z + 30) > 28 && Math.hypot(x, z + 115) > 52 && !(x > 60 && x < 140 && z > 20 && z < 60) && Math.hypot(x, z) < 130;
const treeAccept = (x: number, z: number, y: number) => y > -2 && Math.abs(z - ravineZ(x)) > 22 && !(Math.abs(x) < 14 && z > -100 && z < 90) && Math.hypot(x + 75, z - 10) > 24 && Math.hypot(x - 70, z + 30) > 26 && Math.hypot(x, z + 115) > 55 && !(x > 60 && x < 140 && z > 20 && z < 60) && (Math.hypot(x, z) > 95 || Math.abs(x) > 38);
const grassAccept = (x: number, z: number, y: number) => y > -2 && Math.abs(x) > 8 && Math.abs(z - ravineZ(x)) > 14 && !(x > 60 && x < 140 && z > 20 && z < 60);
const rockAccept = (x: number, z: number, y: number) => y > -2 && Math.abs(z - ravineZ(x)) > 16 && !(x > 60 && x < 140 && z > 20 && z < 60);

const OBELISKS: [number, number][] = [[-10, 40], [10, 40], [-10, 0], [10, 0], [-10, -55], [10, -55]];
const LEAVES: [string, string] = ["#3e7a3a", "#6aa04a"];

export default function Eldoria() {
  const castleY = eldoriaHeight(0, -115);
  const colonY = useMemo(() => 0, []);
  return (
    <>
      <Terrain size={470} seg={200} height={eldoriaHeight} color={colorFn} rep={30} />

      {/* kingdom's heart */}
      <Castle position={[0, castleY, -115]} scale={1.3} ruined={0.7} palette={OLD_CASTLE} kind="brick" seed={9} />
      <Statue position={[22, 0, -35]} rotationY={-Math.PI / 2} scale={1.5} headless />
      <Statue position={[-22, 0, -35]} rotationY={Math.PI / 2} scale={1.45} />
      <Colonnade position={[15, colonY, 10]} rotationY={Math.PI / 2} count={9} spacing={8} height={11} broken={0.35} seed={3} />
      <Colonnade position={[-15, colonY, 10]} rotationY={Math.PI / 2} count={9} spacing={8} height={11} broken={0.35} seed={4} />
      {OBELISKS.map((p, i) => (
        <Obelisk key={i} position={[p[0], 0, p[1]]} height={11} color="#8a8472" glow="#7fe3d0" rotationY={i} />
      ))}
      <RuneWall position={[0, 0.2, -10]} rotation={[-Math.PI / 2, 0, 0]} cols={3} rows={26} cell={3.2} color="#7fe3d0" seed={5} />
      <MagicCircle position={[0, 0.25, -60]} radius={13} color="#ffd48a" />
      <MagicCircle position={[0, 0.25, 45]} radius={9} color="#7fe3d0" />

      <StepTemple position={[70, 0, -30]} rotationY={-0.6} scale={0.7} color="#d8cdb0" glow="#ffe2a0" />
      <Library position={[-75, 0, 10]} rotationY={0} />
      <RuinedCity seed={4} count={36} heightAt={eldoriaHeight} accept={cityAccept} center={[0, -5]} radius={120} />
      <BrokenBridge />
      <Vault />

      <TreeField count={190} radius={215} heightAt={eldoriaHeight} accept={treeAccept} seed={2} minS={0.9} maxS={1.7} leaves={LEAVES} />
      <Grass count={2400} radius={140} heightAt={eldoriaHeight} accept={grassAccept} seed={5} colors={["#58742f", "#9bb25a"]} height={1} />
      <Rocks count={80} radius={210} heightAt={eldoriaHeight} accept={rockAccept} seed={6} colors={["#6a655c", "#8a8574"]} minS={0.8} maxS={4.5} />

      <MagicParticles count={260} area={[240, 24, 240]} position={[0, 0, 0]} color="#ffe0a0" color2="#9ff0e0" size={0.3} speed={0.35} amp={2.5} rise={0.4} alpha={0.85} nightOnly={0.3} seed={6} />
      <MagicParticles count={50} area={[26, 10, 20]} position={[-75, 0.5, 10]} color="#ffd48a" size={0.14} speed={0.3} amp={1} alpha={0.9} seed={8} />
      <ForestSpirits count={5} center={[0, 0, -20]} radius={70} heightAt={eldoriaHeight} color="#ffd48a" seed={9} />
      <Butterflies count={22} center={[0, 0, 0]} radius={90} heightAt={eldoriaHeight} colors={["#ffd48a", "#7fe3d0", "#ffffff"]} seed={3} />
      <GlbFlock model="stork" count={6} center={[0, 0, -30]} rx={120} rz={100} y={52} bob={6} speed={10} size={4} seed={6} />
    </>
  );
}
