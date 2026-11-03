"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { WORLDS, WORLD_ORDER, portalPose, type WorldId } from "../data/worlds";
import { makePortalMaterial, useTimeMaterial } from "../effects/materials";
import { Beam, EnergyStream, MagicCircle, RuneWall, useGlowMaterial } from "../effects/Magic";
import { MagicParticles } from "../effects/Particles";
import { FloatingRocks } from "../props/Island";
import { useStone } from "../props/Ruins";
import { portalFx, travelToWorld } from "../store/actions";
import { useStore } from "../store/useStore";

const PORTAL_COLORS: Record<WorldId, [string, string, string]> = {
  aetheria: ["#4a8fe0", "#cfeaff", "#ffe7a8"],
  evergreen: ["#2f9a5a", "#0b3a2a", "#9dffb8"],
  dragonfall: ["#ff5a1a", "#7a1a10", "#ffb05a"],
  eldoria: ["#e8c070", "#6a4a30", "#ffe2a0"],
  umbracia: ["#8a4aff", "#1a0a40", "#5ad0ff"],
};

function PortalFrame({ id }: { id: WorldId }) {
  const accent = WORLDS[id].accent;
  const marble = useStone("#ece6d8", "marble", 2);
  const wood = useStone("#6a5238", "rock", 1);
  const obsidian = useMemo(() => new THREE.MeshStandardMaterial({ color: "#14100f", metalness: 0.7, roughness: 0.3, flatShading: true }), []);
  const stone = useStone("#9a927c", "brick", 2);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b1433", metalness: 0.7, roughness: 0.3, flatShading: true }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e0b84a", metalness: 0.9, roughness: 0.25 }), []);
  const moss = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3f8a4a", roughness: 1, flatShading: true }), []);
  const glow = useGlowMaterial(accent, 1.8, { flatShading: false });
  useEffect(() => () => { obsidian.dispose(); dark.dispose(); gold.dispose(); moss.dispose(); }, [obsidian, dark, gold, moss]);
  const spin = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (spin.current) spin.current.rotation.z = s.clock.elapsedTime * (id === "umbracia" ? 0.15 : 0.3);
  });
  const ringArc = (rad: number, tube: number, mat: THREE.Material) => (
    <mesh material={mat} position={[0, 9, 0]} scale={[0.64, 1, 1]} castShadow>
      <torusGeometry args={[rad, tube, 10, 56]} />
    </mesh>
  );
  switch (id) {
    case "aetheria":
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 6.4, 0, 0]}>
              <mesh material={marble} position={[0, 9.5, 0]} castShadow>
                <cylinderGeometry args={[0.95, 1.2, 19, 14]} />
              </mesh>
              <mesh material={gold} position={[0, 19.2, 0]}>
                <cylinderGeometry args={[1.5, 1.2, 0.8, 14]} />
              </mesh>
              <mesh material={marble} position={[0, 0.6, 0]}>
                <boxGeometry args={[3.2, 1.2, 3.2]} />
              </mesh>
              <mesh material={marble} position={[s * 1.4, 17, 0]} rotation={[0, 0, -s * 0.9]} scale={[0.4, 5, 2]}>
                <boxGeometry args={[1, 1, 1]} />
              </mesh>
            </group>
          ))}
          {ringArc(8.6, 0.55, marble)}
          {ringArc(8.9, 0.14, glow)}
          <group ref={spin} position={[0, 9, 0]}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} material={gold} position={[Math.cos(i * 2.09) * 10.6, Math.sin(i * 2.09) * 10.6, 0]}>
                <octahedronGeometry args={[0.6, 0]} />
              </mesh>
            ))}
          </group>
        </group>
      );
    case "evergreen":
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} material={wood} position={[s * 6.2, 9, 0]} rotation={[0, 0, s * 0.06]} castShadow>
              <cylinderGeometry args={[0.9, 1.9, 19, 8]} />
            </mesh>
          ))}
          {ringArc(8.6, 0.8, wood)}
          {ringArc(8.4, 0.12, glow)}
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <mesh key={i} material={moss} position={[Math.cos(a) * 5.7, 9 + Math.sin(a) * 8.9, 0.2]} scale={[1.1, 0.45, 0.8]} rotation={[0, 0, a]}>
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
            );
          })}
          {[-1, 1].map((s) => (
            <mesh key={s} material={glow} position={[s * 4, 15, 0.8]}>
              <sphereGeometry args={[0.4, 10, 8]} />
            </mesh>
          ))}
        </group>
      );
    case "dragonfall":
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 6.3, 0, 0]}>
              <mesh material={obsidian} position={[0, 9, 0]} castShadow>
                <boxGeometry args={[2.4, 18, 2.4]} />
              </mesh>
              <mesh material={obsidian} position={[0, 19.5, 0]} castShadow>
                <coneGeometry args={[1.8, 4, 4]} />
              </mesh>
              <mesh material={glow} position={[0, 9, 1.22]} scale={[0.14, 15, 0.1]}>
                <boxGeometry args={[1, 1, 1]} />
              </mesh>
              <mesh material={obsidian} position={[s * 1.8, 17, 0]} rotation={[0, 0, -s * 0.7]}>
                <coneGeometry args={[0.5, 5, 5]} />
              </mesh>
            </group>
          ))}
          {ringArc(8.7, 0.7, obsidian)}
          {ringArc(8.4, 0.12, glow)}
          {[-3, 0, 3].map((x) => (
            <mesh key={x} material={obsidian} position={[x, 18.6, 0]} rotation={[0, 0, -x * 0.12]}>
              <coneGeometry args={[0.45, 3.2 - Math.abs(x) * 0.3, 5]} />
            </mesh>
          ))}
          <MagicParticles count={30} area={[2, 3, 2]} position={[-6.3, 20, 0]} color="#ff9a30" size={0.7} rise={2} speed={1.3} amp={0.3} seed={1} />
          <MagicParticles count={30} area={[2, 3, 2]} position={[6.3, 20, 0]} color="#ff9a30" size={0.7} rise={2} speed={1.3} amp={0.3} seed={2} />
        </group>
      );
    case "eldoria":
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 6.3, 0, 0]}>
              <mesh material={stone} position={[0, 9, 0]} castShadow>
                <boxGeometry args={[2.6, 18, 2.6]} />
              </mesh>
              <mesh material={stone} position={[0, 0.7, 0]}>
                <boxGeometry args={[4, 1.4, 4]} />
              </mesh>
              <RuneWall position={[0, 9, 1.35]} cols={1} rows={6} cell={2.2} color="#ffe2a0" seed={s + 3} />
            </group>
          ))}
          <mesh material={stone} position={[0, 19.2, 0]} castShadow>
            <boxGeometry args={[16, 2, 3]} />
          </mesh>
          <mesh material={stone} position={[-5, 21, 0]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[5, 1.6, 2.6]} />
          </mesh>
          {ringArc(8.5, 0.16, glow)}
        </group>
      );
    default:
      return (
        <group>
          <group ref={spin} position={[0, 9, 0]}>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} material={dark} rotation={[0, 0, (i / 8) * Math.PI * 2]} scale={[0.64, 1, 1]} castShadow>
                <torusGeometry args={[9, 0.7, 8, 12, Math.PI / 4 - 0.18]} />
              </mesh>
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} material={glow} rotation={[0, 0, (i / 8) * Math.PI * 2]} scale={[0.64, 1, 1]}>
                <torusGeometry args={[9, 0.1, 6, 12, Math.PI / 4 - 0.18]} />
              </mesh>
            ))}
          </group>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} material={dark} position={[(i - 2) * 3.4, 2 + (i % 2) * 15, 0]} rotation={[i, i * 2, 0]} scale={[0.8, 2 + (i % 3), 0.8]}>
              <octahedronGeometry args={[1, 0]} />
            </mesh>
          ))}
        </group>
      );
  }
}

