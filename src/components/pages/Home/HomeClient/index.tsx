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

interface Props {
  className?: string;
}

export const HomeClient: FC<Props> = ({ className }) => {
  return <LazyLoadedWebGLContext className={clsx(className)} />;
};
