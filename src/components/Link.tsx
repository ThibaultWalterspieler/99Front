import Link from 'next/link';
import { AnchorHTMLAttributes, FC } from 'react';

type ExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

const ExternalLink: FC<ExternalLinkProps> = ({ children, href, ...props }) => {
  return (
    <Link
      className="link uppercase user-select-none text-[10px] md:text-sm text-white opacity-30 hover:opacity-100 transition-opacity duration-100 mix-blend-overlay w-fit h-fit"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
      prefetch={false}
    >
      {children}
    </Link>
  );
};

export default ExternalLink;
