'use client';

import { useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { useMagnetic } from '@/hooks/useMagnetic';
import { cn } from '@/lib/cn';

type Variant = 'roast' | 'foam' | 'ghost';

const variants: Record<Variant, string> = {
  roast: 'bg-roast text-foam hover:bg-espresso',
  foam: 'bg-foam text-roast hover:bg-milk',
  ghost: 'bg-transparent text-current ring-1 ring-current/30 hover:ring-current/70',
};

const sizes = {
  sm: 'h-10 px-5 text-[0.84rem]',
  md: 'h-12 px-7 text-[0.95rem]',
  lg: 'h-14 px-9 text-base',
} as const;

interface Props extends ComponentPropsWithoutRef<'button'> {
  variant?: Variant;
  size?: keyof typeof sizes;
  children: ReactNode;
}

/**
 * Pillen-Button mit magnetischem Hover und rollendem Label
 * (zwei gestapelte Labels, die beim Hover nach oben wechseln).
 */
export function PillButton({ variant = 'roast', size = 'md', className, children, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  useMagnetic(ref, 0.22);
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'group relative inline-flex select-none items-center justify-center overflow-hidden rounded-full font-semibold tracking-[-0.01em] transition-[background-color,box-shadow,color] duration-500 ease-[var(--ease-out-expo)] will-change-transform active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      <span className="relative block overflow-hidden">
        <span className="block transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-full">
          {children}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0"
        >
          {children}
        </span>
      </span>
    </button>
  );
}
