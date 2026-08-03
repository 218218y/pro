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
  collectNamedModuleExports,
  collectStaticModuleImports,
  collectStaticModuleSpecifiers,
  evaluateLayerContract,
  evaluatePendingLayerRatchetReductions,
  layerOfRelativeFile,
  validateLayerContractSchema,
} from '../tools/wp_layer_contract_support.mjs';
const TEST_CURRENT_DATE = '2026-07-21';
const LAYER_27_SNAPSHOT_DATE = '2026-07-30';

function fileSha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const RATCHET = Object.freeze({
  mode: 'decrease-only',
  owner: 'architecture-contract',
  reason: 'Budgets only move down after verified dependency removal.',
  reviewedAt: '2026-07-14',
  pendingReductionGraceDays: 14,
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
  ratchet = RATCHET,
  rules = [allowRule()],
  facades = [],
  dynamicImportAllowlist = [],
  migrationBudgets = [],
  migrationRetirements = [],
  compatibilityBudgets = [],
  reviewedOwnershipBudgets = [],
  migrationConsolidations = [],
} = {}) {
  return {
    version: '2.7',
    root: 'esm',
    ratchet,
    rules,
    facades,
    dynamicImportAllowlist,
    migrationBudgets,
    migrationRetirements,
    compatibilityBudgets,
    reviewedOwnershipBudgets,
    migrationConsolidations,
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
    toFile: 'esm/native/services/consolidated.ts',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: ['CONSOLIDATED_POLICY'],
    ...overrides,
  };
}

function absorbedStatement(spec, fromFile = 'esm/native/ui/example.ts') {
  return {
    fromFile,
    toFile: spec.toFile,
    kind: spec.kind,
    syntax: spec.syntax,
    importedSymbols: [...spec.importedSymbols],
  };
}

function migrationConsolidation(overrides = {}) {
  const budget = migrationBudget();
  const replacementStatement = consolidationReplacementStatement();
  return {
    id: 'example-consolidation',
    retiredAt: '2026-07-29',
    entryNumbers: [1],
    from: budget.from,
    to: budget.to,
    fromFile: budget.fromFile,
    owner: 'test-consolidation-owner',
    reason: 'Historical focused statements are replaced by one reviewed composition owner.',
    replacementStatement,
    absorbedStatements: [
      absorbedStatement(budget.addedImport, budget.fromFile),
      absorbedStatement(budget.companionImport, budget.fromFile),
    ],
    replacementProvenance: {
      mode: 'reviewed-composition',
      ownerFile: replacementStatement.toFile,
      sourceStatements: [{ ...budget.addedImport }, { ...budget.companionImport }],
    },
    evidenceContracts: [
      {
        path: 'tests/wp_layer_contract_v2_runtime.test.js',
        sha256: fileSha256('tests/wp_layer_contract_v2_runtime.test.js'),
      },
    ],
    ...overrides,
  };
}

function consolidationRetirement(overrides = {}) {
  return {
    entryNumber: 1,
    retiredAt: '2026-07-29',
    mode: 'statement-consolidated',
    reason: 'The historical statements were replaced by one exact consolidation group owner.',
    replacementConsolidationId: 'example-consolidation',
    ...overrides,
  };
}

