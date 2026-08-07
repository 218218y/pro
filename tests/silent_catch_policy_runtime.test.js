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
    try { work(); } catch (error) { /* ignore */ }
    try { work(); } catch (error) { report(error); }
    try { work(); } catch (error) { void error; }
  `;
  assert.deepEqual(countEmptyCatchesInSource(source, 'fixture.ts'), {
    statementFree: 3,
    bare: 1,
    vague: 1,
  });
});

test('silent-catch policy fails closed on invalid source', () => {
  assert.throws(() => countEmptyCatchesInSource('try {', 'broken.ts'), /broken\.ts: AST parse failed/);
});

test('silent-catch policy keeps current production ratchets exact and functional owners observable', () => {
  const result = runSilentCatchPolicyAudit(process.cwd());
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
  const statementFreeTotalFromLayers = Object.values(result.inventory.statementFreeByLayer).reduce(
    (total, count) => total + count,
    0
  );
  const bareTotalFromLayers = Object.values(result.inventory.bareByLayer).reduce(
    (total, count) => total + count,
    0
  );
  const vagueTotalFromLayers = Object.values(result.inventory.vagueByLayer).reduce(
    (total, count) => total + count,
    0
  );
  const bareFileCountFromEntries = result.inventory.entries.filter(entry => entry.bare > 0).length;

  assert.equal(result.inventory.statementFreeTotal, statementFreeTotalFromLayers);
  assert.equal(result.inventory.bareTotal, bareTotalFromLayers);
  assert.equal(result.inventory.bareTotal, 0, 'production must not contain undocumented bare catches');
  assert.equal(result.inventory.bareFileCount, bareFileCountFromEntries);
  assert.equal(result.inventory.bareFileCount, 0);
  assert.equal(result.inventory.vagueTotal, vagueTotalFromLayers);
  for (const layer of ['builder', 'features', 'kernel', 'services']) {
    assert.equal(
      result.inventory.vagueByLayer[layer] || 0,
      0,
      `${layer} must remain free of vague ignore/swallow catch classifications`
    );
  }
  assert.equal(
    result.inventory.entries.every(entry => entry.statementFree > 0),
    true
  );

  const inventory = collectProductionEmptyCatchInventory(process.cwd());
  const paths = new Set(inventory.entries.map(entry => entry.file));
  for (const file of [
    'esm/native/services/boot_finalizers.ts',
    'esm/native/services/boot_seeds_part02_colors.ts',
    'esm/native/services/boot_seeds_part02_flags.ts',
    'esm/native/services/boot_seeds_part02_runtime.ts',
    'esm/native/services/history_runtime.ts',
    'esm/native/services/history_schedule.ts',
    'esm/native/services/history_shared.ts',
    'esm/native/runtime/render_access_state_runtime.ts',
    'esm/native/runtime/render_access_surface.ts',
    'esm/native/ui/react/actions/interior_actions.ts',
  ]) {
    assert.equal(paths.has(file), false, `${file} must remain free of statement-free catches`);
  }
});
