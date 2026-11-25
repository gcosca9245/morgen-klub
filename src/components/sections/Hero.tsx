'use client';

import { useRef } from 'react';
import { useGsap } from '@/hooks/useGsap';
import { useFrameSequence } from '@/hooks/useFrameSequence';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { EASE } from '@/lib/gsap';
import { sequencePoster } from '@/lib/sequences';
import { PillButton } from '../ui/PillButton';
import { CircleButton } from '../ui/CircleButton';
import { ArrowLeft, ArrowRight } from '../ui/Icons';
import { SplitWords } from '../ui/SplitWords';
import { useSmoothScroll } from '../providers/SmoothScroll';

/** Kapitel des Hero-Films (Anteil am Pin-Fortschritt), für Punkte-Navigation und Pfeile. */
const CHAPTERS = [0, 0.46, 1] as const;
const PIN_LENGTH = 1.8; // Viewport-Höhen

/** Muss zu `PORTRAIT_MAX_ASPECT` in `sequenceSource` passen: Hochformat-Poster ≙ Hochformat-Frames. */
const PORTRAIT_MEDIA = '(max-aspect-ratio: 3/4)';
const posterSet = (ext: 'webp' | 'avif') =>
  `${sequencePoster('hero', '1280', ext)} 1280w, ${sequencePoster('hero', '1920', ext)} 1920w`;

/**
 * Hero: Karamell-Bühne mit gescrubbtem Film (schwebende Tasse → Draufsicht auf Untertasse).
 * Zum Ende schrumpft die Bühne zur Karte mit runden Ecken und gibt die Creme-Seite frei.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const seq = useFrameSequence(canvas, 'hero', { lazy: false });
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
          anticipatePin: 1,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => setChapter(self.progress),
        },
      });

      // Timing nach Referenz-Film (8 fps ausgewertet): Tasse setzt sich auf die Untertasse und dreht in die
      // Draufsicht, während die Headline nach oben wegscrollt; kurz vor Ende der Drehung rundet sich die Bühne
      // zur Karte. Danach steht die Draufsicht (Pfeile per Hover), bevor die nächste Sektion kommt.
      tl.to(film, { p: 1, duration: 0.4, ease: EASE.inOut, onUpdate: () => seq.current?.setProgress(film.p) }, 0)
        .to('[data-hero-copy]', { y: () => -window.innerHeight * 0.55, duration: 0.3, ease: 'power1.in' }, 0)
        .to('[data-hero-copy]', { autoAlpha: 0, duration: 0.1, ease: 'none' }, 0.2)
        .fromTo(
          '[data-panel]',
          { clipPath: 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)' },
          {
            clipPath: () => {
              const side = Math.round(Math.max(10, window.innerWidth * 0.012));
              const bottom = Math.round(window.innerHeight * 0.1);
              return `inset(0px ${side}px ${bottom}px ${side}px round 0px 0px 44px 44px)`;
            },
            duration: 0.2,
            ease: EASE.inOut,
          },
          0.28,
        )
        .to(canvas.current, { scale: 0.95, duration: 0.2, ease: EASE.inOut }, 0.28)
        .to('[data-hero-dots]', { y: () => -window.innerHeight * 0.1, duration: 0.2, ease: EASE.inOut }, 0.28)
        .to({}, { duration: 0.52 }); // Halten der Draufsicht

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
        <picture>
          <source media={PORTRAIT_MEDIA} type="image/avif" srcSet={sequencePoster('hero', 'p', 'avif')} />
          <source media={PORTRAIT_MEDIA} type="image/webp" srcSet={sequencePoster('hero', 'p', 'webp')} />
          <source type="image/avif" srcSet={posterSet('avif')} sizes="100vw" />
          <img
            src={sequencePoster('hero', '1920', 'webp')}
            srcSet={posterSet('webp')}
            sizes="100vw"
            alt=""
            width={1920}
            height={1080}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[62%_50%] [@media(max-aspect-ratio:3/4)]:object-[50%_30%]"
          />
        </picture>
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
        {/* Vier Balken wie in der Referenz; Kapitel 1 und 2 schalten die ersten beiden aktiv. */}
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            data-dot
            data-active={i === 0}
            className="h-[3px] w-6 rounded-full bg-foam/40 transition-all duration-700 ease-[var(--ease-out-expo)] data-[active=true]:w-12 data-[active=true]:bg-foam"
          />
        ))}
      </div>
    </section>
  );
}
