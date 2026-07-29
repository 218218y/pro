import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeModuleDependencies,
  buildLayerContractProposal,
  collectLayerContractGraph,
  collectNamedModuleExports,
  collectStaticModuleImports,
  collectStaticModuleSpecifiers,
  evaluateLayerContract,
  layerOfRelativeFile,
  validateLayerContractSchema,
} from '../tools/wp_layer_contract_support.mjs';

const TEST_CURRENT_DATE = '2026-07-21';
const LAYER_24_SNAPSHOT_DATE = '2026-07-29';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function semanticSha256(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}

const RATCHET = Object.freeze({
  mode: 'decrease-only',
  owner: 'architecture-contract',
  reason: 'Budgets only move down after verified dependency removal.',
  reviewedAt: '2026-07-14',
});

function edge(overrides = {}) {
  return {
    from: 'ui',
    to: 'services',
    importerCount: 1,
    importCount: 1,
    importerFiles: ['esm/native/ui/example.ts'],
    typeImporterCount: 0,
    typeImportCount: 0,
    typeImporterFiles: [],
    valueImporterCount: 1,
    valueImportCount: 1,
    valueImporterFiles: ['esm/native/ui/example.ts'],
    dynamicImporterCount: 0,
    dynamicImportCount: 0,
    dynamicImporterFiles: [],
    ...overrides,
  };
}

function allowRule(overrides = {}) {
  return {
    from: 'ui',
    to: 'services',
    decision: 'allow',
    maxImporterCount: 1,
    maxImportCount: 1,
    maxTypeImporterCount: 0,
    maxTypeImportCount: 0,
    maxValueImporterCount: 1,
    maxValueImportCount: 1,
    maxDynamicImporterCount: 0,
    maxDynamicImportCount: 0,
    reason: 'UI uses the public services facade.',
    ...overrides,
  };
}

function contract({
  rules = [allowRule()],
  facades = [],
  dynamicImportAllowlist = [],
  migrationBudgets = [],
  migrationRetirements = [],
  compatibilityBudgets = [],
} = {}) {
  return {
    version: '2.4',
    root: 'esm',
    ratchet: RATCHET,
    rules,
    facades,
    dynamicImportAllowlist,
    migrationBudgets,
    migrationRetirements,
    compatibilityBudgets,
  };
}

function migrationBudget(overrides = {}) {
  return {
    from: 'ui',
    to: 'services',
    fromFile: 'esm/native/ui/example.ts',
    additionalStatements: 1,
    addedImport: {
      toFile: 'esm/native/services/units.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CM_PER_METER'],
    },
    companionImport: {
      toFile: 'esm/native/services/policy.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['EXAMPLE_POLICY'],
    },
    removedImport: {
      toFile: 'esm/native/services/legacy_facade.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CM_PER_METER', 'EXAMPLE_DIMENSIONS'],
    },
    owner: 'test-migration',
    reason: 'One legacy facade statement was split into a direct owner and canonical units import.',
    reviewedAt: '2026-07-20',
    reviewBy: '2026-10-18',
    removalCondition: 'Remove after the extra units statement is no longer required.',
    ...overrides,
  };
}

function compatibilityBudget(overrides = {}) {
  return {
    id: 'example-compatibility-route',
    from: 'ui',
    to: 'services',
    fromFile: 'esm/native/ui/example.ts',
    statement: {
      toFile: 'esm/native/services/units.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CM_PER_METER'],
    },
    owner: 'test-compatibility-owner',
    reason: 'Reviewed permanent compatibility route.',
    reviewedAt: '2026-07-20',
    nextReviewBy: '2027-07-20',
    publicSurface: 'ui/example.ts → services/units.ts',
    ...overrides,
  };
}

function migrationRetirement(overrides = {}) {
  return {
    entryNumber: 1,
    retiredAt: '2026-07-29',
    mode: 'ownership-transferred',
    reason: 'Permanent compatibility ownership replaces active migration debt.',
    replacementCompatibilityBudgetId: 'example-compatibility-route',
    ...overrides,
  };
}

function consolidationReplacementStatement(overrides = {}) {
  return {
    fromFile: 'esm/native/ui/consolidated.ts',
    toFile: 'esm/native/services/consolidated.ts',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: ['CONSOLIDATED_POLICY'],
    ...overrides,
  };
}

function consolidationRetirement(overrides = {}) {
  return migrationRetirement({
    mode: 'statement-consolidated',
    replacementCompatibilityBudgetId: null,
    replacementStatement: consolidationReplacementStatement(),
    reason: 'The historical statement was replaced by one exact consolidated owner statement.',
    ...overrides,
  });
}

function layer24Graph(imports, edgeOverrides = {}) {
  return {
    edges: [edge(edgeOverrides)],
    imports,
    unresolvedDynamicImports: [],
    forbiddenModuleSyntax: [],
    unclassifiedSourceFiles: [],
  };
}

function migrationImport({
  toFile,
  importedSymbols,
  statementKey,
  fromFile = 'esm/native/ui/example.ts',
  kind = 'value',
  syntax = kind === 'type' ? 'type-import' : 'static-import',
}) {
  return {
    from: 'ui',
    to: 'services',
    fromFile,
    toFile,
    specifier: `../services/${path.basename(toFile, path.extname(toFile))}.js`,
    kind,
    syntax,
    importedSymbols,
    statementKey,
  };
}

function migrationImportsFromSource(source, toFile, statementKey) {
  return analyzeModuleDependencies('example.ts', source).imports.map(dependency =>
    migrationImport({
      toFile,
      importedSymbols: dependency.importedSymbols,
      statementKey,
      kind: dependency.kind,
      syntax: dependency.syntax,
    })
  );
}

function migrationImportFromSource(source, toFile, statementKey) {
  const dependencies = migrationImportsFromSource(source, toFile, statementKey);
  assert.equal(dependencies.length, 1, 'fixture must contain exactly one module dependency');
  return dependencies[0];
}

test('layer contract parser reads AST imports and classifies type, value, and dynamic dependencies', () => {
  const source = `
    const fake = "import '../runtime/not-real.js'";
    // export * from '../services/not-real.js';
    import type { ServiceContract } from '../services/types.js';
    import { type Options, createService } from '../services/api.js';
    export type { KernelState } from '../kernel/api.js';
    type RuntimeApi = typeof import('../runtime/api.js');
    const lazy = import('../runtime/lazy.js');
  `;
  const imports = collectStaticModuleImports('fixture.ts', source).map(({ specifier, kind }) => ({
    specifier,
    kind,
  }));

  assert.deepEqual(imports, [
    { specifier: '../services/types.js', kind: 'type' },
    { specifier: '../services/api.js', kind: 'type' },
    { specifier: '../services/api.js', kind: 'value' },
    { specifier: '../kernel/api.js', kind: 'type' },
    { specifier: '../runtime/api.js', kind: 'type' },
    { specifier: '../runtime/lazy.js', kind: 'dynamic' },
  ]);
  assert.deepEqual(
    collectStaticModuleSpecifiers('fixture.ts', source).sort(),
    [
      '../kernel/api.js',
      '../runtime/api.js',
      '../runtime/lazy.js',
      '../services/api.js',
      '../services/types.js',
    ].sort()
  );

  const namedBindings = collectStaticModuleImports(
    'fixture.ts',
    `
      import { STACK_SPLIT_SEAM_GAP_M as seamGap, type StackOptions } from '../shared/facade.js';
      export { DEFAULT_STACK_SPLIT_LOWER_HEIGHT as defaultLowerHeight } from '../shared/facade.js';
    `
  ).map(({ kind, importedSymbols, exportedSymbols }) => ({
    kind,
    importedSymbols,
    exportedSymbols,
  }));
  assert.deepEqual(namedBindings, [
    { kind: 'type', importedSymbols: ['StackOptions'], exportedSymbols: [] },
    { kind: 'value', importedSymbols: ['STACK_SPLIT_SEAM_GAP_M'], exportedSymbols: [] },
    {
      kind: 'value',
      importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
      exportedSymbols: ['defaultLowerHeight'],
    },
  ]);
});

test('layer contract parser classifies type/value imports and re-exports without double-counting mixed statements', () => {
  const dependencies = analyzeModuleDependencies(
    'fixture.ts',
    `
      import type { X } from './type-only-import.js';
      import { type X, Y } from './mixed-import.js';
      export type { X } from './type-only-export.js';
      export { type X, Y } from './mixed-export.js';
      import { X as Alias } from './aliased-import.js';
      export { X as Alias } from './aliased-export.js';
    `
  ).imports;

  assert.deepEqual(
    dependencies.map(({ specifier, kind, syntax, importedSymbols, exportedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      exportedSymbols,
      bindings,
    })),
    [
      {
        specifier: './type-only-import.js',
        kind: 'type',
        syntax: 'type-import',
        importedSymbols: ['X'],
        exportedSymbols: [],
        bindings: [{ importedName: 'X', localName: 'X', exportedName: null }],
      },
      {
        specifier: './mixed-import.js',
        kind: 'type',
        syntax: 'type-import',
        importedSymbols: ['X'],
        exportedSymbols: [],
        bindings: [{ importedName: 'X', localName: 'X', exportedName: null }],
      },
      {
        specifier: './mixed-import.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['Y'],
        exportedSymbols: [],
        bindings: [{ importedName: 'Y', localName: 'Y', exportedName: null }],
      },
      {
        specifier: './type-only-export.js',
        kind: 'type',
        syntax: 'type-re-export',
        importedSymbols: ['X'],
        exportedSymbols: ['X'],
        bindings: [{ importedName: 'X', localName: null, exportedName: 'X' }],
      },
      {
        specifier: './mixed-export.js',
        kind: 'type',
        syntax: 'type-re-export',
        importedSymbols: ['X'],
        exportedSymbols: ['X'],
        bindings: [{ importedName: 'X', localName: null, exportedName: 'X' }],
      },
      {
        specifier: './mixed-export.js',
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: ['Y'],
        exportedSymbols: ['Y'],
        bindings: [{ importedName: 'Y', localName: null, exportedName: 'Y' }],
      },
      {
        specifier: './aliased-import.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['X'],
        exportedSymbols: [],
        bindings: [{ importedName: 'X', localName: 'Alias', exportedName: null }],
      },
      {
        specifier: './aliased-export.js',
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: ['X'],
        exportedSymbols: ['Alias'],
        bindings: [{ importedName: 'X', localName: null, exportedName: 'Alias' }],
      },
    ]
  );

  const categoryCounts = Object.fromEntries(
    ['static-import', 'type-import', 'static-re-export', 'type-re-export', 'dynamic-import'].map(syntax => [
      syntax,
      new Set(
        dependencies
          .filter(dependency => dependency.syntax === syntax)
          .map(dependency => dependency.statementStart)
      ).size,
    ])
  );
  assert.deepEqual(categoryCounts, {
    'static-import': 2,
    'type-import': 2,
    'static-re-export': 2,
    'type-re-export': 2,
    'dynamic-import': 0,
  });
  assert.equal(new Set(dependencies.map(dependency => dependency.statementStart)).size, 6);
});

test('layer contract parser collects named local exports and re-export aliases', () => {
  const exports = collectNamedModuleExports(
    'fixture.ts',
    `
      const STACK_SPLIT_LOCAL = 1;
      export { STACK_SPLIT_LOCAL, STACK_SPLIT_LOCAL as STACK_SPLIT_ALIAS };
      export const DEFAULT_STACK_SPLIT_POLICY = 2;
      export { STACK_SPLIT_SEAM_GAP_M as seamGap } from '../shared/facade.js';
    `
  ).map(({ localName, exportedName, source, kind }) => ({ localName, exportedName, source, kind }));

  assert.deepEqual(exports, [
    {
      localName: 'STACK_SPLIT_LOCAL',
      exportedName: 'STACK_SPLIT_LOCAL',
      source: null,
      kind: 'value',
    },
    {
      localName: 'STACK_SPLIT_LOCAL',
      exportedName: 'STACK_SPLIT_ALIAS',
      source: null,
      kind: 'value',
    },
    {
      localName: 'DEFAULT_STACK_SPLIT_POLICY',
      exportedName: 'DEFAULT_STACK_SPLIT_POLICY',
      source: null,
      kind: 'value',
    },
    {
      localName: 'STACK_SPLIT_SEAM_GAP_M',
      exportedName: 'seamGap',
      source: '../shared/facade.js',
      kind: 'value',
    },
  ]);
});

test('layer contract classifies shared, entry, composition, and executable import probes explicitly', () => {
  assert.equal(layerOfRelativeFile('esm/shared/value.ts'), 'shared');
  assert.equal(layerOfRelativeFile('esm/entry_pro.ts'), 'entry');
  assert.equal(layerOfRelativeFile('esm/test_imports.mjs'), 'entry');
  assert.equal(layerOfRelativeFile('esm/app_container.ts'), 'composition');
  assert.equal(layerOfRelativeFile('esm/main.ts'), 'composition');
  assert.equal(layerOfRelativeFile('esm/release_main.ts'), 'composition');
  assert.equal(layerOfRelativeFile('esm/unowned.ts'), 'other');
});

test('layer contract reports non-literal dynamic imports and rejects CommonJS module syntax through AST', () => {
  const analysis = analyzeModuleDependencies(
    'fixture.ts',
    `
      import legacy = require('./legacy.js');
      const commonJs = require('./common.js');
      const unresolved = import(modulePath);
      const resolved = import('./resolved.js');
    `
  );

  assert.deepEqual(
    analysis.imports.map(({ specifier, kind }) => ({ specifier, kind })),
    [{ specifier: './resolved.js', kind: 'dynamic' }]
  );
  assert.deepEqual(
    analysis.unresolvedDynamicImports.map(issue => issue.expression),
    ['modulePath']
  );
  assert.deepEqual(
    analysis.forbiddenModuleSyntax.map(issue => issue.syntax),
    ['import-equals', 'require-call']
  );
});

test('layer contract rejects denied edges, budget growth, stale rules, and facade bypasses', () => {
  const graph = {
    edges: [
      edge({ from: 'ui', to: 'runtime' }),
      edge({
        importerCount: 2,
        importCount: 3,
        importerFiles: ['esm/native/ui/example.ts', 'esm/native/ui/new_consumer.ts'],
        valueImporterCount: 2,
        valueImportCount: 3,
        valueImporterFiles: ['esm/native/ui/example.ts', 'esm/native/ui/new_consumer.ts'],
      }),
    ],
    imports: [
      {
        from: 'ui',
        to: 'services',
        fromFile: 'esm/native/ui/example.ts',
        toFile: 'esm/native/services/private_owner.ts',
        specifier: '../services/private_owner.js',
        kind: 'value',
      },
    ],
  };
  const baseline = contract({
    rules: [
      allowRule({ approvedImporters: ['esm/native/ui/example.ts'] }),
      allowRule({
        from: 'services',
        to: 'io',
        reason: 'Stale test rule.',
      }),
    ],
    facades: [
      {
        from: 'ui',
        to: 'services',
        allowedTargets: ['esm/native/services/api.ts'],
        reason: 'UI must use services/api.',
      },
    ],
  });

  const report = evaluateLayerContract(graph, baseline);
  assert.equal(report.ok, false);
  const kinds = new Set(report.failures.map(failure => failure.kind));
  for (const expected of [
    'denied-edge',
    'importer-growth',
    'import-growth',
    'value-importer-growth',
    'value-import-growth',
    'stale-edge',
    'facade-bypass',
  ]) {
    assert.equal(kinds.has(expected), true, `missing ${expected}`);
  }
  const growth = report.failures.find(failure => failure.kind === 'importer-growth');
  assert.deepEqual(growth.newImporters, ['esm/native/ui/new_consumer.ts']);
});

