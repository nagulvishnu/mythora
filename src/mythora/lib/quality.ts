export type Quality = "low" | "medium" | "high";

export interface QualitySettings {
  dpr: number;
  shadows: boolean;
  shadowMap: number;
  particles: number;
  density: number;
  seg: number;
  creatures: number;
  post: boolean;
  ao: boolean;
  dof: boolean;
}

export const QUALITY: Record<Quality, QualitySettings> = {
  low: { dpr: 1, shadows: false, shadowMap: 512, particles: 0.35, density: 0.4, seg: 0.55, creatures: 0.5, post: false, ao: false, dof: false },
  medium: { dpr: 1.5, shadows: true, shadowMap: 1024, particles: 0.7, density: 0.75, seg: 0.8, creatures: 0.8, post: true, ao: false, dof: false },
  high: { dpr: 2, shadows: true, shadowMap: 2048, particles: 1, density: 1, seg: 1, creatures: 1, post: true, ao: true, dof: true },
};

export function detectQuality(): Quality {
  if (typeof navigator === "undefined") return "medium";
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia?.("(pointer: coarse)").matches;
  if (mobile) return "low";
  const cores = navigator.hardwareConcurrency || 4;
  return cores >= 12 ? "high" : "medium";
}
