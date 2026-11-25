'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { ROASTS } from '@/lib/catalog';
import { Dialog } from './ui/Dialog';
import { SearchIcon, ArrowRight } from './ui/Icons';
import { FAQ } from './sections/Faq';
import { NAV } from './Header';
import { useUi } from './providers/UiState';
import { useSmoothScroll } from './providers/SmoothScroll';

interface Hit {
  title: string;
  meta: string;
  href: string;
}

const INDEX: Hit[] = [
  ...ROASTS.map((r) => ({ title: r.name, meta: `Röstung · ${r.roast} · ${r.brew} · ${r.notes.join(', ')}`, href: '#roestungen' })),
  ...FAQ.map((f) => ({ title: f.q, meta: 'Häufige Frage', href: '#faq' })),
  ...NAV.map((n) => ({ title: n.label, meta: 'Seite', href: n.href })),
  { title: 'Abo zusammenstellen', meta: 'Röstung, Rhythmus, Menge, Mahlgrad', href: '#abo' },
];

const normalize = (s: string) => s.toLocaleLowerCase('de-DE').normalize('NFD').replace(/\p{Diacritic}/gu, '');

/** Seitensuche über Röstungen, Fragen und Bereiche. */
export function SearchDialog() {
  const { searchOpen, closeSearch } = useUi();
  const { scrollTo } = useSmoothScroll();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);

  const hits = useMemo(() => {
    const q = normalize(deferred.trim());
    if (!q) return INDEX.slice(0, 6);
    return INDEX.filter((h) => normalize(`${h.title} ${h.meta}`).includes(q)).slice(0, 8);
  }, [deferred]);

  const pick = (href: string) => {
    closeSearch();
    setQuery('');
    requestAnimationFrame(() => scrollTo(href, { offset: -24 }));
  };

  return (
    <Dialog open={searchOpen} onClose={closeSearch} label="Suche" placement="top">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (hits[0]) pick(hits[0].href);
        }}
        className="flex items-center gap-3 border-b border-roast/10 p-5 pr-20"
      >
        <SearchIcon />
        <label htmlFor="site-search" className="sr-only">
          Suchbegriff
        </label>
        <input
          id="site-search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Röstung, Frage, Bereich …"
          className="h-12 flex-1 bg-transparent text-xl font-medium placeholder:text-roast/40 focus:outline-none"
        />
      </form>
      <ul className="p-3" aria-live="polite">
        {hits.length === 0 && <li className="p-4 text-roast/60">Nichts gefunden. Versuch es mit „Espresso“ oder „Pausieren“.</li>}
        {hits.map((h) => (
          <li key={`${h.href}-${h.title}`}>
            <button type="button" onClick={() => pick(h.href)} className="group flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left hover:bg-milk">
              <span>
                <span className="block font-semibold">{h.title}</span>
                <span className="text-sm text-roast/60">{h.meta}</span>
              </span>
              <ArrowRight className="opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
