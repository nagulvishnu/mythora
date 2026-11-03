"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { audio } from "../audio/engine";
import { camState, env } from "../lib/env";
import { mulberry32 } from "../lib/noise";
import { getSurface } from "../lib/textures";
import { getState } from "../store/useStore";

export interface DragonColors {
  body: string;
  wing: string;
  horn: string;
  glow: string;
}
export const DRAGON_RED: DragonColors = { body: "#5a1a14", wing: "#8a2a1a", horn: "#d9c9a0", glow: "#ff6a1a" };
export const DRAGON_BRONZE: DragonColors = { body: "#6a4a1e", wing: "#9a6a2a", horn: "#efe0b0", glow: "#ffb020" };
export const DRAGON_ASH: DragonColors = { body: "#2c2a30", wing: "#4a3a48", horn: "#c0b8a8", glow: "#ff4a2a" };
export const DRAGON_WHITE: DragonColors = { body: "#d8dce4", wing: "#e8f0ff", horn: "#ffe8b0", glow: "#9fd8ff" };

// spine layout: index 0 = head base, increasing toward the tail
const SPINE_Z = [6.0, 4.8, 3.6, 2.5, 1.2, -0.4, -2.0, -3.5, -5.0, -6.5, -8.0, -9.5, -11.0, -12.5, -14.0, -15.5, -17.0];
const SPINE_R = [0.42, 0.5, 0.62, 0.78, 1.0, 1.1, 0.95, 0.8, 0.7, 0.6, 0.52, 0.44, 0.36, 0.29, 0.22, 0.15, 0.08];
const SPINE_Y = [1.7, 1.9, 1.7, 1.25, 0.6, 0.35, 0.3, 0.2, 0.1, 0, -0.05, -0.1, -0.15, -0.2, -0.22, -0.25, -0.28];
const N = SPINE_Z.length;

const FINGER_SWEEP = [-0.1, -0.55, -1.05, -1.6];
const FINGER_LEN = [5.8, 5.4, 4.6, 3.6];
const MEMBRANE_TRIS = [2, 3, 4, 2, 4, 5, 2, 5, 6, 2, 6, 7, 2, 7, 0, 2, 0, 1];

const sphere = new THREE.SphereGeometry(1, 12, 10);
const cone = (() => {
  const g = new THREE.ConeGeometry(1, 1, 5);
  g.translate(0, 0.5, 0);
  return g;
})();
const bone = (() => {
  const g = new THREE.CylinderGeometry(0.5, 0.8, 1, 6);
  g.translate(0, 0.5, 0);
  return g;
})();

function dir(a: number, sw: number, out: THREE.Vector3) {
  return out.set(Math.cos(a), Math.sin(a), sw).normalize();
}

const _up = new THREE.Vector3(0, 1, 0);
function placeBone(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number, tmp: THREE.Vector3) {
  tmp.subVectors(b, a);
  const len = tmp.length();
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(_up, tmp.divideScalar(len || 1));
  m.scale.set(r, len, r);
}

function FireBreath({ material }: { material: THREE.ShaderMaterial }) {
  const geo = useMemo(() => {
    const rnd = mulberry32(17);
    const n = 90;
    const g = new THREE.BufferGeometry();
    const s = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) s[i] = rnd();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(s, 4));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <points geometry={geo} material={material} frustumCulled={false} />;
}

export interface DragonProps {
  path: THREE.Curve<THREE.Vector3>;
  speed?: number;
  scale?: number;
  colors?: DragonColors;
  phase?: number;
  loop?: boolean;
  active?: boolean;
  onDone?: () => void;
  breath?: boolean;
  roar?: boolean;
  flapRate?: number;
  wingScale?: number;
}

