import { FC } from 'react';

import { SignatureClient } from '@components/pages/Signature/SignatureClient';

import type { Metadata } from 'next';

// Internal team tool: kept out of search engines and not linked from anywhere on the site.
// The matching X-Robots-Tag header is set in next.config.ts.
export const metadata: Metadata = {
  title: 'Email signature | 99stud',
  robots: { index: false, follow: false },
  openGraph: null,
};

const SignaturePage: FC = () => <SignatureClient />;

export default SignaturePage;
