/**
 * §16.3: "100% tokenized," enforced. Any `color`/`background`/`padding`/
 * `margin`/`border-radius`/`box-shadow`/`z-index` declaration that isn't a
 * `var(--...)` fails the build -- not a code-review hope, a build failure.
 *
 * Deliberately NOT extending `stylelint-config-standard`: it doesn't know
 * Tailwind v4's CSS-first syntax (`@theme`, `@plugin`, bare
 * `@import "tailwindcss"`) and its stylistic rules (hex-length,
 * alpha-value-notation, blank-line conventions) are unrelated to the actual
 * goal here, which is token enforcement, not general CSS style. This repo's
 * component styling lives almost entirely in Tailwind utility classes
 * (enforced separately by eslint-plugin-tailwindcss's `no-arbitrary-value`,
 * see eslint.config.mjs); this file covers the raw CSS that does exist --
 * tokens.css itself and any future one-off stylesheet.
 */
const config = {
  plugins: ["stylelint-declaration-strict-value"],
  rules: {
    "scale-unlimited/declaration-strict-value": [
      [
        "/^color$/",
        "/^background/",
        "padding",
        "margin",
        "border-radius",
        "box-shadow",
        "z-index",
      ],
      {
        ignoreValues: [
          "inherit",
          "initial",
          "unset",
          "currentColor",
          "transparent",
          "none",
          "0",
          "0px",
          "auto",
        ],
      },
    ],
    // Tailwind v4's CSS-first config directives -- not unknown, just not in stylelint's built-in vocabulary.
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["theme", "plugin", "custom-variant", "apply", "config"],
      },
    ],
  },
  ignoreFiles: ["**/node_modules/**", ".next/**", "coverage/**"],
};

export default config;
