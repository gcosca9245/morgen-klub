import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const ArrowLeft = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...base} {...p}>
    <path d="M14.5 6 8.5 12l6 6" />
  </svg>
);
export const ArrowRight = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...base} {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const ArrowUpRight = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...base} {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);
