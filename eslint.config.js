/**
 * WardrobePro ESLint (Flat Config)
 *
 * Goal: keep day-to-day lint low-noise, while making it easy to surface
 * exactly what blocks the upcoming ESM migration.
 *
 * Profiles:
 *   - runtime (default): conservative, avoids churn
 *   - migrate          : highlights remaining "script-style" coupling
 *
 * Select profile via:
 *   node tools/wp_lint.js --profile migrate
 */

import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const PROFILE = (process.env.WP_LINT_PROFILE || 'runtime').toLowerCase();
const MIGRATE = PROFILE === 'migrate' || PROFILE === 'esm' || PROFILE === 'module';

// --- Globals ---------------------------------------------------------------

// Browser/runtime built-ins (keep this list boring and stable)
const browserBuiltins = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  Image: 'readonly',
  FileReader: 'readonly',
  Blob: 'readonly',
  performance: 'readonly',
  Event: 'readonly',
  CustomEvent: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  requestIdleCallback: 'readonly',
  structuredClone: 'readonly',
  ResizeObserver: 'readonly',
  NodeFilter: 'readonly',
  HTMLElement: 'readonly',
  ClipboardItem: 'readonly',
  OffscreenCanvas: 'readonly',
  XMLSerializer: 'readonly',
};

// App singletons (allowed everywhere)
const appGlobals = {
  App: 'readonly',
  THREE: 'readonly',
  HistorySystem: 'readonly',
};

// Runtime-only "compat" globals were removed from ESLint globals
// so they surface as no-undef warnings during migration.

const browserGlobalsRuntime = { ...browserBuiltins, ...appGlobals };
const browserGlobalsMigrate = { ...browserBuiltins };

// Node globals for modern ESM tooling.
// NOTE: we intentionally do NOT declare CommonJS globals (require/module/exports)
// so accidental usage is surfaced during lint.
const nodeGlobals = {
  process: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
};

// CommonJS globals for config files that still use `module.exports`.
// We keep this separate so accidental CommonJS usage inside ESM tools stays visible.
const nodeCjsGlobals = {
  ...nodeGlobals,
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
};

// --- Rule sets -------------------------------------------------------------

const unusedVarsWarn = [
  'warn',
  {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrors: 'all',
    caughtErrorsIgnorePattern: '^_',
    ignoreRestSiblings: true,
  },
];

const baseBrowserRules = {
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
  'no-const-assign': 'error',
  // Redeclares usually mean a real bug (and ESM will be less forgiving).
  'no-redeclare': 'error',
  eqeqeq: ['warn', 'smart'],
};

const profileBrowserRules = {
  // Always surface undefined globals/unused vars (migration-friendly).
  'no-undef': 'warn',
  'no-unused-vars': unusedVarsWarn,
};

// --- Layer boundaries -----------------------------------------------------
// Enforce architectural boundaries during the gradual TS migration.
// This complements the existing contract tools:
//   - tools/wp_layer_contract.js (guards against *new* cross-layer edges)
//   - tools/wp_public_api_contract.js (ensures cross-layer imports go via api.js/install.js)

function layerBoundary(files, disallowedGroups, message) {
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: disallowedGroups,
              message,
            },
          ],
        },
      ],
    },
  };
}

const LAYER_DISALLOWED = {
  // adapters -> runtime בלבד
  adapters: [
    '**/kernel/**',
    '**/platform/**',
    '**/services/**',
    '**/builder/**',
    '**/ui/**',
    '**/data/**',
    '**/io/**',
  ],
  // kernel -> runtime בלבד
  kernel: [
    '**/platform/**',
    '**/services/**',
    '**/builder/**',
    '**/ui/**',
    '**/adapters/**',
    '**/data/**',
    '**/io/**',
  ],
  // builder -> runtime בלבד
  builder: [
    '**/kernel/**',
    '**/platform/**',
    '**/services/**',
    '**/ui/**',
    '**/adapters/**',
    '**/data/**',
    '**/io/**',
  ],
  // platform -> kernel/runtime בלבד
  platform: ['**/services/**', '**/builder/**', '**/ui/**', '**/adapters/**', '**/data/**', '**/io/**'],
  // services -> kernel/runtime בלבד
  services: ['**/platform/**', '**/builder/**', '**/ui/**', '**/adapters/**', '**/data/**', '**/io/**'],
  // ui -> services/runtime בלבד
  ui: ['**/kernel/**', '**/platform/**', '**/builder/**', '**/adapters/**', '**/data/**', '**/io/**'],
};