function Portal({ id }: { id: WorldId }) {
  const def = WORLDS[id];
  const p = portalPose(id);
  const [c1, c2, c3] = PORTAL_COLORS[id];
  const type = WORLD_ORDER.indexOf(id);
  const mat = useTimeMaterial(() => makePortalMaterial(type, c1, c2, c3), [type]);
  const [hover, setHover] = useState(false);
  const busy = useStore((s) => s.travelStage !== "idle");
  const target = useStore((s) => s.travelTarget);
  const discovered = useStore((s) => s.discovered);
  const hv = useRef(0);
  const beamBoost = useRef(0);
  const count = Object.keys(discovered).filter((k) => k.startsWith(id.slice(0, 3))).length;
  useFrame((_, dt) => {
    hv.current = THREE.MathUtils.damp(hv.current, hover ? 1 : 0, 6, dt);
    mat.uniforms.uHover.value = hv.current;
    mat.uniforms.uAct.value = portalFx[id].activation;
    beamBoost.current = portalFx[id].activation;
  });
  useEffect(() => {
    if (!hover) return;
    document.body.style.cursor = busy ? "" : "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover, busy]);
  const go = () => {
    if (!busy) travelToWorld(id);
  };
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, Math.atan2(-p.nx, -p.nz), 0]}>
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <cylinderGeometry args={[9, 10, 0.8, 24]} />
        <meshStandardMaterial color="#2a2540" metalness={0.5} roughness={0.5} />
      </mesh>
      <PortalFrame id={id} />
      <mesh
        position={[0, 9, 0]}
        material={mat}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          go();
        }}
      >
        <planeGeometry args={[10.4, 16.4]} />
      </mesh>
      <MagicCircle position={[0, 0.9, 6]} radius={5.4} color={def.accent} />
      <MagicParticles count={50} area={[10, 17, 3]} position={[0, 0.5, 0]} color={c3} size={0.22} speed={0.7} amp={1.4} rise={1.2} seed={WORLD_ORDER.indexOf(id) + 1} />
      <Beam position={[0, 18, 0]} height={40} radius={1.4} color={def.accent} intensity={0.5} boost={beamBoost.current} />
      <pointLight color={def.accent} intensity={80} distance={46} decay={2} position={[0, 9, 5]} />
      <Html position={[0, 24, 0]} center distanceFactor={26} zIndexRange={[20, 0]}>
        <div className={`portal-label ${hover || target === id ? "is-hot" : ""}`} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
          <div className="portal-num">GATE {String(def.index).padStart(2, "0")}</div>
          <div className="portal-name" style={{ color: def.accent }}>{def.name}</div>
          <div className="portal-sub">{def.subtitle}</div>
          <div className="portal-desc">{def.blurb}</div>
          <div className="portal-meta">{count} / 4 lore entries</div>
          <button className="portal-go" disabled={busy} onClick={go}>{target === id ? "Opening…" : "Enter Portal"}</button>
        </div>
      </Html>
    </group>
  );
}

