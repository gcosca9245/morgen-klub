'use client';

import { useId, useRef } from 'react';
import { useGsap } from '@/hooks/useGsap';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { GRINDS, RHYTHMS, ROASTS, SIZES, formatEur, quote, type GrindId, type RhythmId, type RoastId, type SizeId } from '@/lib/catalog';
import { EASE } from '@/lib/gsap';
import { cn } from '@/lib/cn';
import { updateSelection, useSelection } from '@/lib/subscription-store';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { PillButton } from '../ui/PillButton';
import { useUi } from '../providers/UiState';

interface FieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
  dark?: boolean;
}

function SelectField<T extends string>({ label, value, options, onChange, dark = false }: FieldProps<T>) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          'select-pill h-12 w-full cursor-pointer rounded-full pl-5 pr-10 text-[0.95rem] font-semibold transition-colors duration-300',
          dark ? 'on-dark bg-roast text-foam hover:bg-espresso' : 'bg-milk text-roast ring-1 ring-roast/15 hover:ring-roast/40',
        )}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Abo-Builder: alle Optionen an einem Ort, Live-Preis, Start des Checkouts. */
export function Builder() {
  const root = useRef<HTMLDivElement>(null);
  const sel = useSelection();
  const { openCheckout } = useUi();
  const q = quote(sel.roast, sel.rhythm, sel.size);

  useGsap(
    ({ gsap }) => {
      if (prefersReducedMotion()) return;
      gsap.from(root.current, {
        y: 90,
        autoAlpha: 0,
        duration: 1.2,
        ease: EASE.out,
        scrollTrigger: { trigger: root.current, start: 'top 95%', once: true },
      });
    },
    root,
  );

  return (
    <div id="abo" className="relative z-10 mx-auto -mt-8 max-w-[1100px] scroll-mt-28 px-5 md:-mt-14 md:px-10">
      <div
        ref={root}
        className="rounded-[2rem] bg-foam p-5 shadow-[0_40px_80px_-40px_rgba(61,34,24,0.45),0_2px_0_rgba(255,255,255,0.6)_inset] ring-1 ring-roast/10 md:p-7"
      >
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h3 className="font-display text-2xl font-bold md:text-3xl">Abo-Auswahl</h3>
          <p className="text-sm text-roast/70" aria-live="polite">
            <span className="mr-2 line-through decoration-roast/40">{formatEur(q.base)}</span>
            <strong className="text-lg text-roast">
              <AnimatedNumber value={q.total} format={formatEur} />
            </strong>{' '}
            pro Lieferung · Versand frei
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid flex-1 grid-cols-2 gap-3 lg:flex">
            <SelectField<RoastId>
              dark
              label="Röstung"
              value={sel.roast}
              options={ROASTS.map((r) => ({ id: r.id, label: `${r.name} · ${r.roast}` }))}
              onChange={(roast) => updateSelection({ roast })}
            />
            <SelectField<RhythmId>
              label="Rhythmus"
              value={sel.rhythm}
              options={RHYTHMS.map((r) => ({ id: r.id, label: r.label }))}
              onChange={(rhythm) => updateSelection({ rhythm })}
            />
            <SelectField<SizeId> label="Menge" value={sel.size} options={SIZES} onChange={(size) => updateSelection({ size })} />
            <SelectField<GrindId> label="Mahlgrad" value={sel.grind} options={GRINDS} onChange={(grind) => updateSelection({ grind })} />
          </div>
          <PillButton size="lg" className="w-full lg:w-auto" onClick={openCheckout}>
            Ritual starten
          </PillButton>
        </div>
        <p className="mt-4 px-1 text-xs text-roast/60">Keine Mindestlaufzeit · jederzeit pausieren oder kündigen · Lieferung in 48 Stunden</p>
      </div>
    </div>
  );
}
