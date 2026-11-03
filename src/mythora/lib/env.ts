import * as THREE from "three";

/** Mutable, per-frame environment state shared by systems (no React re-render). */
export const env = {
  night: 0, // 0 day .. 1 night
  glow: 0.6, // emissive multiplier
  rain: 0,
  snow: 0,
  mist: 0,
  storm: 0,
  lightning: 0,
  shake: 0,
  sunDir: new THREE.Vector3(0.3, 0.8, 0.4).normalize(),
  top: new THREE.Color("#4080d0"),
  horizon: new THREE.Color("#c0e0f5"),
  fog: new THREE.Color("#a0c0e0"),
  sunColor: new THREE.Color("#ffffff"),
};

/** Camera state published by the rig for any system that needs it */
export const camState = {
  position: new THREE.Vector3(),
  forward: new THREE.Vector3(0, 0, -1),
  speed: 0,
};

export const windTime = { value: 0 };
