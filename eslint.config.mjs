import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Garde-fou du système d'erreurs : une erreur métier destinée à
    // l'utilisateur doit être une AppError, sinon son message est masqué
    // derrière "Une erreur technique est survenue." par les wrappers.
    // Une panne technique reste un `Error` brut (masquée + remontée à Sentry) :
    // dans ce cas, désactiver la règle sur la ligne avec une justification.
    files: ["src/services/**/*.ts", "src/features/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ThrowStatement > NewExpression[callee.name='Error']",
          message:
            "Utiliser AppError (@/lib/errors) pour une erreur métier affichée à l'utilisateur, ou relancer l'erreur d'origine (`throw error`) pour une panne technique.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "next-env.d.ts",
    "public/sw.js",
    "public/workbox-*.js",
    "public/sw*.map",
    "public/workbox*.map"
  ]),
]);

export default eslintConfig;
