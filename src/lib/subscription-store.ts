'use client';

import { useSyncExternalStore } from 'react';
import type { GrindId, RhythmId, RoastId, SizeId } from './catalog';

/** Abo-Konfiguration: von Rhythmus-Pills, Röstungs-Karten und Builder gemeinsam genutzt. */
export interface Selection {
  roast: RoastId;
  rhythm: RhythmId;
  size: SizeId;
  grind: GrindId;
}

const KEY = 'mk:selection:v1';
const DEFAULT: Selection = { roast: 'goldene-stunde', rhythm: 'zweiwoechentlich', size: '250', grind: 'bohne' };

let state: Selection = DEFAULT;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT, ...(JSON.parse(raw) as Partial<Selection>) };
  } catch {
    state = DEFAULT;
  }
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateSelection(patch: Partial<Selection>) {
  hydrate();
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Speicher voll oder gesperrt – Auswahl bleibt für diese Sitzung erhalten. */
  }
  listeners.forEach((l) => l());
}

export function useSelection(): Selection {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => DEFAULT,
  );
}
