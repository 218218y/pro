import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const retiredFacadeTarget = path
  .normalize(path.join(root, 'esm/shared/wardrobe_dimension_tokens_shared.ts'))
  .toLowerCase();
const focusedOwnerFiles = Object.freeze([
  'esm/shared/dimensions/sketch_box_classic_door_visual_policy.ts',
  'esm/shared/dimensions/sketch_box_geometry_policy.ts',
  'esm/shared/dimensions/sketch_box_divider_policy.ts',
  'esm/shared/dimensions/sketch_box_dimension_overlay_policy.ts',
  'esm/shared/dimensions/sketch_box_preview_policy.ts',
  'esm/shared/dimensions/sketch_box_free_placement_policy.ts',
]);

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.')) return null;
  return path
    .normalize(path.resolve(path.dirname(fromFile), specifier))
    .replace(/\.(?:js|mjs|cjs)$/u, '.ts')
    .toLowerCase();
}

test('focused Sketch Box owner modules never depend on the retired dimension facade', () => {
  for (const relativeFile of focusedOwnerFiles) {
    const file = path.join(root, relativeFile);
    const source = fs.readFileSync(file, 'utf8');
    const analysis = analyzeModuleDependencies(file, source);
    assert.equal(
      analysis.imports.some(
        dependency => resolveModuleTarget(file, dependency.specifier) === retiredFacadeTarget
      ),
      false,
      `${relativeFile} must not import or re-export the retired dimension facade`
    );
    assert.deepEqual(analysis.unresolvedDynamicImports, []);
  }
});
