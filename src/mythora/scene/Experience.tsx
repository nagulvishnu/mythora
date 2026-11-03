"use client";
import { Component, Suspense, lazy, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { SceneId } from "../data/worlds";
import { QUALITY, type Quality } from "../lib/quality";
import { windTime } from "../lib/env";
import { getState, setState, useStore } from "../store/useStore";
import { Atmosphere } from "./Atmosphere";
import { BurstEffects, Discoveries } from "./Discoveries";
import { CameraRig } from "./CameraRig";
import { PostFX } from "./PostFX";
import { Weather } from "./Weather";
import Hub from "./Hub";

const WORLD_COMPONENTS: Record<string, ComponentType> = {
  aetheria: lazy(() => import("../worlds/Aetheria")),
  evergreen: lazy(() => import("../worlds/Evergreen")),
  dragonfall: lazy(() => import("../worlds/Dragonfall")),
  eldoria: lazy(() => import("../worlds/Eldoria")),
  umbracia: lazy(() => import("../worlds/Umbracia")),
};

function ReadySignal() {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current === 10 && !getState().sceneReady) setState({ sceneReady: true });
  });
  return null;
}

function WindClock() {
  useFrame((s) => {
    windTime.value = s.clock.elapsedTime;
  });
  return null;
}

function FpsProbe() {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.t += dt;
    a.n++;
    if (a.t > 0.5) {
      const el = document.getElementById("mythora-fps");
      if (el) el.textContent = `${Math.round(a.n / a.t)} FPS`;
      a.t = 0;
      a.n = 0;
    }
  });
  return null;
}

function SceneContent({ id }: { id: SceneId }) {
  const World = id === "hub" ? null : WORLD_COMPONENTS[id];
  return (
    <>
      <Atmosphere sceneId={id} />
      <Weather />
      <Suspense fallback={null}>
        {World ? <World /> : <Hub />}
        {id !== "hub" && <Discoveries world={id} />}
        <ReadySignal />
      </Suspense>
    </>
  );
}

class Boundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { err: e.message };
  }
  componentDidCatch(e: Error) {
    setState({ webglError: e.message });
  }
  render() {
    if (this.state.err) return null;
    return this.props.children;
  }
}

const STEP_DOWN: Record<Quality, Quality> = { high: "medium", medium: "low", low: "low" };

export default function Experience() {
  const scene = useStore((s) => s.scene);
  const quality = useStore((s) => s.quality);
  const dprScale = useStore((s) => s.dprScale);
  const q = QUALITY[quality];

  useEffect(() => {
    document.body.style.cursor = "";
  }, [scene]);

  return (
    <Boundary>
      <Canvas
        shadows={q.shadows ? { type: THREE.PCFSoftShadowMap } : false}
        dpr={[0.55, Math.max(0.6, q.dpr * dprScale)]}
        camera={{ fov: 56, near: 0.3, far: 2800, position: [0, 40, 100] }}
        gl={{ antialias: !q.post, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000");
        }}
        style={{ position: "fixed", inset: 0, touchAction: "none" }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            const s = getState();
            setState({ dprScale: Math.max(0.55, s.dprScale - 0.15) });
          }}
          onIncline={() => {
            const s = getState();
            setState({ dprScale: Math.min(1, s.dprScale + 0.1) });
          }}
          onFallback={() => {
            const s = getState();
            if (s.dprScale <= 0.6 && s.quality !== "low") setState({ quality: STEP_DOWN[s.quality], dprScale: 1 });
          }}
        />
        <WindClock />
        <CameraRig />
        <SceneContent key={scene} id={scene} />
        <BurstEffects />
        <PostFX />
        <FpsProbe />
      </Canvas>
    </Boundary>
  );
}
