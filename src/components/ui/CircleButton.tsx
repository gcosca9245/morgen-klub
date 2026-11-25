'use client';

import { useRef, type ComponentPropsWithoutRef } from 'react';
import { useMagnetic } from '@/hooks/useMagnetic';
import { cn } from '@/lib/cn';

/** Runder Pfeil-Button (Slider-Navigation) im Stil der Referenz: creme, weich, mit Schatten. */
export function CircleButton({ className, children, ...rest }: ComponentPropsWithoutRef<'button'>) {
  const ref = useRef<HTMLButtonElement>(null);
  useMagnetic(ref, 0.35);
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'grid size-12 place-items-center rounded-full bg-foam/90 text-roast shadow-[0_8px_24px_-10px_rgba(61,34,24,0.45)] backdrop-blur-sm transition-[background-color,transform] duration-500 ease-[var(--ease-out-expo)] hover:bg-milk active:scale-95 md:size-14',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
