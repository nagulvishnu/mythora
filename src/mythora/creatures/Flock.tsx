"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mulberry32 } from "../lib/noise";
import { useQ } from "../lib/useQ";
import type { V3 } from "../data/worlds";

const BIRD_COLORS = {
  stork: "#e8dfca",
  flamingo: "#f29ab5",
  parrot: "#4cae78",
};

function Bird({ model, center, rx, rz, y, bob, speed, size, tint, emissive, seed }: {
  model: keyof typeof BIRD_COLORS;
  center: V3;
  rx: number;
  rz: number;
  y: number;
  bob: number;
  speed: number;
  size: number;
  tint?: string;
  emissive?: string;
  seed: number;
}) {
  const holder = useRef<THREE.Group>(null);
  const leftWing = useRef<THREE.Group>(null);
  const rightWing = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    const rnd = mulberry32(seed);
    return {
      angle: rnd() * Math.PI * 2,
      speedScale: 0.75 + rnd() * 0.5,
      radiusScale: 0.8 + rnd() * 0.4,
      phase: rnd() * Math.PI * 2,
      yOffset: (rnd() - 0.5) * 12,
    };
  }, [seed]);
  const color = tint ?? BIRD_COLORS[model];

  useFrame((state) => {
    const group = holder.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    const angularSpeed = (speed / ((rx + rz) / 2)) * data.speedScale;
    const angle = data.angle + t * angularSpeed;
    const x = center[0] + Math.cos(angle) * rx * data.radiusScale;
    const z = center[2] + Math.sin(angle) * rz * (2 - data.radiusScale);
    const nextAngle = angle + angularSpeed * 0.05;
    group.position.set(
      x,
      center[1] + y + data.yOffset + Math.sin(t * 0.4 + data.phase) * bob,
      z,
    );
    group.lookAt(
      center[0] + Math.cos(nextAngle) * rx * data.radiusScale,
      group.position.y,
      center[2] + Math.sin(nextAngle) * rz * (2 - data.radiusScale),
    );
    const flap = Math.sin(t * 8 * data.speedScale + data.phase) * 0.65;
    if (leftWing.current) leftWing.current.rotation.z = flap;
    if (rightWing.current) rightWing.current.rotation.z = -flap;
  });

  return (
    <group ref={holder} scale={size * 0.7}>
      <mesh position={[0, 0, 0]} scale={[0.42, 0.38, 1]}>
        <sphereGeometry args={[0.5, 10, 8]} />
        <meshStandardMaterial color={color} emissive={emissive ?? "#000000"} emissiveIntensity={emissive ? 0.35 : 0} />
      </mesh>
      <mesh position={[0, 0.2, 0.58]} scale={0.28}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.14, 0.88]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.09, 0.46, 6]} />
        <meshStandardMaterial color={model === "flamingo" ? "#e9a43c" : "#c89c55"} />
      </mesh>
      <group ref={leftWing} position={[-0.12, 0.08, 0]}>
        <mesh position={[-0.48, 0, -0.02]} scale={[1, 0.09, 0.36]}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group ref={rightWing} position={[0.12, 0.08, 0]}>
        <mesh position={[0.48, 0, -0.02]} scale={[1, 0.09, 0.36]}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/** Lightweight animated birds built from meshes, with no external model downloads. */
export function GlbFlock({ model, count, center, rx, rz, y, bob = 3, speed = 10, size = 4, tint, emissive, seed = 1 }: {
  model: keyof typeof BIRD_COLORS;
  count: number;
  center: V3;
  rx: number;
  rz: number;
  y: number;
  bob?: number;
  speed?: number;
  size?: number;
  tint?: string;
  emissive?: string;
  seed?: number;
}) {
  const q = useQ();
  const n = Math.max(1, Math.round(count * q.creatures));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Bird
          key={i}
          model={model}
          center={center}
          rx={rx}
          rz={rz}
          y={y}
          bob={bob}
          speed={speed}
          size={size}
          tint={tint}
          emissive={emissive}
          seed={seed * 77 + i}
        />
      ))}
    </>
  );
}

