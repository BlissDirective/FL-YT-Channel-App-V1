import { FlatCompat } from "@eslint/eslintrc";

/**
 * ESLint (Phase 5): next/core-web-vitals over the app source. Worker
 * packages are typechecked separately (pnpm -r typecheck); generated and
 * vendor dirs are ignored.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "packages/**",
      "public/**",
      "playwright-report/**",
      "test-results/**",
      ".claude/**",
    ],
  },
];

export default config;
