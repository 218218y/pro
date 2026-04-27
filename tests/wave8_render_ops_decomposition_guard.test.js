import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const renderOps = read('esm/native/builder/render_ops.ts');
const sketchOps = read('esm/native/builder/render_interior_sketch_ops.ts');
const carcassOps = read('esm/native/builder/render_carcass_ops.ts');
const audit = read('docs/layering_completion_audit.md');

test('[wave8] render_ops extracts sketch extras and carcass flows into focused helper modules', () => {
  assert.match(
    renderOps,
    /import \{ createBuilderRenderInteriorSketchOps \} from '\.\/render_interior_sketch_ops\.js';/
  );
  assert.match(renderOps, /import \{ createBuilderRenderCarcassOps \} from '\.\/render_carcass_ops\.js';/);
  assert.match(renderOps, /const __interiorSketchOps = createBuilderRenderInteriorSketchOps\(\{/);
  assert.match(renderOps, /const __carcassOps = createBuilderRenderCarcassOps\(\{/);
  assert.match(
    renderOps,
    /export const applyInteriorSketchExtras = __interiorSketchOps\.applyInteriorSketchExtras;/
  );
  assert.match(renderOps, /export const applyCarcassOps = __carcassOps\.applyCarcassOps;/);
  assert.doesNotMatch(renderOps, /export function applyInteriorSketchExtras\(/);
  assert.doesNotMatch(renderOps, /export function applyCarcassOps\(/);

  assert.match(
    sketchOps,
    /export function createBuilderRenderInteriorSketchOps\(deps: RenderInteriorSketchOpsDeps\)/
  );
  assert.match(sketchOps, /function applyInteriorSketchExtras\(args: unknown\)/);
  assert.match(sketchOps, /return \{[\s\S]*applyInteriorSketchExtras,[\s\S]*\};/);

  assert.match(carcassOps, /export function createBuilderRenderCarcassOps\(deps: RenderCarcassOpsDeps\)/);
  assert.match(carcassOps, /function applyCarcassOps\(opsIn: unknown, ctxIn: unknown\)/);
  assert.match(carcassOps, /return \{[\s\S]*applyCarcassOps,[\s\S]*\};/);

  assert.ok(audit.includes('`render_ops.ts` sketch extras + carcass flows extracted into helper modules'));
});