function layer24Graph(imports, edgeOverrides = {}, sourceFiles = {}) {
  return {
    edges: [edge(edgeOverrides)],
    imports,
    unresolvedDynamicImports: [],
    forbiddenModuleSyntax: [],
    unclassifiedSourceFiles: [],
    sourceFiles: {
      'esm/native/services/consolidated.ts': [
        "import { CM_PER_METER } from './units.js';",
        "import { EXAMPLE_POLICY } from './policy.js';",
        'export const CONSOLIDATED_POLICY = { CM_PER_METER, EXAMPLE_POLICY };',
      ].join('\n'),
      ...sourceFiles,
    },
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
      validateLayerContractSchema({
        ...contract(),
        ratchet: { ...RATCHET, pendingReductionGraceDays: 0 },
      }),
    /pendingReductionGraceDays/
  );
  assert.throws(
    () =>
      validateLayerContractSchema({
        ...contract(),
        ratchet: { ...RATCHET, pendingReductionGraceDays: 91 },
      }),
    /pendingReductionGraceDays/
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

test('layer ratchet freshness guard gives clean reductions a bounded grace window', () => {
  const current = contract({
    ratchet: {
      ...RATCHET,
      reviewedAt: '2026-07-01',
      pendingReductionGraceDays: 14,
    },
    rules: [
      allowRule({
        maxImporterCount: 2,
        maxImportCount: 2,
        maxValueImporterCount: 2,
        maxValueImportCount: 2,
      }),
    ],
  });
  const graph = { edges: [edge()] };

  const boundary = evaluatePendingLayerRatchetReductions(graph, current, {
    currentDate: '2026-07-15',
  });
  assert.equal(boundary.ok, true);
  assert.equal(boundary.hasPendingReductions, true);
  assert.equal(boundary.reviewAgeDays, 14);
  assert.equal(boundary.overdue, false);
  assert.equal(boundary.pendingBudgetChanges.length, 4);

  const overdue = evaluatePendingLayerRatchetReductions(graph, current, {
    currentDate: '2026-07-16',
  });
  assert.equal(overdue.ok, false);
  assert.equal(overdue.overdue, true);
  assert.equal(overdue.reviewAgeDays, 15);

  const proposal = buildLayerContractProposal(graph, current, {
    currentDate: '2026-07-16',
  });
  assert.equal(proposal.reviewRequired, false);
  assert.equal(proposal.contract.ratchet.reviewedAt, '2026-07-16');
  const applied = evaluatePendingLayerRatchetReductions(graph, proposal.contract, {
    currentDate: '2026-08-31',
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.hasPendingReductions, false);
});

test('layer ratchet freshness guard fails closed on a future review date', () => {
  const report = evaluatePendingLayerRatchetReductions(
    { edges: [edge()] },
    contract({
      ratchet: {
        ...RATCHET,
        reviewedAt: '2026-07-22',
      },
    }),
    { currentDate: '2026-07-21' }
  );

  assert.equal(report.ok, false);
  assert.equal(report.futureReview, true);
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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-layer-contract-'));
  try {
    const featureDir = path.join(tempRoot, 'esm/native/features');
    const sharedDir = path.join(tempRoot, 'esm/shared');
    fs.mkdirSync(featureDir, { recursive: true });
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(
      path.join(featureDir, 'example.ts'),
      "import { policy } from '../../shared/policy.js';\nexport const value = policy;\n"
    );
    fs.writeFileSync(path.join(sharedDir, 'policy.ts'), 'export const policy = 1;\n');
    const baseline = contract({
      rules: [
        allowRule({
          from: 'features',
          to: 'shared',
          maxImporterCount: 0,
          maxImportCount: 0,
          maxValueImporterCount: 0,
          maxValueImportCount: 0,
        }),
      ],
    });
    const baselinePath = path.join(tempRoot, 'baseline.json');
    fs.writeFileSync(baselinePath, JSON.stringify(baseline));
    const result = spawnSync(
      process.execPath,
      [
        path.join(repositoryRoot, 'tools', 'wp_layer_contract.js'),
        '--propose',
        '--json',
        '--root',
        tempRoot,
        '--baseline',
        baselinePath,
      ],
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

test('layer ratchet freshness CLI rejects overdue clean reductions', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-layer-ratchet-'));
  try {
    const featureDir = path.join(tempRoot, 'esm/native/features');
    const sharedDir = path.join(tempRoot, 'esm/shared');
    fs.mkdirSync(featureDir, { recursive: true });
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(
      path.join(featureDir, 'example.ts'),
      "import { policy } from '../../shared/policy.js';\nexport const value = policy;\n"
    );
    fs.writeFileSync(path.join(sharedDir, 'policy.ts'), 'export const policy = 1;\n');
    const rule = allowRule({ from: 'features', to: 'shared' });
    rule.maxImportCount += 1;
    rule.maxValueImportCount += 1;
    const baseline = contract({
      ratchet: { ...RATCHET, reviewedAt: '2026-01-01' },
      rules: [rule],
    });
    const baselinePath = path.join(tempRoot, 'baseline.json');
    fs.writeFileSync(baselinePath, JSON.stringify(baseline));
    const result = spawnSync(
      process.execPath,
      [
        path.join(repositoryRoot, 'tools', 'wp_layer_contract.js'),
        '--check-pending-reductions',
        '--root',
        tempRoot,
        '--baseline',
        baselinePath,
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      }
    );

    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /pending budget reduction/);
    assert.match(result.stderr, /contract:layers:propose/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('Layer Contract 2.7 separates historical, active, retired, and compatibility ownership', () => {
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

test('Layer Contract 2.7 retirement and compatibility ownership fail closed', () => {
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

test('Layer Contract 2.7 statement-removed retirement requires absence and compatibility does not hide other growth', () => {
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
      {
        entryNumber: 1,
        retiredAt: '2026-07-29',
        mode: 'statement-removed',
        reason: 'The historical statement was removed without replacement.',
      },
    ],
  });
  const report = evaluateLayerContract(graph, baseline, { currentDate: LAYER_27_SNAPSHOT_DATE });
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

test('Layer Contract 2.7 enforces retirement chronology and distinct retirement mode schemas', () => {
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
            {
              ...consolidationRetirement(),
              replacementConsolidationId: 'missing-consolidation',
            },
          ],
        })
      ),
    /statement-consolidated requires an existing replacementConsolidationId/
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [
            {
              entryNumber: 1,
              retiredAt: '2026-07-29',
              mode: 'statement-removed',
              reason: 'The statement was removed.',
              replacementCompatibilityBudgetId: null,
            },
          ],
        })
      ),
    /statement-removed does not allow replacement ownership fields/
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
    /ownership-transferred does not allow replacementConsolidationId.*replacementStatement/
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [
            {
              ...consolidationRetirement(),
              replacementStatement: consolidationReplacementStatement(),
            },
          ],
          migrationConsolidations: [migrationConsolidation()],
        })
      ),
    /statement-consolidated does not allow compatibility.*inline replacement/
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [consolidationRetirement()],
          migrationConsolidations: [
            migrationConsolidation({
              replacementStatement: consolidationReplacementStatement({ importedSymbols: ['*'] }),
            }),
          ],
        })
      ),
    /replacement wildcard requires allowWildcard: true/
  );
});

