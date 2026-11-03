"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ENV_PRESETS, type EnvPreset, type SceneId, type Weather } from "../data/worlds";
import { useStore } from "../store/useStore";
import { env } from "../lib/env";
import { useQ } from "../lib/useQ";
import { audio } from "../audio/engine";
import { makeSkyMaterial } from "../effects/materials";

interface Target {
  top: THREE.Color;
  horizon: THREE.Color;
  sun: THREE.Color;
  amb: THREE.Color;
  fog: THREE.Color;
  cloudColor: THREE.Color;
  sunI: number;
  ambI: number;
  fogD: number;
  stars: number;
  cloud: number;
  dir: THREE.Vector3;
  rain: number;
  snow: number;
  mist: number;
  storm: number;
}

function buildTarget(p: EnvPreset, weather: Weather): Target {
  const t: Target = {
    top: new THREE.Color(p.top),
    horizon: new THREE.Color(p.horizon),
    sun: new THREE.Color(p.sun),
    amb: new THREE.Color(p.amb),
    fog: new THREE.Color(p.fog),
    cloudColor: new THREE.Color(p.cloudColor),
    sunI: p.sunI,
    ambI: p.ambI,
    fogD: p.fogD,
    stars: p.stars,
    cloud: p.cloud,
    dir: new THREE.Vector3(),
    rain: 0,
    snow: 0,
    mist: 0,
    storm: 0,
  };
  const el = (p.elev * Math.PI) / 180;
  const az = (p.az * Math.PI) / 180;
  t.dir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
  const grey = new THREE.Color("#8d97a8");
  switch (weather) {
    case "mist":
      t.fogD *= 3.4;
      t.fog.lerp(new THREE.Color("#c9c3e8"), 0.3);
      t.sunI *= 0.7;
      t.mist = 1;
      break;
    case "rain":
      t.fogD *= 1.9;
      t.sunI *= 0.45;
      t.ambI *= 0.85;
      t.cloud = Math.max(t.cloud, 0.85);
      t.cloudColor.multiplyScalar(0.55);
      t.fog.lerp(grey, 0.25);
      t.rain = 1;
      break;
    case "storm":
      t.fogD *= 2.4;
      t.sunI *= 0.2;
      t.ambI *= 0.65;
      t.cloud = 0.97;
      t.cloudColor.multiplyScalar(0.35);
      t.fog.lerp(grey, 0.3).multiplyScalar(0.7);
      t.rain = 1;
      t.storm = 1;
      break;
    case "snow":
      t.fogD *= 2.2;
      t.sunI *= 0.75;
      t.fog.lerp(new THREE.Color("#e8eef8"), 0.4);
      t.cloud = Math.max(t.cloud, 0.75);
      t.snow = 1;
      break;
  }
  return t;
}

const damp = THREE.MathUtils.damp;

