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
  collectStaticModuleImports,
  collectStaticModuleSpecifiers,
  evaluateLayerContract,
  layerOfRelativeFile,
  validateLayerContractSchema,
} from '../tools/wp_layer_contract_support.mjs';

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

function contract({ rules = [allowRule()], facades = [], dynamicImportAllowlist = [] } = {}) {
  return {
    version: '2.2',
    root: 'esm',
    ratchet: RATCHET,
    rules,
    facades,
    dynamicImportAllowlist,
  };
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
