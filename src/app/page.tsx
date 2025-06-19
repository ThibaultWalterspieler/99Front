import clsx from 'clsx';
import Link from 'next/link';
import { FC } from 'react';

import { HOME_SOCIAL_LINKS } from '@lib/pages/Home/constants';

import { HomeClient } from '@components/pages/Home/HomeClient';

const Home: FC = () => {
  return (
    <main>
      <HomeClient className={clsx('fixed -z-10')} />
      <header
        className={clsx(
          'h-screen w-screen',
          'grid grid-cols-1 grid-rows-3 md:grid-cols-2 md:grid-rows-2',
        )}
      >
        <nav className={clsx('fixed top-4 left-4', 'flex flex-col gap-4')}>
          <Link className={clsx('text-sm font-medium underline')} href="/legal-notice">
            Legal Notice
          </Link>
        </nav>
        <nav className={clsx('fixed top-4 right-4', 'flex flex-col gap-4')}>
          {HOME_SOCIAL_LINKS.map((link) => (
            <Link
              aria-label={link.ariaLabel}
              href={link.href}
              key={link.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {link.icon}
            </Link>
          ))}
        </nav>
        <div
          className={clsx(
            'col-start-1 row-start-3 md:col-start-2 md:row-start-2',
            'flex items-center justify-center gap-3',
            'text-white',
          )}
        >
          <h1 className={clsx('text-2xl font-bold tracking-[-0.125em] italic')}>99stud</h1>
          <span className={clsx('text-xl font-light', 'translate-y-0.2w5')}>
            creative collective
          </span>
        </div>
      </header>
    </main>
  );
};

export default Home;
