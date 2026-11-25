'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CloseIcon } from './Icons';
import { useSmoothScroll } from '../providers/SmoothScroll';

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
  placement?: 'side' | 'top';
}

/**
 * Natives <dialog> (Fokusfalle, Esc, Top-Layer inklusive) mit eigener Ein-/Ausblendung.
 * Smooth-Scroll wird angehalten, solange der Dialog offen ist.
 */
export function Dialog({ open, onClose, label, children, className, placement = 'side' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const { stop, start } = useSmoothScroll();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      stop();
    } else if (!open && d.open) {
      d.close();
      start();
    }
  }, [open, stop, start]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        'm-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-espresso/45 backdrop:backdrop-blur-[3px] open:animate-fade',
        placement === 'side' ? 'ml-auto h-dvh w-full sm:w-[min(560px,100vw)]' : 'mx-auto mt-[12vh] w-[min(680px,92vw)]',
      )}
    >
      <div
        className={cn(
          'relative flex flex-col overflow-y-auto bg-foam text-roast shadow-2xl',
          placement === 'side' ? 'h-full sm:rounded-l-[2rem]' : 'max-h-[70vh] rounded-[1.75rem]',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-milk ring-1 ring-roast/15 transition-colors hover:bg-roast hover:text-foam"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </dialog>
  );
}