export default function Hub() {
  const marble = useStone("#cfc8e0", "marble", 4);
  const star = useGlowMaterial("#ffffff", 2.4, { flatShading: true });
  const crystal = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (crystal.current) {
      crystal.current.rotation.y = s.clock.elapsedTime * 0.4;
      crystal.current.position.y = 9 + Math.sin(s.clock.elapsedTime * 0.8) * 0.6;
    }
  });
  const streams = useMemo(
    () =>
      WORLD_ORDER.map((id) => {
        const p = portalPose(id);
        return { id, pts: [[0, 8, 0], [p.x * 0.35, 2.5, p.z * 0.35], [p.x * 0.7, 0.4, p.z * 0.7], [p.x * 0.88, 0.5, p.z * 0.88]] as [number, number, number][] };
      }),
    [],
  );
  return (
    <>
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <cylinderGeometry args={[43, 40, 3, 64]} />
        <primitive object={marble} attach="material" />
      </mesh>
      <mesh position={[0, -12, 0]}>
        <coneGeometry args={[40, 22, 24]} />
        <meshStandardMaterial color="#1b1633" roughness={0.9} flatShading />
      </mesh>
      <MagicCircle position={[0, 0.06, 0]} radius={40} color="#b8a8ff" spin={0.1} />
      <MagicCircle position={[0, 0.08, 0]} radius={14} color="#ffe7a8" spin={-0.3} />
      {WORLD_ORDER.map((id) => {
        const p = portalPose(id);
        return <MagicCircle key={id} position={[p.x * 0.55, 0.1, p.z * 0.55]} radius={3.2} color={WORLDS[id].accent} />;
      })}
      {/* world heart */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[2.6, 3.4, 2.4, 10]} />
        <primitive object={marble} attach="material" />
      </mesh>
      <group ref={crystal} position={[0, 9, 0]}>
        <mesh material={star} scale={[1.6, 2.6, 1.6]}>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
        {WORLD_ORDER.map((id, i) => (
          <mesh key={id} position={[Math.cos((i / 5) * 6.283) * 3.4, Math.sin(i) * 0.8, Math.sin((i / 5) * 6.283) * 3.4]} scale={0.5}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={WORLDS[id].accent} emissive={WORLDS[id].accent} emissiveIntensity={2} />
          </mesh>
        ))}
      </group>
      <Beam position={[0, 10, 0]} height={120} radius={2} color="#d8ccff" intensity={0.7} />
      <pointLight color="#d8ccff" intensity={120} distance={60} decay={2} position={[0, 10, 0]} />
      {streams.map((s) => (
        <EnergyStream key={s.id} points={s.pts} color={WORLDS[s.id].accent} radius={0.14} />
      ))}
      {WORLD_ORDER.map((id) => (
        <Portal key={id} id={id} />
      ))}
      <FloatingRocks count={30} inner={50} outer={120} yMin={-30} yMax={40} color="#3a3260" emissive="#6a50ff" seed={5} size={[1.5, 6]} speed={0.03} />
      <MagicParticles count={500} area={[260, 90, 260]} position={[0, -20, 0]} color="#d0c8ff" color2="#ffe7a8" size={0.35} speed={0.3} amp={3} rise={0.5} alpha={0.9} seed={8} />
    </>
  );
}
