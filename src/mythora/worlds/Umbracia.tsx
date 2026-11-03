"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { UMBRACIA_ISLANDS } from "../data/terrain";
import { FloatingIsland, FloatingRocks, SHADOW_PALETTE } from "../props/Island";
import { Obelisk, RiftEngine, ShadowTower } from "../props/Ruins";
import { Beam, CrystalCluster, EnergyField, MagicCircle, Water, useGlowMaterial } from "../effects/Magic";
import { MagicParticles } from "../effects/Particles";
import { Guardian, ShadowBeings, VoidEntities } from "../creatures/Creatures";

const TOWERS: [number, number, number][] = [[170, -110, 9], [-190, -60, 13], [120, 180, 21], [-90, 200, 7], [215, 60, 4], [0, -225, 5], [-205, 145, 17]];

function Beacon() {
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1c1632", metalness: 0.6, roughness: 0.4 }), []);
  const glow = useGlowMaterial("#5ad0ff", 2, { flatShading: false });
  useEffect(() => () => dark.dispose(), [dark]);
  return (
    <group position={[3, 0, 2]}>
      <mesh material={dark} position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.7, 14, 8]} />
      </mesh>
      <mesh material={glow} position={[0, 15, 0]}>
        <sphereGeometry args={[1.5, 16, 12]} />
      </mesh>
      <Beam position={[0, 15, 0]} height={90} radius={1.3} color="#5ad0ff" intensity={1.2} />
      <pointLight color="#5ad0ff" intensity={60} distance={60} decay={2} position={[0, 15, 0]} />
    </group>
  );
}

export default function Umbracia() {
  const I = UMBRACIA_ISLANDS;
  const ringStones = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * 6.283 })), []);
  const P = SHADOW_PALETTE;
  return (
    <>
      <Water position={[0, -60, 0]} size={[1600, 1600]} deep="#04010c" shallow="#2a1260" opacity={0.96} choppy={2} />
      <EnergyField position={[0, 42, 0]} radius={62} color="#b07cff" color2="#5ad0ff" />
      <EnergyField position={[90, 10, -50]} radius={30} color="#5ad0ff" color2="#b07cff" squash={0.8} />
      <EnergyField position={[-100, -5, 60]} radius={26} color="#b07cff" color2="#ff70c0" squash={0.8} />

      {/* the central dimensional structure */}
      <FloatingIsland x={I[0].x} y={I[0].y} z={I[0].z} r={I[0].r} seed={11} palette={P} depthMul={2} glow="#4a2a9a">
        {ringStones.map((s, i) => (
          <Obelisk key={i} position={[Math.cos(s.a) * 31, 0, Math.sin(s.a) * 31]} height={10 + (i % 3) * 3} color="#1c1633" glow={i % 2 ? "#5ad0ff" : "#b07cff"} rotationY={-s.a} />
        ))}
        <MagicCircle position={[0, 0.15, 0]} radius={34} color="#b07cff" />
        <MagicCircle position={[0, 0.2, 0]} radius={20} color="#5ad0ff" spin={-0.6} />
        <CrystalCluster position={[0, 0, 0]} count={9} color="#b07cff" height={1.4} spread={3} seed={31} base={1.6} />
      </FloatingIsland>
      <RiftEngine position={[0, 42, 0]} />

      <FloatingIsland x={I[1].x} y={I[1].y} z={I[1].z} r={I[1].r} seed={12} palette={P} glow="#4a2a9a">
        <Obelisk position={[6, 0, 5]} height={18} color="#1c1633" glow="#7fd8ff" />
        <CrystalCluster position={[-7, 0, -5]} count={7} color="#5ad0ff" height={1} spread={2.2} seed={32} />
      </FloatingIsland>
      <FloatingIsland x={I[2].x} y={I[2].y} z={I[2].z} r={I[2].r} seed={13} palette={P} glow="#4a2a9a">
        <CrystalCluster position={[6, 0, 3]} count={12} color="#b07cff" height={2.1} spread={3.2} seed={33} base={1.7} />
        <CrystalCluster position={[-5, 0, -6]} count={6} color="#ff70c0" height={1} spread={2} seed={34} />
      </FloatingIsland>
      <FloatingIsland x={I[3].x} y={I[3].y} z={I[3].z} r={I[3].r} seed={14} palette={P} glow="#4a2a9a">
        <Beacon />
      </FloatingIsland>
      <FloatingIsland x={I[4].x} y={I[4].y} z={I[4].z} r={I[4].r} seed={15} palette={P} glow="#4a2a9a">
        <CrystalCluster position={[0, 0, 0]} count={10} color="#5ad0ff" height={1.7} spread={3} seed={35} />
      </FloatingIsland>
      <FloatingIsland x={I[5].x} y={I[5].y} z={I[5].z} r={I[5].r} seed={16} palette={P} glow="#4a2a9a">
        <Obelisk position={[0, 0, 0]} height={14} color="#1c1633" glow="#b07cff" />
      </FloatingIsland>
      <FloatingIsland x={I[6].x} y={I[6].y} z={I[6].z} r={I[6].r} seed={17} palette={P} glow="#4a2a9a">
        <CrystalCluster position={[0, 0, 0]} count={8} color="#ff70c0" height={1.5} spread={2.6} seed={36} />
      </FloatingIsland>

      {TOWERS.map(([x, z, s], i) => (
        <ShadowTower key={i} position={[x, -58, z]} height={150 + (i % 4) * 28} radius={11 + (i % 3) * 3} seed={s} />
      ))}

      <FloatingRocks count={56} inner={50} outer={230} yMin={-25} yMax={120} color="#2a2244" emissive="#5a2aff" seed={9} size={[1.2, 5]} speed={0.03} />
      <CrystalCluster position={[-40, 78, 60]} count={6} color="#5ad0ff" height={1.2} spread={2} seed={41} tilt={1.2} />
      <CrystalCluster position={[60, 90, -80]} count={7} color="#b07cff" height={1.4} spread={2} seed={42} tilt={1.2} />
      <CrystalCluster position={[-130, 50, -90]} count={6} color="#ff70c0" height={1.2} spread={2} seed={43} tilt={1.2} />

      <MagicParticles count={420} area={[460, 160, 460]} position={[0, -40, 0]} color="#b07cff" color2="#5ad0ff" size={0.6} speed={0.3} amp={5} rise={0.8} alpha={0.9} seed={6} />
      <MagicParticles count={90} area={[120, 90, 120]} position={[0, 0, 0]} color="#ff70c0" size={0.35} speed={0.8} amp={6} alpha={0.8} seed={9} />

      <ShadowBeings count={12} islandAnchors={I.map((i) => [i.x, i.y, i.z])} seed={4} />
      <VoidEntities count={5} radius={150} y={[25, 95]} seed={6} />
      <Guardian position={[235, 20, -150]} rotationY={Math.atan2(-235, 150)} scale={4.6} kind="umbral" seed={1} />
      <Guardian position={[-245, 25, 120]} rotationY={Math.atan2(245, -120)} scale={4.2} kind="umbral" seed={2} />
    </>
  );
}
