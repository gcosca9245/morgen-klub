'use client';

import { getGrind, getRhythm, getRoast, getSize, quote } from './catalog';
import type { Selection } from './subscription-store';

/** Demo-Backend: speichert Abos lokal. Für den Echtbetrieb gegen eine API austauschbar. */
export interface Address {
  name: string;
  email: string;
  street: string;
  zip: string;
  city: string;
}

export type PaymentMethod = 'karte' | 'paypal' | 'sepa';

export interface Order {
  id: string;
  createdAt: string;
  firstDelivery: string;
  selection: Selection;
  address: Address;
  payment: PaymentMethod;
  total: number;
  summary: string;
}

const KEY = 'mk:orders:v1';

export type FieldErrors = Partial<Record<keyof Address, string>>;

/** Validiert die Lieferadresse (deutsche PLZ, E-Mail, Pflichtfelder). */
export function validateAddress(a: Address): FieldErrors {
  const errors: FieldErrors = {};
  if (a.name.trim().length < 2) errors.name = 'Bitte gib deinen Namen an.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email.trim())) errors.email = 'Diese E-Mail-Adresse sieht nicht vollständig aus.';
  if (a.street.trim().length < 4) errors.street = 'Straße und Hausnummer, bitte.';
  if (!/^\d{5}$/.test(a.zip.trim())) errors.zip = 'Die PLZ hat fünf Ziffern.';
  if (a.city.trim().length < 2) errors.city = 'Bitte gib deinen Ort an.';
  return errors;
}

function nextDeliveryDate(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 2);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

/** Simuliert Zahlungsautorisierung und legt das Abo an. */
export async function placeOrder(selection: Selection, address: Address, payment: PaymentMethod): Promise<Order> {
  await new Promise((r) => setTimeout(r, 1100));
  const { total } = quote(selection.roast, selection.rhythm, selection.size);
  const id = `MK-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    firstDelivery: nextDeliveryDate().toISOString(),
    selection,
    address,
    payment,
    total,
    summary: `${getRoast(selection.roast).name}, ${getSize(selection.size).label}, ${getGrind(selection.grind).label} – ${getRhythm(selection.rhythm).short}`,
  };
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as Order[];
    window.localStorage.setItem(KEY, JSON.stringify([order, ...list].slice(0, 20)));
  } catch {
    /* Demo: Speichern ist optional. */
  }
  return order;
}
