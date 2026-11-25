import { Header } from '@/components/Header';
import { Hero } from '@/components/sections/Hero';
import { Rhythm } from '@/components/sections/Rhythm';
import { Ritual } from '@/components/sections/Ritual';
import { Roasts } from '@/components/sections/Roasts';
import { Story } from '@/components/sections/Story';
import { Reviews } from '@/components/sections/Reviews';
import { Espresso } from '@/components/sections/Espresso';
import { Faq } from '@/components/sections/Faq';
import { Footer } from '@/components/sections/Footer';
import { CheckoutDialog } from '@/components/CheckoutDialog';
import { SearchDialog } from '@/components/SearchDialog';

export default function Page() {
  return (
    <>
      <Header />
      <main id="inhalt">
        <Hero />
        <Rhythm />
        <Ritual />
        <Roasts />
        <Story />
        <Reviews />
        <Espresso />
        <Faq />
      </main>
      <Footer />
      <CheckoutDialog />
      <SearchDialog />
    </>
  );
}
