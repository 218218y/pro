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
  collectNamedModuleExports,
  collectStaticModuleImports,
  collectStaticModuleSpecifiers,
  evaluateLayerContract,
  evaluatePendingLayerRatchetReductions,
  layerOfRelativeFile,
  validateLayerContractSchema,
} from '../tools/wp_layer_contract_support.mjs';

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
  compatibilityBudgets = [],
  reviewedOwnershipBudgets = [],
} = {}) {
  return {
    version: '3.0',
    root: 'esm',
    ratchet,
    rules,
    facades,
    dynamicImportAllowlist,
    compatibilityBudgets,
    reviewedOwnershipBudgets,
  };
}

function exactImport({
  toFile = 'esm/native/services/units.ts',
  importedSymbols = ['CM_PER_METER'],
  statementKey = 'example:1',
  bindings = [{ importedName: importedSymbols[0], localName: importedSymbols[0], exportedName: null }],
  kind = 'value',
  syntax = kind === 'type' ? 'type-import' : 'static-import',
} = {}) {
  return {
    from: 'ui',
    to: 'services',
    fromFile: 'esm/native/ui/example.ts',
    toFile,
    specifier: `../services/${path.basename(toFile, path.extname(toFile))}.js`,
    kind,
    syntax,
    importedSymbols,
    bindings,
    statementKey,
  };
}

function ownershipBudget(overrides = {}) {
  return {
    id: 'example-current-owner',
    from: 'ui',
    to: 'services',
    fromFile: 'esm/native/ui/example.ts',
    statement: {
      toFile: 'esm/native/services/units.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CM_PER_METER'],
    },
    owner: 'test-current-owner',
    reason: 'This exact direct import is the current canonical owner.',
    ...overrides,
  };
}

function compatibilityBudget(overrides = {}) {
  return {
    id: 'example-public-compatibility',
    from: 'ui',
    to: 'services',
    fromFile: 'esm/native/ui/example.ts',
    statement: {
      toFile: 'esm/native/services/public_api.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['PUBLIC_API'],
    },
    owner: 'test-public-api-owner',
    reason: 'Reviewed public compatibility route.',
    reviewedAt: '2026-07-20',
    nextReviewBy: '2027-07-20',
    publicSurface: 'ui/example.ts → services/public_api.ts',
    ...overrides,
  };
}

function graph({ imports = [], edges = [edge()], ...overrides } = {}) {
  return {
    edges,
    imports,
    unresolvedDynamicImports: [],
    forbiddenModuleSyntax: [],
    unclassifiedSourceFiles: [],
    ...overrides,
  };
}

test('layer parser classifies static, type, re-export, import-type, and dynamic dependencies', () => {
  const source = `
    const fake = "import '../runtime/not-real.js'";
    import type { ServiceContract } from '../services/types.js';
    import { type Options, createService } from '../services/api.js';
    export type { KernelState } from '../kernel/api.js';
    type RuntimeApi = typeof import('../runtime/api.js');
    const lazy = import('../runtime/lazy.js');
  `;
  assert.deepEqual(
    collectStaticModuleImports('fixture.ts', source).map(({ specifier, kind }) => ({ specifier, kind })),
    [
      { specifier: '../services/types.js', kind: 'type' },
      { specifier: '../services/api.js', kind: 'type' },
      { specifier: '../services/api.js', kind: 'value' },
      { specifier: '../kernel/api.js', kind: 'type' },
      { specifier: '../runtime/api.js', kind: 'type' },
      { specifier: '../runtime/lazy.js', kind: 'dynamic' },
    ]
  );
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
});

test('layer parser preserves named bindings and avoids mixed-statement double counting', () => {
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
  assert.equal(new Set(dependencies.map(dependency => dependency.statementStart)).size, 6);
  assert.deepEqual(
    dependencies.slice(-2).map(({ importedSymbols, bindings }) => ({ importedSymbols, bindings })),
    [
      {
        importedSymbols: ['X'],
        bindings: [{ importedName: 'X', localName: 'Alias', exportedName: null }],
      },
      {
        importedSymbols: ['X'],
        bindings: [{ importedName: 'X', localName: null, exportedName: 'Alias' }],
      },
    ]
  );
});

test('layer parser collects local exports and re-export aliases', () => {
  const exports = collectNamedModuleExports(
    'fixture.ts',
    `
      const LOCAL = 1;
      export { LOCAL, LOCAL as ALIAS };
      export const POLICY = 2;
      export { SOURCE as sourceAlias } from '../shared/source.js';
    `
  ).map(({ localName, exportedName, source, kind }) => ({ localName, exportedName, source, kind }));
  assert.deepEqual(exports, [
    { localName: 'LOCAL', exportedName: 'LOCAL', source: null, kind: 'value' },
    { localName: 'LOCAL', exportedName: 'ALIAS', source: null, kind: 'value' },
    { localName: 'POLICY', exportedName: 'POLICY', source: null, kind: 'value' },
    { localName: 'SOURCE', exportedName: 'sourceAlias', source: '../shared/source.js', kind: 'value' },
  ]);
});

