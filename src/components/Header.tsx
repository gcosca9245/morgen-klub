'use client';

import { useEffect, useRef, useState } from 'react';
import { getGsap } from '@/lib/gsap';
import { cn } from '@/lib/cn';
import { Logo } from './ui/Logo';
import { PillButton } from './ui/PillButton';
import { SearchIcon, CloseIcon } from './ui/Icons';
import { useSmoothScroll } from './providers/SmoothScroll';
import { useUi } from './providers/UiState';

export const NAV = [
  { href: '#start', label: 'Start' },
  { href: '#story', label: 'Über uns' },
  { href: '#ritual', label: 'Abos' },
  { href: '#roestungen', label: 'Röstungen' },
  { href: '#kontakt', label: 'Kontakt' },
] as const;

type Tone = 'light' | 'dark';

/**
 * Fixierter Header. Die Farbe richtet sich nach der Sektion darunter (`data-header-tone`),
 * damit er auf Karamell creme und auf Creme espresso ist – wie im Referenz-Film.
 */
export function Header() {
  const [tone, setTone] = useState<Tone>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollTo, stop, start } = useSmoothScroll();
  const { openSearch } = useUi();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const { ScrollTrigger } = getGsap();
    const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-header-tone]')).map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 44px',
        end: 'bottom 44px',
        onToggle: (self) => self.isActive && setTone(el.dataset.headerTone === 'light' ? 'light' : 'dark'),
      }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, []);

  useEffect(() => {
    if (menuOpen) stop();
    else start();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, stop, start]);

  const go = (href: string) => {
    setMenuOpen(false);
    scrollTo(href, { offset: href === '#start' ? 0 : -24 });
  };

  const light = tone === 'light' && !menuOpen;

  return (
    <header
      ref={ref}
      data-tone={light ? 'light' : 'dark'}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-700 ease-[var(--ease-out-expo)]',
        light ? 'text-foam' : 'text-roast',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10 bg-cream/80 backdrop-blur-md transition-opacity duration-700 pointer-coarse:bg-cream/95 pointer-coarse:backdrop-blur-none',
          light || menuOpen ? 'opacity-0' : 'opacity-100',
        )}
      />
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between gap-6 px-5 md:h-24 md:px-10">
        <a
          href="#start"
          onClick={(e) => {
            e.preventDefault();
            go('#start');
          }}
          aria-label="Morgen Klub – zum Anfang"
          className="inline-flex min-h-11 shrink-0 items-center rounded-md"
        >
          <Logo className="text-[1.15rem] md:text-[1.3rem]" />
        </a>

        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.href);
                  }}
                  className="group relative block rounded-full px-4 py-2 text-[0.92rem] font-medium"
                >
                  {item.label}
                  <span className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-current transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Suche öffnen"
            className="grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-300 hover:bg-current/10"
          >
            <SearchIcon />
          </button>
          <PillButton size="sm" onClick={() => go('#abo')} className="hidden shrink-0 whitespace-nowrap max-md:h-11 pointer-coarse:h-11 max-[374px]:px-4 sm:inline-flex">
            Klub beitreten
          </PillButton>
          <button
            type="button"
            className="grid h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-current/30 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <CloseIcon /> : 'Menü'}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="fixed inset-0 -z-10 bg-cream px-6 pb-10 pt-28 text-roast lg:hidden"
      >
        <ul className="flex flex-col gap-2">
          {NAV.map((item, i) => (
            <li key={item.href} className="overflow-hidden">
              <a
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(item.href);
                }}
                className="font-display block animate-rise py-1 text-5xl font-bold"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <PillButton
          size="lg"
          className="mt-10 w-full"
          onClick={() => go('#abo')}
        >
          Klub beitreten
        </PillButton>
      </div>
    </header>
  );
}
