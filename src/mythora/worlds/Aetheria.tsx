"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { AETHERIA_ISLANDS } from "../data/terrain";
import { Castle, SKY_CASTLE } from "../props/Castle";
import { FloatingIsland, FloatingRocks, StoneBridge } from "../props/Island";
import { TreeField } from "../props/Vegetation";
import { Colonnade, Obelisk, useStone } from "../props/Ruins";
import { Beam, CrystalCluster, EnergyStream, MagicCircle, Waterfall } from "../effects/Magic";
import { MagicParticles } from "../effects/Particles";
import { CloudSea } from "../effects/Magic";
import { Dragon, DRAGON_BRONZE, DRAGON_WHITE, loopPath } from "../creatures/Dragon";
import { GlbFlock } from "../creatures/Flock";
import { useQ } from "../lib/useQ";

const zero = () => 0;
const ring = (x: number, z: number) => {
  const d = Math.hypot(x, z);
  return d > 36 && d < 44;
};
const any = () => true;

function ObservatoryTower() {
  const st = useStone("#e6e0d2", "marble", 2);
  return (
    <group position={[8, 0, 7]}>
      <mesh material={st} position={[0, 8, 0]} castShadow>
        <cylinderGeometry args={[2.8, 3.4, 16, 12]} />
      </mesh>
      <mesh position={[0, 16.4, 0]} castShadow>
        <sphereGeometry args={[3.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d8b24a" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 11, 3.35]}>
        <boxGeometry args={[0.9, 2, 0.2]} />
        <meshStandardMaterial color="#ffe3a0" emissive="#ffd070" emissiveIntensity={1.5} />
      </mesh>
      <pointLight color="#ffe3a0" intensity={14} distance={24} decay={2} position={[0, 11, 4]} />
    </group>
  );
}

function SmallTower({ h = 14 }: { h?: number }) {
  const st = useStone("#e6e0d2", "marble", 2);
  return (
    <group>
      <mesh material={st} position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[1.8, 2.3, h, 10]} />
      </mesh>
      <mesh position={[0, h + 3, 0]} castShadow>
        <coneGeometry args={[2.6, 6, 10]} />
        <meshStandardMaterial color="#3a74b8" metalness={0.25} roughness={0.45} />
      </mesh>
    </group>
  );
}

export default function Aetheria() {
  const q = useQ();
  const I = AETHERIA_ISLANDS;
  const skyDragon = useMemo(() => loopPath([0, 0, 0], 150, 135, 70, 0.12, 3), []);
  const smallA = useMemo(() => loopPath([95, 0, 70], 55, 50, 30, 0.15, 5, 7), []);
  const smallB = useMemo(() => loopPath([-60, 0, -60], 80, 60, 55, 0.15, 8, 7), []);
  const edge = (i: number, deg: number, y = 0, pad = 0.99): [number, number, number] => {
    const a = (deg * Math.PI) / 180;
    const isl = I[i];
    return [isl.x + Math.cos(a) * isl.r * pad, isl.y + y, isl.z + Math.sin(a) * isl.r * pad];
  };
  const wf = [
    { p: edge(0, 20), a: 20, w: 12, h: 85 },
    { p: edge(1, 200), a: 200, w: 7, h: 70 },
    { p: edge(2, 60), a: 60, w: 8, h: 75 },
    { p: edge(4, 300), a: 300, w: 7, h: 75 },
  ];
  return (
    <>
      <CloudSea y={-88} />
      <CloudSea y={-62} radius={520} count={80} />
      <mesh position={[0, -108, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2400, 2400]} />
        <meshBasicMaterial color="#e8f0ff" fog />
      </mesh>

      {/* central floating kingdom */}
      <FloatingIsland x={I[0].x} y={I[0].y} z={I[0].z} r={I[0].r} seed={1} depthMul={1.7}>
        <Castle seed={3} scale={1} palette={SKY_CASTLE} />
        <TreeField count={34} radius={44} heightAt={zero} accept={ring} seed={9} minS={0.7} maxS={1.2} leaves={["#4b9a54", "#8bc86a"]} />
        <CrystalCluster position={[38, 0, 12]} count={11} color="#ffd98a" height={1.5} spread={3.5} seed={5} base={1.4} />
        <MagicCircle position={[0, 0.12, 42]} radius={8} color="#ffe7a8" />
        <Colonnade position={[0, 0, 44]} count={6} spacing={9} height={7} broken={0} color="#efe9da" seed={2} />
      </FloatingIsland>

      {/* satellite islands */}
      <FloatingIsland x={I[1].x} y={I[1].y} z={I[1].z} r={I[1].r} seed={2} trees={10}>
        <Obelisk position={[-6, 0, -3]} height={9} color="#e6e0d2" glow="#8fe0ff" />
        <CrystalCluster position={[6, 0, 4]} count={7} color="#8fe0ff" height={1} spread={2.4} seed={8} />
      </FloatingIsland>
      <FloatingIsland x={I[2].x} y={I[2].y} z={I[2].z} r={I[2].r} seed={3} trees={14}>
        <ObservatoryTower />
        <CrystalCluster position={[-9, 0, -8]} count={6} color="#9fd8ff" height={0.9} spread={2} seed={11} />
      </FloatingIsland>
      <FloatingIsland x={I[3].x} y={I[3].y} z={I[3].z} r={I[3].r} seed={4} trees={6}>
        <Colonnade position={[0, 0, -4]} count={5} spacing={5} height={8} broken={0.4} seed={4} />
        <CrystalCluster position={[3, 0, 5]} count={12} color="#7fb4ff" height={1.6} spread={3} seed={12} base={1.4} />
      </FloatingIsland>
      <FloatingIsland x={I[4].x} y={I[4].y} z={I[4].z} r={I[4].r} seed={5}>
        <Castle seed={7} scale={0.34} towers={4} palette={SKY_CASTLE} />
      </FloatingIsland>
      <FloatingIsland x={I[5].x} y={I[5].y} z={I[5].z} r={I[5].r} seed={6} trees={9}>
        <CrystalCluster position={[0, 0, 0]} count={8} color="#c7a8ff" height={1.2} spread={3} seed={14} />
      </FloatingIsland>
      <FloatingIsland x={I[6].x} y={I[6].y} z={I[6].z} r={I[6].r} seed={7}>
        <CrystalCluster position={[0, 0, 0]} count={14} color="#8fd0ff" height={2.6} spread={3.4} seed={15} base={1.5} />
        <Beam position={[0, 0, 0]} height={50} radius={1.4} color="#8fd0ff" intensity={0.7} />
      </FloatingIsland>
      <FloatingIsland x={I[7].x} y={I[7].y} z={I[7].z} r={I[7].r} seed={8}>
        <SmallTower h={16} />
      </FloatingIsland>

      <StoneBridge from={[33, 0, 24]} to={[80, 8, 59]} />
      <StoneBridge from={[-38, 0, 14]} to={[-95, -12, 35]} />
      <StoneBridge from={[-20, 0, -34]} to={[-62, 14, -105]} />

      {wf.map((w, i) => (
        <Waterfall key={i} position={[w.p[0], w.p[1] - w.h, w.p[2]]} width={w.w} height={w.h} rotationY={Math.PI / 2 - (w.a * Math.PI) / 180} />
      ))}

      <FloatingRocks count={42} inner={60} outer={210} yMin={-30} yMax={70} color="#a9a59f" seed={3} />
      <EnergyStream points={[[0, 70, 0], [40, 90, 30], [80, 60, 60], [95, 30, 70]]} color="#ffe7a8" radius={0.2} />
      <EnergyStream points={[[0, 70, 0], [-40, 80, 10], [-90, 40, 30], [-110, -4, 40]]} color="#8fe0ff" radius={0.2} />

      {/* ambient magic */}
      <MagicParticles count={360} area={[360, 120, 360]} position={[0, -20, 0]} color="#fff1c0" color2="#bfe4ff" size={0.5} speed={0.35} amp={4} rise={0.6} alpha={0.7} seed={3} />

      {/* life */}
      <Dragon path={skyDragon} speed={16} scale={2.4} colors={DRAGON_WHITE} phase={0.2} />
      {q.creatures > 0.6 && <Dragon path={smallA} speed={13} scale={0.7} colors={DRAGON_BRONZE} phase={1.7} />}
      <Dragon path={smallB} speed={14} scale={0.8} colors={DRAGON_WHITE} phase={3.1} />
      <GlbFlock model="stork" count={8} center={[0, 0, 0]} rx={150} rz={120} y={52} bob={6} speed={11} size={5} seed={1} />
      <GlbFlock model="flamingo" count={5} center={[40, 0, 20]} rx={90} rz={80} y={18} bob={4} speed={9} size={4.5} seed={2} tint="#ffd0e0" />
    </>
  );
}

export const _unused = [any, THREE];
