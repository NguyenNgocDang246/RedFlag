import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { Suspense, type ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '@/components/site-header';
import { fetchMeServer } from '@/lib/server-api';
import './globals.css';

// Font with full Vietnamese diacritics support, easy to read for everyone.
const sans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RedFlag',
  description: 'Practice spotting online scams with realistic simulations.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const me = await fetchMeServer();
  return (
    <html lang="en" className={sans.variable}>
      <body>
        {/* Header/footer read ?locale=, so they need a Suspense boundary. */}
        <Suspense fallback={<div style={{ height: 68 }} />}>
          <SiteHeader initialMe={me} />
        </Suspense>
        {children}
        <Suspense fallback={null}>
          <SiteFooter me={me} />
        </Suspense>
      </body>
    </html>
  );
}
