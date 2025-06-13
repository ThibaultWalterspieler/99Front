'use client';

import dynamic from 'next/dynamic';

const WebGLContext = dynamic(
  () =>
    import('@99Stud/components/WebGLContext').then((mod) => mod.WebGLContext),
  { ssr: false }
);

export default function Home() {
  return (
    <div className='relative w-full h-screen overflow-hidden'>
      <WebGLContext />
    </div>
  );
}