test('changing an existing importer from type-only to runtime import is contract growth', () => {
  const baseline = contract({
    rules: [
      allowRule({
        maxTypeImporterCount: 1,
        maxTypeImportCount: 1,
        maxValueImporterCount: 0,
        maxValueImportCount: 0,
      }),
    ],
  });
  const graph = {
    edges: [
      edge({
        typeImporterCount: 0,
        typeImportCount: 0,
        valueImporterCount: 1,
        valueImportCount: 1,
      }),
    ],
    imports: [],
  };

  const report = evaluateLayerContract(graph, baseline);
  assert.equal(report.ok, false);
  assert.deepEqual(
    report.failures.map(failure => failure.kind),
    ['value-importer-growth', 'value-import-growth']
  );
});

test('layer contract migration budgets exempt only the reviewed statement and keep the base ratchet unchanged', () => {
  const budget = migrationBudget();
  const imports = [
    migrationImport({
      toFile: budget.companionImport.toFile,
      importedSymbols: budget.companionImport.importedSymbols,
      statementKey: 'policy-statement',
    }),
    migrationImport({
      toFile: budget.addedImport.toFile,
      importedSymbols: budget.addedImport.importedSymbols,
      statementKey: 'units-statement',
    }),
  ];
  const graph = {
    edges: [edge({ importCount: 2, valueImportCount: 2 })],
    imports,
  };
  const baseline = contract({ migrationBudgets: [budget] });

  const report = evaluateLayerContract(graph, baseline, { currentDate: TEST_CURRENT_DATE });
  assert.equal(report.ok, true);
  assert.deepEqual(
    report.migrationBudgets.map(entry => ({
      from: entry.from,
      to: entry.to,
      fromFile: entry.fromFile,
      addedTarget: entry.addedTarget,
      reviewBy: entry.reviewBy,
      active: entry.active,
      retired: entry.retired,
      statementValid: entry.statementValid,
    })),
    [
      {
        from: 'ui',
        to: 'services',
        fromFile: 'esm/native/ui/example.ts',
        addedTarget: 'esm/native/services/units.ts',
        reviewBy: '2026-10-18',
        active: true,
        retired: false,
        statementValid: true,
      },
    ]
  );
  assert.equal(baseline.rules[0].maxImportCount, 1);
  assert.equal(baseline.rules[0].maxValueImportCount, 1);

  const unrelatedGrowth = evaluateLayerContract(
    {
      edges: [edge({ importCount: 3, valueImportCount: 3 })],
      imports: [
        ...imports,
        migrationImport({
          toFile: 'esm/native/services/unrelated.ts',
          importedSymbols: ['UNRELATED'],
          statementKey: 'unrelated-statement',
        }),
      ],
    },
    baseline,
    { currentDate: TEST_CURRENT_DATE }
  );
  assert.deepEqual(
    unrelatedGrowth.failures
      .filter(failure => failure.kind.endsWith('import-growth'))
      .map(failure => [failure.kind, failure.current, failure.observed, failure.migrationStatementsExcluded]),
    [
      ['import-growth', 2, 3, 1],
      ['value-import-growth', 2, 3, 1],
    ]
  );
});

test('layer contract migration budgets enforce AST syntax and allow named aliases by source symbol', () => {
  const budget = migrationBudget();
  const baseline = contract({ migrationBudgets: [budget] });
  const companion = migrationImport({
    toFile: budget.companionImport.toFile,
    importedSymbols: budget.companionImport.importedSymbols,
    statementKey: 'policy-statement',
  });
  const evaluateAdded = addedImport =>
    evaluateLayerContract(
      {
        edges: [edge({ importCount: 2, valueImportCount: 2 })],
        imports: [companion, addedImport],
      },
      baseline,
      { currentDate: TEST_CURRENT_DATE }
    );

  const aliasedNamedImport = migrationImportFromSource(
    `import { CM_PER_METER as centimetersPerMeter } from '../services/units.js';`,
    budget.addedImport.toFile,
    'aliased-units-statement'
  );
  assert.equal(evaluateAdded(aliasedNamedImport).ok, true);

  for (const [label, source, expectedSyntax] of [
    ['static re-export', `export { CM_PER_METER } from '../services/units.js';`, 'static-re-export'],
    ['wildcard re-export', `export * from '../services/units.js';`, 'static-re-export'],
    ['type import', `import type { CM_PER_METER } from '../services/units.js';`, 'type-import'],
    ['dynamic import', `void import('../services/units.js');`, 'dynamic-import'],
  ]) {
    const report = evaluateAdded(
      migrationImportFromSource(source, budget.addedImport.toFile, `${label}-statement`)
    );
    assert.equal(report.ok, false, `${label} must not consume a static-import migration budget`);
    assert.deepEqual(
      report.failures.find(failure => failure.kind === 'migration-import-syntax-drift'),
      {
        kind: 'migration-import-syntax-drift',
        from: 'ui',
        to: 'services',
        fromFile: 'esm/native/ui/example.ts',
        field: 'addedImport',
        toFile: 'esm/native/services/units.ts',
        currentSyntax: expectedSyntax,
        expectedSyntax: 'static-import',
      }
    );
  }

  const namespaceReport = evaluateAdded(
    migrationImportFromSource(
      `import * as units from '../services/units.js';`,
      budget.addedImport.toFile,
      'namespace-units-statement'
    )
  );
  assert.equal(
    namespaceReport.failures.some(failure => failure.kind === 'migration-import-symbol-drift'),
    true
  );
});

test('layer contract migration budget rejects the static re-export regression explicitly', () => {
  const budget = migrationBudget();
  const report = evaluateLayerContract(
    {
      edges: [edge({ importCount: 2, valueImportCount: 2 })],
      imports: [
        migrationImport({
          toFile: budget.companionImport.toFile,
          importedSymbols: budget.companionImport.importedSymbols,
          statementKey: 'policy-statement',
        }),
        migrationImportFromSource(
          `export { CM_PER_METER } from '../services/units.js';`,
          budget.addedImport.toFile,
          're-export-statement'
        ),
      ],
    },
    contract({ migrationBudgets: [budget] }),
    { currentDate: TEST_CURRENT_DATE }
  );

  assert.equal(report.ok, false);
  assert.equal(
    report.failures.some(
      failure =>
        failure.kind === 'migration-import-syntax-drift' &&
        failure.currentSyntax === 'static-re-export' &&
        failure.expectedSyntax === 'static-import'
    ),
    true
  );
  assert.equal(
    report.failures.some(
      failure => failure.kind === 'stale-migration-budget' && failure.field === 'addedImport'
    ),
    false
  );
});

test('layer contract migration budgets can explicitly own a static named re-export statement', () => {
  const base = migrationBudget();
  const budget = migrationBudget({
    addedImport: { ...base.addedImport, syntax: 'static-re-export' },
  });
  const baseline = contract({ migrationBudgets: [budget] });
  assert.doesNotThrow(() => validateLayerContractSchema(baseline));
  const report = evaluateLayerContract(
    {
      edges: [edge({ importCount: 2, valueImportCount: 2 })],
      imports: [
        migrationImport({
          toFile: budget.companionImport.toFile,
          importedSymbols: budget.companionImport.importedSymbols,
          statementKey: 'policy-statement',
        }),
        migrationImportFromSource(
          `export { CM_PER_METER } from '../services/units.js';`,
          budget.addedImport.toFile,
          'reviewed-re-export-statement'
        ),
      ],
    },
    baseline,
    { currentDate: TEST_CURRENT_DATE }
  );
  assert.equal(report.ok, true);
});

test('layer contract migration budgets diagnose one mixed statement without treating it as statement growth', () => {
  const budget = migrationBudget();
  const baseline = contract({ migrationBudgets: [budget] });
  const companion = migrationImport({
    toFile: budget.companionImport.toFile,
    importedSymbols: budget.companionImport.importedSymbols,
    statementKey: 'policy-statement',
  });

  for (const [label, source, expectedSyntaxes] of [
    [
      'mixed import',
      `import { type SomeType, CM_PER_METER } from '../services/units.js';`,
      ['static-import', 'type-import'],
    ],
    [
      'mixed re-export',
      `export { type SomeType, CM_PER_METER } from '../services/units.js';`,
      ['static-re-export', 'type-re-export'],
    ],
  ]) {
    const mixedEntries = migrationImportsFromSource(source, budget.addedImport.toFile, `${label}-statement`);
    assert.equal(mixedEntries.length, 2, `${label} must expose type and value dependency entries`);
    assert.equal(
      new Set(mixedEntries.map(entry => entry.statementKey)).size,
      1,
      `${label} must remain one physical statement`
    );

    const report = evaluateLayerContract(
      {
        edges: [
          edge({
            importCount: 2,
            typeImportCount: 1,
            typeImporterCount: 1,
            typeImporterFiles: ['esm/native/ui/example.ts'],
            valueImportCount: 2,
          }),
        ],
        imports: [companion, ...mixedEntries],
      },
      baseline,
      { currentDate: TEST_CURRENT_DATE }
    );

    assert.equal(report.ok, false, `${label} must not consume a pure migration allowance`);
    const failure = report.failures.find(
      entry => entry.kind === 'migration-import-mixed-kind-drift' && entry.field === 'addedImport'
    );
    assert.ok(failure, `${label} must receive a mixed-kind diagnostic`);
    assert.deepEqual(failure.currentKinds, ['type', 'value']);
    assert.deepEqual(failure.currentSyntaxes, expectedSyntaxes);
    assert.equal(failure.statementKey, `${label}-statement`);
    assert.equal(
      report.failures.some(
        entry => entry.kind === 'migration-budget-growth' && entry.field === 'addedImport'
      ),
      false,
      `${label} is one statement and must not be reported as statement growth`
    );
  }
});

test('layer contract migration budgets keep multiple matching statements as growth', () => {
  const budget = migrationBudget();
  const added = migrationImport({
    toFile: budget.addedImport.toFile,
    importedSymbols: budget.addedImport.importedSymbols,
    statementKey: 'units-statement',
  });
  const report = evaluateLayerContract(
    {
      edges: [edge({ importCount: 3, valueImportCount: 3 })],
      imports: [
        migrationImport({
          toFile: budget.companionImport.toFile,
          importedSymbols: budget.companionImport.importedSymbols,
          statementKey: 'policy-statement',
        }),
        added,
        { ...added, statementKey: 'duplicate-units-statement' },
      ],
    },
    contract({ migrationBudgets: [budget] }),
    { currentDate: TEST_CURRENT_DATE }
  );

  assert.equal(
    report.failures.some(
      failure =>
        failure.kind === 'migration-budget-growth' && failure.field === 'addedImport' && failure.current === 2
    ),
    true
  );
});

test('layer contract migration budgets fail closed on symbol drift, missing imports, and restored legacy access', () => {
  const budget = migrationBudget();
  const baseline = contract({ migrationBudgets: [budget] });
  const companion = migrationImport({
    toFile: budget.companionImport.toFile,
    importedSymbols: budget.companionImport.importedSymbols,
    statementKey: 'policy-statement',
  });
  const added = migrationImport({
    toFile: budget.addedImport.toFile,
    importedSymbols: budget.addedImport.importedSymbols,
    statementKey: 'units-statement',
  });

  const symbolDrift = evaluateLayerContract(
    {
      edges: [edge({ importCount: 2, valueImportCount: 2 })],
      imports: [{ ...added, importedSymbols: ['CM_PER_METER', 'MM_PER_METER'] }, companion],
    },
    baseline,
    { currentDate: TEST_CURRENT_DATE }
  );
  assert.equal(
    symbolDrift.failures.some(failure => failure.kind === 'migration-import-symbol-drift'),
    true
  );

  const missingAdded = evaluateLayerContract({ edges: [edge()], imports: [companion] }, baseline, {
    currentDate: TEST_CURRENT_DATE,
  });
  assert.equal(
    missingAdded.failures.some(
      failure => failure.kind === 'stale-migration-budget' && failure.field === 'addedImport'
    ),
    true
  );

  const restoredLegacy = evaluateLayerContract(
    {
      edges: [edge({ importCount: 3, valueImportCount: 3 })],
      imports: [
        companion,
        added,
        migrationImport({
          toFile: budget.removedImport.toFile,
          importedSymbols: budget.removedImport.importedSymbols,
          statementKey: 'legacy-statement',
        }),
      ],
    },
    baseline,
    { currentDate: TEST_CURRENT_DATE }
  );
  assert.equal(
    restoredLegacy.failures.some(failure => failure.kind === 'migration-legacy-import-restored'),
    true
  );

  const unrelatedLegacySymbol = evaluateLayerContract(
    {
      edges: [edge({ importCount: 3, valueImportCount: 3 })],
      imports: [
        companion,
        added,
        migrationImport({
          toFile: budget.removedImport.toFile,
          importedSymbols: ['UNRELATED_COMPATIBILITY_SYMBOL'],
          statementKey: 'unrelated-legacy-statement',
        }),
      ],
    },
    baseline,
    { currentDate: TEST_CURRENT_DATE }
  );
  assert.equal(
    unrelatedLegacySymbol.failures.some(failure => failure.kind === 'migration-legacy-import-restored'),
    false
  );
});

test('layer contract migration review deadlines are schema-bounded and evaluator-injectable', () => {
  assert.throws(
    () =>
      validateLayerContractSchema(contract({ migrationBudgets: [migrationBudget({ reviewBy: undefined })] })),
    /reviewBy must be YYYY-MM-DD/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({ migrationBudgets: [migrationBudget({ reviewBy: '2026-07-19' })] })
      ),
    /must not be earlier than reviewedAt/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({ migrationBudgets: [migrationBudget({ reviewBy: '2026-10-19' })] })
      ),
    /must be within 90 days/
  );

  const budget = migrationBudget();
  const graph = {
    edges: [edge({ importCount: 2, valueImportCount: 2 })],
    imports: [
      migrationImport({
        toFile: budget.companionImport.toFile,
        importedSymbols: budget.companionImport.importedSymbols,
        statementKey: 'policy-statement',
      }),
      migrationImport({
        toFile: budget.addedImport.toFile,
        importedSymbols: budget.addedImport.importedSymbols,
        statementKey: 'units-statement',
      }),
    ],
  };
  const baseline = contract({ migrationBudgets: [budget] });

  assert.equal(
    evaluateLayerContract(graph, baseline, { currentDate: '2026-10-18' }).ok,
    true,
    'review remains active through reviewBy'
  );
  const expired = evaluateLayerContract(graph, baseline, { currentDate: '2026-10-19' });
  assert.equal(expired.ok, false);
  assert.deepEqual(
    expired.failures.find(failure => failure.kind === 'stale-migration-review'),
    {
      kind: 'stale-migration-review',
      from: 'ui',
      to: 'services',
      fromFile: 'esm/native/ui/example.ts',
      reviewedAt: '2026-07-20',
      reviewBy: '2026-10-18',
    }
  );
});

