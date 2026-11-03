"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mulberry32 } from "../lib/noise";
import { useQ } from "../lib/useQ";
import { env, camState } from "../lib/env";
import { getSurface } from "../lib/textures";
import { makeWraithMaterial, useTimeMaterial } from "../effects/materials";
import { useGlowMaterial, VoidCore } from "../effects/Magic";
import type { V3 } from "../data/worlds";

/* ------------------------------------------------ Butterflies */
const wingGeo = (() => {
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    0, 0, 0.1, -0.7, 0, 0.55, -0.55, 0, -0.45,
    0, 0, 0.1, -0.55, 0, -0.45, 0, 0, -0.2,
    0, 0, 0.1, 0.55, 0, -0.45, 0.7, 0, 0.55,
    0, 0, 0.1, 0, 0, -0.2, 0.55, 0, -0.45,
  ]);
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  return g;
})();

export function Butterflies({ count = 40, center, radius, height = 3, heightAt, colors = ["#7affd5", "#c8ff7a", "#ff9af0", "#8fd0ff"], seed = 1 }: { count?: number; center: V3; radius: number; height?: number; heightAt: (x: number, z: number) => number; colors?: string[]; seed?: number }) {
  const q = useQ();
  const n = Math.max(4, Math.floor(count * q.creatures));
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const data = useMemo(() => {
    const rnd = mulberry32(seed * 13);
    return Array.from({ length: n }, () => ({ cx: center[0] + (rnd() - 0.5) * radius * 2, cz: center[2] + (rnd() - 0.5) * radius * 2, r: 3 + rnd() * 9, sp: 0.15 + rnd() * 0.3, ph: rnd() * 6.28, fl: 9 + rnd() * 6, h: 1 + rnd() * height, c: new THREE.Color(colors[Math.floor(rnd() * colors.length)]).multiplyScalar(1.6) }));
  }, [n, center, radius, height, colors, seed]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    data.forEach((d, i) => m.setColorAt(i, d.c));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);
  useFrame((s) => {
    const m = ref.current;
    if (!m) return;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const d = data[i];
      const a = t * d.sp + d.ph;
      const x = d.cx + Math.cos(a) * d.r + Math.sin(a * 2.3) * 1.5;
      const z = d.cz + Math.sin(a * 1.3) * d.r;
      const y = heightAt(x, z) + d.h + Math.sin(t * 0.8 + d.ph) * 0.8 + Math.sin(t * d.fl + d.ph) * 0.1;
      const dx = -Math.sin(a) * d.r;
      const dz = Math.cos(a * 1.3) * d.r * 1.3;
      o.position.set(x, y, z);
      o.rotation.set(0, Math.atan2(dx, dz), 0);
      const flap = 0.25 + Math.abs(Math.cos(t * d.fl + d.ph)) * 0.85;
      o.scale.set(flap * 0.7, 0.7, 0.7);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[wingGeo, mat, n]} frustumCulled={false} />;
}

/* ------------------------------------------------ Forest spirits */
export function ForestSpirits({ count = 7, center, radius, heightAt, color = "#9affd8", seed = 2 }: { count?: number; center: V3; radius: number; heightAt: (x: number, z: number) => number; color?: string; seed?: number }) {
  const q = useQ();
  const n = Math.max(2, Math.floor(count * q.creatures));
  const refs = useRef<(THREE.Group | null)[]>([]);
  const body = useGlowMaterial(color, 1.8, { flatShading: false, roughness: 0.2 });
  const tail = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), [color]);
  const eye = useMemo(() => new THREE.MeshBasicMaterial({ color: "#04201a" }), []);
  useEffect(() => () => { tail.dispose(); eye.dispose(); }, [tail, eye]);
  const data = useMemo(() => {
    const rnd = mulberry32(seed * 29);
    return Array.from({ length: n }, () => ({ cx: center[0] + (rnd() - 0.5) * radius * 2, cz: center[2] + (rnd() - 0.5) * radius * 2, rx: 4 + rnd() * 8, rz: 3 + rnd() * 6, sp: 0.18 + rnd() * 0.15, ph: rnd() * 6.28, h: 1.6 + rnd() * 2.4 }));
  }, [n, center, radius, seed]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    data.forEach((d, i) => {
      const g = refs.current[i];
      if (!g) return;
      const f = (tt: number, out: THREE.Vector3) => out.set(d.cx + Math.sin(tt * d.sp + d.ph) * d.rx, 0, d.cz + Math.sin(2 * (tt * d.sp + d.ph)) * d.rz);
      const p = f(t, g.position);
      g.position.y = heightAt(p.x, p.z) + d.h + Math.sin(t * 1.6 + d.ph) * 0.35;
      const q2 = f(t + 0.3, new THREE.Vector3());
      g.rotation.y = Math.atan2(q2.x - p.x, q2.z - p.z);
    });
  });
  return (
    <>
      {data.map((_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <mesh material={body} scale={[0.5, 0.58, 0.5]}>
            <sphereGeometry args={[1, 16, 14]} />
          </mesh>
          <mesh material={tail} position={[0, -0.1, -0.9]} rotation={[-Math.PI / 2 - 0.2, 0, 0]} scale={[0.5, 1.8, 0.5]}>
            <coneGeometry args={[1, 1, 10, 1, true]} />
          </mesh>
          <mesh material={eye} position={[0.17, 0.12, 0.43]} scale={[0.08, 0.14, 0.05]}>
            <sphereGeometry args={[1, 8, 8]} />
          </mesh>
          <mesh material={eye} position={[-0.17, 0.12, 0.43]} scale={[0.08, 0.14, 0.05]}>
            <sphereGeometry args={[1, 8, 8]} />
          </mesh>
          {i % 3 === 0 && <pointLight color={color} intensity={4} distance={11} decay={2} />}
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------ Guardians */
type GuardianKind = "wood" | "basalt" | "umbral";
export function Guardian({ position = [0, 0, 0], rotationY = 0, scale = 1, kind = "wood", seed = 1 }: { position?: V3; rotationY?: number; scale?: number; kind?: GuardianKind; seed?: number }) {
  const tex = useMemo(() => getSurface(kind === "wood" ? "bark" : "rock", 1), [kind]);
  const color = kind === "wood" ? "#5e4a32" : kind === "basalt" ? "#2a2624" : "#1b1430";
  const glowCol = kind === "wood" ? "#8affc0" : kind === "basalt" ? "#ff7a2a" : "#b07cff";
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color, map: tex.map, bumpMap: tex.bump, bumpScale: 3, roughness: 0.9, metalness: kind === "umbral" ? 0.6 : 0.05, flatShading: kind !== "wood" }), [color, tex, kind]);
  const moss = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4f8a3c", roughness: 1, flatShading: true }), []);
  const glow = useGlowMaterial(glowCol, 1.6, { flatShading: false });
  useEffect(() => () => { body.dispose(); moss.dispose(); }, [body, moss]);
  const g = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  const floaty = kind === "umbral";
  useFrame((s) => {
    const t = s.clock.elapsedTime + seed * 3;
    if (torso.current) torso.current.scale.y = 1 + Math.sin(t * 0.7) * 0.012;
    if (armL.current) armL.current.rotation.x = Math.sin(t * 0.5) * 0.06 - 0.05;
    if (armR.current) armR.current.rotation.x = Math.sin(t * 0.5 + 1.5) * 0.06 - 0.05;
    if (halo.current) halo.current.rotation.z = t * 0.2;
    if (g.current && floaty) g.current.position.y = position[1] + Math.sin(t * 0.5) * 2.4 * scale;
    if (head.current && g.current) {
      // slowly turn toward the visitor, within a natural range
      const lp = g.current.worldToLocal(camState.position.clone());
      const target = THREE.MathUtils.clamp(Math.atan2(lp.x, lp.z), -0.9, 0.9);
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, target, 1.2, 0.016);
    }
  });
  return (
    <group ref={g} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {!floaty ? (
        <>
          {[-1, 1].map((sd) => (
            <mesh key={sd} material={body} position={[sd * 2.1, 4.5, 0]} castShadow>
              <cylinderGeometry args={[1.5, 2.1, 9, 8]} />
            </mesh>
          ))}
          <mesh material={body} position={[0, 10, 0]} castShadow scale={[5.5, 2.8, 3.8]}>
            <dodecahedronGeometry args={[1, 0]} />
          </mesh>
        </>
      ) : (
        <mesh material={body} position={[0, 6, 0]} castShadow>
          <coneGeometry args={[3.6, 12, 7]} />
        </mesh>
      )}
      <group ref={torso} position={[0, floaty ? 12 : 14, 0]}>
        <mesh material={body} castShadow scale={[4.6, 5.6, 3.2]}>
          <dodecahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh material={glow} position={[0, 0.6, 2.8]} scale={[0.9, 1.3, 0.2]}>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
        {[-1, 1].map((sd) => (
          <mesh key={sd} material={body} position={[sd * 5.6, 3.6, 0]} castShadow scale={[2.6, 2.2, 2.6]}>
            <dodecahedronGeometry args={[1, 0]} />
          </mesh>
        ))}
        <group ref={armL} position={[-5.8, 3, 0]}>
          <mesh material={body} position={[-0.5, -4.5, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.6, 9, 7]} />
          </mesh>
          <mesh material={body} position={[-0.5, -9.6, 0]} castShadow scale={[1.8, 1.6, 1.8]}>
            <dodecahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
        <group ref={armR} position={[5.8, 3, 0]}>
          <mesh material={body} position={[0.5, -4.5, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.6, 9, 7]} />
          </mesh>
          <mesh material={body} position={[0.5, -9.6, 0]} castShadow scale={[1.8, 1.6, 1.8]}>
            <dodecahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
        <group ref={head} position={[0, 6.6, 0.4]}>
          <mesh material={body} castShadow scale={[2.2, 2.4, 2.2]}>
            <dodecahedronGeometry args={[1, 1]} />
          </mesh>
          {[-1, 1].map((sd) => (
            <mesh key={sd} material={glow} position={[sd * 0.85, 0.2, 1.9]} scale={[0.5, 0.22, 0.2]}>
              <sphereGeometry args={[1, 8, 8]} />
            </mesh>
          ))}
          {kind === "wood" &&
            [-1, 1].map((sd) => (
              <group key={sd}>
                <mesh material={body} position={[sd * 1.2, 3, 0]} rotation={[0, 0, -sd * 0.4]} scale={[0.25, 3.4, 0.25]}>
                  <cylinderGeometry args={[0.6, 1, 1, 5]} />
                </mesh>
                <mesh material={body} position={[sd * 2.2, 4.2, 0]} rotation={[0, 0, -sd * 0.9]} scale={[0.18, 1.8, 0.18]}>
                  <cylinderGeometry args={[0.6, 1, 1, 5]} />
                </mesh>
              </group>
            ))}
          {kind === "basalt" &&
            [-1, 1].map((sd) => (
              <mesh key={sd} material={body} position={[sd * 1.7, 1.6, -0.3]} rotation={[-0.6, 0, -sd * 0.8]} scale={[0.5, 2.8, 0.5]}>
                <coneGeometry args={[1, 1, 5]} />
              </mesh>
            ))}
          {kind === "umbral" && (
            <group ref={halo} position={[0, 0.3, -1.4]}>
              <mesh material={glow}>
                <torusGeometry args={[4.6, 0.14, 6, 48]} />
              </mesh>
              <mesh material={glow} rotation={[0, 0, 0.6]}>
                <torusGeometry args={[3.4, 0.1, 6, 40]} />
              </mesh>
            </group>
          )}
        </group>
      </group>
      {kind === "wood" && <mesh material={moss} position={[-4, 17, 0.5]} scale={[2.4, 0.8, 1.8]}><icosahedronGeometry args={[1, 1]} /></mesh>}
      {kind === "wood" && <mesh material={moss} position={[0, 3, 2]} scale={[3.4, 0.6, 2.2]}><icosahedronGeometry args={[1, 1]} /></mesh>}
      {kind === "basalt" && [0, 1, 2].map((i) => <mesh key={i} material={glow} position={[(i - 1) * 1.6, 8 + i * 0.4, 1.9]} scale={[0.12, 1.6, 0.1]}><boxGeometry args={[1, 1, 1]} /></mesh>)}
    </group>
  );
}

