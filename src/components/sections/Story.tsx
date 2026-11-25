'use client';

import { useRef } from 'react';
import { useGsap } from '@/hooks/useGsap';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { Picture } from '../ui/Picture';

const MANIFEST =
  'Wir rösten in Köln-Ehrenfeld, in kleinen Chargen und gerade so lange, dass jede Bohne nach ihrer Herkunft schmeckt. Danach geht alles schnell: Zwei Tage später steht dein Kaffee auf dem Küchentisch.';

const STATS = [
  { value: '48 h', label: 'von der Röstung bis zu dir' },
  { value: '12 kg', label: 'pro Charge, nie mehr' },
  { value: '0 €', label: 'Versand im Klub' },
  { value: '1 Klick', label: 'zum Pausieren' },
] as const;

/** Über uns: Manifest, das Wort für Wort mit dem Scroll aufleuchtet, plus Bild mit Parallaxe. */
export function Story() {
  const root = useRef<HTMLElement>(null);

  useGsap(
    ({ gsap }) => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        '[data-mword]',
        // Startfarbe hält 3:1 Kontrast (große Schrift), damit der Text auch vor dem Highlight lesbar bleibt.
        { color: '#9c7a63' },
        {
          color: '#4b2a1d',
          stagger: 0.05,
          ease: 'none',
          scrollTrigger: { trigger: '[data-manifest]', start: 'top 78%', end: 'bottom 45%', scrub: 0.6 },
        },
      );
      gsap.fromTo(
        '[data-story-img]',
        { yPercent: -10, scale: 1.12 },
        { yPercent: 10, scale: 1, ease: 'none', scrollTrigger: { trigger: '[data-story-frame]', start: 'top bottom', end: 'bottom top', scrub: true } },
      );
      gsap.from('[data-stat]', {
        y: 40,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 1,
        scrollTrigger: { trigger: '[data-stats]', start: 'top 88%', once: true },
      });
    },
    root,
  );

  return (
    <section id="story" ref={root} data-header-tone="dark" aria-labelledby="story-title" className="bg-cream pb-24 pt-10 text-roast md:pb-40">
      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        <p id="story-title" className="mb-8 text-sm font-semibold uppercase tracking-[0.18em] text-caramel-deep">
          Über uns
        </p>
        <p data-manifest className="font-display max-w-[24ch] text-[clamp(2rem,4.6vw,4.6rem)] font-bold leading-[1.02] md:max-w-[28ch]">
          {MANIFEST.split(' ').map((w, i) => (
            <span key={`${w}-${i}`} data-mword className="inline">
              {w}{' '}
            </span>
          ))}
        </p>

        <div className="mt-20 grid gap-10 md:mt-28 md:grid-cols-12 md:gap-6">
          <div data-story-frame className="relative overflow-hidden rounded-[2rem] md:col-span-7">
            <div data-story-img className="will-change-transform">
              <Picture
                name="hero-beans"
                widths={[720, 1280]}
                sizes="(min-width: 768px) 58vw, 92vw"
                alt="Frisch geröstete Kaffeebohnen fallen neben eine Tasse schwarzen Kaffee"
                width={1280}
                height={720}
                className="aspect-[4/3] w-full object-cover md:aspect-[16/11]"
              />
            </div>
          </div>
          <div className="flex flex-col justify-end md:col-span-4 md:col-start-9">
            <p className="text-lg leading-relaxed text-roast/80">
              Der Morgen Klub ist aus einer einfachen Frage entstanden: Warum kaufen wir Kaffee, der seit Monaten im Regal steht?
              Heute rösten wir nur, was bestellt ist – und schicken es los, solange die Bohne noch ausgast.
            </p>
            <dl data-stats className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-roast/15 pt-8">
              {STATS.map((s) => (
                <div key={s.label} data-stat>
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <span className="font-display block text-4xl font-extrabold md:text-5xl">{s.value}</span>
                    <span className="mt-1 block text-sm text-roast/75">{s.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