export function Dragon({ path, speed = 20, scale = 1, colors = DRAGON_RED, phase = 0, loop = true, active = true, onDone, breath = false, roar = false, flapRate = 0.55, wingScale = 1 }: DragonProps) {
  const root = useRef<THREE.Group>(null);
  const segs = useRef<(THREE.Group | null)[]>([]);
  const head = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const fire = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([null, null]);
  const bones = useRef<THREE.Mesh[][]>([[], []]);
  const membranes = useRef<(THREE.Mesh | null)[]>([null, null]);

  const state = useMemo(
    () => ({
      u: (phase * 0.37) % 1,
      roll: 0,
      lastRoar: -100,
      done: false,
      P: Array.from({ length: N }, () => new THREE.Vector3()),
      pos: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      tan2: new THREE.Vector3(),
      tgt: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
      d: new THREE.Vector3(),
      pts: Array.from({ length: 8 }, () => new THREE.Vector3()),
      len: path.getLength(),
    }),
    [path, phase],
  );

  const tex = useMemo(() => getSurface("scale", 3), []);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: colors.body, map: tex.map, bumpMap: tex.bump, bumpScale: 3, roughness: 0.55, metalness: 0.25 }), [colors.body, tex]);
  const hornMat = useMemo(() => new THREE.MeshStandardMaterial({ color: colors.horn, roughness: 0.5, metalness: 0.2 }), [colors.horn]);
  const wingMat = useMemo(() => new THREE.MeshStandardMaterial({ color: colors.wing, side: THREE.DoubleSide, roughness: 0.65, vertexColors: true, emissive: colors.glow, emissiveIntensity: 0.12 }), [colors.wing, colors.glow]);
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: colors.glow }), [colors.glow]);
  const fireMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uColor: { value: new THREE.Color(colors.glow) }, uScale: { value: 600 } },
        vertexShader: /* glsl */ `
attribute vec4 aSeed; uniform float uTime, uAmt, uScale; varying float vA; varying float vH;
void main(){
  float k = fract(uTime*(0.9+aSeed.x*0.8)+aSeed.y);
  float z = k*16.;
  vec3 p = vec3((aSeed.z-0.5)*k*5., (aSeed.w-0.5)*k*4. + k*k*1.2, z);
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = (0.5+k*2.6)*uScale/max(0.1,-mv.z)*0.5;
  vA = (1.-k)*uAmt; vH = k;
}`,
        fragmentShader: /* glsl */ `uniform vec3 uColor; varying float vA; varying float vH; void main(){ float d=length(gl_PointCoord-.5)*2.; float a=pow(1.-smoothstep(0.,1.,d),1.6); vec3 c=mix(vec3(1.,.95,.6),uColor,vH); gl_FragColor=vec4(c*(1.+a),a*vA); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [colors.glow],
  );
  useEffect(() => () => { bodyMat.dispose(); hornMat.dispose(); wingMat.dispose(); eyeMat.dispose(); fireMat.dispose(); }, [bodyMat, hornMat, wingMat, eyeMat, fireMat]);

  const membraneGeos = useMemo(
    () =>
      [0, 1].map(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
        const sh = [0.55, 0.7, 0.8, 1, 1, 1, 1, 0.6];
        const col = new Float32Array(24);
        sh.forEach((v, i) => {
          col[i * 3] = v;
          col[i * 3 + 1] = v;
          col[i * 3 + 2] = v;
        });
        g.setAttribute("color", new THREE.BufferAttribute(col, 3));
        g.setIndex(MEMBRANE_TRIS);
        return g;
      }),
    [],
  );
  useEffect(() => () => membraneGeos.forEach((g) => g.dispose()), [membraneGeos]);

  useFrame((s, dtRaw) => {
    const g = root.current;
    if (!g) return;
    if (!active) {
      g.visible = false;
      return;
    }
    const dt = Math.min(dtRaw, 0.05);
    const t = s.clock.elapsedTime;
    const st = state;
    if (st.done) {
      g.visible = false;
      return;
    }
    g.visible = true;

    /* ---- flight along path ---- */
    st.u += (speed * dt) / st.len;
    if (st.u >= 1) {
      if (loop) st.u -= 1;
      else {
        st.u = 1;
        st.done = true;
        g.visible = false;
        onDone?.();
        return;
      }
    }
    const uu = Math.min(0.9999, st.u);
    path.getPointAt(uu, st.pos);
    path.getTangentAt(uu, st.tan);
    path.getTangentAt(loop ? (uu + 0.012) % 1 : Math.min(0.9999, uu + 0.012), st.tan2);
    const turn = st.tan.x * st.tan2.z - st.tan.z * st.tan2.x;
    st.roll = THREE.MathUtils.damp(st.roll, THREE.MathUtils.clamp(turn * 28, -0.75, 0.75), 2, dt);
    g.position.copy(st.pos);
    st.tgt.copy(st.pos).add(st.tan);
    g.lookAt(st.tgt);
    g.rotateZ(st.roll);
    g.scale.setScalar(scale);

    /* ---- wing cycle: flap, glide, fold ---- */
    const glideSel = Math.sin(t * 0.21 + phase * 5);
    const glide = THREE.MathUtils.smoothstep(glideSel, 0.15, 0.55);
    const A = THREE.MathUtils.lerp(1, 0.1, glide);
    const phi = t * flapRate * Math.PI * 2 + phase * 3;
    const flapRaw = Math.sin(phi);
    const f = flapRaw * A * 0.85 + 0.12 + glide * 0.05 + Math.sin(t * 1.7 + phase) * 0.03 * glide;
    const fold = Math.max(0, -flapRaw) * A * 0.8;

    /* ---- spine ---- */
    const P = st.P;
    const tt = t * 1.8 + phase;
    for (let i = 0; i < N; i++) {
      const k = Math.max(0, i - 6);
      const kn = Math.min(1, k / 10);
      P[i].set(
        Math.sin(tt - i * 0.55) * 0.5 * kn * (1 + kn) + (i < 5 ? Math.sin(t * 1.1 - i * 0.5 + phase) * 0.12 : 0) + st.roll * 0.0,
        SPINE_Y[i] + (i >= 4 ? -flapRaw * A * 0.28 * Math.max(0.3, 1 - i * 0.05) : flapRaw * A * 0.1) + Math.sin(tt * 0.9 - i * 0.45 + 1) * 0.18 * kn + (i < 4 ? Math.sin(t * 0.8 + phase) * 0.12 : 0),
        SPINE_Z[i],
      );
    }
    for (let i = 0; i < N; i++) {
      const m = segs.current[i];
      if (!m) continue;
      m.position.copy(P[i]);
      const a = P[Math.max(0, i - 1)];
      const b = P[Math.min(N - 1, i + 1)];
      const d = st.d.subVectors(a, b);
      const yaw = Math.atan2(d.x, d.z);
      const pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
      m.rotation.set(pitch, yaw, 0, "YXZ");
    }

    /* ---- head ---- */
    const h = head.current;
    if (h) {
      h.position.copy(P[0]);
      const d = st.d.subVectors(P[0], P[1]);
      const yaw = Math.atan2(d.x, d.z) + Math.sin(t * 0.7 + phase) * 0.08;
      const pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z)) + 0.28 + Math.sin(t * 1.3) * 0.04;
      h.rotation.set(pitch, yaw, 0, "YXZ");
    }
    const breathing = breath && (t + phase * 5) % 17 < 2.8;
    if (jaw.current) jaw.current.rotation.x = THREE.MathUtils.damp(jaw.current.rotation.x, breathing ? 0.55 : 0.04 + Math.max(0, Math.sin(t * 0.5 + phase)) * 0.06, 8, dt);
    if (fire.current) {
      fire.current.visible = breathing || fireMat.uniforms.uAmt.value > 0.02;
      fireMat.uniforms.uAmt.value = THREE.MathUtils.damp(fireMat.uniforms.uAmt.value, breathing ? 1 : 0, 6, dt);
      fireMat.uniforms.uTime.value = t;
      const cam = s.camera as THREE.PerspectiveCamera;
      fireMat.uniforms.uScale.value = (s.size.height * s.viewport.dpr) / (2 * Math.tan((cam.fov * Math.PI) / 360));
    }

    /* ---- wings ---- */
    for (let w = 0; w < 2; w++) {
      const wg = wings.current[w];
      if (!wg) continue;
      wg.position.set(0, P[4].y + 0.75, 1.3);
      const pts = st.pts;
      const tmp = st.tmp;
      const S = pts[0].set(0, 0, 0);
      pts[1].copy(S).addScaledVector(dir(f * 0.85 + 0.18, 0.5, tmp), 2.6 * wingScale);
      pts[2].copy(pts[1]).addScaledVector(dir(f * 0.7 - 0.05 - fold * 0.5, -0.35, tmp), 3.2 * wingScale);
      const a3 = f * 0.5 - 0.22 - fold * 0.9;
      for (let k = 0; k < 4; k++) {
        const ang = a3 - 0.1 * k - 0.15 * Math.max(0, -f) * k;
        pts[3 + k].copy(pts[2]).addScaledVector(dir(ang, FINGER_SWEEP[k], tmp), FINGER_LEN[k] * wingScale * (1 - fold * 0.35));
      }
      pts[7].set(0.3, -0.3, -4.4);
      const geo = membraneGeos[w];
      const pa = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 8; i++) pa.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
      pa.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const bs = bones.current[w];
      if (bs.length >= 6) {
        placeBone(bs[0], pts[0], pts[1], 0.2, tmp);
        placeBone(bs[1], pts[1], pts[2], 0.16, tmp);
        for (let k = 0; k < 4; k++) placeBone(bs[2 + k], pts[2], pts[3 + k], 0.08, tmp);
      }
    }

    /* ---- encounter feedback: proximity shake and roar ---- */
    if (roar) {
      const d = camState.position.distanceTo(st.pos);
      const near = 46 * scale;
      if (d < near) env.shake = Math.max(env.shake, (1 - d / near) * 0.9);
      if (d < 130 * scale && t - st.lastRoar > 24 && getState().audioEnabled) {
        st.lastRoar = t;
        audio.play("roar");
      }
    }
  });

  const setSeg = (i: number) => (el: THREE.Group | null) => {
    segs.current[i] = el;
  };
  const addBone = (w: number, i: number) => (el: THREE.Mesh | null) => {
    if (el) bones.current[w][i] = el;
  };

  return (
    <group ref={root} visible={false} frustumCulled={false}>
      {SPINE_Z.map((_, i) => (
        <group key={i} ref={setSeg(i)}>
          <mesh geometry={sphere} material={bodyMat} scale={[SPINE_R[i], SPINE_R[i] * 0.92, 1.12]} castShadow />
          {i >= 1 && i <= 14 && <mesh geometry={cone} material={hornMat} position={[0, SPINE_R[i] * 0.85, 0]} rotation={[-0.25, 0, 0]} scale={[SPINE_R[i] * 0.28, SPINE_R[i] * 0.9 + 0.2, SPINE_R[i] * 0.28]} />}
          {(i === 5 || i === 7) &&
            [-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.85, -0.7, 0]} rotation={[0.6, 0, sd * 0.35]}>
                <mesh geometry={bone} material={bodyMat} scale={[0.34, 1.5, 0.34]} />
                <mesh geometry={cone} material={hornMat} position={[0, 1.5, 0.15]} rotation={[0.6, 0, 0]} scale={[0.14, 0.6, 0.14]} />
              </group>
            ))}
        </group>
      ))}
      <group ref={head}>
        <mesh geometry={sphere} material={bodyMat} position={[0, 0.1, 0.9]} scale={[0.85, 0.72, 1.35]} castShadow />
        <mesh geometry={sphere} material={bodyMat} position={[0, -0.05, 2.1]} scale={[0.5, 0.38, 1.1]} castShadow />
        <group ref={jaw} position={[0, -0.28, 0.4]}>
          <mesh geometry={sphere} material={bodyMat} position={[0, -0.05, 1.0]} scale={[0.46, 0.17, 1.15]} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} geometry={cone} material={hornMat} position={[sd * 0.25, 0.1, 1.9]} scale={[0.07, 0.3, 0.07]} />
          ))}
        </group>
        {[-1, 1].map((sd) => (
          <group key={sd}>
            <mesh geometry={cone} material={hornMat} position={[sd * 0.5, 0.65, 0.2]} rotation={[-1.05, 0, sd * 0.25]} scale={[0.17, 1.9, 0.17]} />
            <mesh geometry={cone} material={hornMat} position={[sd * 0.78, 0.2, 0.15]} rotation={[-1.3, 0, sd * 0.9]} scale={[0.11, 1.1, 0.11]} />
            <mesh geometry={sphere} material={eyeMat} position={[sd * 0.55, 0.32, 1.25]} scale={[0.13, 0.1, 0.18]} />
          </group>
        ))}
        {[-1, 1].map((sd) => (
          <mesh key={sd} geometry={sphere} material={eyeMat} position={[sd * 0.17, 0.12, 3.1]} scale={0.06} />
        ))}
        <group ref={fire} position={[0, -0.1, 3.0]} visible={false}>
          {breath && <FireBreath material={fireMat} />}
        </group>
      </group>
      {[0, 1].map((w) => (
        <group key={w} ref={(el) => { wings.current[w] = el; }} scale={[w === 0 ? 1 : -1, 1, 1]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} ref={addBone(w, i)} geometry={bone} material={hornMat === undefined ? bodyMat : bodyMat} castShadow />
          ))}
          <mesh ref={(el) => { membranes.current[w] = el; }} geometry={membraneGeos[w]} material={wingMat} castShadow frustumCulled={false} />
        </group>
      ))}
    </group>
  );
}

/** Helper to build a smooth closed or open flight loop */
export function loopPath(center: [number, number, number], rx: number, rz: number, y: number, wobble = 0.2, seed = 1, n = 9, closed = true) {
  const rnd = mulberry32(seed * 91);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rnd() - 0.5) * wobble * 2;
    pts.push(new THREE.Vector3(center[0] + Math.cos(a) * rx * k, center[1] + y + (rnd() - 0.5) * y * wobble * 2, center[2] + Math.sin(a) * rz * k));
  }
  return new THREE.CatmullRomCurve3(pts, closed, "centripetal");
}
