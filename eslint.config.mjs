import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.FlatConfig[]} */
const eslintConfig = [
  {
    ignores: ["playwright-report/", "coverage/", ".next/", "node_modules/"]
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
