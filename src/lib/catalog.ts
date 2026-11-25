/** Produktkatalog des Morgen Klubs – eine Quelle der Wahrheit für UI, Preise und Checkout. */

export type RoastId = 'nachtschicht' | 'erste-sonne' | 'stadtnebel' | 'goldene-stunde';
export type RhythmId = 'woechentlich' | 'zweiwoechentlich' | 'monatlich';
export type SizeId = '250' | '500' | '1000';
export type GrindId = 'bohne' | 'espresso' | 'filter' | 'french-press';

export interface Roast {
  id: RoastId;
  no: string;
  name: string;
  roast: 'Hell' | 'Mittel' | 'Dunkel' | 'Omni';
  origin: string;
  notes: readonly [string, string, string];
  /** Empfohlene Zubereitung */
  brew: string;
  pricePer250: number;
  image: string;
  accent: string;
}

export interface Rhythm {
  id: RhythmId;
  label: string;
  short: string;
  everyDays: number;
  discount: number;
}

export const ROASTS: readonly Roast[] = [
  {
    id: 'nachtschicht',
    no: '01',
    name: 'Nachtschicht',
    brew: 'Espresso & Mokkakanne',
    roast: 'Dunkel',
    origin: 'Brasilien · Cerrado Mineiro',
    notes: ['Kakao', 'Haselnuss', 'Melasse'],
    pricePer250: 14.9,
    image: 'bag-brown',
    accent: '#5a3a2a',
  },
  {
    id: 'erste-sonne',
    no: '02',
    name: 'Erste Sonne',
    brew: 'Handfilter & Pour-over',
    roast: 'Hell',
    origin: 'Äthiopien · Guji',
    notes: ['Jasmin', 'Pfirsich', 'Bergamotte'],
    pricePer250: 16.9,
    image: 'bag-white',
    accent: '#d9a9a8',
  },
  {
    id: 'stadtnebel',
    no: '03',
    name: 'Stadtnebel',
    brew: 'Vollautomat & Filtermaschine',
    roast: 'Mittel',
    origin: 'Kolumbien · Huila',
    notes: ['Karamell', 'Mandel', 'roter Apfel'],
    pricePer250: 13.9,
    image: 'bag-grey',
    accent: '#9aa9b8',
  },
  {
    id: 'goldene-stunde',
    no: '04',
    name: 'Goldene Stunde',
    brew: 'Espresso & Filter',
    roast: 'Omni',
    origin: 'Guatemala · Huehuetenango',
    notes: ['Honig', 'Aprikose', 'Milchschokolade'],
    pricePer250: 15.5,
    image: 'bag-ochre',
    accent: '#c0924f',
  },
];

export const RHYTHMS: readonly Rhythm[] = [
  { id: 'woechentlich', label: 'Wöchentlich', short: 'jede Woche', everyDays: 7, discount: 0.15 },
  { id: 'zweiwoechentlich', label: 'Alle zwei Wochen', short: 'alle 14 Tage', everyDays: 14, discount: 0.1 },
  { id: 'monatlich', label: 'Monatlich', short: 'jeden Monat', everyDays: 30, discount: 0.05 },
];

export const SIZES: readonly { id: SizeId; label: string; factor: number }[] = [
  { id: '250', label: '250 g', factor: 1 },
  { id: '500', label: '500 g', factor: 1.9 },
  { id: '1000', label: '1 kg', factor: 3.6 },
];

export const GRINDS: readonly { id: GrindId; label: string }[] = [
  { id: 'bohne', label: 'Ganze Bohne' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'filter', label: 'Filter' },
  { id: 'french-press', label: 'French Press' },
];

function byId<T extends { id: string }>(list: readonly T[], id: string): T {
  const hit = list.find((item) => item.id === id);
  if (!hit) throw new Error(`Unbekannte ID: ${id}`);
  return hit;
}

export const getRoast = (id: RoastId) => byId(ROASTS, id);
export const getRhythm = (id: RhythmId) => byId(RHYTHMS, id);
export const getSize = (id: SizeId) => byId(SIZES, id);
export const getGrind = (id: GrindId) => byId(GRINDS, id);

export interface Quote {
  base: number;
  discount: number;
  total: number;
}

/** Preis pro Lieferung, auf Cent gerundet. Versand ist im Klub immer frei. */
export function quote(roastId: RoastId, rhythmId: RhythmId, sizeId: SizeId): Quote {
  const base = getRoast(roastId).pricePer250 * getSize(sizeId).factor;
  const discount = base * getRhythm(rhythmId).discount;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { base: round(base), discount: round(discount), total: round(base - discount) };
}

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const formatEur = (n: number) => eur.format(n);