test('layer classification and forbidden module syntax are explicit', () => {
  assert.equal(layerOfRelativeFile('esm/shared/value.ts'), 'shared');
  assert.equal(layerOfRelativeFile('esm/entry_pro.ts'), 'entry');
  assert.equal(layerOfRelativeFile('esm/app_container.ts'), 'composition');
  assert.equal(layerOfRelativeFile('esm/unowned.ts'), 'other');
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
    analysis.unresolvedDynamicImports.map(issue => issue.expression),
    ['modulePath']
  );
  assert.deepEqual(
    analysis.forbiddenModuleSyntax.map(issue => issue.syntax),
    ['import-equals', 'require-call']
  );
});

test('current-state contract rejects denied edges, budget growth, stale rules, and facade bypasses', () => {
  const report = evaluateLayerContract(
    graph({
      edges: [
        edge({ from: 'ui', to: 'runtime' }),
        edge({
          importerCount: 2,
          importCount: 3,
          importerFiles: ['esm/native/ui/example.ts', 'esm/native/ui/new.ts'],
          valueImporterCount: 2,
          valueImportCount: 3,
          valueImporterFiles: ['esm/native/ui/example.ts', 'esm/native/ui/new.ts'],
        }),
      ],
      imports: [
        {
          from: 'ui',
          to: 'services',
          fromFile: 'esm/native/ui/example.ts',
          toFile: 'esm/native/services/private_owner.ts',
          kind: 'value',
        },
      ],
    }),
    contract({
      rules: [
        allowRule({ approvedImporters: ['esm/native/ui/example.ts'] }),
        allowRule({ from: 'services', to: 'io', reason: 'Stale test rule.' }),
      ],
      facades: [
        {
          from: 'ui',
          to: 'services',
          allowedTargets: ['esm/native/services/api.ts'],
          reason: 'UI must use services/api.',
        },
      ],
    })
  );
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
    assert.equal(kinds.has(expected), true, expected);
  }
});

test('exact current ownership excludes only the approved statement from the ratchet', () => {
  const owned = exactImport();
  const unowned = exactImport({
    toFile: 'esm/native/services/other.ts',
    importedSymbols: ['OTHER'],
    statementKey: 'example:2',
  });
  const baseline = contract({
    rules: [allowRule({ maxImportCount: 0, maxValueImportCount: 0 })],
    reviewedOwnershipBudgets: [ownershipBudget()],
  });
  const passing = evaluateLayerContract(
    graph({ imports: [owned], edges: [edge({ importCount: 1, valueImportCount: 1 })] }),
    baseline
  );
  assert.equal(passing.ok, true, JSON.stringify(passing.failures));
  assert.deepEqual(
    {
      observed: passing.edges[0].observedStatements,
      owned: passing.edges[0].reviewedOwnershipStatements,
      general: passing.edges[0].reviewedGeneralStatements,
    },
    { observed: 1, owned: 1, general: 0 }
  );

  const growth = evaluateLayerContract(
    graph({ imports: [owned, unowned], edges: [edge({ importCount: 2, valueImportCount: 2 })] }),
    baseline
  );
  assert.equal(
    growth.failures.some(failure => failure.kind === 'import-growth'),
    true
  );
});

test('current ownership fails closed on aliases, symbol drift, duplicates, and historical metadata', () => {
  const aliasReport = evaluateLayerContract(
    graph({
      imports: [
        exactImport({
          bindings: [{ importedName: 'CM_PER_METER', localName: 'cm', exportedName: null }],
        }),
      ],
    }),
    contract({ reviewedOwnershipBudgets: [ownershipBudget()] })
  );
  assert.equal(
    aliasReport.failures.some(failure => failure.kind === 'reviewed-ownership-budget-alias-drift'),
    true
  );

  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({ reviewedOwnershipBudgets: [ownershipBudget(), ownershipBudget({ id: 'second' })] })
      ),
    /duplicate current statement ownership/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({ reviewedOwnershipBudgets: [ownershipBudget({ reviewedAt: '2026-01-01' })] })
      ),
    /historical metadata/
  );
  assert.throws(
    () => validateLayerContractSchema({ ...contract(), migrationBudgets: [] }),
    /migrationBudgets is retired/
  );
});

test('public compatibility ownership has an inclusive review lifecycle', () => {
  const imported = exactImport({
    toFile: 'esm/native/services/public_api.ts',
    importedSymbols: ['PUBLIC_API'],
  });
  const baseline = contract({
    rules: [allowRule({ maxImportCount: 0, maxValueImportCount: 0 })],
    compatibilityBudgets: [compatibilityBudget()],
  });
  const active = evaluateLayerContract(graph({ imports: [imported] }), baseline, {
    currentDate: '2026-07-20',
  });
  assert.equal(active.ok, true, JSON.stringify(active.failures));
  const future = evaluateLayerContract(graph({ imports: [imported] }), baseline, {
    currentDate: '2026-07-19',
  });
  assert.equal(
    future.failures.some(failure => failure.kind === 'compatibility-review-not-effective-yet'),
    true
  );
  const stale = evaluateLayerContract(graph({ imports: [imported] }), baseline, {
    currentDate: '2027-07-21',
  });
  assert.equal(
    stale.failures.some(failure => failure.kind === 'stale-compatibility-review'),
    true
  );
});

