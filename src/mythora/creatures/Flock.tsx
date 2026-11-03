"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mulberry32 } from "../lib/noise";
import { useQ } from "../lib/useQ";
import { env } from "../lib/env";
import type { V3 } from "../data/worlds";

export const MODELS = {
  stork: "/models/Stork.glb",
  flamingo: "/models/Flamingo.glb",
  parrot: "/models/Parrot.glb",
  horse: "/models/Horse.glb",
};

interface Prepared {
  scene: THREE.Object3D;
  clips: THREE.AnimationClip[];
  scale: number;
  offset: THREE.Vector3;
  size: THREE.Vector3;
  top: THREE.Vector3;
}

function usePrepared(url: string, targetSize: number): Prepared {
  const gltf = useGLTF(url);
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = targetSize / Math.max(size.x, size.y, size.z);
    // highest vertex (used to attach antlers to the head)
    const top = new THREE.Vector3(0, -Infinity, 0);
    const v = new THREE.Vector3();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry?.attributes.position) {
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i += 1) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          if (v.y > top.y) top.copy(v);
        }
      }
    });
    return { scene: gltf.scene, clips: gltf.animations, scale, offset: center.multiplyScalar(-1), size, top };
  }, [gltf, targetSize]);
}

function makeBird(p: Prepared, tint?: string, emissive?: string) {
  const obj = cloneSkinned(p.scene);
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      if (tint) mat.color.lerp(new THREE.Color(tint), 0.7);
      if (emissive) {
        mat.emissive = new THREE.Color(emissive);
        mat.emissiveIntensity = 0.35;
      }
      m.material = mat;
      m.castShadow = true;
      m.frustumCulled = false;
    }
  });
  const inner = new THREE.Group();
  obj.position.copy(p.offset);
  inner.add(obj);
  inner.scale.setScalar(p.scale);
  return { inner, obj };
}

/** Animated GLB birds flying defined, individually phased loops */
export function GlbFlock({ model, count, center, rx, rz, y, bob = 3, speed = 10, size = 4, yaw = -Math.PI / 2, tint, emissive, seed = 1 }: { model: keyof typeof MODELS; count: number; center: V3; rx: number; rz: number; y: number; bob?: number; speed?: number; size?: number; yaw?: number; tint?: string; emissive?: string; seed?: number }) {
  const q = useQ();
  const n = Math.max(1, Math.round(count * q.creatures));
  const prep = usePrepared(MODELS[model], size);
  const group = useRef<THREE.Group>(null);
  const birds = useMemo(() => {
    const rnd = mulberry32(seed * 77);
    return Array.from({ length: n }, (_, i) => {
      const b = makeBird(prep, tint, emissive);
      const mixer = new THREE.AnimationMixer(b.obj);
      if (prep.clips[0]) {
        const a = mixer.clipAction(prep.clips[0]);
        a.play();
        a.time = rnd() * a.getClip().duration;
        mixer.timeScale = 0.8 + rnd() * 0.5;
      }
      const holder = new THREE.Group();
      const orient = new THREE.Group();
      orient.rotation.y = yaw;
      orient.add(b.inner);
      holder.add(orient);
      return { holder, mixer, a: rnd() * 6.28, k: 0.75 + rnd() * 0.5, ry: 0.8 + rnd() * 0.4, ph: rnd() * 6, yo: (rnd() - 0.5) * 12, i };
    });
  }, [n, prep, tint, emissive, seed, yaw]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    birds.forEach((b) => g.add(b.holder));
    return () => {
      birds.forEach((b) => {
        g.remove(b.holder);
        b.mixer.stopAllAction();
        b.holder.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) (m.material as THREE.Material).dispose();
        });
      });
    };
  }, [birds]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const w = speed / ((rx + rz) / 2);
    for (const b of birds) {
      b.mixer.update(Math.min(dt, 0.05));
      const f = (tt: number) => {
        const a = b.a + tt * w * b.k;
        return tmp.set(center[0] + Math.cos(a) * rx * b.ry, center[1] + y + b.yo + Math.sin(tt * 0.4 + b.ph) * bob, center[2] + Math.sin(a) * rz * (2 - b.ry));
      };
      const p0 = f(t).clone();
      const p1 = f(t + 0.25);
      b.holder.position.copy(p0);
      b.holder.lookAt(p1);
      b.holder.rotateZ(-0.25 * Math.sign(w * b.k));
    }
  });
  return <group ref={group} />;
}

