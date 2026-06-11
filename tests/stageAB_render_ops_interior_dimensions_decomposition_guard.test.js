import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const renderOps = read('esm/native/builder/render_ops.ts');
const dimensionOps = read('esm/native/builder/render_dimension_ops.ts');
const interiorOps = read('esm/native/builder/render_interior_ops.ts');
const interiorOpsBundle = [
  'esm/native/builder/render_interior_ops.ts',
  'esm/native/builder/render_interior_preset_ops.ts',
  'esm/native/builder/render_interior_custom_ops.ts',
  'esm/native/builder/render_interior_rod_ops.ts',
]
  .map(read)
  .join('\n\n');
const audit = read('docs/layering_completion_audit.md');

test('[stageAB] render_ops extracts dimensions + interior flows into focused helper modules', () => {
  assert.match(
    renderOps,
    /import \{ createBuilderRenderDimensionOps \} from '\.\/render_dimension_ops\.js';/
  );
  assert.match(renderOps, /import \{ createBuilderRenderInteriorOps \} from '\.\/render_interior_ops\.js';/);
  assert.match(renderOps, /const __dimensionOps = createBuilderRenderDimensionOps\(\{/);
  assert.match(renderOps, /const __interiorOps = createBuilderRenderInteriorOps\(\{/);

  assert.match(renderOps, /export const applyDimensions = __dimensionOps\.applyDimensions;/);
  assert.match(renderOps, /export const applyInteriorPresetOps = __interiorOps\.applyInteriorPresetOps;/);
  assert.match(renderOps, /export const applyInteriorCustomOps = __interiorOps\.applyInteriorCustomOps;/);
  assert.match(renderOps, /export const createRodWithContents = __interiorOps\.createRodWithContents;/);

  assert.doesNotMatch(renderOps, /export function applyDimensions\(/);
  assert.doesNotMatch(renderOps, /export function applyInteriorPresetOps\(/);
  assert.doesNotMatch(renderOps, /export function applyInteriorCustomOps\(/);
  assert.doesNotMatch(renderOps, /export function createRodWithContents\(/);

  assert.match(
    dimensionOps,
    /export function createBuilderRenderDimensionOps\(deps: RenderDimensionOpsDeps\)/
  );
  assert.match(dimensionOps, /function applyDimensions\(argsIn: unknown\)/);
  assert.match(dimensionOps, /return \{[\s\S]*applyDimensions,[\s\S]*\};/);

  assert.match(interiorOps, /export function createBuilderRenderInteriorOps\(deps: RenderInteriorOpsDeps\)/);
  assert.match(interiorOps, /createBuilderRenderInteriorPresetOps\(deps\)/);
  assert.match(interiorOps, /createBuilderRenderInteriorCustomOps\(deps\)/);
  assert.match(interiorOps, /createBuilderRenderInteriorRodOps\(deps\)/);
  assert.match(interiorOpsBundle, /function applyInteriorPresetOps\(args: unknown\)/);
  assert.match(interiorOpsBundle, /function applyInteriorCustomOps\(args: unknown\)/);
  assert.match(interiorOpsBundle, /function createRodWithContents\(args:/);

  assert.ok(
    audit.includes('`render_ops.ts` dimensions + interior preset/custom/rod flows now live in helper modules')
  );
});