test('project migration ledger stays exact at one hundred and seventy-eight reviewed statements with approved importer ceilings', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.equal(baseline.version, '2.4');
  assert.equal(baseline.migrationRetirements.length, 4);
  assert.equal(baseline.compatibilityBudgets.length, 4);
  const runtimeCompatibilityOwner = 'wardrobe-dimension-runtime-public-compatibility';
  const runtimePublicSurface =
    'esm/native/runtime/api.ts → esm/native/services/api_runtime_base_surface.ts → esm/native/services/api.ts';
  const runtimeCompatibilityIds = [
    'runtime-product-limits-public-compatibility',
    'runtime-wardrobe-defaults-public-compatibility',
    'runtime-stack-split-public-compatibility',
    'runtime-default-resolution-public-compatibility',
  ];
  assert.deepEqual(
    baseline.migrationRetirements.map(retirement => ({
      entryNumber: retirement.entryNumber,
      retiredAt: retirement.retiredAt,
      mode: retirement.mode,
      replacementCompatibilityBudgetId: retirement.replacementCompatibilityBudgetId,
    })),
    runtimeCompatibilityIds.map((id, index) => ({
      entryNumber: 175 + index,
      retiredAt: '2026-07-29',
      mode: 'ownership-transferred',
      replacementCompatibilityBudgetId: id,
    }))
  );
  assert.deepEqual(
    baseline.compatibilityBudgets.map((budget, index) => ({
      id: budget.id,
      from: budget.from,
      to: budget.to,
      fromFile: budget.fromFile,
      statement: budget.statement,
      owner: budget.owner,
      reviewedAt: budget.reviewedAt,
      nextReviewBy: budget.nextReviewBy,
      publicSurface: budget.publicSurface,
      historicalAddedImport: baseline.migrationBudgets[174 + index].addedImport,
    })),
    runtimeCompatibilityIds.map((id, index) => ({
      id,
      from: 'runtime',
      to: 'shared',
      fromFile: 'esm/native/runtime/api.ts',
      statement: baseline.migrationBudgets[174 + index].addedImport,
      owner: runtimeCompatibilityOwner,
      reviewedAt: '2026-07-29',
      nextReviewBy: '2027-07-29',
      publicSurface: runtimePublicSurface,
      historicalAddedImport: baseline.migrationBudgets[174 + index].addedImport,
    }))
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    '4f2439c0d05c724a812661c16fe408ea53c434a97f62368eb91e34b9aa1e7d67',
    'Prefix 178 must remain semantically unchanged when retirement and compatibility arrays are added'
  );

  const expectedEntries = [
    ['esm/native/builder/corner_connector_interior_rod.ts', 'esm/shared/dimensions/units.ts'],
    ['esm/native/builder/corner_connector_interior_special_metrics.ts', 'esm/shared/dimensions/units.ts'],
    ['esm/native/builder/post_build_dimensions_corner.ts', 'esm/shared/dimensions/units.ts'],
    ['esm/native/builder/post_build_dimensions_corner.ts', 'esm/shared/dimensions/wardrobe_defaults.ts'],
    [
      'esm/native/features/modules_configuration/corner_cells_ui_defaults.ts',
      'esm/shared/dimensions/units.ts',
    ],
    ['esm/native/services/canvas_picking_cell_dims_corner_context.ts', 'esm/shared/dimensions/units.ts'],
    [
      'esm/native/services/canvas_picking_cell_dims_corner_context.ts',
      'esm/shared/dimensions/wardrobe_defaults.ts',
    ],
    [
      'esm/native/builder/corner_connector_cornice_shared.ts',
      'esm/shared/dimensions/carcass_cornice_render_policy.ts',
    ],
    [
      'esm/native/builder/corner_wing_carcass_shell_floor_base.ts',
      'esm/shared/dimensions/base_plinth_policy.ts',
    ],
    [
      'esm/native/builder/corner_wing_carcass_shell_floor_base.ts',
      'esm/shared/dimensions/base_platform_render_policy.ts',
    ],
    [
      'esm/native/builder/corner_wing_cell_interiors_shelves.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/builder/corner_wing_cell_interiors_shelves.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/corner_wing_cell_interiors_storage.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    ['esm/native/builder/corner_wing_extension_cells_handles.ts', 'esm/shared/dimensions/handle_policy.ts'],
    [
      'esm/native/builder/corner_state_normalize_layout.ts',
      'esm/shared/dimensions/base_platform_render_policy.ts',
    ],
    ['esm/native/builder/corner_state_normalize_layout.ts', 'esm/shared/dimensions/wardrobe_defaults.ts'],
    ['esm/native/builder/build_handle_policy.ts', 'esm/shared/dimensions/external_drawer_policy.ts'],
    [
      'esm/native/builder/hinged_doors_module_ops_context.ts',
      'esm/shared/dimensions/external_drawer_policy.ts',
    ],
    ['esm/native/builder/hinged_doors_module_ops_context.ts', 'esm/shared/dimensions/handle_policy.ts'],
    [
      'esm/native/builder/hinged_doors_module_ops_handle_policy.ts',
      'esm/shared/dimensions/external_drawer_policy.ts',
    ],
    [
      'esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts',
      'esm/shared/dimensions/handle_policy.ts',
    ],
    ['esm/native/builder/render_interior_custom_ops.ts', 'esm/shared/dimensions/interior_storage_policy.ts'],
    [
      'esm/native/builder/render_interior_custom_ops.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_custom_ops_shelves.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    ['esm/native/builder/render_interior_preset_ops.ts', 'esm/shared/dimensions/interior_storage_policy.ts'],
    [
      'esm/native/builder/render_interior_preset_ops.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_ops_input.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_support_shelves.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    ['esm/native/builder/render_ops_primitives.ts', 'esm/shared/dimensions/handle_policy.ts'],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_split_hover_preview_line.ts',
      'esm/shared/dimensions/base_plinth_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_split_hover_preview_line.ts',
      'esm/shared/dimensions/carcass_interior_grid_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_split_hover_preview_line.ts',
      'esm/shared/dimensions/carcass_shell_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_split_hover_preview_line.ts',
      'esm/shared/dimensions/external_drawer_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_split_hover_preview_line.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_split_hover_preview_line.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/build_stack_split_lower_setup.ts',
      'esm/shared/dimensions/carcass_interior_policy.ts',
    ],
    [
      'esm/native/builder/build_stack_split_lower_setup.ts',
      'esm/shared/dimensions/carcass_interior_grid_policy.ts',
    ],
    ['esm/native/builder/build_stack_split_lower_setup.ts', 'esm/shared/dimensions/handle_policy.ts'],
    [
      'esm/native/builder/render_interior_sketch_layout_geometry.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_layout_geometry.ts',
      'esm/shared/dimensions/sketch_box_free_placement_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_box_hover_context.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes.ts',
      'esm/shared/dimensions/sketch_box_preview_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_depth.ts',
      'esm/shared/dimensions/sketch_box_geometry_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_tools.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_selector_internal_metrics.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    ['esm/native/services/canvas_picking_click_manual_sketch_free_box.ts', 'esm/shared/dimensions/units.ts'],
    ['esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts', 'esm/shared/dimensions/units.ts'],
    [
      'esm/native/builder/render_interior_sketch_boxes_shell_apply.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
      'esm/shared/dimensions/units.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
      'esm/shared/dimensions/units.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts',
      'esm/shared/dimensions/sketch_box_geometry_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_rod_clearance.ts',
      'esm/shared/dimensions/carcass_interior_grid_policy.ts',
    ],
    ['esm/native/builder/render_interior_rod_clearance.ts', 'esm/shared/dimensions/content_visual_policy.ts'],
    ['esm/native/builder/render_interior_rod_clearance.ts', 'esm/shared/dimensions/drawer_sketch_policy.ts'],
    [
      'esm/native/builder/render_interior_rod_clearance.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_rod_clearance.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_rod_clearance.ts',
      'esm/shared/dimensions/sketch_box_geometry_policy.ts',
    ],
    [
      'esm/native/builder/post_build_sketch_door_cuts_rebuild.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_door_preview.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_door_geometry.ts',
      'esm/shared/dimensions/door_system_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_context.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_drawers_external_context.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_content.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_content.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_preview_interior_hover_apply.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/builder/render_preview_interior_hover_apply.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/builder/render_preview_interior_hover_apply.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/core_storage_compute_external_drawers.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/builder/render_interior_sketch_drawers_external_plan.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    ['esm/native/features/sketch_drawer_sizing.ts', 'esm/shared/dimensions/units.ts'],
    [
      'esm/native/features/sketch_internal_drawer_cassette.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_config_ops_shelf.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    [
      'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
    ],
    [
      'esm/native/builder/post_build_sketch_door_cuts_apply.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
    ],
    ['esm/native/builder/render_drawer_ops_internal.ts', 'esm/shared/dimensions/chest_mode_policy.ts'],
    ['esm/native/builder/core_doors_compute.ts', 'esm/shared/dimensions/material_thickness_policy.ts'],
    ['esm/native/builder/core_carcass_shared.ts', 'esm/shared/dimensions/base_plinth_policy.ts'],
    ['esm/native/builder/core_carcass_shared.ts', 'esm/shared/dimensions/base_leg_policy.ts'],
    ['esm/native/builder/core_carcass_shared.ts', 'esm/shared/dimensions/base_platform_render_policy.ts'],
    ['esm/native/builder/core_carcass_shared.ts', 'esm/shared/dimensions/material_thickness_policy.ts'],
    ['esm/native/builder/core_layout_compute.ts', 'esm/shared/dimensions/material_thickness_policy.ts'],
    ['esm/native/builder/core_layout_compute.ts', 'esm/shared/dimensions/units.ts'],
    [
      'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts',
      'esm/shared/dimensions/wardrobe_defaults.ts',
    ],
    [
      'esm/native/builder/module_loop_pipeline_module_depth.ts',
      'esm/shared/dimensions/carcass_interior_policy.ts',
    ],
    ['esm/native/builder/module_loop_pipeline_module_depth.ts', 'esm/shared/dimensions/units.ts'],
    ['esm/native/platform/render_loop_motion_doors.ts', 'esm/shared/dimensions/units.ts'],
    ['esm/native/platform/render_loop_motion_doors.ts', 'esm/shared/dimensions/wardrobe_defaults.ts'],
    ['esm/native/builder/visuals_chest_mode_build.ts', 'esm/shared/dimensions/base_plinth_policy.ts'],
    ['esm/native/builder/visuals_chest_mode_build.ts', 'esm/shared/dimensions/base_leg_policy.ts'],
    [
      'esm/native/builder/visuals_chest_mode_build.ts',
      'esm/shared/dimensions/base_platform_render_policy.ts',
    ],
    ['esm/native/builder/visuals_chest_mode_build.ts', 'esm/shared/dimensions/chest_mode_policy.ts'],
    ['esm/native/builder/visuals_chest_mode_build.ts', 'esm/shared/dimensions/door_system_policy.ts'],
    [
      'esm/native/builder/visuals_chest_mode_build.ts',
      'esm/shared/dimensions/door_mount_thickness_policy.ts',
    ],
    [
      'esm/native/builder/visuals_chest_mode_inputs.ts',
      'esm/shared/dimensions/base_platform_render_policy.ts',
    ],
    ['esm/native/builder/visuals_chest_mode_inputs.ts', 'esm/shared/dimensions/chest_structural_policy.ts'],
    ['esm/native/builder/visuals_chest_mode_inputs.ts', 'esm/shared/dimensions/units.ts'],
    ['esm/native/runtime/default_state.ts', 'esm/shared/dimensions/stack_split_policy.ts'],
    ['esm/native/runtime/default_state.ts', 'esm/shared/dimensions/base_leg_policy.ts'],
    ['esm/native/runtime/default_state.ts', 'esm/shared/dimensions/base_plinth_policy.ts'],
    ['esm/native/runtime/default_state.ts', 'esm/shared/dimensions/chest_mode_policy.ts'],
    ['esm/native/builder/corner_connector_emit_shell_base.ts', 'esm/shared/dimensions/base_leg_policy.ts'],
    [
      'esm/native/builder/corner_connector_emit_shell_base.ts',
      'esm/shared/dimensions/base_platform_render_policy.ts',
    ],
    ['esm/native/builder/corner_wing_cornice_path.ts', 'esm/shared/dimensions/carcass_shell_policy.ts'],
    ['esm/native/builder/corner_wing_cornice_profile.ts', 'esm/shared/dimensions/carcass_shell_policy.ts'],
    ['esm/native/builder/corner_wing_cornice_wave.ts', 'esm/shared/dimensions/carcass_shell_policy.ts'],
    ['esm/native/builder/build_flow_plan_inputs.ts', 'esm/shared/dimensions/door_mount_thickness_policy.ts'],
    ['esm/native/builder/build_flow_plan_inputs.ts', 'esm/shared/dimensions/stack_split_policy.ts'],
    ['esm/native/builder/core_storage_compute_custom.ts', 'esm/shared/dimensions/interior_storage_policy.ts'],
    ['esm/native/builder/corner_wing_cell_layouts.ts', 'esm/shared/dimensions/interior_storage_policy.ts'],
    [
      'esm/native/features/interior_layout_presets/ops.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
    ],
  ];

  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 68)),
    '00d8669bb15e2b8bb20805dc668425edb1a03f1ad338df475902a1ff0a13a096',
    'the sixty-eight previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 74)),
    '33bbc870fa9433d5da70cad13d80bd1e51caeeab1e0b805e04d2bac9d13d30b0',
    'the seventy-four previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 76)),
    '754ded9a928219d43969ff666d64aa15a855d923669ec94793e6421bbca57d1c',
    'the seventy-six previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 78)),
    '8c597c8bbdc3d30c36e664a18e52936ee725b46645169fba55f68255e4d60b12',
    'the seventy-eight previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 80)),
    '398633f3cd9da26e88f23ef1f22aa7e88ea4fa1ae5f914b6933693ebd8f1946d',
    'the eighty previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 84)),
    'b34d8c4209c3c84d9b738094851cb8221089242de68c08b20f8d9a9635979335',
    'the eighty-four previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 85)),
    '8c99874fb35870ef203054a2f461c052a975194229e11e5c767153c68c32a864',
    'the eighty-five previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 87)),
    '32edb97832df2b9f8191fbe9f2bc6b19721216aa1e9efd42fcd8a1d126120adb',
    'the eighty-seven previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 89)),
    'e99df16d69cccb08f23fdd3e00a0097aabe12ee091b59a666fe8d5e67f20eb33',
    'the eighty-nine previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 91)),
    '7ff95da1386b7229e5976d89f247a2f010973ba98d50f6a6aecbecf268a2b224',
    'the ninety-one previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 92)),
    'c3925619d29b30dbd157d10f9afd68f4ed4dfe3b7ebac810a1438aa633a89dfd',
    'the ninety-two previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 93)),
    '0ff50bd06b93e4a303e769b92d5db0a87d775022d9bb1f80d9e5d721023bfa13',
    'the ninety-three previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 95)),
    '998ce4016e780748d6f771d97fdd7e9980f0a2fb4d7995b92a1befb154f85fc0',
    'the ninety-five previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 100)),
    '42b33c25832a4d7e9a79cbc577e0f2ba8867e6fe7d771809372b9776c5451c5a',
    'all one hundred active migration entries must remain semantically stable'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 105)),
    'f6b0d938acb9ff1fe2231078dcede6c8c55348683ed48e8d95c5149d1229e24d',
    'all one hundred and five active migration entries must remain semantically stable'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 110)),
    '8d1d7cafcce3d1d360a559daf7a9fa00b92f32139a4f90cf80d6b6f061dfdd2d',
    'the one hundred and ten previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 114)),
    'ee0f595edfec1a9b956d82c4257e160a4d6adf5302d2dcce40667c89720575d1',
    'the one hundred and fourteen previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 117)),
    '7f6b6f681f71b979353ba75aaffe776ac13f8b339f90d6bb56bcb77452fb24d8',
    'the one hundred and seventeen previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 119)),
    'e10f08c6cebfb73ed1ff89676e5bf8bc982d659bf566f218ac52dc89607d53a4',
    'the one hundred and nineteen previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 120)),
    '40c8812b78771efc64e38c69b919ace57a104dabfd1cd79882decbd317d9e170',
    'the one hundred and twenty previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 122)),
    '60b9ef2947cfea12ddc16423ead76437ff6db645889aed2818e41f6733f9a112',
    'the one hundred and twenty-two previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 123)),
    '7423bf5013baa9665b6ba01fe19d4dc57d4785dae27217f6509920b5a3c7f725',
    'the one hundred and twenty-three previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 124)),
    '9eeb17b61e2b1a64eb9303ca0b750319da74d868131f9130a26f1bd4977d49cf',
    'the one hundred and twenty-four previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 125)),
    '84e9877bc6ca47028c5e081018b3025b96ea2f040d5d4f1ab838d9c1b0bd47cb',
    'the one hundred and twenty-five previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 129)),
    '7db36f6859327fd852fb251e414c53a5e0de95bf5b30fb38bd5bd0d50cee96b4',
    'the one hundred and twenty-nine previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 131)),
    'f8b2ec4b773b4d1c01f4a4a0dd519c43bcf01fb2b96d34e075d21bb2b55b6687',
    'the one hundred and thirty-one previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 132)),
    'e55d258b1696ea16e88e3b2feda047a539197361ea582d00be3917abc1e526d2',
    'the one hundred and thirty-two previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 134)),
    '99435b0f09eafa7c93cd6cf0e879685dc5e66b22b7ef6e43469f1777c778e919',
    'the one hundred and thirty-four previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 136)),
    '17c6ec0de239b5bce3d6745b654dd6aa0c3650e626e8ecca360db3ced781ac47',
    'the one hundred and thirty-six previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 142)),
    'e813a8d82fc10b63f077b6b3fba67f9a4db5dc5a308825d871f85e1dcf95a861',
    'the one hundred and forty-two previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 145)),
    'd4f939330cd5c5ec1febe5a004598d66f0a0dcc40618591f3fedffb367ea2447',
    'the one hundred and forty-five previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 149)),
    '017aabccfc1a4d0fccde156cff556af4f6d0006409f196868b3d8a53dbd666e5',
    'the one hundred and forty-nine previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 151)),
    'e9e9c2b5c6446497ce5f8d3c9b4258b99a33ea23846a2f998c11375d10e03897',
    'the one hundred and fifty-one previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 154)),
    '0398ae9924f577c2f06a0293feac49f8a70eff80274c22717a9624421cdf5ef0',
    'the one hundred and fifty-four previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 156)),
    '9e06d7f0e1df80f0f90cbe281eb4622790a49473ce4f3c0bdef36b0535a3386d',
    'the one hundred and fifty-six previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 158)),
    '7cb5d770d8d0297e4037ecf59eaf417a164495416cf956615c37af75163d0516',
    'the one hundred and fifty-eight previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 159)),
    '7bb983429d5ea9cf6c8f4e6f44f8637a0d2841866d09bf9ddc8515dd230e16a8',
    'the one hundred and fifty-nine previously reviewed migration entries must remain semantically unchanged'
  );

  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 62)),
    'df3f1cdc8e66dfd4e1ed2c673b3c0efe459b98d5bbcd34a78fd451f183171dab',
    'the sixty-two previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 61)),
    'a931b3e2c5090e4fa5de7c10057194fde44f0ad58409966e1ab203a8be2cdcc0',
    'the sixty-one previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 59)),
    '35a3fc695221ed255ad212ae4d126ad3cd022299e390a4882c2c4731dd359226',
    'the fifty-nine previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 56)),
    'a0ee2c5c18fcc5c5f473df435a270083f7a8dafabbdeb4fa0b5d515def2e20f0',
    'the fifty-six previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 54)),
    'eba4694fa3dbfb497406d08e5d4d1b01c30d12b66afd6ce5c9519d558fddb552',
    'the fifty-four previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 50)),
    'abc6215529fd6c20db36ec7b379326187149e9cb7d39ad5f9d9f74e07de360c7',
    'the fifty previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 47)),
    '5bccd600217eaa992d4442c13b85143d25e5d05f79ce92222406a99b39ea5da6',
    'the forty-seven previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 41)),
    '3f529bc4b53c478ea6afd6b8ac80202a77cb530189a7bf45f0aada7fc05c9b9c',
    'the forty-one previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 30)),
    '9f2047a5d47e2f73f4b0f9621ee60d593eea946a439df2b17961902ff375fb42',
    'the thirty previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 22)),
    'f77d520ad443232af84217ded9adf59546df8d7fcf530b54ac1152ae5ca5cdd4',
    'the twenty-two previously reviewed migration entries must remain semantically unchanged'
  );
  assert.deepEqual(
    baseline.migrationBudgets.slice(0, 159).map(entry => [entry.fromFile, entry.addedImport.toFile]),
    expectedEntries
  );
  assert.equal(
    baseline.migrationBudgets.every(entry => entry.additionalStatements === 1),
    true
  );
  assert.equal(
    baseline.migrationBudgets.every(entry => entry.reviewBy === '2026-10-18'),
    true
  );

  const graph = collectLayerContractGraph({ root: repositoryRoot });
  const report = evaluateLayerContract(graph, baseline, { currentDate: LAYER_24_SNAPSHOT_DATE });
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.migrationBudgets.length, 178);
  assert.equal(report.historicalMigrationEntries.length, 178);
  assert.equal(report.activeMigrationEntries.length, 174);
  assert.equal(report.retiredMigrationEntries.length, 4);
  assert.equal(report.compatibilityBudgets.length, 4);
  assert.equal(new Set(baseline.migrationBudgets.map(entry => entry.fromFile)).size, 108);
  const retiredEntryNumbers = new Set(baseline.migrationRetirements.map(entry => entry.entryNumber));
  assert.equal(
    new Set(
      baseline.migrationBudgets
        .filter((_, index) => !retiredEntryNumbers.has(index + 1))
        .map(entry => entry.fromFile)
    ).size,
    107
  );
  assert.equal(
    report.migrationBudgets.slice(0, 174).every(entry => entry.active === true),
    true
  );
  assert.deepEqual(
    report.migrationBudgets.slice(174).map(entry => [entry.entryNumber, entry.active, entry.retired]),
    [
      [175, false, true],
      [176, false, true],
      [177, false, true],
      [178, false, true],
    ]
  );

  // Repository-wide totals are owned here. Historical migration tests below lock only
  // their closed prefix and exact entries, so later additive migrations cannot stale them.
  const expectedEdges = new Map([
    ['builder>shared', { observed: 305, migration: 86, reviewed: 219, budget: 219 }],
    ['features>shared', { observed: 76, migration: 18, reviewed: 58, budget: 58 }],
    ['services>shared', { observed: 230, migration: 63, reviewed: 167, budget: 167 }],
    ['ui>shared', { observed: 27, migration: 1, reviewed: 26, budget: 27 }],
    ['platform>shared', { observed: 6, migration: 2, reviewed: 4, budget: 4 }],
    ['runtime>shared', { observed: 40, migration: 4, compatibility: 4, reviewed: 32, budget: 32 }],
  ]);
  for (const [key, expected] of expectedEdges) {
    const [from, to] = key.split('>');
    const edge = graph.edges.find(entry => entry.from === from && entry.to === to);
    const rule = baseline.rules.find(entry => entry.from === from && entry.to === to);
    assert.ok(edge, `missing observed edge ${key}`);
    assert.ok(rule, `missing baseline rule ${key}`);
    assert.equal(edge.importCount, expected.observed);
    const activeMigrationCount = report.activeMigrationEntries.filter(
      entry => entry.from === from && entry.to === to
    ).length;
    const compatibilityCount = report.compatibilityBudgets.filter(
      entry => entry.from === from && entry.to === to
    ).length;
    assert.equal(activeMigrationCount, expected.migration);
    assert.equal(compatibilityCount, expected.compatibility || 0);
    assert.equal(expected.observed - expected.migration - (expected.compatibility || 0), expected.reviewed);
    assert.equal(rule.maxImportCount, expected.budget);
  }

  const runtimeSharedEdge = graph.edges.find(entry => entry.from === 'runtime' && entry.to === 'shared');
  const runtimeSharedRule = baseline.rules.find(entry => entry.from === 'runtime' && entry.to === 'shared');
  assert.ok(runtimeSharedEdge);
  assert.ok(runtimeSharedRule);
  assert.deepEqual(
    {
      observedValueStatements: runtimeSharedEdge.valueImportCount,
      activeMigrationValueStatements: report.activeMigrationEntries.filter(
        entry => entry.from === 'runtime' && entry.to === 'shared'
      ).length,
      compatibilityValueStatements: report.compatibilityBudgets.filter(
        entry => entry.from === 'runtime' && entry.to === 'shared'
      ).length,
      reviewedGeneralValueStatements:
        runtimeSharedEdge.valueImportCount -
        report.activeMigrationEntries.filter(entry => entry.from === 'runtime' && entry.to === 'shared')
          .length -
        report.compatibilityBudgets.filter(entry => entry.from === 'runtime' && entry.to === 'shared').length,
      generalValueBudget: runtimeSharedRule.maxValueImportCount,
    },
    {
      observedValueStatements: 39,
      activeMigrationValueStatements: 4,
      compatibilityValueStatements: 4,
      reviewedGeneralValueStatements: 31,
      generalValueBudget: 31,
    }
  );

  const featureSharedEdge = graph.edges.find(entry => entry.from === 'features' && entry.to === 'shared');
  const uiFeaturesEdge = graph.edges.find(entry => entry.from === 'ui' && entry.to === 'features');
  assert.ok(featureSharedEdge);
  assert.ok(uiFeaturesEdge);
  assert.equal(featureSharedEdge.importerCount, 43);
  assert.equal(featureSharedEdge.valueImporterCount, 43);
  assert.equal(uiFeaturesEdge.importerCount, 47);
  assert.equal(uiFeaturesEdge.importCount, 76);
  assert.equal(uiFeaturesEdge.valueImporterCount, 37);
  assert.equal(uiFeaturesEdge.valueImportCount, 63);

  assert.equal(runtimeSharedEdge.valueImportCount, 39);
  assert.equal(runtimeSharedEdge.valueImportCount - 4 - 4, 31);
  assert.equal(runtimeSharedRule.maxValueImportCount, 31);

  assert.equal(baseline.rules.length, 52);
  const proposal = buildLayerContractProposal(graph, baseline, { currentDate: TEST_CURRENT_DATE });
  assert.equal(proposal.reviewRequired, false);
  assert.deepEqual(proposal.diff.addedEdges, []);
  assert.deepEqual(proposal.diff.ratchetViolations, []);
  assert.deepEqual(proposal.diff.migrationBudgetFailures, []);

  const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
  const facadeDependencies = listSourceFiles(path.join(repositoryRoot, 'esm')).flatMap(file =>
    analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'))
      .imports.filter(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared'))
      .map(dependency => ({ file, ...dependency }))
  );
  const staticFacadeDependencies = facadeDependencies.filter(
    dependency => dependency.syntax === 'static-import'
  );
  assert.equal(new Set(staticFacadeDependencies.map(dependency => dependency.file)).size, 0);
  assert.equal(staticFacadeDependencies.length, 0);
  assert.equal(new Set(facadeDependencies.map(dependency => dependency.file)).size, 1);
  assert.equal(facadeDependencies.length, 1);

  const facadeSource = fs.readFileSync(path.join(repositoryRoot, facadeRel), 'utf8');
  const facadeExports = collectNamedModuleExports(facadeRel, facadeSource);
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'value').map(entry => entry.exportedName)).size,
    89
  );
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'type').map(entry => entry.exportedName)).size,
    10
  );
});

