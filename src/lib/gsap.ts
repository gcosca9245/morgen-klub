'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

/** Registriert GSAP-Plugins genau einmal (clientseitig) und gibt die Instanzen zurück. */
export function getGsap() {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out', duration: 0.9 });
    ScrollTrigger.config({ ignoreMobileResize: true });
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

/** Gemeinsame Easing-Kurven, damit alle Bewegungen dieselbe Handschrift tragen. */
export const EASE = {
  out: 'expo.out',
  inOut: 'power2.inOut',
  soft: 'sine.inOut',
  spring: 'back.out(1.6)',
} as const;
