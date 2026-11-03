"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { DISCOVERIES, discoveriesFor, type DiscoveryDef, type WorldId } from "../data/worlds";
import { getPhysics } from "../data/terrain";
import { camState } from "../lib/env";
import { getState, setState, useStore } from "../store/useStore";
import { discoveryPositions, openDiscovery } from "../store/actions";
import { Beam, MagicCircle, RuneWall, useGlowMaterial } from "../effects/Magic";
import { MagicParticles } from "../effects/Particles";
import { mulberry32 } from "../lib/noise";

function Relic({ d }: { d: DiscoveryDef }) {
  const mat = useGlowMaterial(d.color, 1.4);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2623", roughness: 0.7, metalness: 0.4 }), []);
  useEffect(() => () => dark.dispose(), [dark]);
  switch (d.kind) {
    case "crystal":
      return (
        <group>
          <mesh material={mat} scale={[0.6, 1.2, 0.6]}>
            <octahedronGeometry args={[1.1, 0]} />
          </mesh>
          <mesh material={mat} position={[0.8, -0.3, 0.2]} rotation={[0, 0, 0.5]} scale={[0.35, 0.8, 0.35]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh material={mat} position={[-0.7, -0.4, -0.2]} rotation={[0, 0, -0.5]} scale={[0.3, 0.7, 0.3]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
      );
    case "book":
      return (
        <group rotation={[0.35, 0, 0]}>
          <mesh material={dark} position={[-0.55, 0, 0]} rotation={[0, 0, 0.18]}>
            <boxGeometry args={[1.0, 0.1, 1.4]} />
          </mesh>
          <mesh material={dark} position={[0.55, 0, 0]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[1.0, 0.1, 1.4]} />
          </mesh>
          <mesh material={mat} position={[-0.52, 0.09, 0]} rotation={[0, 0, 0.18]}>
            <boxGeometry args={[0.85, 0.02, 1.2]} />
          </mesh>
          <mesh material={mat} position={[0.52, 0.09, 0]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[0.85, 0.02, 1.2]} />
          </mesh>
        </group>
      );
    case "temple":
      return (
        <group>
          <mesh material={mat}>
            <torusGeometry args={[0.9, 0.12, 8, 24]} />
          </mesh>
          <mesh material={mat} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.9, 0.08, 8, 24]} />
          </mesh>
          <mesh material={mat} scale={0.35}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
      );
    case "nest":
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={mat} position={[Math.cos(i * 2.1) * 0.6, 0, Math.sin(i * 2.1) * 0.6]} scale={[0.5, 0.72, 0.5]}>
              <sphereGeometry args={[1, 14, 12]} />
            </mesh>
          ))}
        </group>
      );
    case "tree":
      return (
        <group>
          <mesh material={mat} scale={[0.55, 0.85, 0.55]}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} material={mat} position={[Math.cos(i * 1.57) * 1.2, Math.sin(i) * 0.4, Math.sin(i * 1.57) * 1.2]} scale={[0.35, 0.1, 0.2]} rotation={[0, i, 0.4]}>
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          ))}
        </group>
      );
    case "statue":
      return (
        <group>
          <mesh material={dark} position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.45, 0.6, 0.8, 8]} />
          </mesh>
          <mesh material={mat} position={[0, 0.35, 0]} scale={0.55}>
            <dodecahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
      );
    case "chamber":
      return (
        <group>
          <mesh material={dark} position={[0, -0.2, 0]}>
            <boxGeometry args={[1.5, 0.8, 0.9]} />
          </mesh>
          <mesh material={mat} position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.45, 0.45, 1.5, 12, 1, false, 0, Math.PI]} />
          </mesh>
        </group>
      );
    case "inscription":
      return (
        <group>
          <mesh material={dark}>
            <boxGeometry args={[1.8, 2.2, 0.25]} />
          </mesh>
          <RuneWall position={[0, 0, 0.14]} cols={2} rows={3} cell={0.62} color={d.color} seed={d.id.length * 7} />
        </group>
      );
    default:
      return (
        <mesh material={mat}>
          <torusKnotGeometry args={[0.6, 0.18, 80, 10]} />
        </mesh>
      );
  }
}

