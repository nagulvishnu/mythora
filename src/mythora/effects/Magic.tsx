"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { env } from "../lib/env";
import { mulberry32 } from "../lib/noise";
import { useInstances } from "../lib/useInstances";
import { MagicParticles } from "./Particles";
import {
  makeBeamMaterial,
  makeCircleMaterial,
  makeFieldMaterial,
  makeFlowMaterial,
  makeGlyphMaterial,
  makeLavaMaterial,
  makeVoidMaterial,
  makeWaterMaterial,
  makeWaterfallMaterial,
  useTimeMaterial,
} from "./materials";
import type { V3 } from "../data/worlds";

/** standard material whose emissive follows the world's glow level (stronger at night) */
export function useGlowMaterial(color: string, base = 1, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const m = useMemo(
    () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: base, roughness: 0.25, metalness: 0.1, flatShading: true, ...extra }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, base],
  );
  useFrame(() => {
    m.emissiveIntensity = base * (0.45 + env.glow);
  });
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

const crystalGeo = (() => {
  const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.5, 0.15), new THREE.Vector2(0.55, 1.6), new THREE.Vector2(0.001, 3)];
  return new THREE.LatheGeometry(pts, 6);
})();

export function CrystalCluster({ position = [0, 0, 0], count = 9, color = "#8fd0ff", spread = 3, height = 1, seed = 1, base = 1.2, tilt = 0.5 }: { position?: V3; count?: number; color?: string; spread?: number; height?: number; seed?: number; base?: number; tilt?: number }) {
  const mat = useGlowMaterial(color, base);
  const ref = useInstances(
    count,
    (i, o) => {
      const rnd = mulberry32(seed * 131 + i * 17);
      const a = rnd() * Math.PI * 2;
      const d = rnd() * spread * (i === 0 ? 0 : 1);
      o.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      const h = (i === 0 ? 1.6 : 0.5 + rnd() * 0.9) * height;
      o.scale.set(h * 0.7, h, h * 0.7);
      o.rotation.set((rnd() - 0.5) * tilt * 2 + Math.sin(a) * d * 0.08, rnd() * 6, (rnd() - 0.5) * tilt * 2 - Math.cos(a) * d * 0.08);
    },
    [count, seed, spread, height, tilt],
  );
  return (
    <group position={position}>
      <instancedMesh ref={ref} args={[crystalGeo, mat, count]} castShadow />
      <pointLight color={color} intensity={6 * base} distance={spread * 5 + 12} decay={2} position={[0, height * 2, 0]} />
    </group>
  );
}

export function Beam({ position = [0, 0, 0], height = 40, radius = 1.2, color = "#ffffff", intensity = 1, boost = 0 }: { position?: V3; height?: number; radius?: number; color?: string; intensity?: number; boost?: number }) {
  const mat = useTimeMaterial(() => makeBeamMaterial(color, intensity), [color, intensity]);
  useFrame(() => {
    mat.uniforms.uBoost.value = boost;
  });
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} material={mat} frustumCulled={false}>
      <cylinderGeometry args={[radius * 0.55, radius, height, 20, 1, true]} />
    </mesh>
  );
}

export function MagicCircle({ position = [0, 0.1, 0], radius = 5, color = "#8fd0ff", rotation = [-Math.PI / 2, 0, 0], spin = 0.4 }: { position?: V3; radius?: number; color?: string; rotation?: V3; spin?: number }) {
  const mat = useTimeMaterial(() => makeCircleMaterial(color), [color]);
  mat.uniforms.uSpin.value = spin;
  return (
    <mesh position={position} rotation={rotation} material={mat} renderOrder={2}>
      <planeGeometry args={[radius * 2, radius * 2]} />
    </mesh>
  );
}