test('repository Sketch Box Geometry migration entries remain exact after Interior Tab UI consolidation', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 59)),
    '35a3fc695221ed255ad212ae4d126ad3cd022299e390a4882c2c4731dd359226',
    'the fifty-nine previously reviewed migration entries must remain semantically unchanged'
  );

  const entries = baseline.migrationBudgets.slice(59, 61);
  assert.deepEqual(
    entries.map(entry => [
      entry.from,
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]),
    [
      [
        'services',
        'esm/native/services/canvas_picking_click_manual_sketch_free_box.ts',
        'esm/shared/dimensions/units.ts',
        ['cmToM'],
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
      [
        'ui',
        'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts',
        'esm/shared/dimensions/units.ts',
        ['mToCm'],
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
    ]
  );

  for (const entry of entries) {
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /(?:free-box click|Sketch tool helper)/u);
    assert.match(entry.removalCondition, /without reintroducing the legacy facade/u);
  }

  assert.deepEqual(entries[0].removedImport, {
    toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
    kind: 'value',
    importedSymbols: ['SKETCH_BOX_DIMENSIONS', 'cmToM'],
    syntax: 'static-import',
  });
  assert.deepEqual(entries[1].removedImport, {
    toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
    kind: 'value',
    importedSymbols: ['SKETCH_BOX_DIMENSIONS', 'mToCm'],
    syntax: 'static-import',
  });

  const graph = collectLayerContractGraph({ root: repositoryRoot });
  const report = evaluateLayerContract(graph, baseline, { currentDate: TEST_CURRENT_DATE });
  assert.equal(report.ok, true);
  const uiEdge = graph.edges.find(entry => entry.from === 'ui' && entry.to === 'shared');
  const uiRule = baseline.rules.find(entry => entry.from === 'ui' && entry.to === 'shared');
  assert.ok(uiEdge);
  assert.ok(uiRule);
  assert.equal(uiEdge.importCount, 27);
  assert.equal(uiRule.maxImportCount, 27);
  assert.equal(
    report.migrationBudgets.filter(entry => entry.from === 'ui' && entry.to === 'shared' && entry.active)
      .length,
    1
  );

  const growthGraph = structuredClone(graph);
  const growthEdge = growthGraph.edges.find(entry => entry.from === 'ui' && entry.to === 'shared');
  assert.ok(growthEdge);
  growthEdge.importCount += 2;
  growthEdge.valueImportCount += 2;
  growthGraph.imports.push({
    from: 'ui',
    to: 'shared',
    fromFile: 'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts',
    toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
    specifier: '../../../../shared/dimensions/material_thickness_policy.js',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
    exportedSymbols: [],
    bindings: [
      {
        importedName: 'MATERIAL_THICKNESS_POLICY',
        localName: 'MATERIAL_THICKNESS_POLICY',
        exportedName: null,
      },
    ],
    statementKey: 'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts:synthetic-unreviewed-growth',
  });
  growthGraph.imports.push({
    from: 'ui',
    to: 'shared',
    fromFile: 'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts',
    toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
    specifier: '../../../../shared/dimensions/material_thickness_policy.js',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
    exportedSymbols: [],
    bindings: [
      {
        importedName: 'MATERIAL_THICKNESS_POLICY',
        localName: 'MATERIAL_THICKNESS_POLICY_SECOND',
        exportedName: null,
      },
    ],
    statementKey:
      'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts:synthetic-unreviewed-growth-2',
  });
  const growth = evaluateLayerContract(growthGraph, baseline, { currentDate: TEST_CURRENT_DATE });
  assert.equal(growth.ok, false, 'the historical UI budget must not absorb two unreviewed statements');
  assert.equal(
    growth.failures.some(
      failure => failure.kind === 'import-growth' && failure.from === 'ui' && failure.to === 'shared'
    ),
    true
  );
});

test('repository Sketch Box Shell Apply migration entry is exact and preserves the previous sixty-one entries', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 61)),
    'a931b3e2c5090e4fa5de7c10057194fde44f0ad58409966e1ab203a8be2cdcc0',
    'the sixty-one previously reviewed migration entries must remain semantically unchanged'
  );

  const entry = baseline.migrationBudgets[61];
  assert.deepEqual(entry, {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-20',
    reviewBy: '2026-10-18',
    fromFile: 'esm/native/builder/render_interior_sketch_boxes_shell_apply.ts',
    addedImport: {
      toFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
      kind: 'value',
      importedSymbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
      syntax: 'static-import',
    },
    companionImport: {
      toFile: 'esm/shared/dimensions/sketch_box_geometry_policy.ts',
      kind: 'value',
      importedSymbols: ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    },
    reason:
      'The Sketch Box shell-apply renderer replaces one legacy facade statement with the canonical Shell Geometry owner plus the focused Interior Shelf Geometry owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Sketch Box shell composition seam eliminates the extra Interior Shelf Geometry statement without reintroducing the legacy facade.',
  });

  const graph = collectLayerContractGraph({ root: repositoryRoot });
  const report = evaluateLayerContract(graph, baseline, { currentDate: TEST_CURRENT_DATE });
  assert.equal(report.ok, true);
  const budget = report.migrationBudgets.find(
    candidate => candidate.fromFile === entry.fromFile && candidate.addedTarget === entry.addedImport.toFile
  );
  assert.ok(budget);
  assert.equal(budget.active, true);
});

