"use client";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useQ } from "../lib/useQ";

export function PostFX() {
  const q = useQ();
  if (!q.post) return null;
  if (q.ao) {
    return (
      <EffectComposer multisampling={0}>
        <N8AO aoRadius={4} distanceFalloff={1.5} intensity={2.2} quality="low" halfRes />
        <Bloom intensity={0.6} luminanceThreshold={0.9} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette offset={0.3} darkness={0.55} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.55} luminanceThreshold={0.92} luminanceSmoothing={0.3} mipmapBlur />
      <Vignette offset={0.3} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
