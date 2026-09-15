// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Flat config thay cho .eslintrc.js (ESLint 9 không còn đọc file cũ).
 *
 * Giữ nguyên bộ rule đang dùng: typescript-eslint "recommended" (bản KHÔNG
 * type-checked) + prettier. Đổi sang recommendedTypeChecked sẽ bật thêm cả
 * loạt rule no-unsafe-* và làm codebase hiện tại đỏ rực, nên để dành cho một
 * lần dọn riêng.
 */
export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'coverage/**', 'uploads/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
