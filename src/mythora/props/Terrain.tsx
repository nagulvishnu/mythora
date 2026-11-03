"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getSurface } from "../lib/textures";
import { useQ } from "../lib/useQ";

export type ColorFn = (h: number, ny: number, x: number, z: number, out: THREE.Color) => void;

export function Terrain({ size, seg, height, color, bump = 1.4, rep = 24 }: { size: number; seg: number; height: (x: number, z: number) => number; color: ColorFn; bump?: number; rep?: number }) {
  const q = useQ();
  const n = Math.max(48, Math.floor(seg * q.seg));
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, n, n);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      color(p.getY(i), nrm.getY(i), p.getX(i), p.getZ(i), c);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, size]);
  useEffect(() => () => geo.dispose(), [geo]);
  const tex = useMemo(() => getSurface("rock", rep), [rep]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0} bumpMap={tex.bump} bumpScale={bump} />
    </mesh>
  );
}
