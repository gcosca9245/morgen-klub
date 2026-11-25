'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** Globale UI-Zustände (Dialoge), damit Header, Builder und Karten dieselben Overlays öffnen. */
interface UiState {
  checkoutOpen: boolean;
  searchOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  openSearch: () => void;
  closeSearch: () => void;
}

const Ctx = createContext<UiState | null>(null);

export function UiStateProvider({ children }: { children: ReactNode }) {
  const [checkoutOpen, setCheckout] = useState(false);
  const [searchOpen, setSearch] = useState(false);
  const value = useMemo<UiState>(
    () => ({
      checkoutOpen,
      searchOpen,
      openCheckout: () => setCheckout(true),
      closeCheckout: () => setCheckout(false),
      openSearch: () => setSearch(true),
      closeSearch: () => setSearch(false),
    }),
    [checkoutOpen, searchOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi(): UiState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUi außerhalb von UiStateProvider');
  return ctx;
}
