"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DISCOVERIES, HUB, TIMES, WEATHER_LABEL, WORLDS, WORLD_ORDER, discoveriesFor, type TimeOfDay, type Weather, type WorldId } from "../data/worlds";
import { audio } from "../audio/engine";
import { input } from "../lib/input";
import { callDragon, closeDiscovery, goHub, openDiscovery, returnToHub, travelToWorld } from "../store/actions";
import { setState, useStore } from "../store/useStore";
import type { Quality } from "../lib/quality";
import { Icon, Logo } from "./Icon";
import { setVolume, toggleAudio, toggleFullscreen, toggleMute } from "./audioControl";

const KIND_LABEL: Record<string, string> = {
  crystal: "Crystal Formation",
  book: "Ancient Book",
  temple: "Forgotten Temple",
  nest: "Dragon Nest",
  tree: "Sacred Tree",
  statue: "Mysterious Statue",
  chamber: "Hidden Chamber",
  inscription: "Ancient Inscription",
  artifact: "Magical Artifact",
};

function useIsTouch() {
  const [t, setT] = useState(false);
  useEffect(() => setT(window.matchMedia("(pointer: coarse)").matches), []);
  return t;
}

export function Joystick() {
  const pad = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const update = (e: React.PointerEvent) => {
    const r = pad.current!.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    input.move.x = x;
    input.move.y = y;
    if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const end = () => {
    active.current = null;
    input.move.x = 0;
    input.move.y = 0;
    if (knob.current) knob.current.style.transform = "translate(0,0)";
  };
  useEffect(() => end, []);
  return (
    <div className="joy-wrap">
      <div
        ref={pad}
        className="joy"
        onPointerDown={(e) => {
          active.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => active.current === e.pointerId && update(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div ref={knob} className="joy-knob" />
      </div>
      <button className="btn btn-ghost joy-sprint" onPointerDown={() => (input.sprint = true)} onPointerUp={() => (input.sprint = false)} onPointerLeave={() => (input.sprint = false)}>
        Sprint
      </button>
    </div>
  );
}

export function HUD() {
  const phase = useStore((s) => s.phase);
  const scene = useStore((s) => s.scene);
  const camMode = useStore((s) => s.camMode);
  const speed = useStore((s) => s.speed);
  const time = useStore((s) => s.timeOfDay);
  const weather = useStore((s) => s.weather);
  const near = useStore((s) => s.nearDiscovery);
  const audioOn = useStore((s) => s.audioEnabled);
  const muted = useStore((s) => s.muted);
  const discovered = useStore((s) => s.discovered);
  const travel = useStore((s) => s.travelStage);
  const showFps = useStore((s) => s.showFps);
  const touch = useIsTouch();
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const f = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  const isHub = scene === "hub";
  const def = isHub ? null : WORLDS[scene];
  const weathers: Weather[] = isHub ? ["clear", "mist"] : def!.weathers;
  const nearDef = near ? DISCOVERIES.find((d) => d.id === near) : null;
  const count = Object.keys(discovered).length;
  const busy = travel !== "idle";

  const setMode = (m: "cinematic" | "free") => {
    audio.play("click");
    setState({ camMode: m });
  };

  return (
    <div className={`hud ${busy ? "is-busy" : ""}`}>
      <div className="hud-top">
        <div className="hud-left">
          <Logo small onClick={() => !isHub && returnToHub()} />
          <div className="hud-loc">
            <div className="hud-loc-name" style={{ color: def?.accent ?? "#d8ccff" }}>{def ? def.name : HUB.name}</div>
            <div className="hud-loc-sub">{def ? def.subtitle : HUB.subtitle}</div>
          </div>
        </div>
        <div className="hud-right">
          {!isHub && (
            <button className="btn btn-glass" onClick={() => returnToHub()} title="Return to the central hub">
              <Icon name="home" /> <span className="lbl">Hub</span>
            </button>
          )}
          <button className="btn btn-glass" onClick={() => setState({ menu: "worlds" })} title="World selection">
            <Icon name="compass" /> <span className="lbl">Worlds</span>
          </button>
          <button className="btn btn-glass" onClick={() => setState({ menu: "journal" })} title="Discovery journal">
            <Icon name="book" /> <span className="lbl">Journal</span> <b className="badge">{count}</b>
          </button>
          <button className="btn btn-glass" onClick={() => setState({ menu: "settings" })} title="Environment & settings">
            <Icon name="sliders" /> <span className="lbl">Settings</span>
          </button>
          <button className="btn btn-glass icon" onClick={() => toggleAudio()} title={audioOn ? "Disable sound" : "Enable sound"}>
            <Icon name={audioOn && !muted ? "volume" : "mute"} />
          </button>
          <button className="btn btn-glass icon" onClick={() => toggleFullscreen()} title="Fullscreen">
            <Icon name={fs ? "close" : "expand"} />
          </button>
        </div>
      </div>

      {showFps && <div id="mythora-fps" className="fps">— FPS</div>}

      {nearDef && (
        <button className="examine" onClick={() => openDiscovery(nearDef.id)}>
          <span className="examine-key">F</span>
          <span>
            Examine <b>{nearDef.title}</b>
          </span>
        </button>
      )}

      <div className="hud-bottom">
        <div className="hud-box">
          <div className="seg">
            <button className={camMode === "cinematic" ? "on" : ""} onClick={() => setMode("cinematic")}>
              <Icon name="camera" size={15} /> Cinematic
            </button>
            <button className={camMode === "free" ? "on" : ""} onClick={() => setMode("free")}>
              <Icon name="eye" size={15} /> Free
            </button>
          </div>
          <button className="btn btn-glass icon" onClick={() => setState({ resetNonce: useStore.getState().resetNonce + 1 })} title="Reset camera (R)">
            <Icon name="reset" />
          </button>
          {camMode === "free" && (
            <label className="speed" title="Movement speed">
              <span>Speed</span>
              <input type="range" min={0.4} max={3} step={0.1} value={speed} onChange={(e) => setState({ speed: Number(e.target.value) })} />
            </label>
          )}
          {scene === "dragonfall" && (
            <button className="btn btn-ember" onClick={() => callDragon()} title="Summon a dragon fly-by">
              <Icon name="flame" /> <span className="lbl">Call the Elder</span>
            </button>
          )}
        </div>
        <div className="hud-hint">
          {camMode === "free"
            ? touch
              ? "Left pad to move · drag to look · tap glowing relics"
              : `WASD move · drag to look · Shift sprint${scene === "hub" || WORLDS[scene as WorldId]?.id === "evergreen" || scene === "eldoria" ? "" : " · Space / C up & down"} · F examine · R reset`
            : "Cinematic tour — switch to Free to explore"}
        </div>
        <div className="hud-box">
          <div className="seg">
            {TIMES.map((t) => (
              <button key={t} className={time === t ? "on" : ""} onClick={() => setState({ timeOfDay: t })} title={t}>
                <Icon name={t === "day" ? "sun" : t === "sunset" ? "sunset" : "moon"} size={15} />
              </button>
            ))}
          </div>
          <select className="select" value={weather} onChange={(e) => setState({ weather: e.target.value as Weather })} aria-label="Weather">
            {weathers.map((w) => (
              <option key={w} value={w}>
                {WEATHER_LABEL[w]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function Drawer({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className={`glass drawer ${wide ? "wide" : ""}`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="drawer-head">
          <h3>{title}</h3>
          <button className="btn btn-glass icon" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function WorldMenu() {
  const scene = useStore((s) => s.scene);
  const discovered = useStore((s) => s.discovered);
  const busy = useStore((s) => s.travelStage !== "idle");
  return (
    <Drawer title="The Five Gates" wide onClose={() => setState({ menu: "none" })}>
      <div className="world-grid">
        {WORLD_ORDER.map((id) => {
          const w = WORLDS[id];
          const list = discoveriesFor(id);
          const found = list.filter((d) => discovered[d.id]).length;
          const here = scene === id;
          return (
            <div key={id} className="world-card" style={{ ["--accent" as string]: w.accent }}>
              <div className="wc-num">GATE 0{w.index}</div>
              <div className="wc-name">{w.name}</div>
              <div className="wc-sub">{w.subtitle}</div>
              <p>{w.blurb}</p>
              <div className="wc-meta">{found} / {list.length} lore entries · {w.weathers.map((x) => WEATHER_LABEL[x]).join(", ")}</div>
              <button className="btn btn-gold" disabled={here || busy} onClick={() => travelToWorld(id)}>
                {here ? "You are here" : "Travel through portal"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="drawer-foot">
        <button className="btn btn-glass" disabled={scene === "hub" || busy} onClick={() => { setState({ menu: "none" }); returnToHub(); }}>
          <Icon name="home" /> Return to the Hub
        </button>
      </div>
    </Drawer>
  );
}

function Journal() {
  const discovered = useStore((s) => s.discovered);
  const total = DISCOVERIES.length;
  const count = DISCOVERIES.filter((d) => discovered[d.id]).length;
  return (
    <Drawer title="Discovery Journal" onClose={() => setState({ menu: "none" })}>
      <div className="journal-top">
        <div className="journal-ring" style={{ ["--p" as string]: `${(count / total) * 360}deg` }}><span>{count}/{total}</span></div>
        <p>Lore you uncover is written here for this session. Approach a glowing relic and press <b>F</b>, or tap it.</p>
      </div>
      {WORLD_ORDER.map((id) => {
        const w = WORLDS[id];
        const list = discoveriesFor(id);
        return (
          <section key={id} className="journal-sec" style={{ ["--accent" as string]: w.accent }}>
            <h4>{w.name} <small>{list.filter((d) => discovered[d.id]).length}/{list.length}</small></h4>
            {list.map((d) =>
              discovered[d.id] ? (
                <article key={d.id} className="entry found">
                  <div className="entry-title">{d.title}</div>
                  <div className="entry-kind">{KIND_LABEL[d.kind]}</div>
                  <p>{d.lore}</p>
                </article>
              ) : (
                <article key={d.id} className="entry">
                  <div className="entry-title">Undiscovered {KIND_LABEL[d.kind]}</div>
                  <p className="dim">Somewhere in {w.name}, a relic is waiting to be found.</p>
                </article>
              ),
            )}
          </section>
        );
      })}
    </Drawer>
  );
}

function Settings() {
  const q = useStore((s) => s.quality);
  const time = useStore((s) => s.timeOfDay);
  const weather = useStore((s) => s.weather);
  const scene = useStore((s) => s.scene);
  const speed = useStore((s) => s.speed);
  const volume = useStore((s) => s.volume);
  const muted = useStore((s) => s.muted);
  const audioOn = useStore((s) => s.audioEnabled);
  const showFps = useStore((s) => s.showFps);
  const weathers: Weather[] = scene === "hub" ? ["clear", "mist"] : WORLDS[scene].weathers;
  return (
    <Drawer title="Environment & Settings" onClose={() => setState({ menu: "none" })}>
      <div className="set-group">
        <label>Graphics quality</label>
        <div className="seg wide">
          {(["low", "medium", "high"] as Quality[]).map((x) => (
            <button key={x} className={q === x ? "on" : ""} onClick={() => setState({ quality: x, dprScale: 1 })}>
              {x[0].toUpperCase() + x.slice(1)}
            </button>
          ))}
        </div>
        <small>Low: no post-processing, no shadows. Medium: bloom + soft shadows. High: ambient occlusion, full density. Resolution adapts automatically to your frame rate.</small>
      </div>
      <div className="set-group">
        <label>Time of day</label>
        <div className="seg wide">
          {TIMES.map((t: TimeOfDay) => (
            <button key={t} className={time === t ? "on" : ""} onClick={() => setState({ timeOfDay: t })}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="set-group">
        <label>Weather — {scene === "hub" ? "The Convergence" : WORLDS[scene].name}</label>
        <div className="seg wide wrap">
          {weathers.map((w) => (
            <button key={w} className={weather === w ? "on" : ""} onClick={() => setState({ weather: w })}>
              {WEATHER_LABEL[w]}
            </button>
          ))}
        </div>
        <small>Each world supports only the weather that suits it — snow falls only on Dragonfall&apos;s peaks.</small>
      </div>
      <div className="set-group">
        <label>Movement speed · {speed.toFixed(1)}×</label>
        <input type="range" min={0.4} max={3} step={0.1} value={speed} onChange={(e) => setState({ speed: Number(e.target.value) })} />
      </div>
      <div className="set-group">
        <label>Audio</label>
        <div className="row">
          <button className={`btn ${audioOn ? "btn-gold" : "btn-glass"}`} onClick={() => toggleAudio()}>
            <Icon name={audioOn ? "volume" : "mute"} /> {audioOn ? "Sound enabled" : "Enable sound"}
          </button>
          <button className="btn btn-glass" onClick={() => toggleMute()} disabled={!audioOn}>{muted ? "Unmute" : "Mute"}</button>
        </div>
        <input type="range" min={0} max={1} step={0.02} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
        <small>Original synthesised ambience — wind, water, forest, lava, temple halls and magic. Off until you enable it.</small>
      </div>
      <div className="set-group row">
        <label>Show FPS</label>
        <input type="checkbox" checked={showFps} onChange={(e) => setState({ showFps: e.target.checked })} />
      </div>
      <div className="set-group">
        <button className="btn btn-glass" onClick={() => toggleFullscreen()}><Icon name="expand" /> Toggle fullscreen</button>
      </div>
    </Drawer>
  );
}

export function Panels() {
  const menu = useStore((s) => s.menu);
  return (
    <AnimatePresence>
      {menu === "worlds" && <WorldMenu key="w" />}
      {menu === "journal" && <Journal key="j" />}
      {menu === "settings" && <Settings key="s" />}
    </AnimatePresence>
  );
}

export function DiscoveryPanel() {
  const id = useStore((s) => s.activeDiscovery);
  const d = id ? DISCOVERIES.find((x) => x.id === id) : null;
  const total = DISCOVERIES.length;
  const count = useStore((s) => Object.keys(s.discovered).length);
  return (
    <AnimatePresence>
      {d && (
        <motion.aside key={d.id} className="glass discovery" style={{ ["--accent" as string]: d.color }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 240, damping: 26 }} role="dialog" aria-label={d.title}>
          <div className="disc-kicker">{KIND_LABEL[d.kind]} · {WORLDS[d.world].name}</div>
          <h3>{d.title}</h3>
          <p>{d.lore}</p>
          <div className="disc-foot">
            <span className="disc-count">Journal entry recorded · {count}/{total}</span>
            <div>
              <button className="btn btn-glass" onClick={() => { closeDiscovery(); setState({ menu: "journal" }); }}>Open journal</button>
              <button className="btn btn-gold" onClick={() => closeDiscovery()}>Continue</button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function GlobalKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      const s = useStore.getState();
      if (s.phase !== "hub" && s.phase !== "world") return;
      if (e.code === "KeyF" && s.nearDiscovery) openDiscovery(s.nearDiscovery);
      else if (e.code === "Escape") {
        if (s.activeDiscovery) closeDiscovery();
        else if (s.menu !== "none") setState({ menu: "none" });
      } else if (e.code === "KeyR") setState({ resetNonce: s.resetNonce + 1 });
      else if (e.code === "KeyV") setState({ camMode: s.camMode === "free" ? "cinematic" : "free" });
      else if (e.code === "KeyJ") setState({ menu: s.menu === "journal" ? "none" : "journal" });
      else if (e.code === "KeyM") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}

export { goHub };
