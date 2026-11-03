import { audio } from "../audio/engine";
import { getState, setState } from "../store/useStore";

export async function toggleAudio() {
  const s = getState();
  if (!s.audioEnabled) {
    await audio.enable();
    audio.setVolume(s.volume);
    audio.setMuted(s.muted);
    setState({ audioEnabled: true });
    audio.setScene(s.phase === "intro" ? "intro" : s.scene);
    audio.play("chime", 0.6);
  } else {
    await audio.disable();
    setState({ audioEnabled: false });
  }
}

export function setVolume(v: number) {
  audio.setVolume(v);
  setState({ volume: v });
}

export function toggleMute() {
  const m = !getState().muted;
  audio.setMuted(m);
  setState({ muted: m });
}

export async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    /* fullscreen not available */
  }
}
