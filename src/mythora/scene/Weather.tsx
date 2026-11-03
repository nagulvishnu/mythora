"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { env } from "../lib/env";
import { mulberry32 } from "../lib/noise";
import { useQ } from "../lib/useQ";
import { MagicParticles } from "../effects/Particles";

function Rain() {
  const q = useQ();
  const n = Math.floor(2600 * q.particles);
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => {
    const rnd = mulberry32(5);
    const base = new Float32Array(n * 2 * 3);
    const end = new Float32Array(n * 2);
    const spd = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const bx = rnd();
      const by = rnd();
      const bz = rnd();
      const sp = 30 + rnd() * 14;
      for (let k = 0; k < 2; k++) {
        const j = i * 2 + k;
        base[j * 3] = bx;
        base[j * 3 + 1] = by;
        base[j * 3 + 2] = bz;
        end[j] = k;
        spd[j] = sp;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
    g.setAttribute("aBase", new THREE.BufferAttribute(base, 3));
    g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(spd, 1));
    return g;
  }, [n]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uAlpha: { value: 0 }, uWind: { value: 0.3 } },
        vertexShader: /* glsl */ `
attribute vec3 aBase; attribute float aEnd; attribute float aSpeed;
uniform vec3 uCam; uniform float uTime, uAlpha, uWind; varying float vA;
void main(){
  vec3 p;
  p.x = uCam.x + mod(aBase.x*70. - uCam.x, 70.) - 35.;
  p.z = uCam.z + mod(aBase.z*70. - uCam.z, 70.) - 35.;
  p.y = uCam.y + mod(aBase.y*50. - uTime*aSpeed - uCam.y, 50.) - 25.;
  p += aEnd*vec3(uWind,1.,uWind*0.3)*(0.9+uWind);
  vA = uAlpha*(aEnd>0.5?0.04:0.45);
  gl_Position = projectionMatrix*viewMatrix*vec4(p,1.);
}`,
        fragmentShader: /* glsl */ `varying float vA; void main(){ gl_FragColor = vec4(0.72,0.8,0.92,vA); }`,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((s) => {
    mat.uniforms.uCam.value.copy(s.camera.position);
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uAlpha.value = env.rain;
    mat.uniforms.uWind.value = 0.25 + env.storm * 0.9;
    if (ref.current) ref.current.visible = env.rain > 0.01;
  });
  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

function Snow() {
  const q = useQ();
  const n = Math.floor(2200 * q.particles);
  const ref = useRef<THREE.Points>(null);
  const { size, viewport } = useThree();
  const geo = useMemo(() => {
    const rnd = mulberry32(9);
    const base = new Float32Array(n * 3);
    const sd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      base[i * 3] = rnd();
      base[i * 3 + 1] = rnd();
      base[i * 3 + 2] = rnd();
      sd[i] = 0.4 + rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aBase", new THREE.BufferAttribute(base, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sd, 1));
    return g;
  }, [n]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uAlpha: { value: 0 }, uScale: { value: 600 } },
        vertexShader: /* glsl */ `
attribute vec3 aBase; attribute float aSize; uniform vec3 uCam; uniform float uTime, uAlpha, uScale; varying float vA;
void main(){
  vec3 p;
  p.x = uCam.x + mod(aBase.x*60. - uCam.x, 60.) - 30.;
  p.z = uCam.z + mod(aBase.z*60. - uCam.z, 60.) - 30.;
  p.y = uCam.y + mod(aBase.y*40. - uTime*(1.2+aSize) - uCam.y, 40.) - 20.;
  p.x += sin(uTime*0.7+aBase.y*40.)*1.2; p.z += cos(uTime*0.6+aBase.x*40.)*1.2;
  vec4 mv = viewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = max(1.5, 0.07*aSize*uScale/max(0.1,-mv.z));
  vA = uAlpha;
}`,
        fragmentShader: /* glsl */ `varying float vA; void main(){ float d=length(gl_PointCoord-0.5)*2.; float a=1.-smoothstep(0.4,1.,d); gl_FragColor=vec4(1.,1.,1.,a*vA*0.85); }`,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((s) => {
    mat.uniforms.uCam.value.copy(s.camera.position);
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uAlpha.value = env.snow;
    const cam = s.camera as THREE.PerspectiveCamera;
    mat.uniforms.uScale.value = (size.height * viewport.dpr) / (2 * Math.tan((cam.fov * Math.PI) / 360));
    if (ref.current) ref.current.visible = env.snow > 0.01;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/** Weather layers; intensity is driven by the smoothed env state so changes fade in/out */
export function Weather({ allowSnow = true }: { allowSnow?: boolean }) {
  return (
    <>
      <Rain />
      {allowSnow && <Snow />}
      <MagicParticles count={60} area={[220, 16, 220]} position={[0, 0, 0]} size={70} speed={0.08} amp={12} alpha={0.12} soft color="#d8d0f5" seed={21} followCam dynAlpha={() => env.mist * 0.5 + env.storm * 0.1} lit />
    </>
  );
}
