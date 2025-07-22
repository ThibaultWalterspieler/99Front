import { Analytics } from '@vercel/analytics/next';
import clsx from 'clsx';
import { Geist, Geist_Mono } from 'next/font/google';
import { FC, PropsWithChildren } from 'react';

import type { Metadata, Viewport } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#0a0a0a' }],
};

export const metadata: Metadata = {
  title: '99stud | Independent Creative Collective',
  description:
    'Multidisciplinary collective based in Paris, Lyon and Milan. Blurring the lines between web, 3D and music.',
  icons: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      url: '/favicon.ico',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      url: '/favicon-dark.png',
      media: '(prefers-color-scheme: dark)',
    },
  ],
  creator: '99stud',
  authors: [{ name: '99stud', url: 'https://99stud.com' }],
  publisher: '99stud',
  openGraph: {
    type: 'website',
    title: '99stud | Independent Creative Collective',
    description:
      'Multidisciplinary collective based in Paris, Lyon and Milan. Blurring the lines between web, 3D and music.',
  },
};

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <html lang="en">
      <link href="/favicon.ico" rel="icon" sizes="any" />
      <link href="/icon?<generated>" rel="icon" sizes="<generated>" type="image/<generated>" />
      <body className={clsx(geistSans.variable, geistMono.variable, 'font-sans antialiased')}>
        {children}
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
