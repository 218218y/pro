import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditLintArchitectureSource,
  collectLintArchitectureViolations,
  getLintArchitectureBaselineCount,
} from '../tools/wp_lint_architecture_contracts.mjs';

test('lint architecture contracts block new restricted imports, globals, and App bag access', () => {
  const source = `
    import { read } from '../kernel/api.js';
    export function run(App) {
      window.alert('x');
      const { cache } = App;
      return App.maps || cache || read;
    }
  `;
  const failures = auditLintArchitectureSource('esm/native/ui/bad_contract_fixture.ts', source);
  assert.deepEqual(
    failures.map(failure => failure.rule),
    [
      'lint-architecture/no-restricted-imports:layer-boundary',
      'lint-architecture/no-restricted-globals',
      'lint-architecture/no-restricted-syntax:app-bag',
      'lint-architecture/no-restricted-syntax:app-bag',
    ]
  );
});

test('lint architecture contract has no unbaselined violations in the current tree', () => {
  assert.equal(collectLintArchitectureViolations().length, 0);
  assert.ok(getLintArchitectureBaselineCount() > 0);
});