function SpiritStag({ center, radius, heightAt, seed, size }: {
  center: V3;
  radius: number;
  heightAt: (x: number, z: number) => number;
  seed: number;
  size: number;
}) {
  const root = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    const rnd = mulberry32(seed * 19);
    return {
      x: center[0] + (rnd() - 0.5) * radius,
      z: center[2] + (rnd() - 0.5) * radius,
      orbit: 8 + rnd() * 14,
      angle: rnd() * Math.PI * 2,
      speed: (0.04 + rnd() * 0.04) * (rnd() > 0.5 ? 1 : -1),
      phase: rnd() * Math.PI * 2,
    };
  }, [center, radius, seed]);

  useFrame((state) => {
    const group = root.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    const angle = data.angle + t * data.speed;
    const x = data.x + Math.cos(angle) * data.orbit;
    const z = data.z + Math.sin(angle) * data.orbit;
    const nextX = data.x + Math.cos(angle + 0.05) * data.orbit;
    const nextZ = data.z + Math.sin(angle + 0.05) * data.orbit;
    group.position.set(x, heightAt(x, z) + Math.sin(t * 2 + data.phase) * 0.08, z);
    group.lookAt(nextX, heightAt(nextX, nextZ), nextZ);
  });

  return (
    <group ref={root} scale={size / 2.5}>
      <mesh position={[0, 1.15, 0]} scale={[0.42, 0.48, 0.82]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#d7f5e8" emissive="#2ad6b0" emissiveIntensity={0.45} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.72, 0.5]} rotation={[-0.5, 0, 0]} scale={[0.2, 0.55, 0.22]} castShadow>
        <cylinderGeometry args={[0.7, 1, 1, 8]} />
        <meshStandardMaterial color="#d7f5e8" emissive="#2ad6b0" emissiveIntensity={0.4} roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.12, 0.83]} scale={[0.25, 0.28, 0.34]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#d7f5e8" emissive="#2ad6b0" emissiveIntensity={0.4} roughness={0.65} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.12, 2.31, 0.85]} rotation={[0, 0, side * -0.28]}>
          <mesh position={[side * 0.16, 0.22, 0]} rotation={[0, 0, side * -0.35]}>
            <cylinderGeometry args={[0.045, 0.065, 0.5, 6]} />
            <meshStandardMaterial color="#bffff0" emissive="#6affd0" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[side * 0.3, 0.39, 0]} rotation={[0, 0, side * -0.55]}>
            <cylinderGeometry args={[0.025, 0.045, 0.34, 6]} />
            <meshStandardMaterial color="#bffff0" emissive="#6affd0" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[-side * 0.03, 0.42, 0]}>
            <cylinderGeometry args={[0.025, 0.045, 0.3, 6]} />
            <meshStandardMaterial color="#bffff0" emissive="#6affd0" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => [-1, 1].map((front) => (
        <mesh key={`${side}-${front}`} position={[side * 0.23, 0.48, front * 0.48]} castShadow>
          <cylinderGeometry args={[0.075, 0.11, 0.9, 7]} />
          <meshStandardMaterial color="#9fcdbb" emissive="#176b53" emissiveIntensity={0.22} roughness={0.8} />
        </mesh>
      )))}
    </group>
  );
}

/** Wandering spirit stags assembled from local geometry instead of a remote GLB. */
export function SpiritStags({ count, center, radius, heightAt, size = 4.2, seed = 3 }: {
  count: number;
  center: V3;
  radius: number;
  heightAt: (x: number, z: number) => number;
  size?: number;
  seed?: number;
}) {
  const q = useQ();
  const n = Math.max(1, Math.round(count * q.creatures));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <SpiritStag
          key={i}
          center={center}
          radius={radius}
          heightAt={heightAt}
          size={size}
          seed={seed + i}
        />
      ))}
    </>
  );
}