test('repository Sketch Box module-context and surface-commit migration entries are exact', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 62)),
    'df3f1cdc8e66dfd4e1ed2c673b3c0efe459b98d5bbcd34a78fd451f183171dab',
    'the sixty-two previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 66)),
    'f9bd1e138abfa089a95d506284de0385784aecdc403447fc20b4c90ff74e251d'
  );

  const entries = baseline.migrationBudgets.slice(62, 66);
  assert.deepEqual(
    entries.map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.importedSymbols,
    ]),
    [
      [
        'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
        'esm/shared/dimensions/units.ts',
        ['cmToM'],
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
      [
        'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
        'esm/shared/dimensions/interior_storage_policy.ts',
        ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_CLAMP_POLICY'],
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
      [
        'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
        'esm/shared/dimensions/units.ts',
        ['cmToM'],
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
      [
        'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
        'esm/shared/dimensions/interior_storage_policy.ts',
        ['INTERIOR_STORAGE_BARRIER_POLICY'],
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
    ]
  );

  for (const entry of entries) {
    assert.equal(entry.from, 'services');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.deepEqual(entry.companionImport, {
      toFile: 'esm/shared/dimensions/sketch_box_geometry_policy.ts',
      kind: 'value',
      importedSymbols: ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      syntax: 'static-import',
    });
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS', 'cmToM'],
      syntax: 'static-import',
    });
    assert.match(entry.reason, /(?:hover-module context|surface-commit shared helper)/u);
    assert.match(entry.removalCondition, /without reintroducing the legacy facade/u);
  }
});

test('layer contract proposal preserves exact migration budgets without raising reviewed ceilings', () => {
  const budget = migrationBudget();
  const current = contract({ migrationBudgets: [budget] });
  const graph = {
    edges: [edge({ importCount: 2, valueImportCount: 2 })],
    imports: [
      migrationImport({
        toFile: budget.companionImport.toFile,
        importedSymbols: budget.companionImport.importedSymbols,
        statementKey: 'policy-statement',
      }),
      migrationImport({
        toFile: budget.addedImport.toFile,
        importedSymbols: budget.addedImport.importedSymbols,
        statementKey: 'units-statement',
      }),
    ],
  };

  const proposal = buildLayerContractProposal(graph, current, { currentDate: TEST_CURRENT_DATE });
  assert.equal(proposal.reviewRequired, false);
  assert.deepEqual(proposal.contract.migrationBudgets, [budget]);
  assert.deepEqual(proposal.diff.ratchetViolations, []);
  assert.deepEqual(proposal.diff.migrationBudgetFailures, []);
  assert.equal(proposal.contract.rules[0].maxImportCount, 1);
  assert.equal(proposal.contract.rules[0].maxValueImportCount, 1);
});

test('layer contract schema rejects duplicate rules, unknown layers, invalid budgets, and unsafe facades', () => {
  assert.throws(
    () => validateLayerContractSchema(contract({ rules: [allowRule(), allowRule()] })),
    /duplicate rule/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          rules: [allowRule(), { from: 'ui', to: 'services', decision: 'deny', reason: 'Denied.' }],
        })
      ),
    /conflicting decision/
  );
  assert.throws(
    () => validateLayerContractSchema(contract({ rules: [allowRule({ to: 'unknown' })] })),
    /unknown or invalid layer pair/
  );
  assert.throws(
    () => validateLayerContractSchema(contract({ rules: [allowRule({ maxImportCount: -1 })] })),
    /must be a non-negative integer/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          facades: [
            {
              from: 'ui',
              to: 'services',
              allowedTargets: ['esm/native/services/api.ts', 'esm/native/services/api.ts'],
              reason: 'Use the facade.',
            },
          ],
        })
      ),
    /duplicate targets/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          facades: [
            {
              from: 'ui',
              to: 'services',
              allowedTargets: ['esm/native/services/api.ts'],
              reason: 'Use the facade.',
            },
            {
              from: 'ui',
              to: 'services',
              allowedTargets: ['esm/native/services/api.ts'],
              reason: 'Duplicate facade.',
            },
          ],
        })
      ),
    /duplicate facade/
  );
  assert.throws(
    () => validateLayerContractSchema({ ...contract(), ratchet: { ...RATCHET, mode: 'snapshot' } }),
    /ratchet requires decrease-only mode/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          dynamicImportAllowlist: [
            {
              fromFile: 'esm/entry_pro.ts',
              expression: 'path',
              reason: 'Reviewed loader.',
              maxOccurrences: 1,
            },
            {
              fromFile: 'esm/entry_pro.ts',
              expression: 'path',
              reason: 'Duplicate loader.',
              maxOccurrences: 1,
            },
          ],
        })
      ),
    /duplicate dynamic import allowlist/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          dynamicImportAllowlist: [
            {
              fromFile: 'esm/entry_pro.ts',
              expression: 'path',
              reason: 'Missing occurrence budget.',
            },
          ],
        })
      ),
    /positive maxOccurrences/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [migrationBudget({ additionalStatements: 2 })],
        })
      ),
    /exactly one additional statement/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [migrationBudget(), migrationBudget()],
        })
      ),
    /duplicate migration budget/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [
            migrationBudget({
              companionImport: {
                toFile: 'esm/native/services/units.ts',
                kind: 'value',
                syntax: 'static-import',
                importedSymbols: ['EXAMPLE_POLICY'],
              },
            }),
          ],
        })
      ),
    /distinct added, companion, and removed targets/
  );
});

test('layer contract blocks unclassified files, forbidden syntax, and unreviewed dynamic imports', () => {
  const graph = {
    edges: [edge()],
    imports: [],
    unclassifiedSourceFiles: ['esm/unowned.ts'],
    forbiddenModuleSyntax: [
      {
        fromFile: 'esm/entry_pro.ts',
        syntax: 'require-call',
        expression: "require('./legacy.js')",
      },
    ],
    unresolvedDynamicImports: [
      { fromFile: 'esm/entry_pro.ts', fromLayer: 'entry', expression: 'modulePath' },
    ],
  };
  const report = evaluateLayerContract(graph, contract());

  assert.deepEqual(
    report.failures.slice(0, 3).map(failure => failure.kind),
    ['unclassified-source-file', 'forbidden-module-syntax', 'unresolved-dynamic-import']
  );

  const allowed = evaluateLayerContract(
    { ...graph, unclassifiedSourceFiles: [], forbiddenModuleSyntax: [] },
    contract({
      dynamicImportAllowlist: [
        {
          fromFile: 'esm/entry_pro.ts',
          expression: 'modulePath',
          reason: 'The browser entry resolves a reviewed deployment module URL.',
          maxOccurrences: 1,
        },
      ],
    })
  );
  assert.equal(allowed.ok, true);

  const staleApproval = evaluateLayerContract(
    { edges: [edge()], imports: [], unresolvedDynamicImports: [] },
    contract({
      dynamicImportAllowlist: [
        {
          fromFile: 'esm/entry_pro.ts',
          expression: 'modulePath',
          reason: 'The browser entry resolves a reviewed deployment module URL.',
          maxOccurrences: 1,
        },
      ],
    })
  );
  assert.equal(
    staleApproval.failures.some(failure => failure.kind === 'stale-dynamic-import-allowlist'),
    true
  );

  const duplicatedLoader = evaluateLayerContract(
    {
      ...graph,
      unclassifiedSourceFiles: [],
      forbiddenModuleSyntax: [],
      unresolvedDynamicImports: [
        ...graph.unresolvedDynamicImports,
        ...graph.unresolvedDynamicImports.map(issue => ({ ...issue, line: 99 })),
      ],
    },
    contract({
      dynamicImportAllowlist: [
        {
          fromFile: 'esm/entry_pro.ts',
          expression: 'modulePath',
          reason: 'The browser entry resolves a reviewed deployment module URL.',
          maxOccurrences: 1,
        },
      ],
    })
  );
  assert.equal(
    duplicatedLoader.failures.some(failure => failure.kind === 'dynamic-import-allowlist-growth'),
    true
  );
});

test('facade wildcard matching is path-segment aware', () => {
  const baseline = contract({
    facades: [
      {
        from: 'ui',
        to: 'services',
        allowedTargets: ['esm/native/services/public/**'],
        reason: 'UI must use the public services directory.',
      },
    ],
  });
  const report = evaluateLayerContract(
    {
      edges: [edge()],
      imports: [
        {
          from: 'ui',
          to: 'services',
          fromFile: 'esm/native/ui/good.ts',
          toFile: 'esm/native/services/public/api.ts',
          kind: 'value',
        },
        {
          from: 'ui',
          to: 'services',
          fromFile: 'esm/native/ui/bad.ts',
          toFile: 'esm/native/services/publicity/api.ts',
          kind: 'value',
        },
      ],
    },
    baseline
  );

  const bypasses = report.failures.filter(failure => failure.kind === 'facade-bypass');
  assert.equal(bypasses.length, 1);
  assert.equal(bypasses[0].fromFile, 'esm/native/ui/bad.ts');
});

test('layer contract proposal preserves reviewed facades and reports edge and budget changes', () => {
  const facade = {
    from: 'ui',
    to: 'services',
    allowedTargets: ['esm/native/services/api.ts'],
    reason: 'UI must use services/api.',
  };
  const dynamicImportAllowlist = [
    {
      fromFile: 'esm/entry_pro.ts',
      expression: 'modulePath',
      reason: 'Reviewed browser module loader.',
      maxOccurrences: 1,
    },
  ];
  const current = contract({ facades: [facade], dynamicImportAllowlist });
  const proposal = buildLayerContractProposal(
    {
      edges: [
        edge({
          importerCount: 2,
          importCount: 3,
          importerFiles: ['esm/native/ui/example.ts', 'esm/native/ui/new_consumer.ts'],
          valueImporterCount: 2,
          valueImportCount: 3,
          valueImporterFiles: ['esm/native/ui/example.ts', 'esm/native/ui/new_consumer.ts'],
        }),
      ],
    },
    current
  );

  assert.deepEqual(proposal.contract.facades, [facade]);
  assert.deepEqual(proposal.contract.ratchet, RATCHET);
  assert.deepEqual(proposal.contract.dynamicImportAllowlist, dynamicImportAllowlist);
  assert.equal(proposal.contract.rules[0].reason, allowRule().reason);
  assert.deepEqual(proposal.diff.addedEdges, []);
  assert.deepEqual(proposal.diff.removedEdges, []);
  assert.deepEqual(proposal.diff.budgetChanges, []);
  assert.deepEqual(proposal.diff.requiresFacadeDecision, []);
  assert.deepEqual(proposal.diff.ratchetViolations[0], {
    edge: 'ui>services',
    growth: [
      { field: 'maxImporterCount', budget: 1, observed: 2 },
      { field: 'maxImportCount', budget: 1, observed: 3 },
      { field: 'maxValueImporterCount', budget: 1, observed: 2 },
      { field: 'maxValueImportCount', budget: 1, observed: 3 },
    ],
  });
  assert.equal(proposal.reviewRequired, true);
  assert.equal(proposal.contract.rules[0].maxImporterCount, 1);
  assert.equal(proposal.contract.rules[0].maxImportCount, 1);
});

test('layer contract proposal preserves a disappeared facade rule pending explicit review', () => {
  const facade = {
    from: 'ui',
    to: 'services',
    allowedTargets: ['esm/native/services/api.ts'],
    reason: 'UI must use services/api.',
  };
  const current = contract({ facades: [facade] });
  const proposal = buildLayerContractProposal({ edges: [] }, current);

  assert.doesNotThrow(() => validateLayerContractSchema(proposal.contract));
  assert.deepEqual(proposal.contract.rules, current.rules);
  assert.deepEqual(proposal.contract.facades, [facade]);
  assert.deepEqual(proposal.diff.removedEdges, []);
  assert.deepEqual(proposal.diff.requiresFacadeDecision, [
    {
      edge: 'ui>services',
      reason: facade.reason,
      allowedTargets: facade.allowedTargets,
    },
  ]);
});

test('layer contract proposal ratchets budgets down and never raises reviewed ceilings', () => {
  const current = contract({
    rules: [
      allowRule({
        maxImporterCount: 3,
        maxImportCount: 4,
        maxValueImporterCount: 3,
        maxValueImportCount: 4,
      }),
    ],
  });
  const proposal = buildLayerContractProposal({ edges: [edge()] }, current);

  assert.equal(proposal.diff.ratchetViolations.length, 0);
  assert.deepEqual(
    proposal.diff.budgetChanges[0].changes.map(change => [change.field, change.previous, change.current]),
    [
      ['maxImporterCount', 3, 1],
      ['maxImportCount', 4, 1],
      ['maxValueImporterCount', 3, 1],
      ['maxValueImportCount', 4, 1],
    ]
  );
});

test('layer contract proposal preserves explicit deny decisions', () => {
  const deniedRule = {
    from: 'ui',
    to: 'runtime',
    decision: 'deny',
    reason: 'UI must not depend on runtime internals.',
  };
  const proposal = buildLayerContractProposal(
    { edges: [edge(), edge({ from: 'ui', to: 'runtime' })] },
    contract({ rules: [allowRule(), deniedRule] })
  );

  assert.deepEqual(
    proposal.contract.rules.find(rule => rule.from === 'ui' && rule.to === 'runtime'),
    deniedRule
  );
  assert.deepEqual(proposal.diff.addedEdges, []);
});

test('layer contract proposal CLI exits nonzero when ratchet growth requires review', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools', 'wp_layer_baseline.json'), 'utf8')
  );
  const observedRule = baseline.rules.find(
    rule => rule.decision === 'allow' && Number(rule.maxImportCount) > 0
  );
  assert.ok(observedRule, 'fixture requires one observed allow rule');
  for (const key of Object.keys(observedRule)) {
    if (key.startsWith('max') && typeof observedRule[key] === 'number') observedRule[key] = 0;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-layer-contract-'));
  try {
    const baselinePath = path.join(tempRoot, 'baseline.json');
    fs.writeFileSync(baselinePath, JSON.stringify(baseline));
    const result = spawnSync(
      process.execPath,
      [path.join(repositoryRoot, 'tools', 'wp_layer_contract.js'), '--propose', '--baseline', baselinePath],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      }
    );

    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stdout.endsWith('\n'), 'proposal JSON must be flushed completely before exit');
    const proposal = JSON.parse(result.stdout);
    assert.equal(proposal.reviewRequired, true);
    assert.ok(proposal.diff.ratchetViolations.length > 0);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('repository Drawer and Handle migration ledger entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools', 'wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);

  const expected = [
    [
      'esm/native/builder/build_handle_policy.ts',
      'esm/shared/dimensions/external_drawer_policy.ts',
      ['EXTERNAL_DRAWER_SIZE_POLICY'],
      'esm/shared/dimensions/handle_policy.ts',
      ['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
    ],
    [
      'esm/native/builder/hinged_doors_module_ops_context.ts',
      'esm/shared/dimensions/external_drawer_policy.ts',
      ['EXTERNAL_DRAWER_FRONT_RENDER_POLICY'],
      'esm/shared/dimensions/door_system_policy.ts',
      ['HINGED_DOOR_MOUNT_POLICY', 'HINGED_DOOR_RENDER_POLICY'],
    ],
    [
      'esm/native/builder/hinged_doors_module_ops_context.ts',
      'esm/shared/dimensions/handle_policy.ts',
      ['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
      'esm/shared/dimensions/door_system_policy.ts',
      ['HINGED_DOOR_MOUNT_POLICY', 'HINGED_DOOR_RENDER_POLICY'],
    ],
    [
      'esm/native/builder/hinged_doors_module_ops_handle_policy.ts',
      'esm/shared/dimensions/external_drawer_policy.ts',
      ['EXTERNAL_DRAWER_SIZE_POLICY'],
      'esm/shared/dimensions/handle_policy.ts',
      ['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
    ],
    [
      'esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
      ['DRAWER_SKETCH_DOOR_CUT_POLICY'],
      'esm/shared/dimensions/handle_policy.ts',
      ['EDGE_HANDLE_SIZE_POLICY', 'STANDARD_HANDLE_RENDER_POLICY'],
    ],
    [
      'esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts',
      'esm/shared/dimensions/handle_policy.ts',
      ['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
      'esm/shared/dimensions/drawer_sketch_policy.ts',
      ['DRAWER_SKETCH_DOOR_CUT_POLICY'],
    ],
  ];

  const actual = baseline.migrationBudgets
    .slice(16, 22)
    .map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]);
  assert.deepEqual(actual, expected);

  for (const entry of baseline.migrationBudgets.slice(16, 22)) {
    assert.equal(entry.from, 'builder');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.equal(entry.removedImport.toFile, 'esm/shared/wardrobe_dimension_tokens_shared.ts');
    assert.equal(entry.removedImport.syntax, 'static-import');
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
  }
});

test('repository Builder Interior ownership migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 22)),
    'f77d520ad443232af84217ded9adf59546df8d7fcf530b54ac1152ae5ca5cdd4'
  );

  const expected = [
    [
      'esm/native/builder/render_interior_custom_ops.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
      ['INTERIOR_STORAGE_GRID_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_custom_ops.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_custom_ops_shelves.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      [
        'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_SHELF_PIN_RENDER_POLICY',
      ],
    ],
    [
      'esm/native/builder/render_interior_preset_ops.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
      ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_preset_ops.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_sketch_ops_input.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_sketch_support_shelves.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/builder/render_ops_primitives.ts',
      'esm/shared/dimensions/handle_policy.ts',
      ['EDGE_HANDLE_SIZE_POLICY', 'STANDARD_HANDLE_RENDER_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_ROUNDED_RENDER_POLICY'],
    ],
  ];

  const actual = baseline.migrationBudgets
    .slice(22, 30)
    .map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]);
  assert.deepEqual(actual, expected);

  for (const entry of baseline.migrationBudgets.slice(22, 30)) {
    assert.equal(entry.from, 'builder');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.equal(entry.removedImport.toFile, 'esm/shared/wardrobe_dimension_tokens_shared.ts');
    assert.deepEqual(entry.removedImport.importedSymbols, [
      ...(entry.fromFile === 'esm/native/builder/render_ops_primitives.ts'
        ? ['HANDLE_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS']
        : ['INTERIOR_FITTINGS_DIMENSIONS', 'MATERIAL_DIMENSIONS']),
    ]);
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
  }
});

