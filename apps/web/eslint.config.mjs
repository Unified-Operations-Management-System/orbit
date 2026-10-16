import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Architecture boundaries. Imports flow one way: app → features → components/lib.
// Flat config replaces (not merges) a rule's options per file, so each block lists every
// pattern that applies to it.
const deepFeatureImport = {
  group: ["@/features/*/*", "@/features/*/*/**"],
  message: "Import a feature through its public API (@/features/<name>), not its internals.",
};
const appImport = {
  group: ["@/app", "@/app/**"],
  message: "Nothing imports from app/: it holds routes only. Move shared code to features/, components/ or lib/.",
};
const featureImport = {
  group: ["@/features", "@/features/**"],
  message: "Shared code (components/, lib/) must not depend on a feature. Move the code into the feature, or pass data in as props.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [deepFeatureImport, appImport] }],
    },
  },
  {
    files: ["components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [featureImport, appImport] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
