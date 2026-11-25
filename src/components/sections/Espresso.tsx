'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameScene, Hotspot } from '../espresso/game-scene';
import { asset } from '@/lib/asset';
import type { Sfx } from '../espresso/sfx';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { PillButton } from '../ui/PillButton';
import { CheckIcon } from '../ui/Icons';
import { useSmoothScroll } from '../providers/SmoothScroll';

type Phase = 'off' | 'warming' | 'empty' | 'filling' | 'ready' | 'grinding' | 'dosed' | 'brewing' | 'done';

const STEPS = [
  { label: 'Einschalten', until: 'warming' },
  { label: 'Bohnen auffüllen', until: 'filling' },
  { label: 'Mahlen', until: 'grinding' },
  { label: 'Espresso beziehen', until: 'brewing' },
] as const satisfies readonly { label: string; until: Phase }[];

const ORDER: readonly Phase[] = ['off', 'warming', 'empty', 'filling', 'ready', 'grinding', 'dosed', 'brewing', 'done'];

const STATUS: Record<Phase, string> = {
  off: 'Die Maschine ist aus. Leg den Schalter um.',
  warming: 'Heizt auf … der Kessel kommt auf Druck.',
  empty: 'Bereit, aber der Trichter ist leer. Zieh die Tüte auf die Mühle oder tippe auf „Bohnen einfüllen“.',
  filling: 'Die Bohnen rieseln in den Trichter …',
  ready: 'Bohnen sind drin. Jetzt 18 g fein mahlen.',
  grinding: 'Die Mühle mahlt 18 g für einen doppelten Espresso …',
  dosed: 'Siebträger eingespannt. Leg das Paddel um.',
  brewing: 'Extraktion läuft bei 9 bar …',
  done: 'Dein Espresso ist fertig.',
};

/** Welches Bedienelement in welcher Phase die nächste Aktion auslöst. */
const HOTSPOT_FOR: Partial<Record<Phase, Hotspot>> = { off: 'power', empty: 'hopper', ready: 'grinder', dosed: 'paddle' };
const ACTION_LABEL: Partial<Record<Phase, string>> = {
  off: 'Maschine einschalten',
  empty: 'Bohnen einfüllen',
  ready: 'Bohnen mahlen',
  dosed: 'Espresso beziehen',
  done: 'Noch einen Shot',
};

/** Standbild je Phase für die Variante ohne WebGL. */
const STILL_FOR: Record<Phase, 'off' | 'filled' | 'brew'> = {
  off: 'off',
  warming: 'off',
  empty: 'off',
  filling: 'filled',
  ready: 'filled',
  grinding: 'filled',
  dosed: 'filled',
  brewing: 'brew',
  done: 'brew',
};

function supportsWebGL2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

const stepState = (phase: Phase, until: Phase) => {
  const p = ORDER.indexOf(phase);
  const u = ORDER.indexOf(until);
  return p > u ? 'done' : p >= u - 1 ? 'current' : 'todo';
};

/**
 * Mini-Spiel „Dein erster Shot“: Siebträgermaschine einschalten, Bohnen einfüllen, mahlen, beziehen.
 * Die 3D-Szene (three.js) wird erst in Viewport-Nähe nachgeladen und rendert nur, solange sie sichtbar ist.
 */