test('repository Service Interior and Material migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 30)),
    '9f2047a5d47e2f73f4b0f9621ee60d593eea946a439df2b17961902ff375fb42',
    'the thirty previously reviewed migration entries must remain semantically unchanged'
  );

  const expected = [
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
      ['INTERIOR_STORAGE_GRID_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts',
      'esm/shared/dimensions/interior_storage_policy.ts',
      [
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_CLAMP_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'INTERIOR_STORAGE_LAYOUT_POLICY',
      ],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_ROD_PLACEMENT_POLICY', 'INTERIOR_ROD_RENDER_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_ROD_PLACEMENT_POLICY', 'INTERIOR_ROD_RENDER_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts',
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_ROD_RENDER_POLICY'],
      'esm/shared/dimensions/interior_storage_policy.ts',
      ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_LAYOUT_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_storage_policy.ts',
      ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_LAYOUT_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts',
      'esm/shared/dimensions/drawer_sketch_policy.ts',
      ['DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_ROD_RENDER_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_ROD_RENDER_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_fittings_policy.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts',
      'esm/shared/dimensions/material_thickness_policy.ts',
      ['MATERIAL_THICKNESS_POLICY'],
      'esm/shared/dimensions/interior_storage_policy.ts',
      ['INTERIOR_STORAGE_GRID_POLICY'],
    ],
  ];

  const actual = baseline.migrationBudgets
    .slice(30, 41)
    .map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]);
  assert.deepEqual(actual, expected);

  for (const entry of baseline.migrationBudgets.slice(30, 41)) {
    assert.equal(entry.from, 'services');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.equal(entry.removedImport.toFile, 'esm/shared/wardrobe_dimension_tokens_shared.ts');
    assert.equal(entry.removedImport.kind, 'value');
    assert.equal(entry.removedImport.syntax, 'static-import');
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
  }
});

test('repository Split Hover Preview Line migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 41)),
    '3f529bc4b53c478ea6afd6b8ac80202a77cb530189a7bf45f0aada7fc05c9b9c',
    'the forty-one previously reviewed migration entries must remain semantically unchanged'
  );

  const expected = [
    ['esm/shared/dimensions/base_plinth_policy.ts', ['BASE_PLINTH_POLICY']],
    ['esm/shared/dimensions/carcass_interior_grid_policy.ts', ['CARCASS_INTERIOR_GRID_POLICY']],
    ['esm/shared/dimensions/carcass_shell_policy.ts', ['CARCASS_SHELL_DIMENSIONS']],
    [
      'esm/shared/dimensions/external_drawer_policy.ts',
      ['EXTERNAL_DRAWER_FRONT_RENDER_POLICY', 'EXTERNAL_DRAWER_SIZE_POLICY'],
    ],
    ['esm/shared/dimensions/interior_storage_policy.ts', ['INTERIOR_STORAGE_BARRIER_POLICY']],
    ['esm/shared/dimensions/material_thickness_policy.ts', ['MATERIAL_THICKNESS_POLICY']],
  ];
  const entries = baseline.migrationBudgets.slice(41, 47);
  assert.deepEqual(
    entries.map(entry => [entry.addedImport.toFile, entry.addedImport.importedSymbols]),
    expected
  );

  const removedSymbols = [
    'CARCASS_BASE_DIMENSIONS',
    'CARCASS_SHELL_DIMENSIONS',
    'DOOR_SYSTEM_DIMENSIONS',
    'DRAWER_DIMENSIONS',
    'INTERIOR_FITTINGS_DIMENSIONS',
    'MATERIAL_DIMENSIONS',
  ];
  for (const entry of entries) {
    assert.equal(entry.from, 'services');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.fromFile, 'esm/native/services/canvas_picking_split_hover_preview_line.ts');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.deepEqual(entry.companionImport, {
      toFile: 'esm/shared/dimensions/door_system_policy.ts',
      kind: 'value',
      importedSymbols: ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY'],
      syntax: 'static-import',
    });
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: removedSymbols,
      syntax: 'static-import',
    });
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /split-hover preview-line resolver/u);
    assert.match(entry.removalCondition, /split-hover preview composition seam/u);
  }
});

test('repository Stack Split Lower migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 47)),
    '5bccd600217eaa992d4442c13b85143d25e5d05f79ce92222406a99b39ea5da6',
    'the forty-seven previously reviewed migration entries must remain semantically unchanged'
  );

  const entries = baseline.migrationBudgets.slice(47, 50);
  assert.deepEqual(
    entries.map(entry => [entry.addedImport.toFile, entry.addedImport.importedSymbols]),
    [
      ['esm/shared/dimensions/carcass_interior_policy.ts', ['CARCASS_INTERIOR_DIMENSIONS']],
      ['esm/shared/dimensions/carcass_interior_grid_policy.ts', ['CARCASS_INTERIOR_GRID_POLICY']],
      ['esm/shared/dimensions/handle_policy.ts', ['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY']],
    ]
  );

  const removedSymbols = [
    'CARCASS_INTERIOR_DIMENSIONS',
    'CARCASS_SHELL_DIMENSIONS',
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
    'HANDLE_DIMENSIONS',
  ];
  for (const entry of entries) {
    assert.equal(entry.from, 'builder');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.fromFile, 'esm/native/builder/build_stack_split_lower_setup.ts');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.deepEqual(entry.companionImport, {
      toFile: 'esm/shared/dimensions/stack_split_policy.ts',
      kind: 'value',
      importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
      syntax: 'static-import',
    });
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: removedSymbols,
      syntax: 'static-import',
    });
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /Stack Split Lower setup/u);
    assert.match(entry.removalCondition, /Stack Split Lower composition seam/u);
  }
});

test('repository Sketch Box foundation keeps the first fifty migration entries semantically unchanged', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 50)),
    'abc6215529fd6c20db36ec7b379326187149e9cb7d39ad5f9d9f74e07de360c7',
    'the fifty previously reviewed migration entries must remain semantically unchanged'
  );
});

test('repository Free Placement mixed-consumer migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 50)),
    'abc6215529fd6c20db36ec7b379326187149e9cb7d39ad5f9d9f74e07de360c7',
    'the fifty previously reviewed migration entries must remain semantically unchanged'
  );

  const entries = baseline.migrationBudgets.slice(50, 54);
  assert.deepEqual(
    entries.map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]),
    [
      [
        'esm/native/builder/render_interior_sketch_layout_geometry.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
      [
        'esm/native/builder/render_interior_sketch_layout_geometry.ts',
        'esm/shared/dimensions/sketch_box_free_placement_policy.ts',
        ['SKETCH_BOX_FREE_VERTICAL_POLICY'],
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
      [
        'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_free_placement_policy.ts',
        ['SKETCH_BOX_FREE_VERTICAL_POLICY', 'SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY'],
      ],
      [
        'esm/native/services/canvas_picking_sketch_free_box_hover_context.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_free_placement_policy.ts',
        ['SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY'],
      ],
    ]
  );

  for (const entry of entries) {
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    });
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /(?:geometry builder|free-box)/u);
    assert.match(entry.removalCondition, /without reintroducing the legacy facade/u);
  }
});

test('repository Sketch Box Geometry and Door Preview pair migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 54)),
    'eba4694fa3dbfb497406d08e5d4d1b01c30d12b66afd6ce5c9519d558fddb552',
    'the fifty-four previously reviewed migration entries must remain semantically unchanged'
  );

  const entries = baseline.migrationBudgets.slice(54, 56);
  assert.deepEqual(
    entries.map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]),
    [
      [
        'esm/native/builder/render_interior_sketch_boxes.ts',
        'esm/shared/dimensions/sketch_box_preview_policy.ts',
        ['SKETCH_BOX_DOOR_PREVIEW_POLICY'],
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
      [
        'esm/native/builder/render_interior_sketch_boxes_contents_depth.ts',
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
        'esm/shared/dimensions/sketch_box_preview_policy.ts',
        ['SKETCH_BOX_DOOR_PREVIEW_POLICY'],
      ],
    ]
  );

  for (const entry of entries) {
    assert.equal(entry.from, 'builder');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    });
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /Sketch Box/u);
    assert.match(entry.removalCondition, /without reintroducing the legacy facade/u);
  }
});

test('repository Sketch Box Geometry and Material migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 56)),
    'a0ee2c5c18fcc5c5f473df435a270083f7a8dafabbdeb4fa0b5d515def2e20f0',
    'the fifty-six previously reviewed migration entries must remain semantically unchanged'
  );

  const entries = baseline.migrationBudgets.slice(56, 59);
  assert.deepEqual(
    entries.map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]),
    [
      [
        'esm/native/services/canvas_picking_manual_layout_sketch_tools.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
      ],
      [
        'esm/native/services/canvas_picking_selector_internal_metrics.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SELECTOR_GEOMETRY_POLICY'],
      ],
      [
        'esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
      ],
    ]
  );

  for (const entry of entries) {
    assert.equal(entry.from, 'services');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.deepEqual(entry.addedImport, {
      toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      syntax: 'static-import',
    });
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    });
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /(?:manual-layout|selector|door-content)/u);
    assert.match(entry.removalCondition, /without reintroducing the legacy facade/u);
  }
});

test('repository Sketch Box front-overlay migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 66)),
    'f9bd1e138abfa089a95d506284de0385784aecdc403447fc20b4c90ff74e251d',
    'the sixty-six previously reviewed migration entries must remain semantically unchanged'
  );

  const entries = baseline.migrationBudgets.slice(66, 68);
  assert.deepEqual(
    entries.map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]),
    [
      [
        'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_preview_policy.ts',
        ['SKETCH_BOX_DOOR_PREVIEW_POLICY', 'SKETCH_BOX_DRAWER_PREVIEW_POLICY'],
      ],
      [
        'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts',
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
        'esm/shared/dimensions/sketch_box_preview_policy.ts',
        ['SKETCH_BOX_DOOR_PREVIEW_POLICY', 'SKETCH_BOX_DRAWER_PREVIEW_POLICY'],
      ],
    ]
  );

  for (const entry of entries) {
    assert.equal(entry.from, 'services');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    });
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /front-overlay/u);
    assert.match(entry.removalCondition, /without reintroducing the legacy facade/u);
  }
});

test('repository Sketch Box Material and Door Preview pair entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 74)),
    '33bbc870fa9433d5da70cad13d80bd1e51caeeab1e0b805e04d2bac9d13d30b0',
    'the seventy-four previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 76)),
    '754ded9a928219d43969ff666d64aa15a855d923669ec94793e6421bbca57d1c'
  );

  const entries = baseline.migrationBudgets.slice(74, 76);
  assert.deepEqual(
    entries.map(entry => [
      entry.from,
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]),
    [
      [
        'builder',
        'esm/native/builder/post_build_sketch_door_cuts_rebuild.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_preview_policy.ts',
        ['SKETCH_BOX_DOOR_PREVIEW_POLICY'],
      ],
      [
        'services',
        'esm/native/services/canvas_picking_sketch_box_door_preview.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/sketch_box_preview_policy.ts',
        ['SKETCH_BOX_DOOR_PREVIEW_POLICY'],
      ],
    ]
  );

  for (const entry of entries) {
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    });
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /Door Preview/u);
    assert.match(entry.removalCondition, /without reintroducing the legacy facade/u);
  }
});

