import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import tailwindcss from "eslint-plugin-tailwindcss";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,
  {
    // Scoped to actual component source, and consistently so across the
    // whole tailwindcss preset (not just the extra rule below it) -- root
    // config files (*.config.mjs/.mts) and e2e/**/*.ts don't contain
    // Tailwind classnames, and without a matching `files` restriction here
    // the plugin either can't resolve its (irrelevant) CSS theme for them
    // or, worse, isn't registered for them at all when a *different*
    // config object references one of its rules.
    ...tailwindcss.configs.recommended,
    files: ["src/**/*.{ts,tsx}"],
    settings: {
      // REQUIRED for Tailwind v4 -- v3's tailwind.config.js doesn't exist
      // here, the theme lives in this CSS file's `@theme` block instead.
      tailwindcss: { cssConfigPath: "./src/app/globals.css" },
    },
    rules: {
      ...tailwindcss.configs.recommended.rules,
      // §16.3: "100% tokenized," enforced. `bg-[#ff0000]`-style escapes that
      // bypass the token-mapped scale in tokens.css now fail the build.
      "tailwindcss/no-arbitrary-value": "error",
    },
  },
  {
    // Applies everywhere -- prettier formatting isn't Tailwind-specific.
    plugins: { prettier: prettierPlugin },
    rules: { "prettier/prettier": "error" },
  },
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // Legacy scaffold from before this build (a phone/OTP auth flow under
    // an app name of "Kyber AI", unrelated to and inconsistent with this
    // plan's NextAuth/email-password model -- see ARCHITECTURE.md's "A
    // pre-existing, unrelated system in this repo"). Confirmed nothing in
    // the new build imports any of these; flagged for the user to
    // review/remove, not touched here.
    "src/services/**",
    "src/hooks/use-auth.ts",
    "src/hooks/use-debounce.ts",
    "src/hooks/use-local-storage.ts",
    "src/hooks/index.ts",
    "src/lib/utils/validation.ts",
    "src/lib/utils/format.ts",
    "src/lib/utils/api.ts",
    "src/schemas/auth-schema.ts",
    "src/schemas/user-schema.ts",
    "src/schemas/index.ts",
    // NOT src/config/i18n.ts or src/config/index.ts -- both are genuinely
    // used (src/i18n/request.ts imports the barrel, which re-exports
    // i18nConfig alongside the two legacy configs below).
    "src/config/app.ts",
    "src/config/api.ts",
    "src/constants/**",
    "src/types/**",
  ]),
]);

export default eslintConfig;