export function Espresso() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const phaseRef = useRef<Phase>('off');
  const reduced = useReducedMotion();
  const { scrollTo } = useSmoothScroll();

  const [phase, setPhaseState] = useState<Phase>('off');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  /** 3D-Szene oder Standbild-Variante (ohne WebGL bzw. nach Kontextverlust). */
  const [mode, setMode] = useState<'3d' | 'still'>('3d');
  const [sound, setSound] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [shots, setShots] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number; over: boolean } | null>(null);

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
    sceneRef.current?.setHint(HOTSPOT_FOR[p] ?? null);
  };

  /** Führt die zur aktuellen Phase passende Aktion aus (Button, Klick in 3D oder Drag & Drop). */
  const advance = useCallback(async () => {
    const scene = sceneRef.current;
    const sfx = sfxRef.current;
    if (!scene) return;
    const p = phaseRef.current;
    sfx?.click();
    if (p === 'off') {
      setPhase('warming');
      sfx?.warmup();
      await scene.powerOn();
      setPhase('empty');
    } else if (p === 'empty') {
      setPhase('filling');
      sfx?.beans();
      await scene.fillBeans();
      setPhase('ready');
    } else if (p === 'ready') {
      setPhase('grinding');
      setTimeout(() => sfxRef.current?.grind(), reduced ? 0 : 2200);
      await scene.grind();
      setPhase('dosed');
    } else if (p === 'dosed') {
      setPhase('brewing');
      setSeconds(0);
      sfx?.brew();
      await scene.brew((f) => setSeconds(Math.round(f * 27)));
      sfxRef.current?.ding();
      setShots((n) => n + 1);
      setPhase('done');
    } else if (p === 'done') {
      scene.reset();
      setPhase('off');
    }
  }, [reduced]);

  const onHotspot = useCallback(
    (h: Hotspot) => {
      if (HOTSPOT_FOR[phaseRef.current] === h) void advance();
    },
    [advance],
  );
  const onHotspotRef = useRef(onHotspot);
  useEffect(() => {
    onHotspotRef.current = onHotspot;
  }, [onHotspot]);

  // Szene erst laden, wenn die Sektion in die Nähe kommt – und erst, wenn der Browser Luft hat.
  useEffect(() => {
    const el = section.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    let scene: GameScene | null = null;
    let cancelled = false;
    let vis: IntersectionObserver | undefined;
    let ro: ResizeObserver | undefined;
    let stopWaiting = () => {};

    const switchToStill = async () => {
      const { FallbackScene } = await import('../espresso/fallback-scene');
      if (cancelled) return;
      scene?.dispose();
      scene = new FallbackScene(reduced);
      sceneRef.current = scene;
      setMode('still');
      setStatus('ready');
    };

    const load = async () => {
      setStatus('loading');
      const { Sfx } = await import('../espresso/sfx');
      sfxRef.current = new Sfx();
      if (!supportsWebGL2()) return switchToStill();
      try {
        const { EspressoScene } = await import('../espresso/machine-scene');
        await document.fonts?.ready;
        if (cancelled) return;
        const s3d = new EspressoScene(cv, {
          reducedMotion: reduced,
          onHotspot: (h) => onHotspotRef.current(h),
          onContextLost: () => void switchToStill(),
        });
        scene = s3d;
        // Shader vorab kompilieren; hängt das (alte GPU-Treiber), nach 4 s trotzdem starten.
        await Promise.race([s3d.warmup(), new Promise((r) => setTimeout(r, 4000))]);
        if (cancelled) return;
        sceneRef.current = s3d;
        s3d.setHint(HOTSPOT_FOR[phaseRef.current] ?? null);
        ro = new ResizeObserver(() => scene?.resize());
        ro.observe(cv);
        vis = new IntersectionObserver(([e]) => scene?.setVisible(Boolean(e?.isIntersecting)));
        vis.observe(cv);
        setMode('3d');
        setStatus('ready');
      } catch {
        if (!cancelled) await switchToStill();
      }
    };

    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        // Aufbau der 3D-Szene erst, wenn gerade nicht gescrollt wird (vermeidet Ruckler beim Wischen).
        let quiet: ReturnType<typeof setTimeout> | undefined;
        const start = () => {
          window.removeEventListener('scroll', onScroll);
          if ('requestIdleCallback' in window) window.requestIdleCallback(() => void load(), { timeout: 1500 });
          else setTimeout(() => void load(), 50);
        };
        const onScroll = () => {
          clearTimeout(quiet);
          quiet = setTimeout(start, 280);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        stopWaiting = () => {
          clearTimeout(quiet);
          window.removeEventListener('scroll', onScroll);
        };
        onScroll();
      },
      { rootMargin: '400px 0px' },
    );
    near.observe(el);
    return () => {
      cancelled = true;
      stopWaiting();
      near.disconnect();
      vis?.disconnect();
      ro?.disconnect();
      scene?.dispose();
      sfxRef.current?.dispose();
      sceneRef.current = null;
      sfxRef.current = null;
    };
  }, [reduced]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    sfxRef.current?.setEnabled(next);
    if (next) sfxRef.current?.click();
  };

  /* ---------- Tüte auf die Mühle ziehen ---------- */
  const dragStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const overStage = (x: number, y: number) => {
    const r = stage.current?.getBoundingClientRect();
    return Boolean(r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
  };
  const onBagDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phaseRef.current !== 'empty' || status !== 'ready') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onBagMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.moved && Math.hypot(dx, dy) < 6) return;
    s.moved = true;
    setDrag({ x: dx, y: dy, over: overStage(e.clientX, e.clientY) });
  };
  const onBagUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current;
    dragStart.current = null;
    setDrag(null);
    if (!s) return;
    // Ein Tipp ohne Ziehen oder ein Ablegen über der Bühne füllt ein
    if (!s.moved || overStage(e.clientX, e.clientY)) void advance();
  };

  const busy = phase === 'warming' || phase === 'filling' || phase === 'grinding' || phase === 'brewing';
  const action = ACTION_LABEL[phase];
  const ready = status === 'ready';

  return (
    <section
      ref={section}
      id="espresso"
      aria-labelledby="espresso-title"
      data-header-tone="dark"
      className="bg-cream pb-24 text-roast md:pb-36"
    >
      <div className="mx-auto grid max-w-[1600px] gap-8 px-5 md:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] md:grid-rows-[auto_1fr] md:gap-x-14 md:gap-y-0 md:px-10">
        <div className="order-1 md:col-start-1 md:row-start-1 md:self-end">
          <p className="text-sm font-semibold tracking-[0.22em] text-caramel-deep uppercase">Mini-Barista</p>
          <h2 id="espresso-title" className="font-display mt-4 text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[0.92]">
            Dein erster Shot.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-roast/75">
            Schalte die Maschine ein, füll die Mühle und zieh einen doppelten Espresso. Genau so, wie es jeden Morgen bei
            dir zu Hause klingen sollte.
          </p>
        </div>

        <div className="order-3 md:col-start-1 md:row-start-2">

          <ol className="grid grid-cols-2 gap-2 md:mt-8 md:grid-cols-1" aria-label="Schritte">
            {STEPS.map((s, i) => {
              const st = stepState(phase, s.until);
              return (
                <li
                  key={s.label}
                  aria-current={st === 'current' ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[0.92rem] transition-colors duration-500 md:gap-4 md:px-4 md:py-3 md:text-base',
                    st === 'current' ? 'bg-foam ring-1 ring-roast/10' : 'bg-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors duration-500',
                      st === 'done' ? 'bg-roast text-foam' : st === 'current' ? 'bg-caramel-deep text-foam' : 'ring-1 ring-roast/25 text-roast/75',
                    )}
                  >
                    {st === 'done' ? <CheckIcon width={14} height={14} /> : i + 1}
                  </span>
                  <span className={cn('font-semibold', st === 'todo' && 'text-roast/75')}>{s.label}</span>
                </li>
              );
            })}
          </ol>

          <p aria-live="polite" className="mt-6 min-h-[3.2em] max-w-md text-[0.98rem] leading-relaxed text-roast/80">
            {!ready ? 'Die Maschine wird aufgebaut …' : null}
            {ready ? (phase === 'brewing' ? `Extraktion läuft · ${seconds} s · 9 bar` : STATUS[phase]) : null}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {phase === 'empty' ? (
              <button
                type="button"
                onPointerDown={onBagDown}
                onPointerMove={onBagMove}
                onPointerUp={onBagUp}
                onPointerCancel={() => {
                  dragStart.current = null;
                  setDrag(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void advance();
                  }
                }}
                disabled={!ready}
                aria-label="Bohnen einfüllen (Tüte auf die Mühle ziehen oder antippen)"
                style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.over ? -28 : -8}deg)` } : undefined}
                className={cn(
                  'relative z-20 inline-flex h-14 touch-none select-none items-center gap-3 rounded-full bg-roast pr-7 pl-2 font-semibold text-foam shadow-[0_18px_40px_-18px_rgba(42,26,19,0.7)] transition-[box-shadow,background-color] duration-300 hover:bg-espresso active:cursor-grabbing',
                  drag ? 'cursor-grabbing transition-none' : 'cursor-grab',
                  drag?.over && 'bg-caramel-deep',
                )}
              >
                <BagIcon />
                Bohnen einfüllen
              </button>
            ) : (
              <PillButton size="lg" onClick={() => void advance()} disabled={!ready || busy || !action} aria-describedby="espresso-hint">
                {busy ? 'Einen Moment …' : (action ?? 'Weiter')}
              </PillButton>
            )}
            <button
              type="button"
              aria-pressed={sound}
              onClick={toggleSound}
              className="inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold ring-1 ring-roast/20 transition-[box-shadow,background-color] duration-300 hover:bg-foam hover:ring-roast/40"
            >
              <SoundIcon on={sound} />
              Ton {sound ? 'an' : 'aus'}
            </button>
          </div>
          <p id="espresso-hint" className="mt-4 text-sm text-roast/75">
            {mode === '3d'
              ? 'Tipp: Du kannst auch direkt an der Maschine klicken, der leuchtende Ring zeigt dir wo.'
              : 'Tipp: Die Schritte laufen über die Schaltflächen oben.'}
          </p>
        </div>

        <div
          ref={stage}
          className={cn(
            'relative order-2 aspect-square overflow-hidden rounded-[2rem] md:col-start-2 md:row-span-2 md:row-start-1 md:self-center bg-[radial-gradient(120%_90%_at_60%_30%,#fffaf2_0%,#f1e4d1_55%,#e3cdb2_100%)] ring-1 ring-roast/10 transition-shadow duration-500 sm:aspect-[4/3] md:aspect-[16/11]',
            drag?.over && 'shadow-[inset_0_0_0_3px_#a9693b]',
          )}
        >
          <canvas
            ref={canvas}
            aria-label="3D-Siebträgermaschine mit Mühle. Bedienung über die Schaltflächen daneben."
            role="img"
            className={cn('absolute inset-0 size-full touch-pan-y transition-opacity duration-1000', ready ? 'opacity-100' : 'opacity-0')}
          />
          {mode === 'still' ? (
            // eslint-disable-next-line @next/next/no-img-element -- statischer Export
            <img
              src={asset(`/media/espresso/${STILL_FOR[phase]}.webp`)}
              alt=""
              width={793}
              height={545}
              className="absolute inset-0 size-full object-cover object-[45%_50%]"
            />
          ) : null}
          {!ready ? (
            <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
              <span className="size-10 animate-spin rounded-full border-2 border-roast/15 border-t-caramel-deep motion-reduce:animate-none" />
            </div>
          ) : null}
          {shots > 0 ? (
            <span className="absolute top-5 right-5 rounded-full bg-foam/85 px-4 py-2 text-sm font-semibold backdrop-blur pointer-coarse:backdrop-blur-none">
              Shot Nº {shots}
            </span>
          ) : null}
          <div
            className={cn(
              'absolute inset-x-3 top-3 rounded-[1.5rem] bg-roast p-5 text-foam md:p-6 shadow-[0_30px_60px_-30px_rgba(42,26,19,0.8)] transition-[opacity,translate] duration-700 ease-[var(--ease-out-expo)] md:inset-x-auto md:top-auto md:left-6 md:bottom-6 md:w-[20rem]',
              phase === 'done' ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
            )}
            inert={phase !== 'done'}
          >
            <p className="font-display text-2xl font-extrabold">Dein Espresso ist fertig.</p>
            <p className="mt-2 text-foam/80">36 g in 27 Sekunden, dicke Crema. So schmeckt jeder Morgen im Klub.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <PillButton variant="foam" onClick={() => scrollTo('#abo', { offset: -40 })}>
                Klub beitreten
              </PillButton>
              <PillButton variant="ghost" onClick={() => void advance()}>
                Noch einen Shot
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BagIcon() {
  return (
    <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-foam text-roast">
      <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
        <path d="M4 3h12l1.5 4v12.5A1.5 1.5 0 0 1 16 21H4a1.5 1.5 0 0 1-1.5-1.5V7L4 3Z" fill="currentColor" />
        <path d="M2.5 7h15" stroke="#f8f2e7" strokeWidth="1.2" />
        <ellipse cx="10" cy="13.5" rx="2.6" ry="3.6" fill="#f8f2e7" />
        <path d="M10 10.2c-.9 1.3-.9 5.3 0 6.6" stroke="currentColor" strokeWidth="1" />
      </svg>
    </span>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 9h3l5-4v14l-5-4H4z" fill="currentColor" />
      {on ? (
        <>
          <path d="M16 9a4 4 0 0 1 0 6" />
          <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      ) : (
        <path d="m16 9 5 6m0-6-5 6" />
      )}
    </svg>
  );
}
