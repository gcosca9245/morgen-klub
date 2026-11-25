'use client';

import Lenis from 'lenis';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { getGsap } from '@/lib/gsap';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';

type ScrollTarget = string | number | HTMLElement;
interface SmoothScrollApi {
  scrollTo: (target: ScrollTarget, opts?: { offset?: number; immediate?: boolean }) => void;
  stop: () => void;
  start: () => void;
}

const Ctx = createContext<SmoothScrollApi | null>(null);

/**
 * Lenis-Smooth-Scroll, synchronisiert mit dem GSAP-Ticker und ScrollTrigger.
 * Bei „prefers-reduced-motion“ bleibt natives Scrollen aktiv.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const { gsap, ScrollTrigger } = getGsap();
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, autoRaf: false });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = useCallback<SmoothScrollApi['scrollTo']>((target, opts = {}) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset: opts.offset ?? 0, immediate: opts.immediate ?? false, duration: 1.4 });
      return;
    }
    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    const top = typeof el === 'number' ? el : el ? el.getBoundingClientRect().top + window.scrollY : 0;
    window.scrollTo({ top: top + (opts.offset ?? 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  const api = useMemo<SmoothScrollApi>(
    () => ({
      scrollTo,
      stop: () => lenisRef.current?.stop(),
      start: () => lenisRef.current?.start(),
    }),
    [scrollTo],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSmoothScroll(): SmoothScrollApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSmoothScroll außerhalb von SmoothScrollProvider');
  return ctx;
}