test('Layer Contract 2.7 compatibility lifecycle is inclusive and blocks stale proposal lowering', () => {
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

test('Layer Contract 2.7 retirement effective dates preserve active-debt accounting on failure', () => {
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
    { currentDate: LAYER_27_SNAPSHOT_DATE }
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
      migrationRetirements: [migrationRetirement({ retiredAt: LAYER_27_SNAPSHOT_DATE })],
      compatibilityBudgets: [compatibility],
    }),
    { currentDate: LAYER_27_SNAPSHOT_DATE }
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
    { currentDate: LAYER_27_SNAPSHOT_DATE }
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

test('Layer Contract 2.7 validates multi-entry consolidation groups and all-or-nothing retirement', () => {
  const first = migrationBudget();
  const second = migrationBudget({
    addedImport: {
      toFile: 'esm/native/services/other_units.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['OTHER_UNIT'],
    },
    reason: 'A second historical statement shares the same consumer and companion statement.',
  });
  const replacement = consolidationReplacementStatement();
  const group = migrationConsolidation({
    id: 'multi-entry-consolidation',
    entryNumbers: [1, 2],
    replacementStatement: replacement,
    absorbedStatements: [
      absorbedStatement(first.addedImport, first.fromFile),
      absorbedStatement(first.companionImport, first.fromFile),
      absorbedStatement(second.addedImport, second.fromFile),
    ],
    replacementProvenance: {
      mode: 'reviewed-composition',
      ownerFile: replacement.toFile,
      sourceStatements: [{ ...first.addedImport }, { ...first.companionImport }, { ...second.addedImport }],
    },
  });
  const retirements = [
    consolidationRetirement({ entryNumber: 1, replacementConsolidationId: group.id }),
    consolidationRetirement({ entryNumber: 2, replacementConsolidationId: group.id }),
  ];
  const replacementImport = migrationImport({
    fromFile: group.fromFile,
    toFile: replacement.toFile,
    importedSymbols: replacement.importedSymbols,
    statementKey: 'replacement',
  });
  const valid = evaluateLayerContract(
    layer24Graph(
      [replacementImport],
      {},
      {
        'esm/native/services/consolidated.ts': [
          "import { CM_PER_METER } from './units.js';",
          "import { EXAMPLE_POLICY } from './policy.js';",
          "import { OTHER_UNIT } from './other_units.js';",
          'export const CONSOLIDATED_POLICY = { CM_PER_METER, EXAMPLE_POLICY, OTHER_UNIT };',
        ].join('\n'),
      }
    ),
    contract({
      migrationBudgets: [first, second],
      migrationRetirements: retirements,
      migrationConsolidations: [group],
    }),
    { currentDate: LAYER_27_SNAPSHOT_DATE }
  );
  assert.equal(valid.ok, true, JSON.stringify(valid.failures));
  assert.equal(valid.activeMigrationEntries.length, 0);
  assert.deepEqual(
    valid.retiredMigrationEntries.map(entry => entry.entryNumber),
    [1, 2]
  );
  assert.deepEqual(valid.migrationConsolidations[0], {
    consolidationId: group.id,
    entryNumbers: [1, 2],
    from: group.from,
    to: group.to,
    fromFile: group.fromFile,
    retiredAt: group.retiredAt,
    currentDate: LAYER_27_SNAPSHOT_DATE,
    retirementEffective: true,
    absorbedStatementsValid: true,
    replacementStatementValid: true,
    replacementProvenanceValid: true,
    evidenceContractsValid: true,
    ownershipConflicts: [],
    active: true,
    valid: true,
    replacementStatement: { fromFile: group.fromFile, ...replacement },
    absorbedStatements: group.absorbedStatements,
    replacementProvenance: {
      ...group.replacementProvenance,
      sourceStatementStatuses: group.replacementProvenance.sourceStatements.map(statement => ({
        ...statement,
        valid: true,
      })),
    },
    evidenceContracts: group.evidenceContracts,
  });

  const stillPresent = migrationImport({
    toFile: first.addedImport.toFile,
    importedSymbols: first.addedImport.importedSymbols,
    statementKey: 'historical-added',
  });
  const invalid = evaluateLayerContract(
    layer24Graph([replacementImport, stillPresent], { importCount: 2, valueImportCount: 2 }),
    contract({
      migrationBudgets: [first, second],
      migrationRetirements: retirements,
      migrationConsolidations: [group],
    }),
    { currentDate: LAYER_27_SNAPSHOT_DATE }
  );
  assert.equal(
    invalid.failures.some(
      failure => failure.kind === 'migration-consolidation-absorbed-statement-still-present'
    ),
    true
  );
  assert.equal(invalid.activeMigrationEntries.length, 2);
  assert.equal(invalid.retiredMigrationEntries.length, 0);

  const companionStillPresent = migrationImport({
    toFile: first.companionImport.toFile,
    importedSymbols: first.companionImport.importedSymbols,
    statementKey: 'historical-companion',
  });
  const companionInvalid = evaluateLayerContract(
    layer24Graph([replacementImport, companionStillPresent], { importCount: 2, valueImportCount: 2 }),
    contract({
      migrationBudgets: [first, second],
      migrationRetirements: retirements,
      migrationConsolidations: [group],
    }),
    { currentDate: LAYER_27_SNAPSHOT_DATE }
  );
  assert.equal(
    companionInvalid.failures.some(
      failure => failure.kind === 'migration-consolidation-absorbed-statement-still-present'
    ),
    true
  );
  assert.equal(companionInvalid.activeMigrationEntries.length, 2);
  assert.equal(companionInvalid.retiredMigrationEntries.length, 0);
});

test('Layer Contract 2.7 consolidation schema rejects ambiguous group ownership and missing evidence', () => {
  const first = migrationBudget();
  const second = migrationBudget({
    addedImport: {
      toFile: 'esm/native/services/other_units.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['OTHER_UNIT'],
    },
  });
  const group = migrationConsolidation({
    id: 'group-a',
    entryNumbers: [1, 2],
    absorbedStatements: [
      absorbedStatement(first.addedImport),
      absorbedStatement(first.companionImport),
      absorbedStatement(second.addedImport),
    ],
  });
  const retirements = [
    consolidationRetirement({ entryNumber: 1, replacementConsolidationId: group.id }),
    consolidationRetirement({ entryNumber: 2, replacementConsolidationId: group.id }),
  ];
  const base = {
    migrationBudgets: [first, second],
    migrationRetirements: retirements,
    migrationConsolidations: [group],
  };

  assert.doesNotThrow(() => validateLayerContractSchema(contract(base)), 'same replacement in one group');
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          ...base,
          migrationConsolidations: [group, { ...group, id: 'group-b', entryNumbers: [2] }],
        })
      ),
    /belongs to multiple consolidations|duplicate migration consolidation replacement ownership/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          ...base,
          migrationConsolidations: [group, { ...group, id: 'group-b', entryNumbers: [1, 2] }],
        })
      ),
    /belongs to multiple consolidations|duplicate migration consolidation replacement ownership/
  );
  assert.throws(
    () => validateLayerContractSchema(contract({ ...base, migrationRetirements: [retirements[0]] })),
    /missing a matching retirement/
  );

  const third = migrationBudget({
    addedImport: {
      toFile: 'esm/native/services/third_units.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['THIRD_UNIT'],
    },
  });
  const groupOne = migrationConsolidation({
    id: 'replacement-group-one',
    entryNumbers: [1],
    absorbedStatements: [absorbedStatement(first.addedImport), absorbedStatement(first.companionImport)],
  });
  const groupTwo = migrationConsolidation({
    id: 'replacement-group-two',
    entryNumbers: [2, 3],
    absorbedStatements: [
      absorbedStatement(second.addedImport),
      absorbedStatement(second.companionImport),
      absorbedStatement(third.addedImport),
    ],
  });
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [first, second, third],
          migrationRetirements: [
            consolidationRetirement({ entryNumber: 1, replacementConsolidationId: groupOne.id }),
            consolidationRetirement({ entryNumber: 2, replacementConsolidationId: groupTwo.id }),
            consolidationRetirement({ entryNumber: 3, replacementConsolidationId: groupTwo.id }),
          ],
          migrationConsolidations: [groupOne, groupTwo],
        })
      ),
    /duplicate migration consolidation replacement ownership/
  );

  const wrongGroup = migrationConsolidation({
    id: 'wrong-existing-group',
    entryNumbers: [2],
    replacementStatement: {
      ...consolidationReplacementStatement(),
      toFile: 'esm/native/services/other-consolidated.ts',
      importedSymbols: ['OTHER_CONSOLIDATED_POLICY'],
    },
    absorbedStatements: [absorbedStatement(second.addedImport), absorbedStatement(second.companionImport)],
  });
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          ...base,
          migrationRetirements: [
            { ...retirements[0], replacementConsolidationId: wrongGroup.id },
            retirements[1],
          ],
          migrationConsolidations: [group, wrongGroup],
        })
      ),
    /points to consolidation .* that does not include it|belongs to multiple consolidations/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          ...base,
          migrationBudgets: [first, { ...second, fromFile: 'esm/native/ui/other.ts' }],
        })
      ),
    /must use fromFile/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          ...base,
          migrationBudgets: [
            first,
            {
              ...second,
              from: 'runtime',
              fromFile: 'esm/native/runtime/example.ts',
            },
          ],
        })
      ),
    /must use edge|requires one existing allowed edge/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          ...base,
          migrationConsolidations: [
            {
              ...group,
              evidenceContracts: [{ path: 'tests/missing-contract.test.js', sha256: '0'.repeat(64) }],
            },
          ],
        })
      ),
    /evidence contract does not exist/
  );
});

