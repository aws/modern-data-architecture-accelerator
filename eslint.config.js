import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import jest from 'eslint-plugin-jest';

export default [
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
        require: true,
        node: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier,
      jest,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      'dot-notation': 'off',
      'no-case-declarations': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/no-var-requires': 0,
      '@typescript-eslint/ban-ts-comment': 'off',
      'prettier/prettier': 'error',
    },
  },
];