"use client";
import { useEffect, useState } from "react";
import { audio } from "./audio/engine";
import Experience from "./scene/Experience";
import { useStore, setState } from "./store/useStore";
import { DiscoveryPanel, GlobalKeys, HUD, Joystick, Panels } from "./ui/hud";
import { IntroOverlay, LoadingOverlay, StoryOverlay, Veil, WebglError } from "./ui/overlays";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function MythoraApp() {
  const phase = useStore((s) => s.phase);
  const scene = useStore((s) => s.scene);
  const camMode = useStore((s) => s.camMode);
  const volume = useStore((s) => s.volume);
  const [ok, setOk] = useState<boolean | null>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const good = webglAvailable();
    setOk(good);
    if (!good) setState({ webglError: "Your browser or device does not support WebGL." });
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // keep ambient audio in sync with the current scene
  useEffect(() => {
    audio.setScene(phase === "intro" ? "intro" : scene);
  }, [phase, scene]);
  useEffect(() => {
    audio.setVolume(volume);
  }, [volume]);

  // document scroll is only used by the story chapters (they scroll inside their own container)
  useEffect(() => {
    document.documentElement.classList.add("mythora-lock");
    return () => document.documentElement.classList.remove("mythora-lock");
  }, []);

  const interactive = phase === "hub" || phase === "world";

  return (
    <main className="mythora-root" data-phase={phase}>
      {ok && <Experience />}
      {phase === "intro" && ok && <IntroOverlay />}
      {phase === "story" && <StoryOverlay />}
      {interactive && (
        <>
          <GlobalKeys />
          <HUD />
          <DiscoveryPanel />
          <Panels />
          {touch && camMode === "free" && <Joystick />}
        </>
      )}
      <LoadingOverlay />
      <Veil />
      <WebglError />
    </main>
  );
}
