import { FC } from 'react';

import { Logo } from '@components/icons/99studLogo';

const PrivacyPolicy: FC = () => {
  return (
    <main className="flex flex-col items-center justify-center h-screen font-geist-sans">
      <h1 className="text-2xl font-bold mb-4 uppercase">Legal Notice</h1>
      <Logo />
      <div className="w-2/3 max-w-[450px]">
        <h2 className="text-lg font-bold mt-4 uppercase font-display">Publisher</h2>
        <p className="text-sm text-gray-500 mt-4">
          WEARESTUDIO99, non-profit organisation (under the 1901 law), domiciled at 8 rue Santos
          Dumont, Lyon 69008, France, registered under no. 924529076
        </p>
        <h2 className="text-lg font-bold mt-4 uppercase font-display">Publication directors</h2>
        <ul className="text-sm text-gray-500 mt-4">
          <li>
            <p>Mr. Thibault Walterspieler, president</p>
          </li>
          <li>
            <p>Mr. Roman Verne, vice-president</p>
          </li>
        </ul>
        <h2 className="text-lg font-bold mt-4 uppercase font-display">Hosting</h2>
        <p className="text-sm text-gray-500 mt-4">
          Vercel Inc. 440 N Barranca Ave #4133 Covina, CA 91723
        </p>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
