'use client';

import dynamic from 'next/dynamic';

import ExternalLink from '@99Stud/components/Link';

const WebGLContext = dynamic(
  () => import('@99Stud/components/WebGLContext').then((mod) => mod.WebGLContext),
  { ssr: false },
);

const links = [
  {
    href: 'https://www.instagram.com/99stud/',
    label: 'Instagram',
  },
  {
    href: 'https://www.behance.net/99stud/members',
    label: 'Behance',
  },
]

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden pointer-events-none">
      <WebGLContext />

      <div className="link-wrapper overflow-hidden pointer-events-auto absolute z-50 bottom-[20px] md:top-[20px] right-[20px] w-fit h-fit flex flex-row items-center justify-center gap-[16px] pointer-events-auto">
        {links.map((link) => (
          <ExternalLink href={link.href} key={link.href}>{link.label}</ExternalLink>
        ))}
      </div>
    </div>
  );
}