export function Atmosphere({ sceneId }: { sceneId: SceneId }) {
  const time = useStore((s) => s.timeOfDay);
  const weather = useStore((s) => s.weather);
  const phase = useStore((s) => s.phase);
  const q = useQ();
  const effTime = phase === "intro" ? "sunset" : time;
  const target = useMemo(() => buildTarget(ENV_PRESETS[sceneId][effTime], weather), [sceneId, effTime, weather]);
  const nightTarget = effTime === "night" ? 1 : effTime === "sunset" ? 0.3 : 0;

  const style = sceneId === "umbracia" ? 1 : 0;
  const skyMat = useMemo(() => makeSkyMaterial(style), [style]);
  useEffect(() => () => skyMat.dispose(), [skyMat]);

  const cur = useRef<Target | null>(null);
  if (!cur.current) {
    const c = buildTarget(ENV_PRESETS[sceneId][effTime], weather);
    cur.current = c;
    env.night = nightTarget;
    env.rain = c.rain;
    env.snow = c.snow;
    env.mist = c.mist;
    env.storm = c.storm;
  }

  const { scene, camera } = useThree();
  const fogRef = useRef<THREE.FogExp2>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const skyRef = useRef<THREE.Mesh>(null);
  const flash = useRef({ next: 3, thunderAt: -1 });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const f = new THREE.FogExp2(0xffffff, 0.002);
    scene.fog = f;
    fogRef.current = f;
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useFrame((s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const c = cur.current!;
    const k = 1 - Math.exp(-dt * 1.4);
    c.top.lerp(target.top, k);
    c.horizon.lerp(target.horizon, k);
    c.sun.lerp(target.sun, k);
    c.amb.lerp(target.amb, k);
    c.fog.lerp(target.fog, k);
    c.cloudColor.lerp(target.cloudColor, k);
    c.dir.lerp(target.dir, k).normalize();
    c.sunI = damp(c.sunI, target.sunI, 1.4, dt);
    c.ambI = damp(c.ambI, target.ambI, 1.4, dt);
    c.fogD = damp(c.fogD, target.fogD, 1.4, dt);
    c.stars = damp(c.stars, target.stars, 1.4, dt);
    c.cloud = damp(c.cloud, target.cloud, 1.4, dt);
    env.night = damp(env.night, nightTarget, 1.4, dt);
    env.glow = 0.55 + env.night * 1.7;
    env.rain = damp(env.rain, target.rain, 1.2, dt);
    env.snow = damp(env.snow, target.snow, 1.2, dt);
    env.mist = damp(env.mist, target.mist, 1.2, dt);
    env.storm = damp(env.storm, target.storm, 1.0, dt);

    // lightning
    if (env.storm > 0.6) {
      const f = flash.current;
      f.next -= dt;
      if (f.next <= 0) {
        env.lightning = 1;
        f.next = 4 + Math.random() * 9;
        f.thunderAt = s.clock.elapsedTime + 0.5 + Math.random() * 1.2;
      }
      if (f.thunderAt > 0 && s.clock.elapsedTime > f.thunderAt) {
        audio.play("thunder");
        f.thunderAt = -1;
      }
    }
    env.lightning = Math.max(0, env.lightning - dt * 3.2);
    const flick = env.lightning > 0 ? env.lightning * (0.6 + 0.4 * Math.sin(s.clock.elapsedTime * 70)) : 0;

    env.sunDir.copy(c.dir);
    env.top.copy(c.top);
    env.horizon.copy(c.horizon);
    env.fog.copy(c.fog);
    env.sunColor.copy(c.sun);

    const fog = fogRef.current;
    if (fog) {
      fog.color.copy(c.fog);
      fog.density = c.fogD;
    }
    const u = skyMat.uniforms;
    u.uTop.value.copy(c.top);
    u.uHorizon.value.copy(c.horizon);
    u.uSunColor.value.copy(c.sun);
    u.uSunDir.value.copy(c.dir);
    u.uCloudColor.value.copy(c.cloudColor);
    u.uStars.value = c.stars;
    u.uCloud.value = c.cloud;
    u.uFlash.value = flick * 0.8;
    u.uTime.value = s.clock.elapsedTime;
    if (skyRef.current) skyRef.current.position.copy(camera.position);

    if (hemiRef.current) {
      hemiRef.current.color.copy(c.amb).lerp(c.top, 0.35);
      hemiRef.current.groundColor.copy(c.fog).multiplyScalar(0.45);
      hemiRef.current.intensity = c.ambI * 1.15 + flick * 3;
    }
    const sun = sunRef.current;
    if (sun) {
      sun.color.copy(c.sun);
      sun.intensity = c.sunI * 1.6 + flick * 2;
      camera.getWorldDirection(tmp);
      const fx = camera.position.x + tmp.x * 30;
      const fy = camera.position.y + tmp.y * 30;
      const fz = camera.position.z + tmp.z * 30;
      sun.target.position.set(fx, fy, fz);
      sun.target.updateMatrixWorld();
      sun.position.set(fx + c.dir.x * 160, fy + c.dir.y * 160, fz + c.dir.z * 160);
    }
  });

  return (
    <>
      <mesh ref={skyRef} renderOrder={-100} frustumCulled={false} material={skyMat}>
        <sphereGeometry args={[900, 32, 20]} />
      </mesh>
      <hemisphereLight ref={hemiRef} args={["#ffffff", "#444444", 1]} />
      <directionalLight
        ref={sunRef}
        castShadow={q.shadows}
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
    </>
  );
}
