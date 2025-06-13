import { Analytics } from '@vercel/analytics/next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { FC, PropsWithChildren } from 'react';

import type { Metadata } from 'next';

import './globals.scss';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const ppSupplySans = localFont({
  src: 'fonts/PPSupplySans-Regular.woff2',
  variable: '--font-supply-sans',
});

export const metadata: Metadata = {
  title: '99stud - Creative Independent Studio',
  description: '99stud is a creative independent studio that makes things.',
};

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${ppSupplySans.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
