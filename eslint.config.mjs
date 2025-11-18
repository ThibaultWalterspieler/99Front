import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
// eslint-disable-next-line import/order
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactHooks.configs.flat.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    rules: {
      'react/jsx-sort-props': 'warn',
    },
  },
  {
    rules: {
      'no-console': 'warn',
    },
  },
  {
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'object',
            'type',
            'index',
          ],
          pathGroups: [
            {
              pattern: '#components/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@lib/**',
              group: 'external',
              position: 'after',
            },
          ],
          distinctGroup: true,
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    'public/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'src/payload/payload-types.ts',
    'src/payload/migrations/**/*',
    'src/app/(payload)/**/*',
  ]),
]);

export default eslintConfig;
