import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// ESLint 9/10 flat config. Next 16 removed `next lint`, so we run ESLint
// directly and consume eslint-config-next's native flat configs.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "prisma/**",
      "e2e/**",
      "playwright.config.ts",
      "eslint.config.mjs",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
