import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectProductionEmptyCatchInventory,
  countEmptyCatchesInSource,
  runSilentCatchPolicyAudit,
} from '../tools/wp_silent_catch_policy_audit.mjs';

test('silent-catch policy recognizes AST-level statement-free and bare catch bodies', () => {
  const source = `
    const misleadingText = "catch (error) {}";
    try { work(); } catch {}
    try { work(); } catch (error) { /* documented cleanup without a statement */ }
    try { work(); } catch (error) { report(error); }
    try { work(); } catch (error) { void error; }
  `;
  assert.deepEqual(countEmptyCatchesInSource(source, 'fixture.ts'), {
    statementFree: 2,
    bare: 1,
  });
});

test('silent-catch policy fails closed on invalid source', () => {
  assert.throws(() => countEmptyCatchesInSource('try {', 'broken.ts'), /broken\.ts: AST parse failed/);
});

test('silent-catch policy keeps current production ratchets exact and functional owners observable', () => {
  const result = runSilentCatchPolicyAudit(process.cwd());
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
  assert.equal(result.inventory.statementFreeTotal, 762);
  assert.equal(result.inventory.bareTotal, 99);
  assert.equal(result.inventory.entries.length, 337);
  assert.equal(result.inventory.bareFileCount, 38);

  const inventory = collectProductionEmptyCatchInventory(process.cwd());
  const paths = new Set(inventory.entries.map(entry => entry.file));
  assert.equal(paths.has('esm/native/services/boot_finalizers.ts'), false);
  assert.equal(paths.has('esm/native/services/history_runtime.ts'), false);
});