/* ------------------------------------------------ Shadow beings */
export function ShadowBeings({ count = 8, radius = 90, y = [0, 60], color = "#9a6bff", seed = 4, islandAnchors }: { count?: number; radius?: number; y?: [number, number]; color?: string; seed?: number; islandAnchors?: V3[] }) {
  const q = useQ();
  const n = Math.max(3, Math.floor(count * q.creatures));
  const mat = useTimeMaterial(() => makeWraithMaterial(color), [color]);
  const eye = useMemo(() => new THREE.MeshBasicMaterial({ color: "#d8c8ff", toneMapped: false }), []);
  useEffect(() => () => eye.dispose(), [eye]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const data = useMemo(() => {
    const rnd = mulberry32(seed * 41);
    return Array.from({ length: n }, (_, i) => {
      const anchor = islandAnchors?.[i % islandAnchors.length];
      return { cx: anchor ? anchor[0] : 0, cz: anchor ? anchor[2] : 0, r: anchor ? 8 + rnd() * 10 : 30 + rnd() * radius, a: rnd() * 6.28, sp: (0.05 + rnd() * 0.06) * (rnd() > 0.5 ? 1 : -1), y: anchor ? anchor[1] + 2 : y[0] + rnd() * (y[1] - y[0]), ph: rnd() * 6.28, s: 0.9 + rnd() * 0.9 };
    });
  }, [n, radius, y, seed, islandAnchors]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    data.forEach((d, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = d.a + t * d.sp;
      g.position.set(d.cx + Math.cos(a) * d.r, d.y + Math.sin(t * 0.7 + d.ph) * 1.5 + 2, d.cz + Math.sin(a) * d.r * 0.8);
      g.rotation.y = Math.atan2(-Math.sin(a) * d.sp, Math.cos(a) * d.sp) + Math.PI / 2 * 0;
      // always turn toward the visitor when close
      const dist = g.position.distanceTo(camState.position);
      if (dist < 40) g.rotation.y = Math.atan2(camState.position.x - g.position.x, camState.position.z - g.position.z);
    });
  });
  return (
    <>
      {data.map((d, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} scale={d.s * 1.3}>
          <mesh material={mat} position={[0, 1.6, 0]}>
            <coneGeometry args={[1.1, 3.8, 12, 6, true]} />
          </mesh>
          <mesh material={eye} position={[0.22, 2.7, 0.55]} scale={[0.1, 0.05, 0.05]}>
            <sphereGeometry args={[1, 6, 6]} />
          </mesh>
          <mesh material={eye} position={[-0.22, 2.7, 0.55]} scale={[0.1, 0.05, 0.05]}>
            <sphereGeometry args={[1, 6, 6]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------ Floating void entities */
export function VoidEntities({ count = 6, radius = 120, y = [20, 90], seed = 6 }: { count?: number; radius?: number; y?: [number, number]; seed?: number }) {
  const q = useQ();
  const n = Math.max(2, Math.floor(count * q.creatures));
  const glow = useGlowMaterial("#5ad0ff", 1.8, { flatShading: false });
  const refs = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const data = useMemo(() => {
    const rnd = mulberry32(seed * 57);
    return Array.from({ length: n }, () => ({ r: 40 + rnd() * radius, a: rnd() * 6.28, sp: (0.02 + rnd() * 0.03) * (rnd() > 0.5 ? 1 : -1), y: y[0] + rnd() * (y[1] - y[0]), ph: rnd() * 6.28, s: 1.2 + rnd() * 1.8 }));
  }, [n, radius, y, seed]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    data.forEach((d, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = d.a + t * d.sp;
      g.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 0.4 + d.ph) * 4, Math.sin(a) * d.r);
      g.lookAt(camState.position);
      const r = rings.current[i];
      if (r) r.rotation.z = t * (0.4 + i * 0.1);
    });
  });
  return (
    <>
      {data.map((d, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} scale={d.s}>
          <VoidCore radius={1.6} />
          <mesh material={glow} position={[0, 0, 1.55]} scale={[1, 0.45, 0.2]}>
            <sphereGeometry args={[0.7, 12, 10]} />
          </mesh>
          <mesh ref={(el) => { rings.current[i] = el; }} material={glow}>
            <torusGeometry args={[2.6, 0.06, 6, 40]} />
          </mesh>
          <pointLight color="#5ad0ff" intensity={20} distance={40} decay={2} />
        </group>
      ))}
    </>
  );
}

export { env };
