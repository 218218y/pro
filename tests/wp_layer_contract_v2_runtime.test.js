import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLayerContractProposal,
  collectStaticModuleImports,
  collectStaticModuleSpecifiers,
  evaluateLayerContract,
  validateLayerContractSchema,
} from '../tools/wp_layer_contract_support.mjs';

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

function contract({ rules = [allowRule()], facades = [] } = {}) {
  return { version: '2.1', root: 'esm', rules, facades };
}

test('layer contract parser reads AST imports and classifies type, value, and dynamic dependencies', () => {
  const source = `
    const fake = "import '../runtime/not-real.js'";
    // export * from '../services/not-real.js';
    import type { ServiceContract } from '../services/types.js';
    import { type Options, createService } from '../services/api.js';
    export type { KernelState } from '../kernel/api.js';
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
    { specifier: '../runtime/lazy.js', kind: 'dynamic' },
  ]);
  assert.deepEqual(
    collectStaticModuleSpecifiers('fixture.ts', source).sort(),
    ['../kernel/api.js', '../runtime/lazy.js', '../services/api.js', '../services/types.js'].sort()
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
});

test('layer contract proposal preserves reviewed facades and reports edge and budget changes', () => {
  const facade = {
    from: 'ui',
    to: 'services',
    allowedTargets: ['esm/native/services/api.ts'],
    reason: 'UI must use services/api.',
  };
  const current = contract({ facades: [facade] });
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
  assert.equal(proposal.contract.rules[0].reason, allowRule().reason);
  assert.deepEqual(proposal.diff.addedEdges, []);
  assert.deepEqual(proposal.diff.removedEdges, []);
  assert.deepEqual(
    proposal.diff.budgetChanges[0].changes.map(change => change.field),
    ['maxImporterCount', 'maxImportCount', 'maxValueImporterCount', 'maxValueImportCount']
  );
});