test('Layer Contract 2.7 consolidation exact-statement probes fail closed without partial retirement', () => {
  const budget = migrationBudget();
  const replacement = consolidationReplacementStatement();
  const group = migrationConsolidation();
  const retirement = consolidationRetirement();
  const replacementImport = migrationImport({
    fromFile: group.fromFile,
    toFile: replacement.toFile,
    importedSymbols: replacement.importedSymbols,
    statementKey: 'replacement',
  });
  const evaluateProbe = (probeGroup, imports, extra = {}) =>
    evaluateLayerContract(
      layer24Graph(imports, { importCount: imports.length, valueImportCount: imports.length }),
      contract({
        migrationBudgets: [budget, ...(extra.migrationBudgets || [])],
        migrationRetirements: [retirement],
        migrationConsolidations: [probeGroup],
        compatibilityBudgets: extra.compatibilityBudgets || [],
      }),
      { currentDate: extra.currentDate || LAYER_27_SNAPSHOT_DATE }
    );

  const probes = [
    ['missing replacement', group, [], 'migration-consolidation-replacement-statement-missing'],
    [
      'wrong target',
      {
        ...group,
        replacementStatement: { ...replacement, toFile: 'esm/native/services/unrelated.ts' },
        replacementProvenance: {
          ...group.replacementProvenance,
          ownerFile: 'esm/native/services/unrelated.ts',
        },
      },
      [replacementImport],
      'migration-consolidation-replacement-statement-missing',
    ],
    [
      'unrelated replacement in another consumer file',
      group,
      [{ ...replacementImport, fromFile: 'esm/native/ui/unrelated.ts' }],
      'migration-consolidation-replacement-statement-missing',
    ],
    [
      'wrong symbols',
      { ...group, replacementStatement: { ...replacement, importedSymbols: ['UNRELATED'] } },
      [replacementImport],
      'migration-consolidation-replacement-statement-missing',
    ],
    [
      'wrong kind',
      { ...group, replacementStatement: { ...replacement, kind: 'type', syntax: 'type-import' } },
      [replacementImport],
      'migration-consolidation-replacement-kind-drift',
    ],
    [
      'wrong syntax',
      { ...group, replacementStatement: { ...replacement, syntax: 'static-re-export' } },
      [replacementImport],
      'migration-consolidation-replacement-syntax-drift',
    ],
    [
      'alias',
      group,
      [
        {
          ...replacementImport,
          bindings: [{ importedName: 'CONSOLIDATED_POLICY', localName: 'aliasPolicy' }],
        },
      ],
      'migration-consolidation-replacement-alias-drift',
    ],
  ];
  for (const [label, probeGroup, imports, failureKind] of probes) {
    const report = evaluateProbe(probeGroup, imports);
    assert.equal(
      report.failures.some(failure => failure.kind === failureKind),
      true,
      `${label}: ${JSON.stringify(report.failures)}`
    );
    assert.equal(report.activeMigrationEntries.length, 1, `${label} keeps the Entry active`);
    assert.equal(report.retiredMigrationEntries.length, 0, `${label} retires nothing`);
  }

  const future = evaluateProbe(group, [replacementImport], { currentDate: '2026-07-28' });
  assert.equal(
    future.failures.some(failure => failure.kind === 'migration-consolidation-not-effective-yet'),
    true
  );
  assert.equal(future.activeMigrationEntries.length, 1);
  assert.equal(future.retiredMigrationEntries.length, 0);

  const boundary = evaluateProbe(group, [replacementImport], { currentDate: group.retiredAt });
  assert.equal(boundary.ok, true, JSON.stringify(boundary.failures));
  assert.equal(boundary.retiredMigrationEntries.length, 1);
});

