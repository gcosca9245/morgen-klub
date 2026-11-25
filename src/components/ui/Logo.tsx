import { cn } from '@/lib/cn';

/** Zweizeilige Wortmarke – gestapelt wie im Referenz-Design. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display block text-[1.05rem] font-extrabold uppercase leading-[0.82] tracking-[-0.01em] [font-variation-settings:"wdth"_80,"opsz"_96]',
        className,
      )}
    >
      Morgen
      <br />
      Klub
    </span>
  );
}
