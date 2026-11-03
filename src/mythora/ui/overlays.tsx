"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useProgress } from "@react-three/drei";
import { audio } from "../audio/engine";
import { WORLDS, WORLD_ORDER, type SceneId } from "../data/worlds";
import { enterStory, goHub, revealVeil, skipIntro, startIntroClock, swapStoryScene, travelToWorld } from "../store/actions";
import { setState, useStore } from "../store/useStore";
import { Icon, Logo } from "./Icon";
import { toggleAudio } from "./audioControl";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function Veil() {
  const v = useStore((s) => s.veil);
  const c = useStore((s) => s.veilColor);
  return <div className="veil" style={{ opacity: v, background: c, pointerEvents: v > 0.98 ? "auto" : "none" }} />;
}

export function LoadingOverlay() {
  const ready = useStore((s) => s.sceneReady);
  const scene = useStore((s) => s.scene);
  const phase = useStore((s) => s.phase);
  const { progress, active } = useProgress();
  const name = scene === "hub" ? "The Convergence" : WORLDS[scene].name;
  const pct = ready ? 100 : Math.max(4, Math.round(active ? progress : 60));
  return (
    <div className={`loading ${ready ? "is-done" : ""}`} aria-live="polite" role="status">
      <div className="loading-inner">
        <div className="loading-rune">✦</div>
        <div className="loading-title">{phase === "intro" ? "MYTHORA" : `Entering ${name}`}</div>
        <div className="loading-bar"><span style={{ width: `${pct}%` }} /></div>
        <div className="loading-sub">{pct}% · conjuring the world</div>
      </div>
    </div>
  );
}

export function WebglError() {
  const err = useStore((s) => s.webglError);
  if (!err) return null;
  return (
    <div className="fatal">
      <div className="glass fatal-card">
        <h2>The veil could not be opened</h2>
        <p>MYTHORA needs WebGL to render its worlds. {err}</p>
        <button className="btn btn-gold" onClick={() => window.location.reload()}>Try again</button>
      </div>
    </div>
  );
}

