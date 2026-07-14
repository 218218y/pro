import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLayerContractProposal,
  collectStaticModuleSpecifiers,
  evaluateLayerContract,
} from '../tools/wp_layer_contract_support.mjs';

test('layer contract parser reads syntax nodes rather than source-looking strings', () => {
  const specifiers = collectStaticModuleSpecifiers(
    'fixture.ts',
    `
      const fake = "import '../runtime/not-real.js'";
      // export * from '../services/not-real.js';
      import {
        service
      } from '../services/api.js';
      export { state } from '../kernel/api.js';
      const lazy = import('../runtime/lazy.js');
    `
  );

  assert.deepEqual(
    specifiers.sort(),
    ['../kernel/api.js', '../runtime/lazy.js', '../services/api.js'].sort()
  );
});

test('layer contract rejects denied edges, consumer growth, stale rules, and facade bypasses', () => {
  const graph = {
    edges: [
      { from: 'ui', to: 'runtime', importerCount: 1, importCount: 1 },
      { from: 'ui', to: 'services', importerCount: 2, importCount: 2 },
    ],
    imports: [
      {
        from: 'ui',
        to: 'services',
        fromFile: 'esm/native/ui/example.ts',
        toFile: 'esm/native/services/private_owner.ts',
        specifier: '../services/private_owner.js',
      },
    ],
  };
  const contract = {
    version: 2,
    rules: [
      { from: 'ui', to: 'services', maxImporters: 1, reason: 'UI uses the public facade.' },
      { from: 'services', to: 'io', maxImporters: 1, reason: 'Stale test rule.' },
    ],
    facades: [
      {
        from: 'ui',
        to: 'services',
        allowedTargets: ['esm/native/services/api.ts'],
        reason: 'UI must use services/api.',
      },
    ],
  };

  const report = evaluateLayerContract(graph, contract);
  assert.equal(report.ok, false);
  assert.deepEqual(
    new Set(report.failures.map(failure => failure.kind)),
    new Set(['denied-edge', 'consumer-growth', 'stale-edge', 'facade-bypass'])
  );
});

test('layer contract proposal uses current importer counts as reviewable budgets', () => {
  assert.deepEqual(
    buildLayerContractProposal({
      edges: [{ from: 'ui', to: 'services', importerCount: 4, importCount: 6 }],
    }),
    {
      version: 2,
      root: 'esm',
      rules: [
        {
          from: 'ui',
          to: 'services',
          maxImporters: 4,
          reason: 'REVIEW REQUIRED',
        },
      ],
      facades: [],
    }
  );
});
