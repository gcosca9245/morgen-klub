'use client';

import { useState, type FormEvent } from 'react';
import { formatEur, getGrind, getRhythm, getRoast, getSize, quote } from '@/lib/catalog';
import { placeOrder, validateAddress, type Address, type FieldErrors, type Order, type PaymentMethod } from '@/lib/orders';
import { useSelection } from '@/lib/subscription-store';
import { cn } from '@/lib/cn';
import { asset } from '@/lib/asset';
import { Dialog } from './ui/Dialog';
import { PillButton } from './ui/PillButton';
import { CheckIcon } from './ui/Icons';
import { useUi } from './providers/UiState';

type Step = 'adresse' | 'zahlung' | 'fertig';

const EMPTY: Address = { name: '', email: '', street: '', zip: '', city: '' };
const FIELDS: { key: keyof Address; label: string; autoComplete: string; type?: string; span?: boolean; inputMode?: 'numeric' }[] = [
  { key: 'name', label: 'Vor- und Nachname', autoComplete: 'name', span: true },
  { key: 'email', label: 'E-Mail', autoComplete: 'email', type: 'email', span: true },
  { key: 'street', label: 'Straße und Hausnummer', autoComplete: 'street-address', span: true },
  { key: 'zip', label: 'PLZ', autoComplete: 'postal-code', inputMode: 'numeric' },
  { key: 'city', label: 'Ort', autoComplete: 'address-level2' },
];
const PAYMENTS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: 'karte', label: 'Kreditkarte', hint: 'Visa, Mastercard, Amex' },
  { id: 'paypal', label: 'PayPal', hint: 'Weiterleitung nach dem Klick' },
  { id: 'sepa', label: 'SEPA-Lastschrift', hint: 'Abbuchung je Lieferung' },
];

const dateFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

