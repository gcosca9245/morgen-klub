'use client';

import { useRef } from 'react';
import { useGsap } from '@/hooks/useGsap';
import { useFrameSequence } from '@/hooks/useFrameSequence';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { asset } from '@/lib/asset';
import { EASE } from '@/lib/gsap';
import { PillButton } from '../ui/PillButton';
import { CircleButton } from '../ui/CircleButton';
import { ArrowLeft, ArrowRight } from '../ui/Icons';
import { SplitWords } from '../ui/SplitWords';
import { useSmoothScroll } from '../providers/SmoothScroll';

/** Kapitel des Hero-Films (Anteil am Pin-Fortschritt), für Punkte-Navigation und Pfeile. */
const CHAPTERS = [0, 0.34, 0.66, 1] as const;
const PIN_LENGTH = 2.2; // Viewport-Höhen

/**
 * Hero: Karamell-Bühne mit gescrubbtem Film (schwebende Tasse → Draufsicht auf Untertasse).
 * Zum Ende schrumpft die Bühne zur Karte mit runden Ecken und gibt die Creme-Seite frei.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const seq = useFrameSequence(canvas, 'hero', { focusX: 0.62, lazy: false });
  const { scrollTo } = useSmoothScroll();

  useGsap(
    ({ gsap, ScrollTrigger }) => {
      const el = root.current!;
      const dots = gsap.utils.toArray<HTMLElement>('[data-dot]', el);
      const setChapter = (p: number) => {
        const idx = CHAPTERS.reduce<number>((acc, c, i) => (p >= c - 0.02 ? i : acc), 0);
        dots.forEach((d, i) => (d.dataset.active = String(i === Math.min(idx, dots.length - 1))));
      };

      if (prefersReducedMotion()) {
        seq.current?.setProgress(0);
        setChapter(0);
        return;
      }

      const film = { p: 0 };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => `+=${window.innerHeight * PIN_LENGTH}`,
          pin: true,
          scrub: 0.4,
          invalidateOnRefresh: true,
          onUpdate: (self) => setChapter(self.progress),
        },
      });

      tl.to(film, { p: 1, duration: 0.64, onUpdate: () => seq.current?.setProgress(film.p) }, 0)
        .to('[data-hero-copy]', { yPercent: -38, autoAlpha: 0, duration: 0.2, ease: 'power1.in' }, 0.03)
        .fromTo('[data-hero-caption]', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: EASE.out }, 0.4)
        .to('[data-hero-caption]', { autoAlpha: 0, y: -16, duration: 0.08 }, 0.64)
        .fromTo(
          '[data-panel]',
          { clipPath: 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)' },
          {
            clipPath: () => {
              const side = window.innerWidth < 768 ? 12 : 28;
              const bottom = Math.round(window.innerHeight * 0.16);
              return `inset(0px ${side}px ${bottom}px ${side}px round 0px 0px 48px 48px)`;
            },
            duration: 0.3,
            ease: EASE.inOut,
          },
          0.68,
        )
        .to(canvas.current, { scale: 0.92, yPercent: -5, duration: 0.3, ease: EASE.inOut }, 0.68)
        .to('[data-hero-dots]', { y: () => -window.innerHeight * 0.16, duration: 0.3, ease: EASE.inOut }, 0.68);

      const pointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (!pointerFine) return;
      // Feine Tiefenbewegung der Tasse mit dem Zeiger (nur Maus).
      const xTo = gsap.quickTo(canvas.current, 'x', { duration: 1.2, ease: 'power3.out' });
      const yTo = gsap.quickTo(canvas.current, 'y', { duration: 1.2, ease: 'power3.out' });
      const move = (e: PointerEvent) => {
        xTo((e.clientX / window.innerWidth - 0.5) * -14);
        yTo((e.clientY / window.innerHeight - 0.5) * -10);
      };
      el.addEventListener('pointermove', move);
      ScrollTrigger.refresh();
      return () => el.removeEventListener('pointermove', move);
    },
    root,
  );

  const goToChapter = (dir: 1 | -1) => {
    const el = root.current;
    if (!el) return;
    const total = window.innerHeight * PIN_LENGTH;
    const current = Math.min(1, Math.max(0, (window.scrollY - el.offsetTop) / total));
    const idx = CHAPTERS.findIndex((c) => c > current + 0.01);
    const next = dir === 1 ? (idx === -1 ? CHAPTERS.length - 1 : idx) : Math.max(0, (idx === -1 ? CHAPTERS.length : idx) - 2);
    scrollTo(el.offsetTop + total * (CHAPTERS[next] ?? 0));
  };

  return (
    <section id="start" ref={root} data-header-tone="light" aria-label="Willkommen" className="relative h-[100svh]">
      <div data-panel className="group/hero absolute inset-0 overflow-hidden bg-[#7a4421] text-foam will-change-[clip-path]">
        {/* Poster = erster Frame: sofort sichtbar (LCP), das Canvas übernimmt nahtlos. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- statischer Export */}
        <img
          src={asset('/media/seq/hero/1280/001.webp')}
          srcSet={`${asset('/media/seq/hero/720/001.webp')} 720w, ${asset('/media/seq/hero/1280/001.webp')} 1280w`}
          sizes="100vw"
          alt=""
          width={1280}
          height={720}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-[62%_50%]"
        />
        <canvas
          ref={canvas}
          aria-hidden="true"
          className="absolute inset-0 size-full origin-[50%_40%] will-change-transform"
        />
        <div aria-hidden="true" className="grain absolute inset-0" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_40%,rgba(52,26,12,0.42),transparent_58%)] md:bg-[radial-gradient(80%_100%_at_0%_45%,rgba(52,26,12,0.38),transparent_62%)]"
        />

        <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-start px-5 pt-32 md:justify-center md:px-10 md:pt-0">
          <div data-hero-copy className="max-w-[40rem]">
            <h1 className="font-display text-[clamp(3rem,7.4vw,7.2rem)] font-extrabold leading-[0.9] [&_[data-word]]:animate-rise [&_[data-word]]:[animation-delay:calc(var(--i)*70ms+180ms)]">
              <SplitWords text="„Dein Morgen," />
              <br />
              <SplitWords text="veredelt.“" delayBase={2} />
            </h1>
            <p className="mt-6 max-w-[22rem] animate-fade text-lg leading-snug text-foam/90 [animation-delay:520ms] md:text-xl">
              Frisch gerösteter Kaffee, geliefert in deinem Rhythmus.
            </p>
            <div className="mt-8 animate-fade [animation-delay:640ms]">
              <PillButton size="lg" onClick={() => scrollTo('#abo', { offset: -24 })}>
                Klub beitreten
              </PillButton>
            </div>
          </div>
        </div>

        <p
          data-hero-caption
          className="invisible absolute bottom-24 left-5 z-10 max-w-xs text-sm leading-relaxed text-foam/90 md:left-10 md:max-w-sm md:text-base"
        >
          <span className="font-display mb-2 block text-2xl font-bold text-foam md:text-3xl">48 Stunden.</span>
          So lange dauert es vom Trommelröster in Köln bis zu deiner ersten Tasse.
        </p>

        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 hidden -translate-y-1/2 justify-between px-6 opacity-0 transition-opacity duration-700 group-hover/hero:pointer-events-auto group-hover/hero:opacity-100 md:flex">
          <CircleButton aria-label="Vorheriges Kapitel" onClick={() => goToChapter(-1)}>
            <ArrowLeft />
          </CircleButton>
          <CircleButton aria-label="Nächstes Kapitel" onClick={() => goToChapter(1)}>
            <ArrowRight />
          </CircleButton>
        </div>
      </div>

      <div data-hero-dots aria-hidden="true" className="absolute inset-x-0 bottom-8 z-20 flex justify-center gap-2">
        {CHAPTERS.slice(0, 3).map((c) => (
          <span
            key={c}
            data-dot
            data-active={c === 0}
            className="h-[3px] w-6 rounded-full bg-foam/40 transition-all duration-700 ease-[var(--ease-out-expo)] data-[active=true]:w-12 data-[active=true]:bg-foam"
          />
        ))}
      </div>
    </section>
  );
}
