export default {
  plugins: ['typescript', 'unicorn', 'oxc'],
  categories: {
    correctness: 'error',
  },
  rules: {},
  env: {
    builtin: true,
  },
  ignorePatterns: ['dist/**', 'libs/**', 'node_modules/**', 'tools/three_addons/**'],
};
