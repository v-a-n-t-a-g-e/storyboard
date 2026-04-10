import js from '@eslint/js'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import globals from 'globals'

export default [
  js.configs.recommended,
  ...sveltePlugin.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'svelte/sort-attributes': ['error'],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  },
]
