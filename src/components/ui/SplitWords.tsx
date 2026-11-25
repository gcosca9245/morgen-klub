import { Fragment } from 'react';

/**
 * Teilt Text in maskierte Wörter. Animationen greifen über `[data-word]` zu.
 * Screenreader lesen den Originaltext (aria-label), nicht die Einzelteile.
 */
export function SplitWords({ text, className, delayBase = 0 }: { text: string; className?: string; delayBase?: number }) {
  const words = text.split(' ');
  return (
    <span aria-label={text} role="text" className={className}>
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <span className="mask-line" aria-hidden="true">
            <span data-word style={{ ['--i' as string]: i + delayBase }}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  );
}
