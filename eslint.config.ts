import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    languageOptions: {
      parserOptions: {
        // Tell the parser where to find your tsconfig files
        project: [
          './tsconfig.json',
          './tsconfig.app.json',
          './tsconfig.node.json',
        ],

        tsconfigRootDir: __dirname,
      },
    },
  },

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
