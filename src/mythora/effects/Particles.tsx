"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { env } from "../lib/env";
import { mulberry32 } from "../lib/noise";
import { useQ } from "../lib/useQ";

const VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime, uSpeed, uAmp, uRise, uWrap, uSize, uScale;
varying vec4 vSeed; varying float vFade;
#include <fog_pars_vertex>
void main(){
  vSeed = aSeed;
  vec3 p = position;
  float t = uTime*uSpeed;
  vec3 off = vec3(sin(t*(0.5+aSeed.x)+aSeed.y*6.28), sin(t*(0.4+aSeed.y)+aSeed.z*6.28)*0.6, cos(t*(0.5+aSeed.z)+aSeed.w*6.28))*uAmp;
  vFade = 1.;
  if(abs(uRise) > 0.0001){
    float y = mod(position.y + uRise*uTime*(0.6+aSeed.w*0.8) + aSeed.x*uWrap, uWrap);
    p.y = y;
    vFade = smoothstep(0.0,0.12,y/uWrap)*smoothstep(1.0,0.75,y/uWrap);
  }
  p += off;
  vec4 mvPosition = modelViewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mvPosition;
  gl_PointSize = max(1., aSeed.z*uSize*uScale/max(0.1,-mvPosition.z));
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor, uColor2, uTint; uniform float uAlpha, uNightOnly, uLit; 
varying vec4 vSeed; varying float vFade;
#include <fog_pars_fragment>
void main(){
  float d = length(gl_PointCoord-0.5)*2.;
  float a = pow(1.-smoothstep(0.,1.,d),2.);
  float tw = 0.6+0.4*sin(uTime*(1.5+vSeed.x*2.)+vSeed.w*30.);
  float night = mix(1., smoothstep(0.0,0.6,uNight+0.05), uNightOnly);
  vec3 col = mix(uColor, uColor2, vSeed.y);
  col = mix(col, uTint, uLit*0.45) * mix(1.0, 0.28, uNight*uLit);
  gl_FragColor = vec4(col*(1.0+a), a*uAlpha*tw*vFade*night);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export interface ParticleProps {
  count?: number;
  area?: [number, number, number];
  position?: [number, number, number];
  color?: string;
  color2?: string;
  size?: number;
  speed?: number;
  amp?: number;
  rise?: number;
  alpha?: number;
  soft?: boolean;
  nightOnly?: number;
  seed?: number;
  scaleWithQuality?: boolean;
  lit?: boolean;
  followCam?: boolean;
  dynAlpha?: () => number;
}

/** GPU-animated particle field: fireflies, motes, embers, spirits, mist */
export function MagicParticles({ count = 200, area = [60, 20, 60], position = [0, 0, 0], color = "#fff6b0", color2, size = 0.4, speed = 0.6, amp = 2, rise = 0, alpha = 1, soft = false, nightOnly = 0, seed = 1, scaleWithQuality = true, lit = false, followCam = false, dynAlpha }: ParticleProps) {
  const q = useQ();
  const ptsRef = useRef<THREE.Points>(null);
  const n = Math.max(8, Math.floor(count * (scaleWithQuality ? q.particles : 1)));
  const { size: vs, viewport } = useThree();
  const geo = useMemo(() => {
    const rnd = mulberry32(seed * 7919 + n);
    const pos = new Float32Array(n * 3);
    const sd = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rnd() - 0.5) * area[0];
      pos[i * 3 + 1] = rnd() * area[1];
      pos[i * 3 + 2] = (rnd() - 0.5) * area[2];
      sd[i * 4] = rnd();
      sd[i * 4 + 1] = rnd();
      sd[i * 4 + 2] = 0.5 + rnd();
      sd[i * 4 + 3] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 4));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, area[0], area[1], area[2], seed]);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: "uniform float uTime; uniform float uNight;\n" + FRAG,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uNight: { value: 0 },
          uSpeed: { value: speed },
          uAmp: { value: amp },
          uRise: { value: rise },
          uWrap: { value: area[1] },
          uSize: { value: size },
          uScale: { value: 600 },
          uColor: { value: new THREE.Color(color) },
          uColor2: { value: new THREE.Color(color2 ?? color) },
          uAlpha: { value: alpha },
          uNightOnly: { value: nightOnly },
          uLit: { value: lit ? 1 : 0 },
          uTint: { value: new THREE.Color() },
        },
      ]),
      fog: true,
      transparent: true,
      depthWrite: false,
      blending: soft ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, color2, size, speed, amp, rise, alpha, soft, nightOnly, area[1], lit]);

  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uNight.value = env.night;
    if (lit) mat.uniforms.uTint.value.copy(env.horizon);
    if (dynAlpha) {
      const a = dynAlpha();
      mat.uniforms.uAlpha.value = a;
      if (ptsRef.current) ptsRef.current.visible = a > 0.005;
    }
    if (followCam && ptsRef.current) ptsRef.current.position.set(s.camera.position.x, position[1], s.camera.position.z);
    const cam = s.camera as THREE.PerspectiveCamera;
    mat.uniforms.uScale.value = (vs.height * viewport.dpr) / (2 * Math.tan((cam.fov * Math.PI) / 360));
  });
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => mat.dispose(), [mat]);

  return <points ref={ptsRef} geometry={geo} material={mat} position={position} frustumCulled={false} />;
}
