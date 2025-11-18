import { CodeBlock } from '@lib/payload/blocks/Code';
import { ParagraphBlock } from '@lib/payload/blocks/Paragraph';
import { QuoteBlock } from '@lib/payload/blocks/Quote';
import { ScriptCopyBtnBlock } from '@lib/payload/blocks/ScriptCopyBtn';
import { TweetCardBlock } from '@lib/payload/blocks/TweetCard';

import type { CollectionConfig } from 'payload';

export const BlogPosts: CollectionConfig = {
  slug: 'blogPosts',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
  },
  versions: {
    drafts: { autosave: true },
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'content',
      type: 'blocks',
      blocks: [ParagraphBlock, CodeBlock, ScriptCopyBtnBlock, QuoteBlock, TweetCardBlock],
      localized: true,
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
  ],
};