test('Layer Contract 2.7 consolidation ownership conflicts block proposal lowering', () => {
  const budget = migrationBudget();
  const group = migrationConsolidation();
  const retirement = consolidationRetirement();
  const replacement = group.replacementStatement;
  const replacementImport = migrationImport({
    fromFile: group.fromFile,
    toFile: replacement.toFile,
    importedSymbols: replacement.importedSymbols,
    statementKey: 'replacement',
  });
  const compatibility = compatibilityBudget({
    id: 'replacement-compatibility',
    fromFile: group.fromFile,
    statement: { ...replacement },
  });
  const compatibilityConflictContract = contract({
    rules: [allowRule({ maxImportCount: 1, maxValueImportCount: 1 })],
    migrationBudgets: [budget],
    migrationRetirements: [retirement],
    migrationConsolidations: [group],
    compatibilityBudgets: [compatibility],
  });
  const compatibilityConflict = evaluateLayerContract(
    layer24Graph([replacementImport]),
    compatibilityConflictContract,
    { currentDate: LAYER_27_SNAPSHOT_DATE }
  );
  assert.equal(
    compatibilityConflict.failures.some(
      failure => failure.kind === 'migration-consolidation-compatibility-ownership-conflict'
    ),
    true
  );
  assert.equal(compatibilityConflict.activeMigrationEntries.length, 1);
  assert.equal(compatibilityConflict.retiredMigrationEntries.length, 0);

  const activeOwner = migrationBudget({
    addedImport: { ...replacement },
    companionImport: {
      toFile: 'esm/native/services/other_companion.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['OTHER_COMPANION'],
    },
    removedImport: {
      toFile: 'esm/native/services/other_legacy.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CONSOLIDATED_POLICY', 'OTHER_COMPANION'],
    },
  });
  const activeOwnerConflict = evaluateLayerContract(
    layer24Graph([replacementImport]),
    contract({
      migrationBudgets: [budget, activeOwner],
      migrationRetirements: [retirement],
      migrationConsolidations: [group],
    }),
    { currentDate: LAYER_27_SNAPSHOT_DATE }
  );
  assert.equal(
    activeOwnerConflict.failures.some(
      failure => failure.kind === 'migration-consolidation-active-migration-ownership-conflict'
    ),
    true
  );
  assert.equal(activeOwnerConflict.activeMigrationEntries.length, 2);
  assert.equal(activeOwnerConflict.retiredMigrationEntries.length, 0);

  const proposal = buildLayerContractProposal(
    layer24Graph([], { importCount: 0, valueImportCount: 0 }),
    contract({
      rules: [allowRule({ maxImportCount: 1, maxValueImportCount: 1 })],
      migrationBudgets: [budget],
      migrationRetirements: [retirement],
      migrationConsolidations: [group],
    }),
    { currentDate: LAYER_27_SNAPSHOT_DATE }
  );
  assert.equal(proposal.reviewRequired, true);
  assert.deepEqual(proposal.diff.budgetChanges, []);
  assert.equal(proposal.contract.rules[0].maxImportCount, 1);
  assert.equal(proposal.contract.rules[0].maxValueImportCount, 1);
  assert.deepEqual(proposal.contract.migrationConsolidations, [group]);
});

