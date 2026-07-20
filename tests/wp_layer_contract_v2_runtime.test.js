import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

const TEST_CURRENT_DATE = '2026-07-20';

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
} = {}) {
  return {
    version: '2.3',
    root: 'esm',
    ratchet: RATCHET,
    rules,
    facades,
    dynamicImportAllowlist,
    migrationBudgets,
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

function migrationImportFromSource(source, toFile, statementKey) {
  const dependencies = analyzeModuleDependencies('example.ts', source).imports;
  assert.equal(dependencies.length, 1, 'fixture must contain exactly one module dependency');
  const [dependency] = dependencies;
  return migrationImport({
    toFile,
    importedSymbols: dependency.importedSymbols,
    statementKey,
    kind: dependency.kind,
    syntax: dependency.syntax,
  });
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
  assert.deepEqual(report.migrationBudgets, [
    {
      from: 'ui',
      to: 'services',
      fromFile: 'esm/native/ui/example.ts',
      addedTarget: 'esm/native/services/units.ts',
      reviewBy: '2026-10-18',
      active: true,
    },
  ]);
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

test('project migration ledger stays exact at seven reviewed statements with unchanged base budgets', () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'tools/wp_layer_baseline.json'), 'utf8')
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
  ];

  assert.deepEqual(
    baseline.migrationBudgets.map(entry => [entry.fromFile, entry.addedImport.toFile]),
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
  const report = evaluateLayerContract(graph, baseline, { currentDate: TEST_CURRENT_DATE });
  assert.equal(report.ok, true);
  assert.equal(report.migrationBudgets.length, 7);
  assert.equal(
    report.migrationBudgets.every(entry => entry.active === true),
    true
  );

  const expectedEdges = new Map([
    ['builder>shared', { observed: 223, migration: 4, reviewed: 219, budget: 219 }],
    ['features>shared', { observed: 59, migration: 1, reviewed: 58, budget: 58 }],
    ['services>shared', { observed: 169, migration: 2, reviewed: 167, budget: 167 }],
  ]);
  for (const [key, expected] of expectedEdges) {
    const [from, to] = key.split('>');
    const edge = graph.edges.find(entry => entry.from === from && entry.to === to);
    const rule = baseline.rules.find(entry => entry.from === from && entry.to === to);
    assert.ok(edge, `missing observed edge ${key}`);
    assert.ok(rule, `missing baseline rule ${key}`);
    assert.equal(edge.importCount, expected.observed);
    assert.equal(expected.observed - expected.migration, expected.reviewed);
    assert.equal(rule.maxImportCount, expected.budget);
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
      { cwd: repositoryRoot, encoding: 'utf8' }
    );

    assert.equal(result.status, 1, result.stderr);
    const proposal = JSON.parse(result.stdout);
    assert.equal(proposal.reviewRequired, true);
    assert.ok(proposal.diff.ratchetViolations.length > 0);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
