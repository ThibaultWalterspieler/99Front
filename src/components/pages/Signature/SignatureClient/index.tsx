'use client';

import clsx from 'clsx';
import { FC, useEffect, useRef, useState } from 'react';

import {
  SIGNATURE_PLACEHOLDER_NAME,
  signatureHtml,
  signatureText,
} from '@lib/pages/Signature/signature';

const INSTALL_STEPS = [
  {
    app: 'Gmail',
    steps: 'Settings → See all settings → General → Signature → Create new, then paste.',
  },
  {
    app: 'Apple Mail',
    steps:
      'Settings → Signatures → select the account, click +, untick “Always match my default message font”, then paste. Make sure the signature is under your account (drag it onto the account in the left column if it isn’t), then pick it in “Choose Signature”. The Settings preview often shows an empty box where the logo goes; compose a new email to check the logo.',
  },
  {
    app: 'Outlook',
    steps: 'Settings → Account → Signatures → New signature, then paste.',
  },
];

// Fixed colors on purpose: the cards mimic a mail app's message view, whatever the site's theme.
const PREVIEWS = [
  { label: 'Light mode', className: 'bg-[#ffffff] text-[#111111]' },
  { label: 'Dark mode', className: 'bg-[#1e1e1e] text-[#f2f2f2]' },
];

export const SignatureClient: FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [status, setStatus] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const statusTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const name =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || SIGNATURE_PLACEHOLDER_NAME;
  const html = signatureHtml(name);

  useEffect(() => () => clearTimeout(statusTimeout.current), []);

  const flash = (message: string) => {
    setStatus(message);
    clearTimeout(statusTimeout.current);
    statusTimeout.current = setTimeout(() => setStatus(''), 2500);
  };

  const copySelection = () => {
    if (!previewRef.current) return false;
    const range = document.createRange();
    range.selectNodeContents(previewRef.current);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const copied = document.execCommand('copy');
    selection?.removeAllRanges();
    return copied;
  };

  const copySignature = async () => {
    let copied = true;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([signatureText(name)], { type: 'text/plain' }),
        }),
      ]);
    } catch {
      copied = copySelection();
    }
    flash(
      copied
        ? 'Copied. Paste it into your mail app’s signature editor.'
        : 'Couldn’t access the clipboard.',
    );
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      flash('HTML source copied.');
    } catch {
      flash('Couldn’t access the clipboard.');
    }
  };

  return (
    <main className={clsx('mx-auto max-w-[640px] px-4 pt-10 pb-16')}>
      <header className={clsx('space-y-1')}>
        <h1 className={clsx('text-2xl font-bold uppercase')}>Email signature</h1>
        <p className={clsx('text-sm text-gray-500')}>
          Type your name, copy, paste into your mail app.
        </p>
      </header>

      <div className={clsx('mt-6', 'grid grid-cols-1 gap-3 sm:grid-cols-2')}>
        <label className={clsx('space-y-1')}>
          <span className={clsx('block text-sm font-medium')}>First name</span>
          <input
            autoComplete="given-name"
            className={clsx(
              'w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700',
            )}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Firstname"
            value={firstName}
          />
        </label>
        <label className={clsx('space-y-1')}>
          <span className={clsx('block text-sm font-medium')}>Last name</span>
          <input
            autoComplete="family-name"
            className={clsx(
              'w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700',
            )}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Lastname"
            value={lastName}
          />
        </label>
      </div>

      <h2 className={clsx('mt-8 mb-3', 'text-lg font-bold uppercase')}>Preview</h2>
      <div className={clsx('grid gap-3')}>
        {PREVIEWS.map((preview, index) => (
          <figure
            className={clsx(
              'm-0 overflow-x-auto rounded-lg border border-gray-300 px-5 pt-3.5 pb-6 dark:border-gray-700',
              preview.className,
            )}
            key={preview.label}
          >
            <figcaption className={clsx('mb-3.5 text-xs tracking-wider uppercase opacity-50')}>
              {preview.label}
            </figcaption>
            <div dangerouslySetInnerHTML={{ __html: html }} ref={index === 0 ? previewRef : null} />
          </figure>
        ))}
      </div>

      <div className={clsx('mt-4', 'flex flex-wrap items-center gap-3')}>
        <button
          className={clsx(
            'cursor-pointer rounded-md px-4 py-2 font-medium',
            'bg-foreground text-background',
          )}
          onClick={copySignature}
          type="button"
        >
          Copy signature
        </button>
        <button
          className={clsx(
            'cursor-pointer rounded-md border border-gray-300 px-4 py-2 font-medium dark:border-gray-700',
          )}
          onClick={copyHtml}
          type="button"
        >
          Copy HTML
        </button>
        <span className={clsx('text-sm text-gray-500')} role="status">
          {status}
        </span>
      </div>

      <h2 className={clsx('mt-8 mb-3', 'text-lg font-bold uppercase')}>Install</h2>
      <ol className={clsx('list-decimal space-y-2 pl-5', 'text-sm text-gray-500')}>
        {INSTALL_STEPS.map((install) => (
          <li key={install.app}>
            <strong className={clsx('text-foreground')}>{install.app}</strong>: {install.steps}
          </li>
        ))}
      </ol>
    </main>
  );
};