export function IntroOverlay() {
  const ready = useStore((s) => s.sceneReady);
  const skipped = useStore((s) => s.introSkipped);
  const audioOn = useStore((s) => s.audioEnabled);
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [showEnter, setShowEnter] = useState(false);

  useEffect(() => {
    if (!ready || tl.current) return;
    startIntroClock();
    revealVeil(7);
    const ctx = gsap.context(() => {
      const t = gsap.timeline();
      t.fromTo(".intro-l1", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 2 }, 1.4)
        .to(".intro-l1", { opacity: 0, duration: 1.4 }, 5.4)
        .fromTo(".intro-l2", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 2 }, 7)
        .to(".intro-l2", { opacity: 0, duration: 1.4 }, 11)
        .fromTo(".intro-title span", { opacity: 0, y: 34, filter: "blur(14px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.7, stagger: 0.12, ease: "power3.out" }, 13.5)
        .fromTo(".intro-tag", { opacity: 0, letterSpacing: "0.9em" }, { opacity: 1, letterSpacing: "0.5em", duration: 2.2, ease: "power2.out" }, 16)
        .call(() => setShowEnter(true), [], 19);
      tl.current = t;
    }, root);
    return () => ctx.revert();
  }, [ready]);

  useEffect(() => {
    if (!skipped) return;
    tl.current?.progress(1);
    setShowEnter(true);
    revealVeil(1.2);
  }, [skipped]);

  return (
    <div className="intro" ref={root}>
      {!skipped && ready && !showEnter && (
        <button className="btn btn-ghost intro-skip" onClick={skipIntro}>Skip intro ▸▸</button>
      )}
      <div className="intro-center">
        <p className="intro-l1 intro-line">In the silence before the first dawn…</p>
        <p className="intro-l2 intro-line">…five worlds waited beyond the veil.</p>
        <h1 className="intro-title" aria-label="MYTHORA">
          {"MYTHORA".split("").map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </h1>
        <p className="intro-tag">WORLDS BEYOND REALITY.</p>
        <div className={`intro-actions ${showEnter ? "is-on" : ""}`}>
          <button className="enter-btn" onClick={() => enterStory()} disabled={!showEnter}>
            <svg className="enter-ring" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 5" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.4" />
            </svg>
            <span>ENTER MYTHORA</span>
          </button>
          <button className="btn btn-ghost" onClick={() => toggleAudio()}>
            <Icon name={audioOn ? "volume" : "mute"} /> {audioOn ? "Sound on" : "Enable sound"}
          </button>
        </div>
      </div>
    </div>
  );
}

const SECTIONS: { scene: SceneId; kicker: string; title: string; text: string; world?: number }[] = [
  { scene: "hub", kicker: "Chapter I", title: "Beyond Reality", text: "MYTHORA is not a place on any map. It is a convergence — five living worlds braided around a single hall of gates, each one older than memory and still quietly dreaming." },
  { scene: "aetheria", kicker: "Chapter II · Aetheria", title: "Kingdom Above the Clouds", text: "Marble spires, crystal gardens and waterfalls that fall into an ocean of cloud. A colossal sky-castle watches over islands that drifted free of the earth and never looked back." },
  { scene: "evergreen", kicker: "Chapter III · Evergreen", title: "The Forest That Remembers", text: "Every root is a sentence, every firefly a thought of the Sacred Tree. By day it is peaceful. By night the whole wood glows, and the stags lower their luminous antlers to drink." },
  { scene: "dragonfall", kicker: "Chapter IV · Dragonfall", title: "The Age of Dragons", text: "Rivers of lava, cathedral-sized peaks and a sky that never stops burning. The elders still ride the thermals here — and sometimes they fly low enough to feel their wings." },
  { scene: "eldoria", kicker: "Chapter V · Eldoria", title: "Secrets of the Lost Civilization", text: "A headless king, a library that kept its last secret and a vault sealed beneath the grass. Walk the avenue of broken statues and read what the stones still want to say." },
  { scene: "umbracia", kicker: "Chapter VI · Umbracia", title: "The World Beyond Shadows", text: "Gravity forgets itself. The sea is black glass. At the heart of the rift a machine nobody built turns slowly, and something enormous turns with it." },
  { scene: "hub", kicker: "Chapter VII", title: "The Five Portals", text: "Choose a gate. Each portal is a real doorway — the camera will carry you through it and into the world beyond." },
  { scene: "hub", kicker: "Chapter VIII", title: "Your Journey Begins", text: "Walk the hub on your own feet, fly over floating kingdoms, follow a dragon's shadow or read the lore of the lost. The worlds are yours to explore." },
];

export function StoryOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const idx = useStore((s) => s.storyIndex);
  const audioOn = useStore((s) => s.audioEnabled);

  useLayoutEffect(() => {
    const scroller = ref.current;
    if (!scroller) return;
    const ctx = gsap.context(() => {
      SECTIONS.forEach((sec, i) => {
        const el = scroller.querySelector(`#story-${i}`);
        if (!el) return;
        ScrollTrigger.create({
          trigger: el,
          scroller,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) {
              setState({ storyIndex: i });
              swapStoryScene(sec.scene);
            }
          },
          onUpdate: (self) => setState({ storyProgress: self.progress }),
        });
        gsap.fromTo(el.querySelectorAll("[data-reveal]"), { opacity: 0, y: 46 }, { opacity: 1, y: 0, stagger: 0.14, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, scroller, start: "top 68%", toggleActions: "play none none reverse" } });
      });
    }, scroller);
    return () => ctx.revert();
  }, []);

  const jump = (i: number) => {
    const el = ref.current?.querySelector(`#story-${i}`) as HTMLElement | null;
    if (el) ref.current?.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  };

  return (
    <>
      <header className="story-nav">
        <Logo small onClick={() => jump(0)} />
        <nav className="story-dots" aria-label="Chapters">
          {SECTIONS.map((s, i) => (
            <button key={i} className={i === idx ? "on" : ""} onClick={() => jump(i)} title={s.title} aria-label={s.title} />
          ))}
        </nav>
        <div className="story-actions">
          <button className="btn btn-ghost" onClick={() => toggleAudio()} aria-label="Toggle sound"><Icon name={audioOn ? "volume" : "mute"} /></button>
          <button className="btn btn-gold" onClick={() => goHub(true)}>Skip to the Hub</button>
        </div>
      </header>
      <div className="story" ref={ref}>
        {SECTIONS.map((s, i) => (
          <section id={`story-${i}`} key={i} className={`story-sec ${i % 2 ? "right" : "left"}`}>
            <div className="story-card">
              <div data-reveal className="kicker">{s.kicker}</div>
              <h2 data-reveal>{s.title}</h2>
              <p data-reveal>{s.text}</p>
              {i === 0 && <div data-reveal className="scroll-hint">Scroll to journey ↓</div>}
              {i === 6 && (
                <div data-reveal className="portal-cards">
                  {WORLD_ORDER.map((id) => (
                    <button key={id} className="portal-card" style={{ ["--accent" as string]: WORLDS[id].accent }} onClick={() => travelToWorld(id)}>
                      <span className="pc-num">0{WORLDS[id].index}</span>
                      <span className="pc-name">{WORLDS[id].name}</span>
                      <span className="pc-sub">{WORLDS[id].subtitle}</span>
                      <span className="pc-go">Enter portal →</span>
                    </button>
                  ))}
                </div>
              )}
              {i === 7 && (
                <div data-reveal className="story-cta">
                  <button className="enter-btn small" onClick={() => goHub(true)}><span>BEGIN EXPLORATION</span></button>
                  <button className="btn btn-ghost" onClick={() => goHub(false)}>Cinematic tour of the hub</button>
                </div>
              )}
            </div>
          </section>
        ))}
        <footer className="story-foot">MYTHORA · Worlds Beyond Reality</footer>
      </div>
    </>
  );
}

export { audio };
