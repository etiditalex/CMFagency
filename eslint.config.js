const coreWebVitals = require("eslint-config-next/core-web-vitals");
const typescript = require("eslint-config-next/typescript");

module.exports = [
  {
    ignores: [".next/**", "out/**", "dist/**", "coverage/**", "node_modules/**"],
  },
  ...coreWebVitals,
  ...typescript,
];

