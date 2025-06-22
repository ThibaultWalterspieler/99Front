import clsx from 'clsx';
import { FC } from 'react';

import { Logo } from '@components/icons/99studLogo';

const PrivacyPolicy: FC = () => {
  return (
    <div className={clsx('min-h-screen', 'flex flex-col items-center justify-center gap-6')}>
      <header className={clsx('space-y-6')}>
        <h1 className={clsx('text-2xl font-bold uppercase')}>Legal Notice</h1>
        <Logo />
      </header>
      <main className={clsx('px-6', 'space-y-4', 'max-w-[450px]')}>
        <div className={clsx('space-y-2')}>
          <h2 className={clsx('text-lg font-bold uppercase')}>Publisher</h2>
          <p className={clsx('text-sm text-gray-500')}>
            WEARESTUDIO99, non-profit organisation (under the 1901 law), domiciled at 8 rue Santos
            Dumont, Lyon 69008, France, registered under no. 924529076
          </p>
        </div>
        <div className={clsx('space-y-2')}>
          <h2 className={clsx('text-lg font-bold uppercase')}>Publication directors</h2>
          <ul className={clsx('text-sm text-gray-500')}>
            <li>
              <p>Mr. Thibault Walterspieler, president</p>
            </li>
            <li>
              <p>Mr. Roman Verne, vice-president</p>
            </li>
          </ul>
        </div>
        <div className={clsx('space-y-2')}>
          <h2 className={clsx('text-lg font-bold uppercase')}>Hosting</h2>
          <p className={clsx('text-sm text-gray-500')}>
            Vercel Inc. 440 N Barranca Ave #4133 Covina, CA 91723
          </p>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
