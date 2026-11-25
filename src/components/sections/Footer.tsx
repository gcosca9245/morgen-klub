'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useGsap } from '@/hooks/useGsap';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { PillButton } from '../ui/PillButton';
import { ArrowUpRight } from '../ui/Icons';

/** Kontakt & Footer: Karamell-Bühne mit riesiger Wortmarke, die beim Hereinscrollen aufsteigt. */
export function Footer() {
  const root = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'error' | 'done'>('idle');

  useGsap(
    ({ gsap }) => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        '[data-wordmark] > span',
        { yPercent: 100 },
        { yPercent: 0, stagger: 0.06, ease: 'none', scrollTrigger: { trigger: '[data-wordmark]', start: 'top bottom', end: 'bottom 92%', scrub: 0.6 } },
      );
    },
    root,
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '');
    setState(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? 'done' : 'error');
  };

  return (
    <footer id="kontakt" ref={root} data-header-tone="light" className="relative overflow-hidden rounded-t-[2.5rem] bg-caramel text-foam">
      <div aria-hidden="true" className="grain absolute inset-0" />
      <div className="relative mx-auto grid max-w-[1600px] gap-14 px-5 pb-10 pt-20 md:grid-cols-12 md:px-10 md:pt-28">
        <div className="md:col-span-5">
          <h2 className="font-display text-[clamp(2.2rem,4.4vw,4.2rem)] font-extrabold leading-[0.95]">Morgen schon was vor?</h2>
          <p className="mt-5 max-w-sm text-lg leading-snug text-foam/85">Neue Röstungen, Brühtipps und einmal im Monat ein Gutschein. Kein Spam.</p>
          <form onSubmit={onSubmit} noValidate className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <label htmlFor="newsletter" className="sr-only">
              E-Mail-Adresse
            </label>
            <input
              id="newsletter"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="deine@email.de"
              aria-invalid={state === 'error'}
              aria-describedby="newsletter-msg"
              className="h-14 flex-1 rounded-full bg-foam/15 px-6 text-foam ring-1 ring-foam/30 placeholder:text-foam/60 focus:bg-foam/20 focus:outline-none focus:ring-foam"
            />
            <PillButton type="submit" variant="foam" size="lg">
              Eintragen
            </PillButton>
          </form>
          <p id="newsletter-msg" aria-live="polite" className="mt-3 min-h-5 text-sm text-foam/85">
            {state === 'done' && 'Danke! Bitte bestätige noch kurz die E-Mail in deinem Postfach.'}
            {state === 'error' && 'Bitte prüfe die E-Mail-Adresse.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-foam/90 md:col-span-6 md:col-start-7 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-foam/60">Röstcafé</h3>
            <address className="not-italic leading-relaxed">
              Musterstraße 12
              <br />
              50823 Köln-Ehrenfeld
            </address>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-foam/60">Geöffnet</h3>
            <p className="leading-relaxed">
              Di–Fr 8–17 Uhr
              <br />
              Sa 9–15 Uhr
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-foam/60">Kontakt</h3>
            <p className="leading-relaxed">
              <a className="underline-offset-4 hover:underline" href="mailto:hallo@example.com">
                hallo@example.com
              </a>
              <br />
              <a className="inline-flex items-center gap-1 underline-offset-4 hover:underline" href="https://www.instagram.com/" rel="noopener noreferrer" target="_blank">
                Instagram <ArrowUpRight />
              </a>
            </p>
          </div>
        </div>
      </div>

      <p data-wordmark aria-hidden="true" className="font-display relative flex select-none justify-center overflow-hidden px-3 text-[19.5vw] font-extrabold uppercase leading-[0.8] tracking-[-0.04em] text-foam [font-variation-settings:'wdth'_78,'opsz'_96]">
        {'MORGEN KLUB'.split('').map((c, i) => (
          <span key={i} className="inline-block whitespace-pre will-change-transform">
            {c}
          </span>
        ))}
      </p>

      <div className="relative mx-auto flex max-w-[1600px] flex-col justify-between gap-3 border-t border-foam/20 px-5 py-6 text-xs text-foam/70 md:flex-row md:px-10">
        <p>© {new Date().getFullYear()} Morgen Klub · Konzeptstudie, keine echten Bestellungen</p>
        <p className="flex gap-5">
          <a href="#kontakt" className="hover:text-foam">Impressum</a>
          <a href="#kontakt" className="hover:text-foam">Datenschutz</a>
          <a href="#kontakt" className="hover:text-foam">AGB</a>
        </p>
      </div>
    </footer>
  );
}