test('schema rejects invalid rules, dynamic allowlists, and unsafe ownership surfaces', () => {
  assert.throws(
    () => validateLayerContractSchema(contract({ rules: [allowRule(), allowRule()] })),
    /duplicate rule/
  );
  assert.throws(
    () => validateLayerContractSchema(contract({ rules: [allowRule({ maxImportCount: -1 })] })),
    /non-negative integer/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          dynamicImportAllowlist: [
            { fromFile: 'esm/entry_pro.ts', expression: 'path', reason: 'Reviewed loader.' },
          ],
        })
      ),
    /positive maxOccurrences/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          reviewedOwnershipBudgets: [
            ownershipBudget({
              statement: {
                toFile: 'esm/native/services/units.ts',
                kind: 'value',
                syntax: 'static-re-export',
                importedSymbols: ['CM_PER_METER'],
              },
            }),
          ],
        })
      ),
    /direct static import/
  );
});

test('dynamic import allowlist is exact and no-growth', () => {
  const issue = { fromFile: 'esm/entry_pro.ts', fromLayer: 'entry', expression: 'modulePath' };
  const baseline = contract({
    dynamicImportAllowlist: [
      {
        fromFile: issue.fromFile,
        expression: issue.expression,
        reason: 'Reviewed deployment loader.',
        maxOccurrences: 1,
      },
    ],
  });
  assert.equal(evaluateLayerContract(graph({ unresolvedDynamicImports: [issue] }), baseline).ok, true);
  const growth = evaluateLayerContract(
    graph({ unresolvedDynamicImports: [issue, { ...issue, line: 99 }] }),
    baseline
  );
  assert.equal(
    growth.failures.some(failure => failure.kind === 'dynamic-import-allowlist-growth'),
    true
  );
});

test('facade wildcard matching is path-segment aware', () => {
  const report = evaluateLayerContract(
    graph({
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
    }),
    contract({
      facades: [
        {
          from: 'ui',
          to: 'services',
          allowedTargets: ['esm/native/services/public/**'],
          reason: 'UI must use the public services directory.',
        },
      ],
    })
  );
  const bypasses = report.failures.filter(failure => failure.kind === 'facade-bypass');
  assert.equal(bypasses.length, 1);
  assert.equal(bypasses[0].fromFile, 'esm/native/ui/bad.ts');
});

test('proposal preserves current ownership and never raises reviewed ceilings', () => {
  const baseline = contract({ reviewedOwnershipBudgets: [ownershipBudget()] });
  const proposal = buildLayerContractProposal(
    graph({
      imports: [exactImport()],
      edges: [
        edge({
          importerCount: 2,
          importCount: 3,
          importerFiles: ['esm/native/ui/example.ts', 'esm/native/ui/new.ts'],
          valueImporterCount: 2,
          valueImportCount: 3,
          valueImporterFiles: ['esm/native/ui/example.ts', 'esm/native/ui/new.ts'],
        }),
      ],
    }),
    baseline
  );
  assert.deepEqual(proposal.contract.reviewedOwnershipBudgets, baseline.reviewedOwnershipBudgets);
  assert.equal(proposal.reviewRequired, true);
  assert.equal(proposal.contract.rules[0].maxImportCount, 1);
  assert.equal(proposal.diff.ratchetViolations.length, 1);
});

test('ratchet freshness gives clean reductions a bounded grace window', () => {
  const baseline = contract({
    ratchet: { ...RATCHET, reviewedAt: '2026-07-01' },
    rules: [
      allowRule({
        maxImporterCount: 2,
        maxImportCount: 2,
        maxValueImporterCount: 2,
        maxValueImportCount: 2,
      }),
    ],
  });
  const boundary = evaluatePendingLayerRatchetReductions(graph(), baseline, {
    currentDate: '2026-07-15',
  });
  assert.equal(boundary.ok, true);
  assert.equal(boundary.hasPendingReductions, true);
  const overdue = evaluatePendingLayerRatchetReductions(graph(), baseline, {
    currentDate: '2026-07-16',
  });
  assert.equal(overdue.ok, false);
  assert.equal(overdue.overdue, true);
});

test('proposal CLI returns complete JSON and exits nonzero on growth', () => {
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
    const baselinePath = path.join(tempRoot, 'baseline.json');
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(
        contract({
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
        })
      )
    );
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
      { cwd: repositoryRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    );
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stdout.endsWith('\n'));
    assert.equal(JSON.parse(result.stdout).reviewRequired, true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