function Marker({ d, world }: { d: DiscoveryDef; world: WorldId }) {
  const grp = useRef<THREE.Group>(null);
  const relic = useRef<THREE.Group>(null);
  const hover = useRef(false);
  const found = useStore((s) => !!s.discovered[d.id]);
  const hot = useStore((s) => s.nearDiscovery === d.id || s.activeDiscovery === d.id);
  const y = useMemo(() => {
    if (!d.ground) return d.pos[1];
    const g = getPhysics(world).groundAt(d.pos[0], d.pos[2]);
    return (isFinite(g) ? g : 0) + d.pos[1];
  }, [d, world]);
  const pos: [number, number, number] = [d.pos[0], y, d.pos[2]];
  useEffect(() => {
    discoveryPositions.set(d.id, [pos[0], pos[1] + 2.2, pos[2]]);
    return () => {
      discoveryPositions.delete(d.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.id, y]);

  useFrame((s, dt) => {
    const g = relic.current;
    if (!g) return;
    const t = s.clock.elapsedTime;
    const target = hot || hover.current ? 1.35 : 1;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target * 1.1, 6, dt));
    g.position.y = 2.2 + Math.sin(t * 1.2 + d.pos[0]) * 0.25;
    g.rotation.y += dt * (hot ? 1.4 : 0.5);
  });

  const col = found ? "#ffe6a0" : d.color;
  return (
    <group ref={grp} position={pos}>
      <group ref={relic} position={[0, 2.2, 0]}>
        <Relic d={d} />
        <pointLight color={d.color} intensity={found ? 3 : 8} distance={14} decay={2} />
      </group>
      <Beam height={found ? 10 : 22} radius={0.7} color={col} intensity={hot ? 1.8 : found ? 0.5 : 1} boost={hot ? 0.6 : 0} />
      <MagicCircle position={[0, 0.12, 0]} radius={hot ? 3.6 : 2.6} color={col} spin={hot ? 1.4 : 0.5} />
      <MagicParticles count={26} area={[5, 5, 5]} position={[0, 0.5, 0]} color={col} size={0.18} speed={0.6} amp={0.8} rise={0.8} seed={d.id.length} />
      <mesh
        position={[0, 2.2, 0]}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          openDiscovery(d.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          hover.current = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hover.current = false;
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[3.2, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {(hot || found) && (
        <Html position={[0, 5.6, 0]} center distanceFactor={26} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="mythora-tag">{d.title}</div>
        </Html>
      )}
    </group>
  );
}

/** Proximity detection: publishes the nearest discovery to the store */
function Proximity({ list }: { list: DiscoveryDef[] }) {
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.2) return;
    acc.current = 0;
    const p = camState.position;
    let best: string | null = null;
    let bd = 13;
    for (const d of list) {
      const wp = discoveryPositions.get(d.id);
      if (!wp) continue;
      const dist = Math.hypot(p.x - wp[0], p.y - wp[1], p.z - wp[2]);
      if (dist < bd) {
        bd = dist;
        best = d.id;
      }
    }
    const s = getState();
    if (s.phase !== "hub" && s.phase !== "world") best = null;
    if (s.nearDiscovery !== best) setState({ nearDiscovery: best });
  });
  useEffect(() => () => setState({ nearDiscovery: null }), []);
  return null;
}

export function Discoveries({ world }: { world: WorldId }) {
  const list = useMemo(() => discoveriesFor(world), [world]);
  return (
    <>
      {list.map((d) => (
        <Marker key={d.id} d={d} world={world} />
      ))}
      <Proximity list={list} />
    </>
  );
}

/* ----------------------------- burst effect on discovery ----------------------------- */
const MODE: Record<string, number> = { sparkle: 0, rings: 1, embers: 2, runes: 3, void: 4 };

export function BurstEffects() {
  const burst = useStore((s) => s.burst);
  const { size, viewport } = useThree();
  const pts = useRef<THREE.Points>(null);
  const start = useRef(-10);
  const N = 220;
  const geo = useMemo(() => {
    const rnd = mulberry32(99);
    const sd = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) sd[i] = rnd();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 4));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uP: { value: 1 }, uMode: { value: 0 }, uColor: { value: new THREE.Color("#fff") }, uScale: { value: 600 } },
        vertexShader: /* glsl */ `
attribute vec4 aSeed; uniform float uP, uMode, uScale; varying float vA;
void main(){
  vec3 dir = normalize(aSeed.xyz*2.-1.+vec3(0.001));
  float e = 1.-pow(1.-uP,3.);
  vec3 p;
  if(uMode<0.5){ p = dir*e*7.*(0.5+aSeed.w); p.y -= uP*uP*2.; }
  else if(uMode<1.5){ float a=aSeed.x*6.283; p = vec3(cos(a),0.,sin(a))*e*(4.+aSeed.w*7.); p.y = sin(uP*6.+aSeed.y*6.)*0.4+aSeed.z*1.2; }
  else if(uMode<2.5){ p = vec3(dir.x*3.*e, 1.+uP*(7.+aSeed.w*7.), dir.z*3.*e); }
  else if(uMode<3.5){ float a=aSeed.x*6.283+uP*6.; float r=1.6+aSeed.w*2.2; p = vec3(cos(a)*r, uP*11.*aSeed.z+aSeed.y*3., sin(a)*r); }
  else { float k = uP<0.35 ? (1.-uP/0.35) : (uP-0.35)/0.65*1.5; p = dir*k*(3.+aSeed.w*5.)*(uP<0.35?1.:e); }
  p.y += 2.2;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = max(2., (0.25+aSeed.w*0.3)*uScale/max(0.1,-mv.z));
  vA = pow(1.-uP,1.2)*smoothstep(0.,0.05,uP);
}`,
        fragmentShader: /* glsl */ `uniform vec3 uColor; varying float vA; void main(){ float d=length(gl_PointCoord-.5)*2.; float a=pow(1.-smoothstep(0.,1.,d),2.); gl_FragColor=vec4(uColor*(1.+a*2.),a*vA); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  useEffect(() => {
    if (!burst || !pts.current) return;
    pts.current.position.set(burst.pos[0], burst.pos[1] - 2.2, burst.pos[2]);
    mat.uniforms.uColor.value.set(burst.color);
    mat.uniforms.uMode.value = MODE[burst.effect] ?? 0;
    start.current = performance.now() / 1000;
  }, [burst, mat]);

  useFrame((s) => {
    const p = (performance.now() / 1000 - start.current) / 2.6;
    mat.uniforms.uP.value = Math.min(1, Math.max(0, p));
    if (pts.current) pts.current.visible = p >= 0 && p < 1;
    const cam = s.camera as THREE.PerspectiveCamera;
    mat.uniforms.uScale.value = (size.height * viewport.dpr) / (2 * Math.tan((cam.fov * Math.PI) / 360));
  });
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} visible={false} />;
}

export { DISCOVERIES };
