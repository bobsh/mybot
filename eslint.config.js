import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json'
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // General rules
      'no-console': 'off', // Allow console.log for bot logging
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
      'curly': 'error',

      // Code style
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never']
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '*.d.ts', 'coverage/', '.env', '.env.local']
  }
];
