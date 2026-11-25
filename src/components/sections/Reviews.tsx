const REVIEWS = [
  { quote: 'Seit dem Klub kaufe ich keinen Supermarktkaffee mehr. Die Erste Sonne ist mein Sonntag.', name: 'Lena M., Köln' },
  { quote: 'Kommt immer pünktlich, und wenn ich verreise, pausiere ich mit einem Klick.', name: 'Jonas K., Düsseldorf' },
  { quote: 'Die Nachtschicht als Espresso – dicke Crema, null Bitterkeit. Großartig.', name: 'Aylin T., Bonn' },
  { quote: 'Endlich Kaffee, auf dem steht, wann er geröstet wurde. Und das war vorgestern.', name: 'Marc W., Aachen' },
  { quote: 'Schön verpackt, ehrlich im Preis, und der Mahlgrad passt perfekt zu meiner Siebträgermaschine.', name: 'Sophie R., Leverkusen' },
] as const;

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 gap-4 pr-4">
      {REVIEWS.map((r) => (
        <li key={r.name} className="w-[min(78vw,26rem)] shrink-0 rounded-[1.75rem] bg-foam p-7 ring-1 ring-roast/10">
          <p className="text-[0.8rem] tracking-[0.3em] text-caramel" aria-label="5 von 5 Sternen">
            ★★★★★
          </p>
          <blockquote className="font-display mt-4 text-xl font-semibold leading-snug md:text-2xl">„{r.quote}“</blockquote>
          <p className="mt-5 text-sm text-roast/60">{r.name}</p>
        </li>
      ))}
    </ul>
  );
}

/** Stimmen aus dem Klub als endloses Laufband (pausiert bei Hover/Fokus, statisch bei reduzierter Bewegung). */
export function Reviews() {
  return (
    <section aria-labelledby="reviews-title" data-header-tone="dark" className="overflow-hidden bg-cream pb-24 text-roast md:pb-36">
      <div className="mx-auto mb-12 flex max-w-[1600px] items-end justify-between gap-6 px-5 md:px-10">
        <h2 id="reviews-title" className="font-display text-[clamp(2.2rem,4.4vw,4.2rem)] font-extrabold leading-[0.95]">
          4,9 von 5. Aus 2.300 Küchen.
        </h2>
      </div>
      <div className="group flex w-max motion-safe:animate-[marquee_48s_linear_infinite] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
        <Row />
        <Row hidden />
      </div>
    </section>
  );
}