// --- Guardrails: legacy App bags ------------------------------------------
// Prevent regressions back to "hybrid" code paths by forbidding direct access to the
// legacy global bags (maps / cache / tools / ui feedback).
//
// Allowed locations:
// - esm/native/runtime/**            (canonical access helpers + compat shims)
// - esm/native/services/api.ts       (UI-safe public surface)
// - esm/native/kernel/cfg_surface.ts (legacy compat surface installer)
// - esm/native/ui/feedback.ts        (App.uiFeedback compat installer)
//
// Everywhere else must go through runtime/*_access helpers.

const APP_BAG_PROPS = ['maps', 'cache', 'tools', 'uiFeedback', 'cfg'];

const appBagMessage =
  'Do not access legacy App.* bags directly. Use runtime/*_access helpers (or the dedicated compat installer modules).';

const APP_BAG_RESTRICTIONS = APP_BAG_PROPS.flatMap(p => [
  // App.maps / App.cache / ...
  { selector: `MemberExpression[object.name="App"][property.name="${p}"]`, message: appBagMessage },
  // (App as unknown).cache
  {
    selector: `MemberExpression[object.type="TSAsExpression"][object.expression.name="App"][property.name="${p}"]`,
    message: appBagMessage,
  },
  // (App!).cache
  {
    selector: `MemberExpression[object.type="TSNonNullExpression"][object.expression.name="App"][property.name="${p}"]`,
    message: appBagMessage,
  },
  // App["cache"]
  {
    selector: `MemberExpression[object.name="App"][computed=true][property.value="${p}"]`,
    message: appBagMessage,
  },
  // (App as unknown)["cache"]
  {
    selector: `MemberExpression[object.type="TSAsExpression"][object.expression.name="App"][computed=true][property.value="${p}"]`,
    message: appBagMessage,
  },
  // const { cache } = App
  {
    selector: `VariableDeclarator[init.name="App"] > ObjectPattern > Property[key.name="${p}"]`,
    message: appBagMessage,
  },
  // const { cache } = App as unknown
  {
    selector: `VariableDeclarator[init.type="TSAsExpression"][init.expression.name="App"] > ObjectPattern > Property[key.name="${p}"]`,
    message: appBagMessage,
  },
]);

