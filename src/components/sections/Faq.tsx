'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { PlusIcon } from '../ui/Icons';

export const FAQ = [
  { q: 'Kann ich mein Abo pausieren oder kündigen?', a: 'Jederzeit, ohne Mindestlaufzeit. Ein Klick im Kundenkonto genügt – bis 24 Stunden vor der nächsten Röstung.' },
  { q: 'Wann wird geröstet und geliefert?', a: 'Wir rösten dienstags und donnerstags. Die Lieferung kommt klimaneutral per DHL, in der Regel 48 Stunden nach der Röstung.' },
  { q: 'Welcher Mahlgrad passt zu mir?', a: 'Espresso für Siebträger und Kocher, Filter für Handfilter und Maschine, French Press grob. Im Zweifel: ganze Bohne und frisch mahlen.' },
  { q: 'Kann ich die Röstung wechseln?', a: 'Ja, vor jeder Lieferung. Viele Mitglieder rotieren monatlich durch alle vier Sorten.' },
  { q: 'Wohin liefert ihr?', a: 'Nach ganz Deutschland, Österreich und in die Schweiz. In Köln bringen wir montags auch per Lastenrad.' },
] as const;

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <li className="border-b border-roast/15">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 rounded-none py-6 text-left font-display text-xl font-bold md:text-2xl"
        >
          {q}
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-roast/20 transition-transform duration-500 ease-[var(--ease-out-expo)]', open && 'rotate-45 bg-roast text-foam')}>
            <PlusIcon />
          </span>
        </button>
      </h3>
      <div
        id={id}
        role="region"
        className={cn('grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out-expo)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden" inert={!open}>
          <p className="max-w-2xl pb-7 text-lg leading-relaxed text-roast/75">{a}</p>
        </div>
      </div>
    </li>
  );
}

/** Häufige Fragen als zugängliches Akkordeon mit weicher Höhenanimation. */
export function Faq() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section id="faq" aria-labelledby="faq-title" data-header-tone="dark" className="bg-cream pb-28 text-roast md:pb-40">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-5 md:grid-cols-12 md:px-10">
        <h2 id="faq-title" className="font-display text-[clamp(2.2rem,4.4vw,4.2rem)] font-extrabold leading-[0.95] md:col-span-4">
          Gut zu wissen.
        </h2>
        <ul className="border-t border-roast/15 md:col-span-7 md:col-start-6">
          {FAQ.map((f, i) => (
            <Item key={f.q} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen((o) => (o === i ? -1 : i))} />
          ))}
        </ul>
      </div>
    </section>
  );
}
