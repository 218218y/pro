import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const analyze = rel => analyzeModuleDependencies(path.join(root, rel), read(rel));

const planners = Object.freeze([
  'esm/native/builder/corner_wing_cornice_path.ts',
  'esm/native/builder/corner_wing_cornice_plan.ts',
  'esm/native/builder/corner_cornice_profile_plan.ts',
]);
const renderers = Object.freeze([
  'esm/native/builder/corner_wing_cornice_profile.ts',
  'esm/native/builder/corner_wing_cornice_wave.ts',
  'esm/native/builder/corner_cornice_render.ts',
]);

function sharedDimensionImports(rel) {
  return analyze(rel)
    .imports.filter(dependency => dependency.specifier.includes('../../shared/dimensions/'))
    .map(dependency => dependency.specifier)
    .sort();
}

test('Corner Wing Cornice keeps dimension policy ownership in deterministic planners, not flow wrappers', () => {
  assert.deepEqual(sharedDimensionImports(planners[0]), [
    '../../shared/dimensions/carcass_cornice_render_policy.js',
    '../../shared/dimensions/carcass_shell_policy.js',
  ]);
  assert.deepEqual(sharedDimensionImports(planners[1]), [
    '../../shared/dimensions/carcass_cornice_render_policy.js',
    '../../shared/dimensions/carcass_shell_policy.js',
  ]);
  assert.deepEqual(sharedDimensionImports(planners[2]), [
    '../../shared/dimensions/carcass_cornice_render_policy.js',
  ]);

  assert.deepEqual(sharedDimensionImports(renderers[0]), []);
  assert.deepEqual(sharedDimensionImports(renderers[1]), []);
  assert.deepEqual(sharedDimensionImports(renderers[2]), [
    '../../shared/dimensions/carcass_cornice_render_policy.js',
  ]);
});

test('Corner Wing Cornice planners stay plan-first and do not create Three.js objects', () => {
  for (const rel of planners) {
    const source = read(rel);
    const analysis = analyze(rel);
    assert.deepEqual(analysis.unresolvedDynamicImports, [], rel);
    assert.deepEqual(analysis.forbiddenModuleSyntax, [], rel);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u, rel);
    assert.doesNotMatch(
      source,
      /\bnew\s+THREE\b|\.Mesh\s*\(|\.Shape\s*\(|\.ExtrudeGeometry\s*\(|\.BoxGeometry\s*\(/u,
      rel
    );
  }

  const planSource = read('esm/native/builder/corner_wing_cornice_plan.ts');
  assert.match(planSource, /buildCornerWingProfileCornicePlan/);
  assert.match(planSource, /buildCornerWingWaveCornicePlan/);
  assert.match(planSource, /kind: 'corner_cornice', owner: 'wing', mode: 'profile'/);
  assert.match(planSource, /kind: 'corner_cornice', owner: 'wing', mode: 'wave'/);
});

test('Corner Wing Cornice flow wrappers route one typed plan through the canonical renderer', () => {
  const profile = read('esm/native/builder/corner_wing_cornice_profile.ts');
  const wave = read('esm/native/builder/corner_wing_cornice_wave.ts');
  const renderer = read('esm/native/builder/corner_cornice_render.ts');

  assert.match(profile, /buildCornerWingProfileCornicePlan\(ctx, locals\)/);
  assert.match(profile, /renderCornerCornicePlan\(plan,/);
  assert.match(wave, /buildCornerWingWaveCornicePlan\(ctx, locals\)/);
  assert.match(wave, /renderCornerCornicePlan\(plan,/);
  assert.doesNotMatch(profile, /CARCASS_CORNICE_RENDER_POLICY|CARCASS_SHELL_DIMENSIONS/);
  assert.doesNotMatch(wave, /CARCASS_CORNICE_RENDER_POLICY|CARCASS_SHELL_DIMENSIONS/);

  assert.match(renderer, /isCornerCornicePlan\(plan\)/);
  assert.match(renderer, /op\.kind === 'corner_profile'/);
  assert.match(renderer, /op\.kind === 'corner_wave'/);
  assert.match(renderer, /new three\.BoxGeometry\(op\.width, op\.height, op\.depth\)/);
});