test('Layer Contract 2.7 binds consolidation replacement provenance to the reviewed owner source', () => {
  const budget = migrationBudget();
  const replacementStatement = {
    toFile: 'esm/native/services/consolidated.ts',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: ['CM_PER_METER', 'EXAMPLE_POLICY'],
  };
  const identityGroup = migrationConsolidation({
    replacementStatement,
    replacementProvenance: {
      mode: 'identity-reexport',
      ownerFile: replacementStatement.toFile,
      sourceStatements: [
        { ...budget.addedImport, syntax: 'static-re-export' },
        { ...budget.companionImport, syntax: 'static-re-export' },
      ],
    },
  });
  const retirement = consolidationRetirement();
  const replacementImport = migrationImport({
    fromFile: identityGroup.fromFile,
    toFile: replacementStatement.toFile,
    importedSymbols: replacementStatement.importedSymbols,
    statementKey: 'identity-replacement',
  });
  const validOwner = [
    "export { CM_PER_METER } from './units.js';",
    "export { EXAMPLE_POLICY } from './policy.js';",
  ].join('\n');
  const evaluate = (group, ownerSource, extra = {}) =>
    evaluateLayerContract(
      layer24Graph(
        [replacementImport],
        { importCount: 1, valueImportCount: 1 },
        { [group.replacementProvenance.ownerFile]: ownerSource }
      ),
      contract({
        rules: [
          allowRule({
            maxImportCount: extra.maxImportCount ?? 1,
            maxValueImportCount: extra.maxValueImportCount ?? 1,
          }),
        ],
        migrationBudgets: [budget],
        migrationRetirements: [retirement],
        migrationConsolidations: [group],
      }),
      { currentDate: LAYER_27_SNAPSHOT_DATE }
    );

  const valid = evaluate(identityGroup, validOwner, { maxImportCount: 0, maxValueImportCount: 0 });
  assert.equal(valid.ok, true, JSON.stringify(valid.failures));
  assert.equal(valid.activeMigrationEntries.length, 0);
  assert.equal(valid.retiredMigrationEntries.length, 1);
  assert.equal(valid.migrationConsolidations[0].replacementProvenanceValid, true);
  const ownedEdge = valid.edges[0];
  assert.equal(ownedEdge.observedStatements, 1);
  assert.equal(ownedEdge.consolidationStatements, 1);
  assert.equal(ownedEdge.reviewedGeneralStatements, 0);
  assert.equal(ownedEdge.observedValueStatements, 1);
  assert.equal(ownedEdge.consolidationValueStatements, 1);
  assert.equal(ownedEdge.reviewedGeneralValueStatements, 0);
  assert.equal(valid.consolidationApprovedStatements.get('ui>services').all.size, 1);

  const unrelated = migrationConsolidation({
    replacementStatement: { ...replacementStatement, importedSymbols: ['UNRELATED'] },
    replacementProvenance: {
      mode: 'identity-reexport',
      ownerFile: replacementStatement.toFile,
      sourceStatements: [
        {
          toFile: 'esm/native/services/unrelated_source.ts',
          kind: 'value',
          syntax: 'static-re-export',
          importedSymbols: ['UNRELATED'],
        },
      ],
    },
  });
  const unrelatedReport = evaluate(unrelated, "export { UNRELATED } from './unrelated_source.js';");
  assert.equal(
    unrelatedReport.failures.some(failure => failure.kind === 'migration-consolidation-provenance-mismatch'),
    true,
    JSON.stringify(unrelatedReport.failures)
  );
  assert.equal(unrelatedReport.activeMigrationEntries.length, 1);
  assert.equal(unrelatedReport.retiredMigrationEntries.length, 0);

  const probes = [
    [
      'missing source statement',
      identityGroup,
      "export { CM_PER_METER } from './units.js';",
      'migration-consolidation-provenance-source-statement-missing',
    ],
    [
      'extra source dependency',
      identityGroup,
      `${validOwner}\nexport { EXTRA } from './extra.js';`,
      'migration-consolidation-provenance-extra-source-dependency',
    ],
    [
      'wrong source target',
      {
        ...identityGroup,
        replacementProvenance: {
          ...identityGroup.replacementProvenance,
          sourceStatements: [
            {
              ...identityGroup.replacementProvenance.sourceStatements[0],
              toFile: 'esm/native/services/other_units.ts',
            },
            identityGroup.replacementProvenance.sourceStatements[1],
          ],
        },
      },
      validOwner,
      'migration-consolidation-provenance-source-statement-missing',
    ],
    [
      'wrong source symbols',
      {
        ...identityGroup,
        replacementProvenance: {
          ...identityGroup.replacementProvenance,
          sourceStatements: [
            { ...identityGroup.replacementProvenance.sourceStatements[0], importedSymbols: ['OTHER_UNIT'] },
            identityGroup.replacementProvenance.sourceStatements[1],
          ],
        },
      },
      validOwner,
      'migration-consolidation-provenance-source-statement-missing',
    ],
    [
      'source alias',
      identityGroup,
      [
        "export { CM_PER_METER as centimetersPerMeter } from './units.js';",
        "export { EXAMPLE_POLICY } from './policy.js';",
      ].join('\n'),
      'migration-consolidation-provenance-source-alias-drift',
    ],
    [
      'identity import instead of re-export',
      {
        ...identityGroup,
        replacementProvenance: {
          ...identityGroup.replacementProvenance,
          sourceStatements: identityGroup.replacementProvenance.sourceStatements.map(statement => ({
            ...statement,
            syntax: 'static-import',
          })),
        },
      },
      [
        "import { CM_PER_METER } from './units.js';",
        "import { EXAMPLE_POLICY } from './policy.js';",
        'export { CM_PER_METER, EXAMPLE_POLICY };',
      ].join('\n'),
      'migration-consolidation-provenance-identity-syntax-drift',
    ],
    [
      'identity wrapper declaration',
      {
        ...identityGroup,
        replacementProvenance: {
          ...identityGroup.replacementProvenance,
          mode: 'identity-reexport',
          sourceStatements: identityGroup.replacementProvenance.sourceStatements.map(statement => ({
            ...statement,
            syntax: 'static-import',
          })),
        },
      },
      [
        "import { CM_PER_METER } from './units.js';",
        "import { EXAMPLE_POLICY } from './policy.js';",
        'export const WRAPPED = { CM_PER_METER, EXAMPLE_POLICY };',
      ].join('\n'),
      'migration-consolidation-provenance-identity-owner-body-drift',
    ],
  ];
  for (const [label, group, ownerSource, failureKind] of probes) {
    const report = evaluate(group, ownerSource);
    assert.equal(
      report.failures.some(failure => failure.kind === failureKind),
      true,
      `${label}: ${JSON.stringify(report.failures)}`
    );
    assert.equal(report.activeMigrationEntries.length, 1, `${label} keeps active debt`);
    assert.equal(report.retiredMigrationEntries.length, 0, `${label} retires nothing`);
  }

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [retirement],
          migrationConsolidations: [
            {
              ...identityGroup,
              replacementProvenance: {
                ...identityGroup.replacementProvenance,
                ownerFile: 'esm/native/services/other_owner.ts',
              },
            },
          ],
        })
      ),
    /ownerFile must equal replacementStatement\.toFile/
  );
});