export default [
  {
    // Generated Three.js mirrors are refreshed from node_modules; verify their
    // runtime contract through wp_three_vendor_contract instead of ESLint style rules.
    ignores: ['dist/**', 'libs/**', 'node_modules/**', 'tools/three_addons/**'],
  },

  // Legacy / pre-ESM source (./js). Only present in older repos.
  // In runtime profile we keep this low-noise; in migrate profile we surface globals/unused vars
  // to help finish migration work.
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: MIGRATE ? browserGlobalsMigrate : browserGlobalsRuntime,
    },
    rules: {
      ...baseBrowserRules,
      ...(MIGRATE ? profileBrowserRules : {}),
    },
  },

  // Pure ESM source (./esm)
  {
    files: ['esm/**/*.js', 'esm/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // Browser built-ins only. Intentionally DO NOT declare App/THREE as globals in ESM mode.
      globals: browserBuiltins,
    },
    rules: {
      ...baseBrowserRules,
      'no-undef': 'error',
      'no-unused-vars': unusedVarsWarn,
      'no-restricted-globals': ['error', 'window', 'globalThis'],
      eqeqeq: ['warn', 'smart'],
    },
  },

  // Pure ESM TypeScript source (./esm and ./types)
  {
    files: ['esm/**/*.ts', 'esm/**/*.tsx', 'esm/**/*.mts', 'types/**/*.ts', 'types/**/*.d.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      // Same philosophy as ESM JS: keep browser globals available, but restrict direct access in core.
      globals: browserBuiltins,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...baseBrowserRules,
      // In TS, `no-undef` is noisy/incorrect (TS knows libs/types). Let TS catch type errors.
      'no-undef': 'off',
      // Use the TS-aware unused vars rule.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': unusedVarsWarn,
      'no-restricted-globals': ['error', 'window', 'globalThis'],
      eqeqeq: ['warn', 'smart'],
    },
  },

  // Layer import boundaries (pure ESM)
  // NOTE: We intentionally keep these simple (import path heuristics) so they work
  // everywhere, even before full TS project-references enforcement.
  layerBoundary(
    [
      'esm/native/adapters/**/*.js',
      'esm/native/adapters/**/*.mjs',
      'esm/native/adapters/**/*.ts',
      'esm/native/adapters/**/*.tsx',
      'esm/native/adapters/**/*.mts',
    ],
    LAYER_DISALLOWED.adapters,
    'Layer boundary: adapters may only import from runtime (or local adapters modules).'
  ),
  layerBoundary(
    [
      'esm/native/kernel/**/*.js',
      'esm/native/kernel/**/*.mjs',
      'esm/native/kernel/**/*.ts',
      'esm/native/kernel/**/*.tsx',
      'esm/native/kernel/**/*.mts',
    ],
    LAYER_DISALLOWED.kernel,
    'Layer boundary: kernel may only import from runtime (or local kernel modules).'
  ),
  layerBoundary(
    [
      'esm/native/builder/**/*.js',
      'esm/native/builder/**/*.mjs',
      'esm/native/builder/**/*.ts',
      'esm/native/builder/**/*.tsx',
      'esm/native/builder/**/*.mts',
    ],
    LAYER_DISALLOWED.builder,
    'Layer boundary: builder may only import from runtime (or local builder modules).'
  ),
  layerBoundary(
    [
      'esm/native/platform/**/*.js',
      'esm/native/platform/**/*.mjs',
      'esm/native/platform/**/*.ts',
      'esm/native/platform/**/*.tsx',
      'esm/native/platform/**/*.mts',
    ],
    LAYER_DISALLOWED.platform,
    'Layer boundary: platform may only import from kernel/runtime (or local platform modules).'
  ),
  layerBoundary(
    [
      'esm/native/services/**/*.js',
      'esm/native/services/**/*.mjs',
      'esm/native/services/**/*.ts',
      'esm/native/services/**/*.tsx',
      'esm/native/services/**/*.mts',
    ],
    LAYER_DISALLOWED.services,
    'Layer boundary: services may only import from kernel/runtime (or local services modules).'
  ),
  layerBoundary(
    [
      'esm/native/ui/**/*.js',
      'esm/native/ui/**/*.mjs',
      'esm/native/ui/**/*.ts',
      'esm/native/ui/**/*.tsx',
      'esm/native/ui/**/*.mts',
    ],
    LAYER_DISALLOWED.ui,
    'Layer boundary: ui may only import from services (via services/api) or local ui modules.'
  ),

  // ESM code should not touch browser globals directly (route through runtime/browser_env via DI).
  {
    files: [
      'esm/native/platform/**/*.js',
      'esm/native/platform/**/*.ts',
      'esm/native/platform/**/*.tsx',
      'esm/native/platform/**/*.mts',
      'esm/native/services/**/*.js',
      'esm/native/services/**/*.ts',
      'esm/native/services/**/*.tsx',
      'esm/native/services/**/*.mts',
      'esm/native/kernel/**/*.js',
      'esm/native/kernel/**/*.ts',
      'esm/native/kernel/**/*.tsx',
      'esm/native/kernel/**/*.mts',
      'esm/native/io/**/*.js',
      'esm/native/io/**/*.ts',
      'esm/native/io/**/*.tsx',
      'esm/native/io/**/*.mts',
      'esm/native/builder/**/*.js',
      'esm/native/builder/**/*.ts',
      'esm/native/builder/**/*.tsx',
      'esm/native/builder/**/*.mts',
      'esm/native/ui/**/*.js',
      'esm/native/ui/**/*.ts',
      'esm/native/ui/**/*.tsx',
      'esm/native/ui/**/*.mts',
    ],
    rules: {
      // Route through runtime/browser_env (DI) instead of accessing browser globals directly.
      'no-restricted-globals': ['error', 'window', 'globalThis', 'document', 'navigator', 'location'],
    },
  },

  // Allow the import-side-effect test to touch globals.
  {
    files: ['esm/test_no_side_effects_on_import.mjs'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },

  // Node tooling & configs
  {
    // ESM-only Node scripts (project is `"type": "module"`).
    files: ['tools/**/*.js', '*.js', '*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      // Project is ESM (`"type": "module"`), and our tools use ESM imports.
      // If this is set to 'script' ESLint will fail parsing `import`/`export`.
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': unusedVarsWarn,
      eqeqeq: ['warn', 'smart'],
    },
  },

  // CommonJS config files (`*.cjs`) must be linted as scripts (module.exports).
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: nodeCjsGlobals,
    },
    rules: {
      // Keep config files strict, but don't break on their intentional CJS globals.
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': unusedVarsWarn,
      eqeqeq: ['warn', 'smart'],
    },
  },

  // Boundary: core modules must not import browser_env directly.
  // Use UI/adapters to read window/document/navigator and inject functions into core.
  {
    files: [
      'esm/native/platform/**/*.js',
      'esm/native/platform/**/*.mjs',
      'esm/native/platform/**/*.ts',
      'esm/native/platform/**/*.tsx',
      'esm/native/platform/**/*.mts',

      'esm/native/services/**/*.js',
      'esm/native/services/**/*.mjs',
      'esm/native/services/**/*.ts',
      'esm/native/services/**/*.tsx',
      'esm/native/services/**/*.mts',

      'esm/native/io/**/*.js',
      'esm/native/io/**/*.mjs',
      'esm/native/io/**/*.ts',
      'esm/native/io/**/*.tsx',
      'esm/native/io/**/*.mts',

      'esm/native/builder/**/*.js',
      'esm/native/builder/**/*.mjs',
      'esm/native/builder/**/*.ts',
      'esm/native/builder/**/*.tsx',
      'esm/native/builder/**/*.mts',

      'esm/native/kernel/**/*.js',
      'esm/native/kernel/**/*.mjs',
      'esm/native/kernel/**/*.ts',
      'esm/native/kernel/**/*.tsx',
      'esm/native/kernel/**/*.mts',

      'esm/native/data/**/*.js',
      'esm/native/data/**/*.mjs',
      'esm/native/data/**/*.ts',
      'esm/native/data/**/*.tsx',
      'esm/native/data/**/*.mts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['**/runtime/browser_env.js', '**/runtime/browser_env.ts'],
        },
      ],
    },
  },

  // Guardrail: forbid direct App.* bag usage outside runtime/compat modules.
  {
    files: [
      'esm/native/**/*.js',
      'esm/native/**/*.mjs',
      'esm/native/**/*.ts',
      'esm/native/**/*.tsx',
      'esm/native/**/*.mts',
    ],
    ignores: ['esm/native/runtime/**', 'esm/native/kernel/cfg_surface.ts', 'esm/native/ui/feedback.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...APP_BAG_RESTRICTIONS],
    },
  },

  // Entry adapters (HTML/bootstrap): allowed to touch browser globals.
  // Keep the rest of ./esm free of direct window/document reads.
  {
    files: ['esm/entry*.js', 'esm/entry*.mjs', 'esm/entry*.ts', 'esm/entry*.tsx', 'esm/entry*.mts'],
    // Future TS entry points (during migration)
    // files: ['esm/entry*.ts'] is handled by the TS block above, but we keep the exception here too.
    rules: {
      // Entry code may use `window`/`document`, but we still forbid `globalThis`
      // so browser-only assumptions stay explicit.
      'no-restricted-globals': ['error', 'globalThis'],
    },
  },
];