test('repository Sketch Box Door Geometry migration entry is exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 76)),
    '754ded9a928219d43969ff666d64aa15a855d923669ec94793e6421bbca57d1c',
    'the seventy-six previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 77)),
    'fd97bcc51a2e7c692099fd63397b594a9e963122ecab566c3457043126878705'
  );

  const entry = baseline.migrationBudgets[76];
  assert.deepEqual(entry, {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-20',
    reviewBy: '2026-10-18',
    fromFile: 'esm/native/builder/render_interior_sketch_boxes_door_geometry.ts',
    companionImport: {
      toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
      kind: 'value',
      importedSymbols: ['SKETCH_BOX_DOOR_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['DOOR_SYSTEM_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/door_system_policy.ts',
      kind: 'value',
      importedSymbols: ['HINGED_DOOR_MOUNT_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The Sketch Box door-geometry resolver replaces one legacy facade statement with the canonical Door Preview owner plus the focused Hinged Door Mount owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Sketch Box door-geometry composition seam eliminates the extra Hinged Door Mount statement without reintroducing the legacy facade.',
  });
});

test('repository interior rod-clearance ownership migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 68)),
    '00d8669bb15e2b8bb20805dc668425edb1a03f1ad338df475902a1ff0a13a096',
    'the sixty-eight previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 74)),
    '33bbc870fa9433d5da70cad13d80bd1e51caeeab1e0b805e04d2bac9d13d30b0'
  );

  const entries = baseline.migrationBudgets.slice(68, 74);
  assert.deepEqual(
    entries.map(entry => [
      entry.fromFile,
      entry.addedImport.toFile,
      entry.addedImport.importedSymbols,
      entry.companionImport.toFile,
      entry.companionImport.importedSymbols,
    ]),
    [
      [
        'esm/native/builder/render_interior_rod_clearance.ts',
        'esm/shared/dimensions/carcass_interior_grid_policy.ts',
        ['CARCASS_INTERIOR_GRID_POLICY'],
        'esm/shared/dimensions/interior_fittings_policy.ts',
        [
          'INTERIOR_PRESET_ROD_FACTORS_POLICY',
          'INTERIOR_PRESET_SHELF_ROWS_POLICY',
          'INTERIOR_ROD_PLACEMENT_POLICY',
          'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        ],
      ],
      [
        'esm/native/builder/render_interior_rod_clearance.ts',
        'esm/shared/dimensions/content_visual_policy.ts',
        ['FOLDED_CLOTHES_VISUAL_POLICY', 'HANGER_VISUAL_POLICY'],
        'esm/shared/dimensions/interior_fittings_policy.ts',
        [
          'INTERIOR_PRESET_ROD_FACTORS_POLICY',
          'INTERIOR_PRESET_SHELF_ROWS_POLICY',
          'INTERIOR_ROD_PLACEMENT_POLICY',
          'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        ],
      ],
      [
        'esm/native/builder/render_interior_rod_clearance.ts',
        'esm/shared/dimensions/drawer_sketch_policy.ts',
        ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
        'esm/shared/dimensions/interior_fittings_policy.ts',
        [
          'INTERIOR_PRESET_ROD_FACTORS_POLICY',
          'INTERIOR_PRESET_SHELF_ROWS_POLICY',
          'INTERIOR_ROD_PLACEMENT_POLICY',
          'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        ],
      ],
      [
        'esm/native/builder/render_interior_rod_clearance.ts',
        'esm/shared/dimensions/interior_storage_policy.ts',
        ['INTERIOR_STORAGE_BARRIER_POLICY'],
        'esm/shared/dimensions/interior_fittings_policy.ts',
        [
          'INTERIOR_PRESET_ROD_FACTORS_POLICY',
          'INTERIOR_PRESET_SHELF_ROWS_POLICY',
          'INTERIOR_ROD_PLACEMENT_POLICY',
          'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        ],
      ],
      [
        'esm/native/builder/render_interior_rod_clearance.ts',
        'esm/shared/dimensions/material_thickness_policy.ts',
        ['MATERIAL_THICKNESS_POLICY'],
        'esm/shared/dimensions/interior_fittings_policy.ts',
        [
          'INTERIOR_PRESET_ROD_FACTORS_POLICY',
          'INTERIOR_PRESET_SHELF_ROWS_POLICY',
          'INTERIOR_ROD_PLACEMENT_POLICY',
          'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        ],
      ],
      [
        'esm/native/builder/render_interior_rod_clearance.ts',
        'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
        'esm/shared/dimensions/interior_fittings_policy.ts',
        [
          'INTERIOR_PRESET_ROD_FACTORS_POLICY',
          'INTERIOR_PRESET_SHELF_ROWS_POLICY',
          'INTERIOR_ROD_PLACEMENT_POLICY',
          'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        ],
      ],
    ]
  );

  for (const entry of entries) {
    assert.equal(entry.from, 'builder');
    assert.equal(entry.to, 'shared');
    assert.equal(entry.additionalStatements, 1);
    assert.equal(entry.owner, 'dimension-ownership-migration');
    assert.equal(entry.addedImport.kind, 'value');
    assert.equal(entry.addedImport.syntax, 'static-import');
    assert.equal(entry.companionImport.kind, 'value');
    assert.equal(entry.companionImport.syntax, 'static-import');
    assert.deepEqual(entry.removedImport, {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: [
        'CARCASS_SHELL_DIMENSIONS',
        'CONTENT_VISUAL_DIMENSIONS',
        'DRAWER_DIMENSIONS',
        'INTERIOR_FITTINGS_DIMENSIONS',
        'MATERIAL_DIMENSIONS',
        'SKETCH_BOX_DIMENSIONS',
      ],
      syntax: 'static-import',
    });
    assert.equal(entry.reviewedAt, '2026-07-20');
    assert.equal(entry.reviewBy, '2026-10-18');
    assert.match(entry.reason, /rod-clearance/u);
    assert.match(entry.removalCondition, /without reintroducing the legacy facade/u);
  }
});

test('repository Sketch Box Adornment Preview ownership migration entry is exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 77)),
    'fd97bcc51a2e7c692099fd63397b594a9e963122ecab566c3457043126878705',
    'the seventy-seven previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 78)),
    '8c597c8bbdc3d30c36e664a18e52936ee725b46645169fba55f68255e4d60b12'
  );

  assert.deepEqual(baseline.migrationBudgets[77], {
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-20',
    reviewBy: '2026-10-18',
    fromFile: 'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
    companionImport: {
      toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
      kind: 'value',
      importedSymbols: ['SKETCH_BOX_ADORNMENT_PREVIEW_POLICY', 'SKETCH_BOX_DOOR_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The Sketch free-surface adornment preview replaces one legacy facade statement with focused Adornment and Door Preview owners plus the canonical Material Thickness owner on the existing services to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed adornment-preview composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
  });
});

test('repository Sketch Box Drawer Preview context pair migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 78)),
    '8c597c8bbdc3d30c36e664a18e52936ee725b46645169fba55f68255e4d60b12',
    'the seventy-eight previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 80)),
    '398633f3cd9da26e88f23ef1f22aa7e88ea4fa1ae5f914b6933693ebd8f1946d'
  );

  assert.deepEqual(baseline.migrationBudgets.slice(78, 80), [
    {
      from: 'builder',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-20',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_context.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_DRAWER_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      removedImport: {
        toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
        kind: 'value',
        importedSymbols: ['DRAWER_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
        kind: 'value',
        importedSymbols: ['DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch Box external-drawer render context replaces one legacy facade statement with the canonical Drawer Preview owner plus the focused external drawer preview geometry owner on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box external-drawer context seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.',
    },
    {
      from: 'builder',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-20',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/builder/render_interior_sketch_drawers_external_context.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_DRAWER_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      removedImport: {
        toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
        kind: 'value',
        importedSymbols: ['DRAWER_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
        kind: 'value',
        importedSymbols: ['DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch external-drawer render context replaces one legacy facade statement with the canonical Drawer Preview owner plus the focused external drawer preview geometry owner on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch external-drawer context seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.',
    },
  ]);
});

test('repository Sketch Box Measurement stack-preview quartet migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 80)),
    '398633f3cd9da26e88f23ef1f22aa7e88ea4fa1ae5f914b6933693ebd8f1946d',
    'the eighty previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 84)),
    'b34d8c4209c3c84d9b738094851cb8221089242de68c08b20f8d9a9635979335'
  );

  const internalEntry = (fromFile, scopeName) => ({
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-21',
    reviewBy: '2026-10-18',
    fromFile,
    companionImport: {
      toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
      kind: 'value',
      importedSymbols: ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
      kind: 'value',
      importedSymbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    reason: `The ${scopeName} internal-drawer stack preview replaces one legacy facade statement with the focused Drawer Sketch Internal Preview owner plus the focused Sketch Box Measurement Preview owner on the existing services to shared edge.`,
    removalCondition: `Remove this entry when a reviewed ${scopeName} internal-drawer stack-preview composition seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.`,
  });
  const externalEntry = (fromFile, scopeName) => ({
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-21',
    reviewBy: '2026-10-18',
    fromFile,
    companionImport: {
      toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
      kind: 'value',
      importedSymbols: ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
      kind: 'value',
      importedSymbols: [
        'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
        'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
        'DRAWER_SKETCH_SIZING_POLICY',
        'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
      ],
      syntax: 'static-import',
    },
    reason: `The ${scopeName} external-drawer stack preview replaces one legacy facade statement with focused Drawer Sketch sizing, collision, external-preview, and External Drawer Front Render policies plus the focused Sketch Box Measurement Preview owner on the existing services to shared edge.`,
    removalCondition: `Remove this entry when a reviewed ${scopeName} external-drawer stack-preview composition seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.`,
  });

  assert.deepEqual(baseline.migrationBudgets.slice(80, 84), [
    internalEntry('esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts', 'Sketch Box'),
    externalEntry('esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts', 'Sketch Box'),
    internalEntry(
      'esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts',
      'Sketch module'
    ),
    externalEntry(
      'esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts',
      'Sketch module'
    ),
  ]);
});

test('repository Sketch Box stacked content preview renderer migration entry is exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 84)),
    'b34d8c4209c3c84d9b738094851cb8221089242de68c08b20f8d9a9635979335',
    'the eighty-four previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 85)),
    '8c99874fb35870ef203054a2f461c052a975194229e11e5c767153c68c32a864'
  );

  assert.deepEqual(baseline.migrationBudgets.slice(84, 85), [
    {
      from: 'builder',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_DOOR_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      removedImport: {
        toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
        kind: 'value',
        importedSymbols: ['DRAWER_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
        kind: 'value',
        importedSymbols: ['DRAWER_SKETCH_PREVIEW_RENDER_POLICY', 'DRAWER_SKETCH_SIZING_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch Box stacked content preview renderer replaces one legacy facade statement with focused Drawer Sketch Preview Render and Sizing owners plus the focused Sketch Box Door Preview owner on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box stacked content preview composition seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.',
    },
  ]);
});

test('repository Sketch Box Storage Preview pair migration entries are exact and additive-only', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
  );
  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 85)),
    '8c99874fb35870ef203054a2f461c052a975194229e11e5c767153c68c32a864',
    'the eighty-five previously reviewed migration entries must remain semantically unchanged'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 87)),
    '32edb97832df2b9f8191fbe9f2bc6b19721216aa1e9efd42fcd8a1d126120adb'
  );

  assert.deepEqual(baseline.migrationBudgets.slice(85, 87), [
    {
      from: 'builder',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_STORAGE_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      removedImport: {
        toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
        kind: 'value',
        importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        importedSymbols: [
          'INTERIOR_STORAGE_BARRIER_POLICY',
          'INTERIOR_STORAGE_LAYOUT_POLICY',
          'INTERIOR_STORAGE_PREVIEW_POLICY',
        ],
        syntax: 'static-import',
      },
      reason:
        'The Sketch Box storage-barrier renderer replaces one legacy facade statement with focused Interior Storage Barrier, Layout, and Preview owners plus the focused Sketch Box Storage Preview owner on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box storage-barrier rendering composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    },
    {
      from: 'services',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: [
          'SKETCH_BOX_PREVIEW_CORE_POLICY',
          'SKETCH_BOX_SHELF_PREVIEW_POLICY',
          'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
        ],
        syntax: 'static-import',
      },
      removedImport: {
        toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
        kind: 'value',
        importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch Box vertical storage preview resolver replaces one legacy facade statement with focused Interior Storage Barrier and Preview owners plus focused Sketch Box Core, Shelf, and Storage Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box vertical storage-preview composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    },
  ]);
});

test('Layer Contract 2.4 separates historical, active, retired, and compatibility ownership', () => {
  const budget = migrationBudget();
  const compatibility = compatibilityBudget();
  const retirement = migrationRetirement();
  const added = migrationImport({
    toFile: budget.addedImport.toFile,
    importedSymbols: budget.addedImport.importedSymbols,
    statementKey: 'added',
  });
  const companion = migrationImport({
    toFile: budget.companionImport.toFile,
    importedSymbols: budget.companionImport.importedSymbols,
    statementKey: 'companion',
  });
  const graph = {
    edges: [edge()],
    imports: [added, companion],
    unresolvedDynamicImports: [],
    forbiddenModuleSyntax: [],
    unclassifiedSourceFiles: [],
  };
  const report = evaluateLayerContract(
    graph,
    contract({
      migrationBudgets: [budget],
      migrationRetirements: [retirement],
      compatibilityBudgets: [compatibility],
    }),
    { currentDate: '2027-01-01' }
  );
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.historicalMigrationEntries.length, 1);
  assert.equal(report.activeMigrationEntries.length, 0);
  assert.equal(report.retiredMigrationEntries.length, 1);
  assert.equal(report.compatibilityBudgets.length, 1);
  assert.equal(report.migrationBudgets[0].active, false);
  assert.equal(report.migrationBudgets[0].retired, true);
});

test('Layer Contract 2.4 retirement and compatibility ownership fail closed', () => {
  const budget = migrationBudget();
  const compatibility = compatibilityBudget();
  const retirement = migrationRetirement();
  const added = migrationImport({
    toFile: budget.addedImport.toFile,
    importedSymbols: budget.addedImport.importedSymbols,
    statementKey: 'added',
  });
  const companion = migrationImport({
    toFile: budget.companionImport.toFile,
    importedSymbols: budget.companionImport.importedSymbols,
    statementKey: 'companion',
  });
  const graph = {
    edges: [edge()],
    imports: [added, companion],
    unresolvedDynamicImports: [],
    forbiddenModuleSyntax: [],
    unclassifiedSourceFiles: [],
  };

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [retirement, retirement],
          compatibilityBudgets: [compatibility],
        })
      ),
    /duplicate migration retirement/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [migrationRetirement({ entryNumber: 2 })],
          compatibilityBudgets: [compatibility],
        })
      ),
    /does not exist/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          compatibilityBudgets: [compatibility, { ...compatibility, id: 'duplicate-route' }],
        })
      ),
    /duplicate compatibility statement ownership/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          compatibilityBudgets: [
            compatibilityBudget({
              statement: { ...compatibility.statement, importedSymbols: ['*'] },
            }),
          ],
        })
      ),
    /wildcard requires allowWildcard/
  );

  const conflict = evaluateLayerContract(
    graph,
    contract({ migrationBudgets: [budget], compatibilityBudgets: [compatibility] }),
    { currentDate: '2026-07-29' }
  );
  assert.equal(
    conflict.failures.some(failure => failure.kind === 'compatibility-active-migration-ownership-conflict'),
    true
  );

  const mismatchedTransfer = evaluateLayerContract(
    graph,
    contract({
      migrationBudgets: [budget],
      migrationRetirements: [retirement],
      compatibilityBudgets: [
        compatibilityBudget({
          statement: { ...compatibility.statement, importedSymbols: ['WRONG_SYMBOL'] },
        }),
      ],
    }),
    { currentDate: '2027-01-01' }
  );
  assert.equal(
    mismatchedTransfer.failures.some(
      failure => failure.kind === 'migration-retirement-compatibility-mismatch'
    ),
    true
  );

  const aliasDrift = evaluateLayerContract(
    { ...graph, imports: [{ ...added, bindings: [{ importedName: 'CM_PER_METER', localName: 'cm' }] }] },
    contract({ compatibilityBudgets: [compatibility] })
  );
  assert.equal(
    aliasDrift.failures.some(failure => failure.kind === 'compatibility-budget-alias-drift'),
    true
  );

  for (const [label, statement, failureKind] of [
    [
      'target',
      { ...compatibility.statement, toFile: 'esm/native/services/other.ts' },
      'compatibility-budget-statement-missing',
    ],
    [
      'symbols',
      { ...compatibility.statement, importedSymbols: ['WRONG_SYMBOL'] },
      'compatibility-budget-statement-missing',
    ],
    [
      'syntax',
      { ...compatibility.statement, syntax: 'static-re-export' },
      'compatibility-budget-syntax-drift',
    ],
  ]) {
    const drift = evaluateLayerContract(
      graph,
      contract({ compatibilityBudgets: [compatibilityBudget({ statement })] })
    );
    assert.equal(
      drift.failures.some(failure => failure.kind === failureKind),
      true,
      `${label} drift must fail exact compatibility ownership`
    );
  }
});

test('Layer Contract 2.4 statement-removed retirement requires absence and compatibility does not hide other growth', () => {
  const budget = migrationBudget();
  const added = migrationImport({
    toFile: budget.addedImport.toFile,
    importedSymbols: budget.addedImport.importedSymbols,
    statementKey: 'added',
  });
  const graph = {
    edges: [edge()],
    imports: [added],
    unresolvedDynamicImports: [],
    forbiddenModuleSyntax: [],
    unclassifiedSourceFiles: [],
  };
  const baseline = contract({
    migrationBudgets: [budget],
    migrationRetirements: [
      migrationRetirement({
        mode: 'statement-removed',
        replacementCompatibilityBudgetId: null,
        replacementStatement: null,
      }),
    ],
  });
  const report = evaluateLayerContract(graph, baseline, { currentDate: LAYER_24_SNAPSHOT_DATE });
  assert.equal(
    report.failures.some(failure => failure.kind === 'migration-retirement-statement-still-present'),
    true
  );

  const compatibility = compatibilityBudget();
  const unrelated = migrationImport({
    toFile: 'esm/native/services/unrelated.ts',
    importedSymbols: ['UNRELATED'],
    statementKey: 'unrelated',
  });
  const compatibilityContract = contract({
    rules: [allowRule({ maxImportCount: 0, maxValueImportCount: 0 })],
    compatibilityBudgets: [compatibility],
  });
  const compatibilityGraph = {
    edges: [edge({ importCount: 2, valueImportCount: 2 })],
    imports: [added, unrelated],
    unresolvedDynamicImports: [],
    forbiddenModuleSyntax: [],
    unclassifiedSourceFiles: [],
  };
  const growth = evaluateLayerContract(compatibilityGraph, compatibilityContract);
  assert.deepEqual(
    growth.failures
      .filter(failure => failure.kind === 'import-growth' || failure.kind === 'value-import-growth')
      .map(failure => [failure.kind, failure.current, failure.observed, failure.migrationStatementsExcluded]),
    [
      ['import-growth', 1, 2, 1],
      ['value-import-growth', 1, 2, 1],
    ]
  );

  const proposal = buildLayerContractProposal(compatibilityGraph, compatibilityContract);
  assert.deepEqual(proposal.contract.compatibilityBudgets, [compatibility]);
  assert.deepEqual(proposal.diff.removedEdges, []);
  assert.equal(proposal.diff.compatibilityBudgets, 1);
});

