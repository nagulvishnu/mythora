"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mulberry32 } from "../lib/noise";
import { getSurface } from "../lib/textures";
import { useInstances } from "../lib/useInstances";
import { useGlowMaterial } from "../effects/Magic";
import type { V3 } from "../data/worlds";

export interface CastlePalette {
  stone: string;
  roof: string;
  accent: string;
  glow: string;
  moss?: string;
}
export const SKY_CASTLE: CastlePalette = { stone: "#e6e0d2", roof: "#3a74b8", accent: "#e8c566", glow: "#ffe3a0" };
export const ASH_CASTLE: CastlePalette = { stone: "#4a4543", roof: "#2a2220", accent: "#ff7a3a", glow: "#ff8a40", moss: "#3a3a30" };
export const OLD_CASTLE: CastlePalette = { stone: "#b9b09a", roof: "#5a6a58", accent: "#d8b868", glow: "#ffd48a", moss: "#4a7a3a" };

interface TowerData {
  x: number;
  z: number;
  h: number;
  r: number;
  roof: boolean;
  a: number;
}

export function Castle({ seed = 1, ruined = 0, scale = 1, palette = SKY_CASTLE, towers = 6, kind = "marble", position = [0, 0, 0], rotationY = 0 }: { seed?: number; ruined?: number; scale?: number; palette?: CastlePalette; towers?: number; kind?: "marble" | "brick"; position?: V3; rotationY?: number }) {
  const tex = useMemo(() => getSurface(kind, 2), [kind]);
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.stone, map: tex.map, bumpMap: tex.bump, bumpScale: 1.6, roughness: 0.85, metalness: 0.02 }), [palette.stone, tex]);
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.roof, roughness: 0.45, metalness: 0.25 }), [palette.roof]);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.3, metalness: 0.85 }), [palette.accent]);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#16130f", roughness: 0.9 }), []);
  const mossMat = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.moss ?? "#4a7a3a", roughness: 1, flatShading: true }), [palette.moss]);
  const win = useGlowMaterial(palette.glow, 1.3, { flatShading: false });
  useEffect(() => () => { stone.dispose(); roof.dispose(); gold.dispose(); dark.dispose(); mossMat.dispose(); }, [stone, roof, gold, dark, mossMat]);

  const layout = useMemo(() => {
    const rnd = mulberry32(seed * 977);
    const n = towers;
    const R = 30;
    const ts: TowerData[] = Array.from({ length: n }, (_, i) => {
      const a = Math.PI / 2 + Math.PI / n + (i * Math.PI * 2) / n;
      const broken = rnd() < ruined;
      return { x: Math.cos(a) * R, z: Math.sin(a) * R, h: (30 + rnd() * 14) * (broken ? 1 - ruined * (0.3 + rnd() * 0.35) : 1), r: 4.6 + rnd() * 1.1, roof: !broken || ruined < 0.3, a };
    });
    const walls = ts.map((t, i) => {
      const u = ts[(i + 1) % n];
      const cx = (t.x + u.x) / 2;
      const cz = (t.z + u.z) / 2;
      const len = Math.hypot(u.x - t.x, u.z - t.z);
      const ang = Math.atan2(u.x - t.x, u.z - t.z);
      const gap = rnd() < ruined * 0.7 && i !== n - 1;
      return { cx, cz, len, ang, h: 12 * (gap ? 0.45 : 1) };
    });
    const merlons: { x: number; y: number; z: number; ang: number }[] = [];
    walls.forEach((w, i) => {
      if (i === n - 1) return; // gate wall: handled by gatehouse
      const cnt = Math.floor(w.len / 2.6);
      for (let k = 0; k < cnt; k++) {
        if (rnd() < ruined * 0.5) continue;
        const f = (k + 0.5) / cnt - 0.5;
        merlons.push({ x: w.cx + Math.sin(w.ang) * w.len * f, y: w.h + 0.7, z: w.cz + Math.cos(w.ang) * w.len * f, ang: w.ang });
      }
    });
    const windows: { x: number; y: number; z: number; ang: number }[] = [];
    ts.forEach((t) => {
      for (let lvl = 0; lvl < 4; lvl++) {
        const y = 8 + lvl * 6.5;
        if (y > t.h - 3) break;
        for (let k = 0; k < 3; k++) {
          if (rnd() < ruined * 0.7) continue;
          const a = t.a + (k - 1) * 1.0 + lvl * 0.3;
          windows.push({ x: t.x + Math.cos(a) * (t.r + 0.05), y, z: t.z + Math.sin(a) * (t.r + 0.05), ang: -a + Math.PI / 2 });
        }
      }
    });
    // keep windows
    for (let lvl = 0; lvl < 6; lvl++)
      for (let k = 0; k < 8; k++) {
        if (rnd() < ruined * 0.6) continue;
        const a = (k / 8) * 6.283 + lvl * 0.4;
        windows.push({ x: Math.cos(a) * 9.55, y: 8 + lvl * 7, z: Math.sin(a) * 9.55, ang: -a + Math.PI / 2 });
      }
    const rubble = Array.from({ length: Math.floor(ruined * 46) }, () => {
      const a = rnd() * 6.28;
      const d = 10 + rnd() * 28;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.6 + rnd() * 2.2, r: rnd() * 6 };
    });
    const moss = Array.from({ length: Math.floor((palette.moss ? 1 : 0) * 70 * (0.3 + ruined)) }, () => {
      const a = rnd() * 6.28;
      const d = 9.5 + rnd() * 21;
      return { x: Math.cos(a) * d, y: 1 + rnd() * 14, z: Math.sin(a) * d, s: 0.9 + rnd() * 1.9 };
    });
    return { ts, walls, merlons, windows, rubble, moss };
  }, [seed, ruined, towers, palette.moss]);

  const keepH = 52 * (1 - ruined * 0.35);
  const mref = useInstances(layout.merlons.length, (i, o) => {
    const m = layout.merlons[i];
    o.position.set(m.x, m.y, m.z);
    o.rotation.y = m.ang;
    o.scale.set(1.2, 1.5, 2.4);
  }, [layout]);
  const wref = useInstances(layout.windows.length, (i, o) => {
    const w = layout.windows[i];
    o.position.set(w.x, w.y, w.z);
    o.rotation.y = w.ang;
    o.scale.set(0.9, 2.1, 0.3);
  }, [layout]);
  const rref = useInstances(layout.rubble.length, (i, o) => {
    const r = layout.rubble[i];
    o.position.set(r.x, r.s * 0.3, r.z);
    o.rotation.set(r.r, r.r * 2, r.r * 0.5);
    o.scale.set(r.s, r.s * 0.7, r.s * 0.9);
  }, [layout]);
  const gref = useInstances(layout.moss.length, (i, o) => {
    const m = layout.moss[i];
    o.position.set(m.x, m.y, m.z);
    o.scale.set(m.s, m.s * 0.5, m.s);
  }, [layout]);

  const banner = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (banner.current) banner.current.children.forEach((c, i) => (c.rotation.y = Math.sin(s.clock.elapsedTime * 1.6 + i) * 0.25));
  });

  const gate = layout.walls[towers - 1];
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const dodeca = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const ico = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Keep */}
      <mesh material={stone} position={[0, keepH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[9, 10.5, keepH, 12]} />
      </mesh>
      <mesh material={gold} position={[0, keepH, 0]}>
        <cylinderGeometry args={[10.4, 10.4, 1.2, 12]} />
      </mesh>
      <mesh material={stone} position={[0, keepH + 3, 0]} castShadow>
        <cylinderGeometry args={[7, 9, 6, 12]} />
      </mesh>
      {ruined < 0.45 && (
        <>
          <mesh material={roof} position={[0, keepH + 20, 0]} castShadow>
            <coneGeometry args={[8.5, 28, 12]} />
          </mesh>
          <mesh material={gold} position={[0, keepH + 35.5, 0]}>
            <sphereGeometry args={[1.1, 12, 10]} />
          </mesh>
          <mesh material={gold} position={[0, keepH + 38.5, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 6, 5]} />
          </mesh>
        </>
      )}
      {/* Great hall */}
      <mesh material={stone} position={[0, 9, 17]} castShadow receiveShadow>
        <boxGeometry args={[30, 18 * (1 - ruined * 0.3), 20]} />
      </mesh>
      {ruined < 0.6 && (
        <mesh material={roof} position={[0, 18.5, 17]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[8.5, 8.5, 31, 3]} />
        </mesh>
      )}
      {/* Gatehouse */}
      <group position={[gate.cx, 0, gate.cz]} rotation={[0, gate.ang, 0]}>
        <mesh material={stone} position={[0, 8, 0]} castShadow receiveShadow>
          <boxGeometry args={[12, 16, 7]} />
        </mesh>
        <mesh material={dark} position={[0, 4.6, 0.2]}>
          <boxGeometry args={[5.4, 9.2, 7.4]} />
        </mesh>
        <mesh material={dark} position={[0, 9.2, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.7, 2.7, 7.4, 16, 1, false, 0, Math.PI]} />
        </mesh>
        <mesh material={gold} position={[0, 14.4, 3.6]}>
          <torusGeometry args={[1.2, 0.18, 6, 16]} />
        </mesh>
        <pointLight color={palette.glow} intensity={ruined > 0.4 ? 8 : 25} distance={26} decay={2} position={[0, 4, 5]} />
      </group>
      {/* Towers */}
      {layout.ts.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh material={stone} position={[0, t.h / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[t.r, t.r + 0.9, t.h, 12]} />
          </mesh>
          <mesh material={gold} position={[0, t.h, 0]}>
            <cylinderGeometry args={[t.r + 0.9, t.r + 0.9, 1.1, 12]} />
          </mesh>
          {t.roof ? (
            <>
              <mesh material={roof} position={[0, t.h + 6.5, 0]} castShadow>
                <coneGeometry args={[t.r + 1.5, 12, 12]} />
              </mesh>
              <mesh material={gold} position={[0, t.h + 13, 0]}>
                <sphereGeometry args={[0.55, 10, 8]} />
              </mesh>
            </>
          ) : (
            <mesh material={stone} position={[0, t.h + 0.8, 0]} rotation={[0.2, i, 0.2]} scale={[t.r * 0.9, 1.6, t.r * 0.8]} castShadow>
              <dodecahedronGeometry args={[1, 0]} />
            </mesh>
          )}
        </group>
      ))}
      {/* Curtain walls */}
      {layout.walls.map((w, i) =>
        i === towers - 1 ? null : (
          <mesh key={i} material={stone} position={[w.cx, w.h / 2, w.cz]} rotation={[0, w.ang, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, w.h, w.len]} />
          </mesh>
        ),
      )}
      {layout.merlons.length > 0 && <instancedMesh ref={mref} args={[boxGeo, stone, layout.merlons.length]} castShadow />}
      {layout.windows.length > 0 && <instancedMesh ref={wref} args={[boxGeo, win, layout.windows.length]} />}
      {layout.rubble.length > 0 && <instancedMesh ref={rref} args={[dodeca, stone, layout.rubble.length]} castShadow receiveShadow />}
      {layout.moss.length > 0 && <instancedMesh ref={gref} args={[ico, mossMat, layout.moss.length]} />}
      {/* Banners */}
      <group ref={banner}>
        {[0, 1, 2, 3].map((i) => {
          const a = i * 1.571 + 0.5;
          return (
            <mesh key={i} position={[Math.cos(a) * 9.6, keepH * 0.7, Math.sin(a) * 9.6]} rotation={[0, -a + Math.PI / 2, 0]}>
              <planeGeometry args={[3, 11]} />
              <meshStandardMaterial color={palette.roof} side={THREE.DoubleSide} roughness={0.8} emissive={palette.accent} emissiveIntensity={ruined > 0.4 ? 0 : 0.08} />
            </mesh>
          );
        })}
      </group>
      <pointLight color={palette.glow} intensity={ruined > 0.4 ? 5 : 30} distance={60} decay={2} position={[0, keepH * 0.6, 14]} />
    </group>
  );
}
