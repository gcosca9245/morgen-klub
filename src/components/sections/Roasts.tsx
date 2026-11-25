'use client';

import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useGsap } from '@/hooks/useGsap';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { ROASTS, formatEur, type Roast } from '@/lib/catalog';
import { getGsap, EASE } from '@/lib/gsap';
import { cn } from '@/lib/cn';
import { updateSelection, useSelection } from '@/lib/subscription-store';
import { Picture } from '../ui/Picture';
import { CheckIcon, PlusIcon } from '../ui/Icons';
import { useSmoothScroll } from '../providers/SmoothScroll';

function RoastCard({ roast, selected, onPick }: { roast: Roast; selected: boolean; onPick: () => void }) {
  const media = useRef<HTMLDivElement>(null);

  // 3D-Neigung zum Zeiger – nur transform, damit es auf der GPU bleibt.
  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion() || !media.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    getGsap().gsap.to(media.current, { rotateY: px * 10, rotateX: py * -8, y: -10, duration: 0.6, ease: 'power3.out' });
  };
  const onLeave = () => {
    if (media.current) getGsap().gsap.to(media.current, { rotateY: 0, rotateX: 0, y: 0, duration: 0.9, ease: EASE.out });
  };

  return (
    <article
      data-roast
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        'group relative flex flex-col rounded-[1.75rem] bg-[#f1e7d8] p-3 ring-1 transition-shadow duration-500',
        selected ? 'ring-2 ring-roast' : 'ring-roast/10 hover:shadow-[0_30px_60px_-36px_rgba(61,34,24,0.5)]',
      )}
    >
      <div className="relative overflow-hidden rounded-[1.4rem] [perspective:900px]">
        <div ref={media} className="will-change-transform [transform-style:preserve-3d]">
          <Picture
            name={roast.image}
            widths={[480, 800]}
            sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 92vw"
            alt={`Kaffeetüte ${roast.name}`}
            width={800}
            height={1067}
            className="aspect-[4/5] w-full object-cover object-[50%_62%]"
          />
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-milk/90 px-3 py-1 text-xs font-semibold tracking-wide text-roast backdrop-blur pointer-coarse:backdrop-blur-none">
          Nº {roast.no} · {roast.roast}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl font-bold">{roast.name}</h3>
          <p className="shrink-0 text-sm font-semibold tabular-nums">ab {formatEur(roast.pricePer250 * 0.85)}</p>
        </div>
        <p className="mt-1 text-sm text-roast/75">
          {roast.origin} · für {roast.brew}
        </p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Geschmacksnoten">
          {roast.notes.map((n) => (
            <li key={n} className="rounded-full bg-milk px-3 py-1 text-xs font-medium text-roast/85 ring-1 ring-roast/10">
              {n}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onPick}
          aria-pressed={selected}
          className={cn(
            'mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors duration-500',
            selected ? 'bg-roast text-foam' : 'bg-milk text-roast ring-1 ring-roast/20 hover:bg-roast hover:text-foam',
          )}
        >
          {selected ? <CheckIcon /> : <PlusIcon />}
          {selected ? 'In deinem Abo' : 'Für mein Abo wählen'}
        </button>
      </div>
    </article>
  );
}

/** Röstungen als Karten mit 3D-Neigung; Auswahl fließt direkt in den Abo-Builder. */
export function Roasts() {
  const root = useRef<HTMLElement>(null);
  const { roast } = useSelection();
  const { scrollTo } = useSmoothScroll();

  useGsap(
    ({ gsap }) => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-roast]', {
        y: 70,
        autoAlpha: 0,
        duration: 1.1,
        stagger: 0.09,
        ease: EASE.out,
        scrollTrigger: { trigger: '[data-roast-grid]', start: 'top 85%', once: true },
      });
    },
    root,
  );

  return (
    <section id="roestungen" ref={root} data-header-tone="dark" aria-labelledby="roasts-title" className="bg-cream py-24 text-roast md:py-36">
      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 id="roasts-title" className="font-display max-w-[14ch] text-[clamp(2.4rem,5vw,4.8rem)] font-extrabold leading-[0.95]">
            Vier Röstungen. Ein Klub.
          </h2>
          <p className="max-w-sm text-lg leading-snug text-roast/75">
            Jede Charge rösten wir dienstags und donnerstags frisch – in kleinen Mengen, damit nichts im Regal altert.
          </p>
        </div>
        <div data-roast-grid className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {ROASTS.map((r) => (
            <RoastCard
              key={r.id}
              roast={r}
              selected={roast === r.id}
              onPick={() => {
                updateSelection({ roast: r.id });
                scrollTo('#abo', { offset: -120 });
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