/** Checkout als Seitenpanel: Adresse → Zahlung (simuliert) → Bestätigung mit Abo-Nummer. */
export function CheckoutDialog() {
  const { checkoutOpen, closeCheckout } = useUi();
  const sel = useSelection();
  const [step, setStep] = useState<Step>('adresse');
  const [address, setAddress] = useState<Address>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [payment, setPayment] = useState<PaymentMethod>('karte');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const q = quote(sel.roast, sel.rhythm, sel.size);
  const roast = getRoast(sel.roast);

  const close = () => {
    closeCheckout();
    if (step === 'fertig') {
      setStep('adresse');
      setOrder(null);
    }
  };

  const submitAddress = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateAddress(address);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep('zahlung');
    else document.getElementById(`co-${Object.keys(errs)[0]}`)?.focus();
  };

  const submitPayment = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setOrder(await placeOrder(sel, address, payment));
      setStep('fertig');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={checkoutOpen} onClose={close} label="Abo abschließen">
      <div className="border-b border-roast/10 p-6 pr-20 md:p-8 md:pr-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-caramel-deep">Dein Ritual</p>
        <div className="mt-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- statischer Export */}
          <img src={asset(`/media/${roast.image}-480.webp`)} alt="" width={64} height={85} className="h-[85px] w-16 rounded-xl object-cover object-[50%_60%]" />
          <div className="min-w-0">
            <p className="font-display text-2xl font-bold">{roast.name}</p>
            <p className="text-sm text-roast/70">
              {getSize(sel.size).label} · {getGrind(sel.grind).label} · {getRhythm(sel.rhythm).label}
            </p>
          </div>
          <p className="ml-auto text-right text-sm">
            <span className="block text-lg font-bold">{formatEur(q.total)}</span>
            <span className="text-roast/75">pro Lieferung</span>
          </p>
        </div>
        <ol className="mt-6 flex gap-2 text-xs font-semibold" aria-label="Fortschritt">
          {(['adresse', 'zahlung', 'fertig'] as const).map((s, i) => (
            <li key={s} aria-current={step === s ? 'step' : undefined} className={cn('flex-1 border-t-2 pt-2 capitalize', step === s || (s !== 'fertig' && step === 'fertig') || (s === 'adresse' && step === 'zahlung') ? 'border-roast text-roast' : 'border-roast/15 text-roast/45')}>
              {i + 1}. {s === 'fertig' ? 'Bestätigung' : s}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex-1 p-6 md:p-8">
        {step === 'adresse' && (
          <form onSubmit={submitAddress} noValidate className="grid grid-cols-2 gap-4">
            <h2 className="font-display col-span-2 text-3xl font-bold">Wohin dürfen wir liefern?</h2>
            {FIELDS.map((f) => (
              <div key={f.key} className={f.span ? 'col-span-2' : 'col-span-1'}>
                <label htmlFor={`co-${f.key}`} className="mb-1.5 block text-sm font-medium">
                  {f.label}
                </label>
                <input
                  id={`co-${f.key}`}
                  type={f.type ?? 'text'}
                  inputMode={f.inputMode}
                  autoComplete={f.autoComplete}
                  value={address[f.key]}
                  onChange={(e) => setAddress((a) => ({ ...a, [f.key]: e.target.value }))}
                  aria-invalid={Boolean(errors[f.key])}
                  aria-describedby={errors[f.key] ? `co-${f.key}-err` : undefined}
                  className={cn('h-12 w-full rounded-2xl bg-milk px-4 ring-1 transition-shadow focus:outline-none focus:ring-2', errors[f.key] ? 'ring-[#b3261e]' : 'ring-roast/15 focus:ring-roast')}
                />
                {errors[f.key] && (
                  <p id={`co-${f.key}-err`} className="mt-1.5 text-sm text-[#b3261e]">
                    {errors[f.key]}
                  </p>
                )}
              </div>
            ))}
            <PillButton type="submit" size="lg" className="col-span-2 mt-4">
              Weiter zur Zahlung
            </PillButton>
          </form>
        )}

        {step === 'zahlung' && (
          <form onSubmit={submitPayment} className="flex flex-col gap-4">
            <h2 className="font-display text-3xl font-bold">Wie möchtest du zahlen?</h2>
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Zahlungsart</legend>
              {PAYMENTS.map((p) => (
                <label key={p.id} className={cn('flex cursor-pointer items-center gap-4 rounded-2xl bg-milk p-4 ring-1 transition-shadow', payment === p.id ? 'ring-2 ring-roast' : 'ring-roast/15 hover:ring-roast/40')}>
                  <input type="radio" name="payment" value={p.id} checked={payment === p.id} onChange={() => setPayment(p.id)} className="size-4 accent-[#4b2a1d]" />
                  <span>
                    <span className="block font-semibold">{p.label}</span>
                    <span className="text-sm text-roast/75">{p.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="text-sm text-roast/75">Demo: Es wird keine echte Zahlung ausgelöst. Für den Echtbetrieb ist die Anbindung an Stripe vorgesehen.</p>
            <div className="mt-2 flex gap-3">
              <PillButton variant="ghost" size="lg" onClick={() => setStep('adresse')}>
                Zurück
              </PillButton>
              <PillButton type="submit" size="lg" className="flex-1" disabled={busy}>
                {busy ? 'Wird autorisiert …' : `Kostenpflichtig abonnieren · ${formatEur(q.total)}`}
              </PillButton>
            </div>
          </form>
        )}

        {step === 'fertig' && order && (
          <div className="flex flex-col items-start gap-5" role="status">
            <span className="grid size-16 place-items-center rounded-full bg-roast text-foam">
              <CheckIcon width={28} height={28} />
            </span>
            <h2 className="font-display text-4xl font-bold">Willkommen im Klub.</h2>
            <p className="text-lg leading-relaxed text-roast/80">
              Abo <strong>{order.id}</strong> ist angelegt. Deine erste Röstung kommt am{' '}
              <strong>{dateFmt.format(new Date(order.firstDelivery))}</strong>. Eine Bestätigung geht an {order.address.email}.
            </p>
            <p className="rounded-2xl bg-milk p-4 text-sm ring-1 ring-roast/10">{order.summary}</p>
            <PillButton size="lg" onClick={close}>
              Zurück zur Seite
            </PillButton>
          </div>
        )}
      </div>
    </Dialog>
  );
}