/** Deer-like spirit stags: animated horse rig with glowing antlers, wandering on the ground */
export function SpiritStags({ count, center, radius, heightAt, size = 4.2, seed = 3 }: { count: number; center: V3; radius: number; heightAt: (x: number, z: number) => number; size?: number; seed?: number }) {
  const q = useQ();
  const n = Math.max(1, Math.round(count * q.creatures));
  const prep = usePrepared(MODELS.horse, size);
  const group = useRef<THREE.Group>(null);
  const antlerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#bffff0", emissive: "#6affd0", emissiveIntensity: 1.2, roughness: 0.4 }), []);
  useFrame(() => {
    antlerMat.emissiveIntensity = 0.5 + env.glow * 0.9;
  });
  const stags = useMemo(() => {
    const rnd = mulberry32(seed * 19);
    const antlerGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.35, -0.05), new THREE.Vector3(0.28, 0.65, -0.05), new THREE.Vector3(0.36, 0.95, 0.02), new THREE.Vector3(0.3, 1.2, 0.08)]),
      14,
      0.035,
      5,
    );
    return Array.from({ length: n }, () => {
      const b = makeBird(prep, "#d7f5ff", "#2ad6b0");
      const mixer = new THREE.AnimationMixer(b.obj);
      if (prep.clips[0]) {
        const a = mixer.clipAction(prep.clips[0]);
        a.play();
        mixer.timeScale = 0.38;
        a.time = rnd() * a.getClip().duration;
      }
      // antlers at the highest point of the model (head)
      const longX = prep.size.x >= prep.size.z;
      const lateral = (longX ? prep.size.z : prep.size.x) * 0.1;
      [-1, 1].forEach((sd) => {
        const m = new THREE.Mesh(antlerGeo, antlerMat);
        const worldScale = 1 / prep.scale;
        m.scale.setScalar(worldScale * 1.4);
        const p = prep.top.clone().add(prep.offset);
        if (longX) p.z += sd * lateral;
        else p.x += sd * lateral;
        p.y -= 0.02 * prep.size.y;
        m.position.copy(p);
        m.rotation.set(0, 0, 0);
        m.rotation.z = longX ? 0 : sd * 0.4;
        m.rotation.x = longX ? sd * 0.4 : 0;
        b.obj.add(m);
      });
      const holder = new THREE.Group();
      const orient = new THREE.Group();
      orient.rotation.y = -Math.PI / 2;
      orient.add(b.inner);
      holder.add(orient);
      return { holder, mixer, cx: center[0] + (rnd() - 0.5) * radius, cz: center[2] + (rnd() - 0.5) * radius, r: 8 + rnd() * 14, a: rnd() * 6.28, sp: (0.04 + rnd() * 0.04) * (rnd() > 0.5 ? 1 : -1) };
    });
  }, [n, prep, center, radius, seed, antlerMat]);
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    stags.forEach((s) => g.add(s.holder));
    return () => stags.forEach((s) => g.remove(s.holder));
  }, [stags]);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    for (const st of stags) {
      st.mixer.update(Math.min(dt, 0.05));
      const ax = (tt: number) => [st.cx + Math.cos(st.a + tt * st.sp) * st.r, st.cz + Math.sin(st.a + tt * st.sp) * st.r];
      const [x, z] = ax(t);
      const [x2, z2] = ax(t + 0.5);
      st.holder.position.set(x, heightAt(x, z) + 0.1, z);
      st.holder.lookAt(x2, heightAt(x2, z2) + 0.1, z2);
    }
  });
  useEffect(() => () => antlerMat.dispose(), [antlerMat]);
  return <group ref={group} />;
}
