'use client';

import { useEffect, useRef, useState } from 'react';
import { getGsap } from '@/lib/gsap';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';

/** Zählt sanft zum neuen Wert (z. B. Preis), ohne React bei jedem Frame neu zu rendern. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(value);
  // Der Startwert wird einmal gerendert; danach schreibt nur noch der Tween in den Textknoten.
  const [initial] = useState(() => format(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = format(value);
      current.current = value;
      return;
    }
    const { gsap } = getGsap();
    const proxy = { v: current.current };
    const tween = gsap.to(proxy, {
      v: value,
      duration: 0.7,
      ease: 'expo.out',
      onUpdate: () => {
        el.textContent = format(proxy.v);
        current.current = proxy.v;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, format]);

  return (
    <span ref={ref} className="tabular-nums">
      {initial}
    </span>
  );
}
