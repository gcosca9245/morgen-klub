# Morgen Klub – Kaffee-Abo (Konzept-Website)

Nachbau des Designs und der Effekte aus einem Instagram-Reel von *Enki's Web Studio* (Konzept „Crema Club“),
mit eigenem Code, eigener Marke („Morgen Klub“), eigenen generierten Fotos/Filmen und frei lizenzierten Schriften.

**Live:** https://gcosca9245.github.io/morgen-klub/

## Stack

- **Next.js 16 (App Router), React 19, TypeScript strict** (`noUncheckedIndexedAccess`), statischer Export
- **Tailwind CSS 4** mit Design-Tokens in `src/app/globals.css` (`@theme`)
- **GSAP 3 + ScrollTrigger** für Scroll-Choreografie, **Lenis** für Smooth-Scroll (mit GSAP-Ticker synchronisiert)
- Schriften: **Bricolage Grotesque** (Display, OFL) und **Figtree** (Text, OFL) – lokal über Fontsource

## Effekte

| Bereich | Umsetzung |
| --- | --- |
| Hero | Gepinnte Karamell-Bühne, Canvas-Bildsequenz (73 Frames) wird gescrubbt: schwebende Tasse → Draufsicht. Headline steigt aus, danach schrumpft die Bühne per `clip-path` zur Karte mit runden Ecken. Pfeile beim Hover springen zwischen Kapiteln, Zeiger-Parallaxe. |
| Rhythmus | Drehteller mit Röstungen dreht sich mit dem Scroll um 360° (97 Frames), Rhythmus-Pills fliegen mit Federkurve herein und sind wählbar (fließen in den Builder). |
| Drei Schritte | Karten-Slider mit organischer Silhouette (`clip-path: path()` pixelgenau aus `organicCardPath`), angeschnittene Nachbarn, Pfeile in den Einbuchtungen, Drag/Swipe, Tastatur, Parallaxe. |
| Abo-Builder | Überlappendes Panel mit Live-Preis (getweente Zahl), Auswahl synchron mit Pills und Karten. |
| Weitere | Röstungs-Karten mit 3D-Neigung, Manifest mit Wort-für-Wort-Highlight, Laufband, Akkordeon, Wortmarke im Footer, magnetische Buttons mit rollendem Label. |

## Struktur

```
src/
  app/                 Layout, Seite, globale Styles/Tokens
  components/
    sections/          Hero, Rhythm, Ritual, Builder, Roasts, Story, Reviews, Faq, Footer
    ui/                PillButton, CircleButton, Dialog, Picture, SplitWords, AnimatedNumber, Icons, Logo
    providers/         SmoothScroll (Lenis ↔ ScrollTrigger), UiState (Dialoge)
    CheckoutDialog.tsx Adresse → Zahlung (simuliert) → Bestätigung
    SearchDialog.tsx   Seitensuche
  hooks/               useGsap (gsap.context + revert), useFrameSequence, useMagnetic, useReducedMotion, useElementSize
  lib/                 catalog (Produkte, Preise), subscription-store (useSyncExternalStore + localStorage),
                       orders (Demo-Backend, Validierung), frame-sequence (progressiver Canvas-Loader), organic-shape
scripts/build-assets.mjs  AVIF/WebP-Varianten, Scroll-Sequenzen (ffmpeg), Etiketten auf den Tüten
assets-src/            Quellbilder und -filme (generiert)
```

## Performance & Zugänglichkeit

- Erster Hero-Frame als `<img fetchpriority="high">` (LCP), Canvas übernimmt nahtlos; Sequenzen laden progressiv
  (jeder 8. → 4. → 2. → jeder Frame) und erst in Viewport-Nähe; 720er-Frames auf kleinen Displays.
- Animationen nur über `transform`, `opacity` und `clip-path`; `gsap.context` räumt bei Unmount auf.
- `prefers-reduced-motion`: kein Smooth-Scroll, keine Pins/Scrubs, Inhalte statisch sichtbar.
- Native `<dialog>` (Fokusfalle, Esc), Skip-Link, beschriftete Formulare mit Fehlermeldungen, `aria-pressed`/`aria-expanded`,
  Karussell mit `inert` für verdeckte Folien.

## Entwicklung

```bash
npm install
npm run assets      # optional: Medien aus assets-src neu erzeugen (ffmpeg nötig)
npm run dev
npm run typecheck && npm run lint
NEXT_PUBLIC_BASE_PATH=/morgen-klub npm run build   # statischer Export nach out/
```

## Hinweis zum Repository

Der Upload-Weg dieses Repos erlaubt nur Text. Quellmedien (`assets-src/`, `public/media/`) sind deshalb nicht eingecheckt;
sie stecken vollständig im veröffentlichten Build (Branch `gh-pages`, Ordner `media/`).

## Für den Echtbetrieb

Zahlung (Stripe Billing), Kundenkonto/Abo-Verwaltung (z. B. Supabase), Bestätigungs-Mails, Impressum/Datenschutz,
echte Produktfotos. `lib/orders.ts` ist die Schnittstelle, die dafür gegen eine API ausgetauscht wird.
