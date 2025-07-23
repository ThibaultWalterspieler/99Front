'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { FC } from 'react';

const LazyLoadedWebGLContext = dynamic(
  () => import('@components/pages/Home/WebGLContext').then((mod) => mod.WebGLContext),
  {
    ssr: false,
  },
);

export const HomeClient: FC = () => {
  return <LazyLoadedWebGLContext className={clsx('fixed inset-0')} />;
};