test('Layer Contract 2.4 enforces retirement chronology and distinct retirement mode schemas', () => {
  const budget = migrationBudget();
  const compatibility = compatibilityBudget();

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          compatibilityBudgets: [compatibility],
          migrationRetirements: [migrationRetirement({ retiredAt: '2026-07-19' })],
        })
      ),
    /retiredAt must not be earlier than migration reviewedAt/
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          compatibilityBudgets: [
            compatibilityBudget({ reviewedAt: '2026-07-30', nextReviewBy: '2027-07-30' }),
          ],
          migrationRetirements: [migrationRetirement({ retiredAt: '2026-07-29' })],
        })
      ),
    /compatibility reviewedAt on or before retiredAt/
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [
            migrationRetirement({
              mode: 'statement-consolidated',
              replacementCompatibilityBudgetId: null,
            }),
          ],
        })
      ),
    /statement-consolidated requires replacementStatement/
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [
            migrationRetirement({
              mode: 'statement-removed',
              replacementCompatibilityBudgetId: null,
            }),
          ],
        })
      ),
    /statement-removed requires replacementStatement null/
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          compatibilityBudgets: [compatibility],
          migrationRetirements: [migrationRetirement({ replacementStatement: null })],
        })
      ),
    /ownership-transferred does not allow replacementStatement/
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [
            consolidationRetirement({
              replacementStatement: consolidationReplacementStatement({ importedSymbols: ['*'] }),
            }),
          ],
        })
      ),
    /replacement wildcard requires allowWildcard: true/
  );
});

test('Layer Contract 2.4 compatibility lifecycle is inclusive and blocks stale proposal lowering', () => {
  const compatibility = compatibilityBudget();
  const statement = migrationImport({
    toFile: compatibility.statement.toFile,
    importedSymbols: compatibility.statement.importedSymbols,
    statementKey: 'compatibility-statement',
  });
  const graph = layer24Graph([statement]);
  const baseline = contract({
    rules: [allowRule({ maxImportCount: 0, maxValueImportCount: 0 })],
    compatibilityBudgets: [compatibility],
  });

  for (const currentDate of [compatibility.reviewedAt, compatibility.nextReviewBy]) {
    const boundary = evaluateLayerContract(graph, baseline, { currentDate });
    assert.equal(boundary.ok, true, `${currentDate}: ${JSON.stringify(boundary.failures)}`);
    assert.deepEqual(
      {
        statementValid: boundary.compatibilityBudgets[0].statementValid,
        reviewEffective: boundary.compatibilityBudgets[0].reviewEffective,
        reviewOverdue: boundary.compatibilityBudgets[0].reviewOverdue,
        ownershipEffective: boundary.compatibilityBudgets[0].ownershipEffective,
        active: boundary.compatibilityBudgets[0].active,
      },
      {
        statementValid: true,
        reviewEffective: true,
        reviewOverdue: false,
        ownershipEffective: true,
        active: true,
      }
    );
  }

  const future = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-19' });
  assert.equal(
    future.failures.some(failure => failure.kind === 'compatibility-review-not-effective-yet'),
    true
  );
  assert.equal(
    future.failures.some(failure => failure.kind === 'import-growth'),
    true,
    'a future compatibility review must not hide current general ratchet growth'
  );
  assert.deepEqual(
    {
      statementValid: future.compatibilityBudgets[0].statementValid,
      reviewEffective: future.compatibilityBudgets[0].reviewEffective,
      reviewOverdue: future.compatibilityBudgets[0].reviewOverdue,
      ownershipEffective: future.compatibilityBudgets[0].ownershipEffective,
      active: future.compatibilityBudgets[0].active,
    },
    {
      statementValid: true,
      reviewEffective: false,
      reviewOverdue: false,
      ownershipEffective: false,
      active: false,
    }
  );

  const futureWithStatementDrift = evaluateLayerContract(
    graph,
    contract({
      compatibilityBudgets: [
        compatibilityBudget({
          statement: { ...compatibility.statement, syntax: 'static-re-export' },
        }),
      ],
    }),
    { currentDate: '2026-07-19' }
  );
  assert.equal(
    futureWithStatementDrift.failures.some(
      failure => failure.kind === 'compatibility-review-not-effective-yet'
    ),
    true
  );
  assert.equal(
    futureWithStatementDrift.failures.some(failure => failure.kind === 'compatibility-budget-syntax-drift'),
    true,
    'lifecycle invalidity must not bypass exact statement validation'
  );

  const staleContract = baseline;
  const staleDate = '2027-07-21';
  const stale = evaluateLayerContract(graph, staleContract, { currentDate: staleDate });
  const staleFailure = stale.failures.find(failure => failure.kind === 'stale-compatibility-review');
  assert.deepEqual(staleFailure, {
    kind: 'stale-compatibility-review',
    compatibilityBudgetId: compatibility.id,
    reviewedAt: compatibility.reviewedAt,
    nextReviewBy: compatibility.nextReviewBy,
    currentDate: staleDate,
    fromFile: compatibility.fromFile,
    toFile: compatibility.statement.toFile,
  });
  assert.deepEqual(
    {
      statementValid: stale.compatibilityBudgets[0].statementValid,
      reviewEffective: stale.compatibilityBudgets[0].reviewEffective,
      reviewOverdue: stale.compatibilityBudgets[0].reviewOverdue,
      ownershipEffective: stale.compatibilityBudgets[0].ownershipEffective,
      active: stale.compatibilityBudgets[0].active,
    },
    {
      statementValid: true,
      reviewEffective: true,
      reviewOverdue: true,
      ownershipEffective: true,
      active: false,
    }
  );

  const proposal = buildLayerContractProposal(graph, staleContract, { currentDate: staleDate });
  assert.equal(proposal.reviewRequired, true);
  assert.equal(
    stale.failures.some(failure => /growth$/u.test(failure.kind)),
    false,
    'an overdue review remains exact compatibility ownership rather than general ratchet growth'
  );
  assert.deepEqual(proposal.diff.removedEdges, []);
  assert.deepEqual(proposal.diff.budgetChanges, []);
  assert.equal(proposal.contract.rules[0].maxImportCount, 0);
  assert.equal(proposal.contract.rules[0].maxValueImportCount, 0);
});

test('Layer Contract 2.4 retirement effective dates preserve active-debt accounting on failure', () => {
  const budget = migrationBudget();
  const compatibility = compatibilityBudget();
  const added = migrationImport({
    toFile: budget.addedImport.toFile,
    importedSymbols: budget.addedImport.importedSymbols,
    statementKey: 'added',
  });
  const companion = migrationImport({
    toFile: budget.companionImport.toFile,
    importedSymbols: budget.companionImport.importedSymbols,
    statementKey: 'companion',
  });
  const graph = layer24Graph([added, companion], { importCount: 2, valueImportCount: 2 });

  const future = evaluateLayerContract(
    graph,
    contract({
      migrationBudgets: [budget],
      migrationRetirements: [migrationRetirement({ retiredAt: '2030-01-01' })],
      compatibilityBudgets: [compatibility],
    }),
    { currentDate: LAYER_24_SNAPSHOT_DATE }
  );
  assert.equal(
    future.failures.some(failure => failure.kind === 'migration-retirement-not-effective-yet'),
    true
  );
  assert.equal(future.activeMigrationEntries.length, 1);
  assert.equal(future.retiredMigrationEntries.length, 0);
  assert.equal(future.migrationBudgets[0].active, true);
  assert.equal(future.migrationBudgets[0].retirementEffective, false);
  assert.equal(future.migrationBudgets[0].statementValid, true);

  const effectiveToday = evaluateLayerContract(
    graph,
    contract({
      migrationBudgets: [budget],
      migrationRetirements: [migrationRetirement({ retiredAt: LAYER_24_SNAPSHOT_DATE })],
      compatibilityBudgets: [compatibility],
    }),
    { currentDate: LAYER_24_SNAPSHOT_DATE }
  );
  assert.equal(effectiveToday.ok, true, JSON.stringify(effectiveToday.failures));
  assert.equal(effectiveToday.activeMigrationEntries.length, 0);
  assert.equal(effectiveToday.retiredMigrationEntries.length, 1);

  const mismatched = evaluateLayerContract(
    graph,
    contract({
      migrationBudgets: [budget],
      migrationRetirements: [migrationRetirement()],
      compatibilityBudgets: [
        compatibilityBudget({
          statement: { ...compatibility.statement, importedSymbols: ['WRONG_SYMBOL'] },
        }),
      ],
    }),
    { currentDate: LAYER_24_SNAPSHOT_DATE }
  );
  assert.equal(
    mismatched.failures.some(failure => failure.kind === 'migration-retirement-compatibility-mismatch'),
    true
  );
  assert.equal(mismatched.activeMigrationEntries.length, 1);
  assert.equal(mismatched.retiredMigrationEntries.length, 0);
  assert.equal(mismatched.migrationBudgets[0].active, true);
  assert.equal(mismatched.migrationBudgets[0].retired, false);
});

test('Layer Contract 2.4 verifies consolidation replacement provenance and failed accounting', () => {
  const budget = migrationBudget();
  const replacement = consolidationReplacementStatement();
  const replacementImport = migrationImport({
    fromFile: replacement.fromFile,
    toFile: replacement.toFile,
    importedSymbols: replacement.importedSymbols,
    statementKey: 'consolidated',
    kind: replacement.kind,
    syntax: replacement.syntax,
  });
  const graph = layer24Graph([replacementImport]);
  const validContract = contract({
    migrationBudgets: [budget],
    migrationRetirements: [consolidationRetirement()],
  });
  const valid = evaluateLayerContract(graph, validContract, {
    currentDate: LAYER_24_SNAPSHOT_DATE,
  });
  assert.equal(valid.ok, true, JSON.stringify(valid.failures));
  assert.equal(valid.activeMigrationEntries.length, 0);
  assert.equal(valid.retiredMigrationEntries.length, 1);
  assert.deepEqual(valid.retiredMigrationEntries[0].replacementStatement, {
    fromFile: replacement.fromFile,
    toFile: replacement.toFile,
    kind: replacement.kind,
    syntax: replacement.syntax,
    importedSymbols: replacement.importedSymbols,
    statementValid: true,
  });

  const invalidProbes = [
    {
      label: 'target',
      retirement: consolidationRetirement({
        replacementStatement: consolidationReplacementStatement({
          toFile: 'esm/native/services/other-consolidated.ts',
        }),
      }),
      imports: [replacementImport],
      failureKind: 'migration-retirement-consolidation-statement-missing',
    },
    {
      label: 'symbols',
      retirement: consolidationRetirement({
        replacementStatement: consolidationReplacementStatement({ importedSymbols: ['WRONG_SYMBOL'] }),
      }),
      imports: [replacementImport],
      failureKind: 'migration-retirement-consolidation-statement-missing',
    },
    {
      label: 'kind',
      retirement: consolidationRetirement({
        replacementStatement: consolidationReplacementStatement({ kind: 'type', syntax: 'type-import' }),
      }),
      imports: [replacementImport],
      failureKind: 'migration-retirement-consolidation-kind-drift',
    },
    {
      label: 'syntax',
      retirement: consolidationRetirement({
        replacementStatement: consolidationReplacementStatement({ syntax: 'static-re-export' }),
      }),
      imports: [replacementImport],
      failureKind: 'migration-retirement-consolidation-syntax-drift',
    },
    {
      label: 'multiple statements',
      retirement: consolidationRetirement(),
      imports: [replacementImport, { ...replacementImport, statementKey: 'consolidated-duplicate' }],
      failureKind: 'migration-retirement-consolidation-statement-growth',
    },
    {
      label: 'alias',
      retirement: consolidationRetirement(),
      imports: [
        {
          ...replacementImport,
          bindings: [{ importedName: 'CONSOLIDATED_POLICY', localName: 'consolidatedPolicy' }],
        },
      ],
      failureKind: 'migration-retirement-consolidation-alias-drift',
    },
  ];

  for (const probe of invalidProbes) {
    const report = evaluateLayerContract(
      layer24Graph(probe.imports),
      contract({
        migrationBudgets: [budget],
        migrationRetirements: [probe.retirement],
      }),
      { currentDate: LAYER_24_SNAPSHOT_DATE }
    );
    assert.equal(
      report.failures.some(failure => failure.kind === probe.failureKind),
      true,
      `${probe.label}: ${JSON.stringify(report.failures)}`
    );
    assert.equal(report.activeMigrationEntries.length, 1, `${probe.label} stays active debt`);
    assert.equal(report.retiredMigrationEntries.length, 0, `${probe.label} is not retired`);
  }

  const compatibility = compatibilityBudget({
    id: 'consolidated-compatibility-owner',
    fromFile: replacement.fromFile,
    statement: {
      toFile: replacement.toFile,
      kind: replacement.kind,
      syntax: replacement.syntax,
      importedSymbols: replacement.importedSymbols,
    },
    publicSurface: 'ui/consolidated.ts → services/consolidated.ts',
  });
  const compatibilityConflict = evaluateLayerContract(
    graph,
    contract({
      migrationBudgets: [budget],
      migrationRetirements: [consolidationRetirement()],
      compatibilityBudgets: [compatibility],
    }),
    { currentDate: LAYER_24_SNAPSHOT_DATE }
  );
  assert.equal(
    compatibilityConflict.failures.some(
      failure => failure.kind === 'migration-retirement-consolidation-compatibility-ownership-conflict'
    ),
    true
  );
  assert.equal(compatibilityConflict.activeMigrationEntries.length, 1);
  assert.equal(compatibilityConflict.retiredMigrationEntries.length, 0);

  const activeOwnerBudget = migrationBudget({
    fromFile: replacement.fromFile,
    addedImport: {
      toFile: replacement.toFile,
      kind: replacement.kind,
      syntax: replacement.syntax,
      importedSymbols: replacement.importedSymbols,
    },
    companionImport: {
      toFile: 'esm/native/services/consolidated_companion.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CONSOLIDATED_COMPANION'],
    },
    removedImport: {
      toFile: 'esm/native/services/consolidated_legacy.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CONSOLIDATED_POLICY', 'CONSOLIDATED_COMPANION'],
    },
  });
  const activeOwnerCompanion = migrationImport({
    fromFile: replacement.fromFile,
    toFile: activeOwnerBudget.companionImport.toFile,
    importedSymbols: activeOwnerBudget.companionImport.importedSymbols,
    statementKey: 'consolidated-companion',
  });
  const activeOwnerConflict = evaluateLayerContract(
    layer24Graph([replacementImport, activeOwnerCompanion], {
      importCount: 2,
      valueImportCount: 2,
    }),
    contract({
      migrationBudgets: [budget, activeOwnerBudget],
      migrationRetirements: [consolidationRetirement()],
    }),
    { currentDate: LAYER_24_SNAPSHOT_DATE }
  );
  assert.equal(
    activeOwnerConflict.failures.some(
      failure => failure.kind === 'migration-retirement-consolidation-active-migration-ownership-conflict'
    ),
    true
  );
  assert.equal(activeOwnerConflict.activeMigrationEntries.length, 2);
  assert.equal(activeOwnerConflict.retiredMigrationEntries.length, 0);
});
