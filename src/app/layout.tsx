import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/figtree/wght.css';
import './globals.css';
import { SmoothScrollProvider } from '@/components/providers/SmoothScroll';
import { UiStateProvider } from '@/components/providers/UiState';

export const metadata: Metadata = {
  title: 'Morgen Klub – Frisch gerösteter Kaffee im Abo',
  description:
    'Spezialitätenkaffee, frisch in Köln geröstet und in deinem Rhythmus geliefert: wöchentlich, alle zwei Wochen oder monatlich. Jederzeit pausierbar.',
  robots: { index: false, follow: false },
  openGraph: { title: 'Morgen Klub', description: 'Dein Morgen, veredelt.', locale: 'de_DE', type: 'website' },
};

export const viewport: Viewport = {
  themeColor: '#a9693b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <a
          href="#inhalt"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-espresso px-5 py-3 text-sm text-foam transition-transform focus:translate-y-0"
        >
          Zum Inhalt springen
        </a>
        <UiStateProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </UiStateProvider>
      </body>
    </html>
  );
}
