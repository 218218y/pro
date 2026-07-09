export default {
  plugins: ['typescript', 'unicorn', 'oxc'],
  categories: {
    correctness: 'error',
  },
  rules: {
    'eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    eqeqeq: ['error', 'smart'],
    'eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    'typescript/no-this-alias': 'off',
  },
  env: {
    builtin: true,
  },
  ignorePatterns: ['dist/**', 'libs/**', 'node_modules/**', 'tools/three_addons/**'],
};
