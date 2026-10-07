import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import pluginVitest from '@vitest/eslint-plugin'
import oxlint from 'eslint-plugin-oxlint'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// Compose the official Vue and TypeScript flat configs directly.
// This preserves the lint rules without the unpatched fast-glob/braces dependency.
export default tseslint.config(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    extends: [...tseslint.configs.recommended, ...pluginVue.configs['flat/essential']],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { parser: tseslint.parser },
    },
  },
  
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },
  ...oxlint.configs['flat/recommended'],
  skipFormatting,
)
