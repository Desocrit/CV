// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  // Base configs
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,

  // Astro support
  ...eslintPluginAstro.configs.recommended,

  // Accessibility rules
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.strict.rules,
    },
  },

  // Strict TypeScript rules
  {
    rules: {
      // Unused variables
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Type consistency
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Strict checks
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },

  // Ignores
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', '*.config.*'],
  }
);