export function RuneWall({ position = [0, 0, 0], rotation = [0, 0, 0], cols = 6, rows = 4, cell = 1.2, color = "#ffd48a", seed = 3 }: { position?: V3; rotation?: V3; cols?: number; rows?: number; cell?: number; color?: string; seed?: number }) {
  const mat = useTimeMaterial(() => makeGlyphMaterial(color), [color]);
  const n = cols * rows;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const rnd = mulberry32(seed);
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = rnd() * 100;
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(s, 1));
    return g;
  }, [n, seed]);
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useInstances(
    n,
    (i, o) => {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      o.position.set((cx - (cols - 1) / 2) * cell, (cy - (rows - 1) / 2) * cell, 0);
      o.scale.setScalar(cell * 0.78);
    },
    [n, cols, rows, cell],
  );
  return (
    <group position={position} rotation={rotation}>
      <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} renderOrder={3} />
    </group>
  );
}

export function EnergyStream({ points, color = "#8fd0ff", radius = 0.12, rep = 14, speed = 0.6 }: { points: V3[]; color?: string; radius?: number; rep?: number; speed?: number }) {
  const mat = useTimeMaterial(() => makeFlowMaterial(color, rep, speed), [color, rep, speed]);
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 80, radius, 6, false), [points, radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

export function EnergyField({ position = [0, 0, 0], radius = 20, color = "#b07cff", color2 = "#5ad0ff", squash = 1 }: { position?: V3; radius?: number; color?: string; color2?: string; squash?: number }) {
  const mat = useTimeMaterial(() => makeFieldMaterial(color, color2), [color, color2]);
  return (
    <mesh position={position} scale={[1, squash, 1]} material={mat} frustumCulled={false}>
      <sphereGeometry args={[radius, 32, 24]} />
    </mesh>
  );
}

export function VoidCore({ position = [0, 0, 0], radius = 6 }: { position?: V3; radius?: number }) {
  const mat = useTimeMaterial(() => makeVoidMaterial(), []);
  return (
    <mesh position={position} material={mat}>
      <sphereGeometry args={[radius, 40, 28]} />
    </mesh>
  );
}

/* ------------------------------ Water / lava / falls / clouds ------------------------------ */
export function Water({ position = [0, 0, 0], size = [200, 200], deep = "#0b3a4a", shallow = "#2c8f9a", opacity = 0.9, choppy = 1 }: { position?: V3; size?: [number, number]; deep?: string; shallow?: string; opacity?: number; choppy?: number }) {
  const mat = useTimeMaterial(() => makeWaterMaterial(deep, shallow, opacity, choppy), [deep, shallow, opacity, choppy]);
  useFrame(() => {
    const u = mat.uniforms;
    u.uSky.value.copy(env.horizon);
    u.uSkyTop.value.copy(env.top);
    u.uSunDir.value.copy(env.sunDir);
    u.uSunColor.value.copy(env.sunColor);
  });
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={1}>
      <planeGeometry args={[size[0], size[1], 1, 1]} />
    </mesh>
  );
}

export function LavaPlane({ position = [0, -6, 0], size = [700, 700] }: { position?: V3; size?: [number, number] }) {
  const mat = useTimeMaterial(() => makeLavaMaterial(), []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={size} />
    </mesh>
  );
}

export function Waterfall({ position = [0, 0, 0], width = 8, height = 30, rotationY = 0, tint = "#cfeeff", mist = true }: { position?: V3; width?: number; height?: number; rotationY?: number; tint?: string; mist?: boolean }) {
  const mat = useTimeMaterial(() => makeWaterfallMaterial(tint), [tint]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, 0]} material={mat} renderOrder={4}>
        <planeGeometry args={[width, height, 1, 1]} />
      </mesh>
      {mist && <MagicParticles count={60} area={[width * 1.6, 9, width * 1.6]} position={[0, -1, 1]} size={7} speed={0.5} amp={1.5} rise={1.6} alpha={0.28} soft color="#e8f6ff" seed={7} />}
    </group>
  );
}

export function CloudSea({ y = -85, radius = 700, count = 170, color = "#ffffff" }: { y?: number; radius?: number; count?: number; color?: string }) {
  return <MagicParticles count={count} area={[radius, 14, radius]} position={[0, y, 0]} size={95} speed={0.05} amp={14} alpha={0.55} soft color={color} seed={11} lit />;
}
