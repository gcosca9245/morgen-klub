'use client';

import { useLayoutEffect, type DependencyList, type RefObject } from 'react';
import { getGsap } from '@/lib/gsap';

type Setup = (tools: ReturnType<typeof getGsap>) => void | (() => void);

/**
 * Führt GSAP-Code in einem gsap.context aus, der beim Unmount/Neuaufbau sauber zurückgesetzt wird.
 * Alle Selektoren im Setup sind auf `scope` begrenzt.
 */
export function useGsap(setup: Setup, scope: RefObject<HTMLElement | null>, deps: DependencyList = []) {
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    const tools = getGsap();
    let cleanup: void | (() => void);
    const ctx = tools.gsap.context(() => {
      cleanup = setup(tools);
    }, el);
    return () => {
      cleanup?.();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Abhängigkeiten werden explizit vom Aufrufer übergeben.
  }, deps);
}
