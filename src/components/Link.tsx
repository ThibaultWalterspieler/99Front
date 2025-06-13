import { AnchorHTMLAttributes, FC } from 'react';

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
}

const ExternalLink: FC<ExternalLinkProps> = ({ children, href, ...props }) => {
    return (
        <a
            className="link uppercase text-xs md:text-sm text-white opacity-60 hover:opacity-100 transition-opacity duration-100 mix-blend-overlay w-fit h-fit"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
            {...props}
        >
            {children}
        </a>
    );
};

export default ExternalLink;
