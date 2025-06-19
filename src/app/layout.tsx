import { Analytics } from '@vercel/analytics/next';
import { Geist } from 'next/font/google';
import { FC, PropsWithChildren } from 'react';

import type { Metadata } from 'next';

import './globals.scss';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '99stud | Creative Independent Studio',
  description: '99stud is a creative independent studio that makes things happen.',
  creator: '99stud',
  authors: [{ name: '99stud', url: 'https://99stud.com' }],
  publisher: '99stud',
  openGraph: {
    type: 'website',
    title: '99stud | Creative Independent Studio',
    description: '99stud is a creative independent studio that makes things happen.',
  },
};

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <html lang="en">
      <link href="/favicon.ico" rel="icon" sizes="any" />
      <link href="/icon?<generated>" rel="icon" sizes="<generated>" type="image/<generated>" />
      <body className={`${geistSans.variable}  antialiased font-sans`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
