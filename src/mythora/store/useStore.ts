import { create } from "zustand";
import { detectQuality, type Quality } from "../lib/quality";
import type { SceneId, TimeOfDay, Weather, WorldId } from "../data/worlds";

export type Phase = "intro" | "story" | "hub" | "world";
export type CamMode = "cinematic" | "free";
export type Menu = "none" | "worlds" | "journal" | "settings";
export type TravelStage = "idle" | "charging" | "crossing";

export interface BurstEvent {
  nonce: number;
  pos: [number, number, number];
  color: string;
  effect: string;
}

interface State {
  phase: Phase;
  scene: SceneId;
  world: WorldId | null;
  introSkipped: boolean;
  introStart: number;
  storyIndex: number;
  storyProgress: number;

  camMode: CamMode;
  speed: number;
  resetNonce: number;
  menu: Menu;
  uiHidden: boolean;

  timeOfDay: TimeOfDay;
  weather: Weather;
  quality: Quality;
  dprScale: number;
  showFps: boolean;

  audioEnabled: boolean;
  volume: number;
  muted: boolean;

  discovered: Record<string, number>;
  nearDiscovery: string | null;
  activeDiscovery: string | null;
  burst: BurstEvent | null;

  travelStage: TravelStage;
  travelTarget: WorldId | null;
  veil: number;
  veilColor: string;
  sceneReady: boolean;
  encounterNonce: number;
  webglError: string | null;

  set: (p: Partial<State>) => void;
}

function loadDiscovered(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem("mythora.journal") || "{}");
  } catch {
    return {};
  }
}

export const useStore = create<State>()((set) => ({
  phase: "intro",
  scene: "aetheria",
  world: null,
  introSkipped: false,
  introStart: 0,
  storyIndex: 0,
  storyProgress: 0,

  camMode: "cinematic",
  speed: 1,
  resetNonce: 0,
  menu: "none",
  uiHidden: false,

  timeOfDay: "day",
  weather: "clear",
  quality: detectQuality(),
  dprScale: 1,
  showFps: false,

  audioEnabled: false,
  volume: 0.6,
  muted: false,

  discovered: loadDiscovered(),
  nearDiscovery: null,
  activeDiscovery: null,
  burst: null,

  travelStage: "idle",
  travelTarget: null,
  veil: 1,
  veilColor: "#000000",
  sceneReady: false,
  encounterNonce: 0,
  webglError: null,

  set: (p) => set(p),
}));

export const getState = () => useStore.getState();
export const setState = (p: Partial<State>) => useStore.setState(p);
