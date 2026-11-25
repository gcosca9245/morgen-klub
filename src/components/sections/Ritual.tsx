'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useElementSize } from '@/hooks/useElementSize';
import { useGsap } from '@/hooks/useGsap';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { getGsap, EASE } from '@/lib/gsap';
import { organicCardPath } from '@/lib/organic-shape';
import { cn } from '@/lib/cn';
import { Picture } from '../ui/Picture';
import { CircleButton } from '../ui/CircleButton';
import { ArrowLeft, ArrowRight } from '../ui/Icons';
import { Builder } from './Builder';

const SLIDES = [
  {
    title: 'Röstung',
    image: 'club-2',
    bg: '#8d4e29',
    alt: 'Graue Kaffeetüte neben einer Handmühle aus Messing und Walnuss, davor Kaffeebohnen',
    text: 'Vier Röstungen, von blumig-hell bis schokoladig-dunkel. Du wählst, wir rösten frisch.',
  },
  {
    title: 'Brühart',
    image: 'club-3',
    bg: '#945830',
    alt: 'Ockerfarbene Kaffeetüte neben einer Glaskaraffe mit Handfilter',
    text: 'Ganze Bohne oder gemahlen – exakt auf Espresso, Filter oder French Press eingestellt.',
  },
  {
    title: 'Morgen Klub',
    image: 'club-1',
    bg: '#996941',
    alt: 'Zwei Kaffeetüten in Braun und Weiß neben einer Tasse auf Untertasse',
    text: 'Kommt in deinem Rhythmus, versandkostenfrei. Pausieren oder ändern jederzeit mit einem Klick.',
  },
] as const;

/**
 * „In drei Schritten“: Karten-Slider mit organischer Silhouette, angeschnittenen Nachbarn,
 * Pfeilen in den Einbuchtungen, Swipe/Drag und Tastatur. Darunter überlappt der Abo-Builder.
 */
export function Ritual() {
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const firstSlide = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(SLIDES.length - 1);
  const vp = useElementSize(viewport);
  const card = useElementSize(firstSlide);
  const drag = useRef<{ x: number; dx: number; id: number } | null>(null);

  const gap = vp.width < 768 ? 14 : 28;
  const offsetFor = useCallback(
    (i: number) => (vp.width - card.width) / 2 - i * (card.width + gap),
    [vp.width, card.width, gap],
  );

  // Track zur aktiven Karte bewegen.
  useEffect(() => {
    if (!track.current || !card.width) return;
    const { gsap } = getGsap();
    gsap.to(track.current, {
      x: offsetFor(index),
      duration: prefersReducedMotion() ? 0 : 1.1,
      ease: EASE.out,
      overwrite: true,
    });
  }, [index, offsetFor, card.width]);

  // Auftritt: Karte wächst beim Hereinscrollen aus der Tiefe, Bild mit Parallaxe.
  useGsap(
    ({ gsap }) => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        '[data-stage]',
        { scale: 0.86, y: 80 },
        {
          scale: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: { trigger: '[data-stage]', start: 'top bottom', end: 'top 25%', scrub: 0.6 },
        },
      );
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -4 },
          { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } },
        );
      });
    },
    root,
  );

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, dx: 0, id: e.pointerId };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !track.current) return;
    d.dx = e.clientX - d.x;
    if (Math.abs(d.dx) > 6 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
    getGsap().gsap.set(track.current, { x: offsetFor(index) + d.dx * 0.9 });
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !track.current) return;
    if (Math.abs(d.dx) > Math.min(90, card.width * 0.12)) go(d.dx < 0 ? 1 : -1);
    else getGsap().gsap.to(track.current, { x: offsetFor(index), duration: 0.8, ease: EASE.out });
  };

  const shape = organicCardPath(card.width, card.height);

  return (
    <section id="ritual" ref={root} data-header-tone="dark" aria-labelledby="ritual-title" className="relative bg-cream pb-24 pt-28 text-roast md:pb-36 md:pt-40">
      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-caramel-deep">So funktioniert der Klub</p>
            <h2 id="ritual-title" className="font-display max-w-[16ch] text-[clamp(2.4rem,5vw,4.8rem)] font-extrabold leading-[0.95]">
              Drei Schritte zu deinem Ritual.
            </h2>
          </div>
          <p key={index} aria-live="polite" className="max-w-sm animate-fade text-lg leading-snug text-roast/75 md:min-h-[3lh]">
            <span className="font-semibold text-roast">
              {index + 1}. {SLIDES[index]?.title}:
            </span>{' '}
            {SLIDES[index]?.text}
          </p>
        </div>
      </div>

      <div
        ref={viewport}
        role="region"
        aria-roledescription="Karussell"
        aria-label="Drei Schritte"
        className="relative mt-14 touch-pan-y overflow-hidden md:mt-20"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1);
          if (e.key === 'ArrowLeft') go(-1);
        }}
      >
        <div data-stage className="relative will-change-transform">
          <div
            ref={track}
            className="flex cursor-grab select-none active:cursor-grabbing [&_img]:pointer-events-none"
            style={{ gap }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {SLIDES.map((s, i) => (
              <div
                key={s.title}
                ref={i === 0 ? firstSlide : undefined}
                role="group"
                aria-roledescription="Folie"
                aria-label={`${i + 1} von ${SLIDES.length}: ${s.title}`}
                inert={i !== index}
                className={cn(
                  'relative aspect-[4/5] w-[86vw] shrink-0 overflow-hidden transition-[opacity,filter] duration-700 sm:aspect-[16/10] md:w-[min(78vw,1180px)]',
                  i === index ? 'opacity-100' : 'opacity-55 saturate-[0.85]',
                )}
                style={{ clipPath: shape, backgroundColor: s.bg }}
              >
                {/* Bild sitzt tiefer und blendet oben in die Kartenfarbe aus: Platz für den Titel. */}
                <div data-parallax className="absolute inset-x-0 -bottom-[6%] top-[20%] [mask-image:linear-gradient(to_bottom,transparent,#000_22%)] sm:top-[14%]">
                  <Picture
                    name={s.image}
                    widths={[720, 1280]}
                    sizes="(min-width: 768px) 78vw, 86vw"
                    alt={s.alt}
                    width={1280}
                    height={720}
                    className="size-full object-cover object-top"
                  />
                </div>
                <div aria-hidden="true" className="grain absolute inset-0" />
                <h3 className="font-display absolute inset-x-0 top-[9%] text-center text-[clamp(2rem,5.4vw,5.4rem)] font-extrabold uppercase leading-none text-foam [text-shadow:0_2px_30px_rgba(61,34,24,0.25)]">
                  {i + 1}. {s.title}
                </h3>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 mx-auto flex items-center justify-between" style={{ width: card.width || undefined }}>
            <CircleButton aria-label="Vorheriger Schritt" className="pointer-events-auto -ml-3 md:-ml-1" onClick={() => go(-1)}>
              <ArrowLeft />
            </CircleButton>
            <CircleButton aria-label="Nächster Schritt" className="pointer-events-auto -mr-3 md:-mr-1" onClick={() => go(1)}>
              <ArrowRight />
            </CircleButton>
          </div>

          <div className="absolute inset-x-0 bottom-[9%] flex justify-center gap-2 sm:bottom-[11%]">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Schritt ${i + 1}: ${s.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className="group grid h-6 place-items-center"
              >
                <span
                  className={cn(
                    'block h-[3px] rounded-full transition-all duration-700 ease-[var(--ease-out-expo)]',
                    i === index ? 'w-12 bg-foam' : 'w-6 bg-foam/45 group-hover:bg-foam/70',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <Builder />
    </section>
  );
}
