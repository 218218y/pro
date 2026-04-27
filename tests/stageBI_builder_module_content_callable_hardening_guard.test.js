import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';
import path from 'node:path';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const root = process.cwd();

function read(rel) {
  return normalizeWhitespace(fs.readFileSync(path.join(root, rel), 'utf8'));
}

test('[stageBI] builder module/content surfaces use shared callable contracts instead of generic unknown arg bags', () => {
  const buildTypes = readBuildTypesBundle(import.meta.url);
  assert.match(buildTypes, /createDoorVisual\?: BuilderCreateDoorVisualFn;/);
  assert.match(buildTypes, /createInternalDrawerBox\?: BuilderCreateInternalDrawerBoxFn;/);
  assert.match(buildTypes, /calculateModuleStructure\?: BuilderCalculateModuleStructureFn;/);
  assert.match(buildTypes, /buildChestOnly\?: BuilderBuildChestOnlyFn;/);
  assert.match(buildTypes, /buildCornerWing\?: BuilderBuildCornerWingFn;/);
  assert.match(buildTypes, /addHangingClothes\?: BuilderAddHangingClothesFn;/);
  assert.match(buildTypes, /addFoldedClothes\?: BuilderAddFoldedClothesFn;/);
  assert.match(buildTypes, /addRealisticHanger\?: BuilderAddRealisticHangerFn;/);
  assert.doesNotMatch(
    buildTypes,
    /BuilderModulesSurfaceLike[\s\S]*createDoorVisual\?: \(\.\.\.args: unknown\[\]\) => Object3DLike;/
  );
  assert.doesNotMatch(
    buildTypes,
    /BuilderContentsSurfaceLike[\s\S]*addHangingClothes\?: \(\.\.\.args: unknown\[\]\) => unknown;/
  );
});

test('[stageBI] builder installers and resolvers bind typed module/content callables through the shared contracts', () => {
  const visuals = read('esm/native/builder/visuals_and_contents.ts');
  const deps = read('esm/native/builder/builder_deps_resolver.ts');
  assert.match(visuals, /BuilderCreateDoorVisualFn/);
  assert.match(visuals, /BuilderAddHangingClothesFn/);
  assert.match(visuals, /__bindWithApp<[\s\S]*Parameters<BuilderCreateDoorVisualFn>/);
  assert.match(deps, /bindCreateDoorVisualFn/);
  assert.match(deps, /bindAddHangingClothesFn/);
  assert.doesNotMatch(deps, /bindCallable\(modules, 'buildCornerWing'\)/);
});
