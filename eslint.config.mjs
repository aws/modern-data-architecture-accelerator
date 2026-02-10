import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import jest from 'eslint-plugin-jest';

export default [
  {
    ignores: ['**/*.d.ts', '**/*.js', '**/cdk8s/**', '**/imports/**', '**/dist/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      'dot-notation': 'off',
      'no-case-declarations': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    plugins: {
      jest,
    },
    rules: {
      ...jest.configs.recommended.rules,
      'jest/expect-expect': [
        'warn',
        {
          assertFunctionNames: [
            'expect',
            'template.has*',
            'template.resource*',
            'template.template*',
            '*.has*',
            '*.resource*',
            '*.template*',
          ],
        },
      ],
      'jest/no-standalone-expect': [
        'error',
        {
          additionalTestBlockFunctions: ['itintegration', 'itif'],
        },
      ],
    },
  },
  prettierConfig,
];