test('Layer Contract 2.7 evidence fingerprints fail closed and invalid groups do not receive ratchet ownership', () => {
  const budget = migrationBudget();
  const group = migrationConsolidation({
    evidenceContracts: [{ path: 'tests/wp_layer_contract_v2_runtime.test.js', sha256: '0'.repeat(64) }],
  });
  const retirement = consolidationRetirement();
  const replacementImport = migrationImport({
    fromFile: group.fromFile,
    toFile: group.replacementStatement.toFile,
    importedSymbols: group.replacementStatement.importedSymbols,
    statementKey: 'replacement',
  });
  const invalidContract = contract({
    rules: [allowRule({ maxImportCount: 0, maxValueImportCount: 0 })],
    migrationBudgets: [budget],
    migrationRetirements: [retirement],
    migrationConsolidations: [group],
  });
  const report = evaluateLayerContract(layer24Graph([replacementImport]), invalidContract, {
    currentDate: LAYER_27_SNAPSHOT_DATE,
  });
  assert.equal(
    report.failures.some(
      failure => failure.kind === 'migration-consolidation-evidence-contract-hash-mismatch'
    ),
    true
  );
  assert.equal(report.activeMigrationEntries.length, 1);
  assert.equal(report.retiredMigrationEntries.length, 0);
  assert.equal(report.edges[0].consolidationStatements, 0);
  assert.equal(
    report.failures.some(failure => failure.kind === 'import-growth'),
    true,
    JSON.stringify(report.failures)
  );

  const proposal = buildLayerContractProposal(
    layer24Graph([], { importCount: 0, valueImportCount: 0 }),
    invalidContract,
    { currentDate: LAYER_27_SNAPSHOT_DATE }
  );
  assert.equal(proposal.reviewRequired, true);
  assert.deepEqual(proposal.diff.budgetChanges, []);
  assert.equal(proposal.contract.rules[0].maxImportCount, 0);
});
