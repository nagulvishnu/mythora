"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { HUB, INTRO_PATH, WORLDS, type CinePath, type SceneId, type V3 } from "../data/worlds";
import { getPhysics } from "../data/terrain";
import { camState, env } from "../lib/env";
import { input } from "../lib/input";
import { getState } from "../store/useStore";
import { travelCam } from "../store/actions";

const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);
const damp = THREE.MathUtils.damp;

interface Curves {
  pos: THREE.CatmullRomCurve3;
  look: THREE.CatmullRomCurve3;
  loop: number;
  relative: boolean;
}
function buildCurves(c: CinePath, closed = true): Curves {
  return {
    pos: new THREE.CatmullRomCurve3(c.pos.map(v3), closed, "catmullrom", 0.5),
    look: new THREE.CatmullRomCurve3(c.look.map(v3), closed, "catmullrom", 0.5),
    loop: c.loop,
    relative: !!c.relative,
  };
}

const easeIO = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

export function CameraRig() {
  const { camera, gl } = useThree();
  const R = useRef({
    lastKey: "",
    lastMode: "",
    lastReset: -1,
    cineT: 0,
    snap: true,
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    lookS: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    ys: 0,
    ps: 0,
    vel: new THREE.Vector3(),
    keys: new Set<string>(),
    drag: false,
    tp: new THREE.Vector3(),
    tl: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    des: new THREE.Vector3(),
  }).current;

  const curveCache = useMemo(() => new Map<string, Curves>(), []);
  const getCurves = (key: string) => {
    let c = curveCache.get(key);
    if (!c) {
      if (key === "intro") c = buildCurves({ pos: INTRO_PATH.pos, look: INTRO_PATH.look, loop: INTRO_PATH.duration }, false);
      else if (key === "hub") c = buildCurves(HUB.cine);
      else c = buildCurves(WORLDS[key as keyof typeof WORLDS].cine);
      curveCache.set(key, c);
    }
    return c;
  };

  useEffect(() => {
    const el = gl.domElement;
    const kd = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      R.keys.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown"].includes(e.code) && getState().phase !== "story") e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => R.keys.delete(e.code);
    const blur = () => R.keys.clear();
    const pd = (e: PointerEvent) => {
      if (e.button === 0 || e.pointerType === "touch") {
        R.drag = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    };
    const pm = (e: PointerEvent) => {
      if (!R.drag) return;
      const s = getState();
      if (s.camMode !== "free" || (s.phase !== "hub" && s.phase !== "world")) return;
      const k = e.pointerType === "touch" ? 0.005 : 0.0032;
      R.yaw -= e.movementX * k;
      R.pitch = THREE.MathUtils.clamp(R.pitch - e.movementY * k, -1.45, 1.45);
    };
    const pu = (e: PointerEvent) => {
      R.drag = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    el.addEventListener("pointerdown", pd);
    el.addEventListener("pointermove", pm);
    el.addEventListener("pointerup", pu);
    el.addEventListener("pointercancel", pu);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      el.removeEventListener("pointerdown", pd);
      el.removeEventListener("pointermove", pm);
      el.removeEventListener("pointerup", pu);
      el.removeEventListener("pointercancel", pu);
    };
  }, [gl, R]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = getState();
    const phase = s.phase;
    const scene: SceneId = s.scene;
    const phys = getPhysics(scene);
    const interactive = phase === "hub" || phase === "world";
    const mode = interactive ? s.camMode : "cinematic";
    const key = phase === "intro" ? "intro" : scene;

    const sceneChanged = key !== R.lastKey;
    const resetChanged = s.resetNonce !== R.lastReset;
    const modeChanged = mode !== R.lastMode;

    const setFromLook = (pos: V3, look: V3) => {
      R.pos.set(pos[0], pos[1], pos[2]);
      const d = R.dir.set(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]);
      R.yaw = Math.atan2(-d.x, -d.z);
      R.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      R.ys = R.yaw;
      R.ps = R.pitch;
      R.vel.set(0, 0, 0);
    };

    if (sceneChanged || resetChanged || modeChanged) {
      if (mode === "free") {
        if (sceneChanged || resetChanged || R.lastMode === "") {
          const sp = scene === "hub" ? HUB.spawn : WORLDS[scene].spawn;
          const g = phys.groundAt(sp.pos[0], sp.pos[2]);
          setFromLook([sp.pos[0], phys.walk && isFinite(g) ? g + phys.eye : sp.pos[1], sp.pos[2]], sp.look as V3);
        } else {
          R.pos.copy(camera.position);
          const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
          R.yaw = R.ys = e.y;
          R.pitch = R.ps = e.x;
          R.vel.set(0, 0, 0);
        }
      } else if (sceneChanged || resetChanged) {
        R.cineT = 0;
        R.snap = true;
      }
      R.lastKey = key;
      R.lastMode = mode;
      R.lastReset = s.resetNonce;
    }

    /* ---------------- portal travel override ---------------- */
    if (travelCam.active) {
      const t = travelCam.t;
      if (t <= 1) {
        const e = easeIO(Math.min(1, t));
        R.tp.lerpVectors(travelCam.from, travelCam.a, e);
        R.tl.lerpVectors(travelCam.fromLook, travelCam.look, e);
      } else {
        const e = Math.min(1, t - 1);
        R.tp.lerpVectors(travelCam.a, travelCam.b, e);
        R.tl.copy(travelCam.look);
        env.shake = Math.max(env.shake, 0.4 * e);
      }
      camera.position.copy(R.tp);
      camera.lookAt(R.tl);
      R.pos.copy(R.tp);
    } else if (mode === "free") {
      /* ---------------- free exploration ---------------- */
      const k = R.keys;
      let fx = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
      let sx = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
      fx += -input.move.y;
      sx += input.move.x;
      const vy = (k.has("Space") || k.has("KeyE") ? 1 : 0) - (k.has("KeyC") || k.has("KeyQ") ? 1 : 0);
      const sprint = k.has("ShiftLeft") || k.has("ShiftRight") || input.sprint;
      const base = (phys.walk ? 7 : 24) * s.speed * (sprint ? 2.3 : 1);
      // rotate with yaw
      const cy = Math.cos(R.yaw);
      const sy = Math.sin(R.yaw);
      const cp = phys.walk ? 1 : Math.cos(R.pitch);
      R.fwd.set(-sy * cp, phys.walk ? 0 : Math.sin(R.pitch), -cy * cp);
      R.right.set(cy, 0, -sy);
      R.des.set(0, 0, 0).addScaledVector(R.fwd, fx).addScaledVector(R.right, sx);
      if (!phys.walk) R.des.y += vy * 0.8;
      const len = R.des.length();
      if (len > 1) R.des.divideScalar(len);
      R.des.multiplyScalar(base);
      const lam = len > 0.01 ? 5 : 6.5;
      R.vel.x = damp(R.vel.x, R.des.x, lam, dt);
      R.vel.y = damp(R.vel.y, R.des.y, lam, dt);
      R.vel.z = damp(R.vel.z, R.des.z, lam, dt);
      R.pos.addScaledVector(R.vel, dt);

      // collisions with landmarks
      for (const c of phys.colliders) {
        const dx = R.pos.x - c.x;
        const dy = R.pos.y - c.y;
        const dz = R.pos.z - c.z;
        const d = Math.hypot(dx, dy, dz);
        const rr = c.r + 1.4;
        if (d < rr && d > 0.001) {
          const f = (rr - d) / d;
          if (phys.walk) {
            R.pos.x += dx * f;
            R.pos.z += dz * f;
          } else {
            R.pos.x += dx * f;
            R.pos.y += dy * f;
            R.pos.z += dz * f;
          }
        }
      }
      // exploration boundary (soft wall)
      const hr = Math.hypot(R.pos.x, R.pos.z);
      if (hr > phys.bounds) {
        const sc = phys.bounds / hr;
        R.pos.x = THREE.MathUtils.lerp(R.pos.x, R.pos.x * sc, 0.2);
        R.pos.z = THREE.MathUtils.lerp(R.pos.z, R.pos.z * sc, 0.2);
        R.vel.multiplyScalar(0.9);
      }
      const g = phys.groundAt(R.pos.x, R.pos.z);
      if (phys.walk) {
        const ty = (isFinite(g) ? g : 0) + phys.eye;
        R.pos.y = damp(R.pos.y, ty, 14, dt);
        R.pos.y += Math.sin(state.clock.elapsedTime * 9) * 0.0 + 0;
      } else {
        const floor = (isFinite(g) ? g : -Infinity) + 3.5;
        R.pos.y = Math.max(R.pos.y, floor, phys.minY);
        R.pos.y = Math.min(R.pos.y, phys.maxY);
      }
      R.ys = damp(R.ys, R.yaw, 22, dt);
      R.ps = damp(R.ps, R.pitch, 22, dt);
      camera.position.copy(R.pos);
      camera.rotation.set(R.ps, R.ys, 0, "YXZ");
      camState.speed = R.vel.length();
    } else {
      /* ---------------- cinematic ---------------- */
      let tp = R.tp;
      let tl = R.tl;
      if (phase === "intro") {
        const c = getCurves("intro");
        const p = s.introSkipped ? 1 : Math.min(1, (performance.now() - s.introStart) / 1000 / INTRO_PATH.duration);
        const e = easeIO(p);
        c.pos.getPoint(e, tp);
        c.look.getPoint(e, tl);
        if (p >= 1) {
          const t = state.clock.elapsedTime;
          tp.x += Math.sin(t * 0.25) * 4;
          tp.y += Math.sin(t * 0.37) * 1.5;
        }
        if (R.snap && !s.introSkipped) {
          R.pos.copy(tp);
          R.lookS.copy(tl);
          R.snap = false;
        }
      } else {
        const c = getCurves(scene);
        R.cineT += dt * s.speed;
        let u = (R.cineT / c.loop + (phase === "story" ? s.storyProgress * 0.08 : 0)) % 1;
        if (u < 0) u += 1;
        c.pos.getPoint(u, tp);
        c.look.getPoint(u, tl);
        if (c.relative) {
          const g1 = phys.groundAt(tp.x, tp.z);
          const g2 = phys.groundAt(tl.x, tl.z);
          tp.y += isFinite(g1) ? g1 : 0;
          tl.y += isFinite(g2) ? g2 : 0;
        } else {
          const g = phys.groundAt(tp.x, tp.z);
          if (isFinite(g)) tp.y = Math.max(tp.y, g + 4);
        }
        if (R.snap) {
          R.pos.copy(tp);
          R.lookS.copy(tl);
          R.snap = false;
        }
      }
      const lamP = phase === "intro" ? 6 : 2.2;
      R.pos.x = damp(R.pos.x, tp.x, lamP, dt);
      R.pos.y = damp(R.pos.y, tp.y, lamP, dt);
      R.pos.z = damp(R.pos.z, tp.z, lamP, dt);
      R.lookS.x = damp(R.lookS.x, tl.x, lamP * 1.4, dt);
      R.lookS.y = damp(R.lookS.y, tl.y, lamP * 1.4, dt);
      R.lookS.z = damp(R.lookS.z, tl.z, lamP * 1.4, dt);
      const t = state.clock.elapsedTime;
      camera.position.set(R.pos.x + Math.sin(t * 0.6) * 0.18, R.pos.y + Math.sin(t * 0.8 + 1) * 0.14, R.pos.z + Math.cos(t * 0.5) * 0.18);
      camera.lookAt(R.lookS);
      camState.speed = 0;
    }

    // camera shake (dragon fly-bys, portal crossing)
    if (env.shake > 0.001) {
      const sh = env.shake;
      camera.position.x += (Math.random() - 0.5) * sh * 0.5;
      camera.position.y += (Math.random() - 0.5) * sh * 0.5;
      camera.rotation.z += (Math.random() - 0.5) * sh * 0.01;
      env.shake = damp(env.shake, 0, 3, dt);
    }

    camState.position.copy(camera.position);
    camera.getWorldDirection(camState.forward);
  });

  return null;
}
