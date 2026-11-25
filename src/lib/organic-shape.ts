/**
 * Erzeugt die organische Kartenform aus dem Referenz-Design als CSS-path() in Pixeln:
 * erhöhter Mittelteil oben, weiche Einbuchtungen links/rechts für die Pfeile, „smooth corners“.
 */
export function organicCardPath(w: number, h: number): string {
  if (w <= 0 || h <= 0) return 'none';
  const r = Math.min(64, w * 0.07, h * 0.14);
  const k = 0.45; // Squircle-Faktor für weichere Ecken als ein Kreisbogen
  const lift = Math.min(h * 0.07, 44);
  const span = Math.min(w * 0.07, 84);
  const bx0 = w * 0.26;
  const bx1 = w * 0.74;
  const notch = Math.min(w * 0.028, 26);
  const ny0 = h * 0.36;
  const ny1 = h * 0.64;
  const ns = Math.min(h * 0.1, 64);
  const f = (n: number) => n.toFixed(1);

  return `path('${[
    `M${f(r)},${f(lift)}`,
    `L${f(bx0 - span)},${f(lift)}`,
    `C${f(bx0 - span * 0.35)},${f(lift)} ${f(bx0 - span * 0.65)},0 ${f(bx0)},0`,
    `L${f(bx1)},0`,
    `C${f(bx1 + span * 0.65)},0 ${f(bx1 + span * 0.35)},${f(lift)} ${f(bx1 + span)},${f(lift)}`,
    `L${f(w - r)},${f(lift)}`,
    `C${f(w - r * k)},${f(lift)} ${f(w)},${f(lift + r * k)} ${f(w)},${f(lift + r)}`,
    `L${f(w)},${f(ny0 - ns)}`,
    `C${f(w)},${f(ny0 - ns * 0.35)} ${f(w - notch)},${f(ny0 - ns * 0.65)} ${f(w - notch)},${f(ny0)}`,
    `L${f(w - notch)},${f(ny1)}`,
    `C${f(w - notch)},${f(ny1 + ns * 0.65)} ${f(w)},${f(ny1 + ns * 0.35)} ${f(w)},${f(ny1 + ns)}`,
    `L${f(w)},${f(h - r)}`,
    `C${f(w)},${f(h - r * k)} ${f(w - r * k)},${f(h)} ${f(w - r)},${f(h)}`,
    `L${f(r)},${f(h)}`,
    `C${f(r * k)},${f(h)} 0,${f(h - r * k)} 0,${f(h - r)}`,
    `L0,${f(ny1 + ns)}`,
    `C0,${f(ny1 + ns * 0.35)} ${f(notch)},${f(ny1 + ns * 0.65)} ${f(notch)},${f(ny1)}`,
    `L${f(notch)},${f(ny0)}`,
    `C${f(notch)},${f(ny0 - ns * 0.65)} 0,${f(ny0 - ns * 0.35)} 0,${f(ny0 - ns)}`,
    `L0,${f(lift + r)}`,
    `C0,${f(lift + r * k)} ${f(r * k)},${f(lift)} ${f(r)},${f(lift)}`,
    'Z',
  ].join(' ')}')`;
}
