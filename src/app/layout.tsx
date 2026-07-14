import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import './globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'ŠPIL — Trening bez opreme',
  description: 'Trening bez opreme, zasnovan na izvlačenju karata. Izvuci kartu, odradi seriju.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} antialiased`}>
      <body className="min-h-screen bg-outer flex justify-center">
        <div className="w-full max-w-[440px] min-h-screen bg-background text-foreground shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <LocaleProvider>
            <AuthProvider>{children}</AuthProvider>
          </LocaleProvider>
        </div>
      </body>
    </html>
  );
}
