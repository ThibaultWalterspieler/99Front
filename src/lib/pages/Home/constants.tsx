import { InstagramLogoIcon, LinkedInLogoIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';

import { BehanceLogoIcon } from '@components/icons/BehanceLogoIcon';
import { YoutubeLogoIcon } from '@components/icons/YoutubeLogoIcon';

export const HOME_SOCIAL_LINKS = [
  {
    href: 'https://www.instagram.com/99stud/',
    icon: <InstagramLogoIcon className={clsx('size-5 fill-white')} />,
    ariaLabel: '99stud Instagram profile link',
  },
  {
    href: 'https://www.behance.net/99stud/members',
    icon: <BehanceLogoIcon className={clsx('size-5 fill-white')} />,
    ariaLabel: '99stud Behance profile link',
  },
  {
    href: 'https://www.linkedin.com/company/99stud/',
    icon: <LinkedInLogoIcon className={clsx('size-5 fill-white')} />,
    ariaLabel: '99stud LinkedIn profile link',
  },
  {
    href: 'https://www.youtube.com/@99stud',
    icon: <YoutubeLogoIcon className={clsx('size-5 fill-white')} />,
    ariaLabel: '99stud Youtube channel link',
  },
];
