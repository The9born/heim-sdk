module.exports = {
  parser: "@typescript-eslint/parser",
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  extends: [
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["prettier"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": [
      "error",
      {
        singleQuote: false,
      },
    ],
    "no-unused-vars": "warn",
    "no-constant-condition": "off",
    "prefer-arrow-callback": "error",
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
  },
};
