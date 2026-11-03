import * as THREE from "three";
import { windTime } from "./env";

/** Adds GPU wind sway to a standard material (instancing-aware). Sway grows with local height. */
export function windify<T extends THREE.Material>(mat: T, strength = 0.4, height = 10): T {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWindTime = windTime;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWindTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 wp_ = modelMatrix * vec4(transformed,1.);
        #ifdef USE_INSTANCING
          wp_ = modelMatrix * instanceMatrix * vec4(transformed,1.);
        #endif
        float sway_ = clamp(position.y/${height.toFixed(1)},0.,1.);
        sway_ *= sway_;
        transformed.x += sin(uWindTime*1.3 + wp_.x*0.12 + wp_.z*0.09)*${strength.toFixed(2)}*sway_;
        transformed.z += cos(uWindTime*1.1 + wp_.z*0.14 + wp_.x*0.05)*${(strength * 0.7).toFixed(2)}*sway_;`,
      );
  };
  mat.customProgramCacheKey = () => `wind-${strength}-${height}`;
  return mat;
}
