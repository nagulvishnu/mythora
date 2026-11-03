import gsap from "gsap";
import * as THREE from "three";
import { audio } from "../audio/engine";
import { camState } from "../lib/env";
import { DISCOVERIES, WORLDS, portalPose, type SceneId, type WorldId } from "../data/worlds";
import { getState, setState } from "./useStore";

/** Camera override used while travelling through a portal */
export const travelCam = {
  active: false,
  t: 0,
  from: new THREE.Vector3(),
  fromLook: new THREE.Vector3(),
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  look: new THREE.Vector3(),
};

/** Portal activation 0..1 per world (animated by GSAP, read by shaders) */
export const portalFx: Record<WorldId, { activation: number }> = {
  aetheria: { activation: 0 },
  evergreen: { activation: 0 },
  dragonfall: { activation: 0 },
  eldoria: { activation: 0 },
  umbracia: { activation: 0 },
};

/** Actual world positions of discoveries (ground-adjusted), filled by the scene */
export const discoveryPositions = new Map<string, [number, number, number]>();

const veilProxy = { v: 1 };
function tweenVeil(to: number, duration: number, color?: string) {
  if (color) setState({ veilColor: color });
  veilProxy.v = getState().veil;
  return new Promise<void>((res) => {
    gsap.to(veilProxy, {
      v: to,
      duration,
      ease: "power2.inOut",
      overwrite: true,
      onUpdate: () => setState({ veil: veilProxy.v }),
      onComplete: () => res(),
    });
  });
}

function waitReady(timeout = 30000) {
  return new Promise<void>((res) => {
    const t0 = performance.now();
    const iv = setInterval(() => {
      if (getState().sceneReady || performance.now() - t0 > timeout) {
        clearInterval(iv);
        res();
      }
    }, 80);
  });
}

let swapToken = 0;
async function transition(change: () => void, color = "#000000", inDur = 0.6, outDur = 1.1) {
  const token = ++swapToken;
  await tweenVeil(1, inDur, color);
  if (token !== swapToken) return;
  setState({ sceneReady: false });
  change();
  await new Promise((r) => setTimeout(r, 120));
  await waitReady();
  if (token !== swapToken) return;
  await tweenVeil(0, outDur);
}

export function ensureWeatherValid(scene: SceneId) {
  const s = getState();
  if (scene === "hub") {
    if (s.weather !== "clear" && s.weather !== "mist") setState({ weather: "clear" });
    return;
  }
  if (!WORLDS[scene].weathers.includes(s.weather)) setState({ weather: "clear" });
}

export function startIntroClock() {
  setState({ introStart: performance.now() });
}

export function skipIntro() {
  audio.play("click");
  setState({ introSkipped: true });
}

export function enterStory() {
  audio.play("portal", 0.8);
  return transition(
    () => {
      setState({ phase: "story", scene: "hub", storyIndex: 0, camMode: "cinematic", world: null });
      ensureWeatherValid("hub");
      window.scrollTo(0, 0);
    },
    "#f3e3b5",
    1.0,
    1.4,
  );
}

export function goHub(free = true) {
  const s = getState();
  if (s.travelStage !== "idle") return Promise.resolve();
  return transition(
    () => {
      setState({ phase: "hub", scene: "hub", world: null, camMode: free ? "free" : s.camMode, menu: "none", activeDiscovery: null, nearDiscovery: null, resetNonce: s.resetNonce + 1 });
      ensureWeatherValid("hub");
    },
    "#241b66",
    0.7,
    1.2,
  );
}

export const returnToHub = () => goHub(false);

export function swapStoryScene(scene: SceneId) {
  if (getState().scene === scene) return;
  return transition(
    () => {
      setState({ scene });
      ensureWeatherValid(scene);
    },
    "#000000",
    0.45,
    0.8,
  );
}

export function travelToWorld(id: WorldId) {
  const s = getState();
  if (s.travelStage !== "idle") return;
  if (s.scene !== "hub") {
    returnToHub().then(() => travelToWorld(id));
    return;
  }
  setState({ travelStage: "charging", travelTarget: id, menu: "none", activeDiscovery: null });
  audio.play("portal");
  const p = portalPose(id);
  travelCam.active = true;
  travelCam.t = 0;
  travelCam.from.copy(camState.position);
  travelCam.fromLook.copy(camState.position).addScaledVector(camState.forward, 10);
  travelCam.a.set(p.x - p.nx * 11, 7.5, p.z - p.nz * 11);
  travelCam.b.set(p.x + p.nx * 8, 8, p.z + p.nz * 8);
  travelCam.look.set(p.x, 8, p.z);
  const fx = portalFx[id];
  const color = WORLDS[id].accent;
  const tl = gsap.timeline();
  tl.to(fx, { activation: 1, duration: 2.4, ease: "power2.in" }, 0);
  tl.to(travelCam, { t: 1, duration: 2.4, ease: "power2.inOut" }, 0);
  tl.call(() => setState({ travelStage: "crossing" }), [], 2.4);
  tl.to(travelCam, { t: 2, duration: 1.3, ease: "power2.in" }, 2.4);
  tl.call(
    () => {
      const token = ++swapToken;
      tweenVeil(1, 0.7, color).then(async () => {
        setState({ sceneReady: false, phase: "world", scene: id, world: id, camMode: getState().camMode, activeDiscovery: null, nearDiscovery: null, resetNonce: getState().resetNonce + 1 });
        ensureWeatherValid(id);
        travelCam.active = false;
        fx.activation = 0;
        setState({ travelStage: "idle", travelTarget: null });
        await new Promise((r) => setTimeout(r, 150));
        await waitReady();
        if (token !== swapToken) return;
        await tweenVeil(0, 1.5);
      });
    },
    [],
    3.2,
  );
}

export function callDragon() {
  audio.play("whoosh", 0.5);
  setState({ encounterNonce: getState().encounterNonce + 1 });
}

export function openDiscovery(id: string) {
  const d = DISCOVERIES.find((x) => x.id === id);
  if (!d) return;
  const s = getState();
  const isNew = !s.discovered[id];
  const discovered = isNew ? { ...s.discovered, [id]: Date.now() } : s.discovered;
  if (isNew) {
    try {
      window.sessionStorage.setItem("mythora.journal", JSON.stringify(discovered));
    } catch {
      /* ignore */
    }
  }
  const pos = discoveryPositions.get(id) ?? d.pos;
  audio.play("chime");
  setState({ activeDiscovery: id, discovered, burst: { nonce: Date.now(), pos, color: d.color, effect: d.effect } });
}

export function closeDiscovery() {
  setState({ activeDiscovery: null });
}

export function revealVeil(duration = 4) {
  return tweenVeil(0, duration);
}
