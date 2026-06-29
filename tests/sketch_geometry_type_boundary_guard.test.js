import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const buildTypes = readBuildTypesBundle(import.meta.url);
const sharedTypes = read('esm/native/builder/render_interior_sketch_shared_types.ts');
const normalizer = read('esm/native/builder/render_interior_sketch_geometry_normalizer.ts');
const interiorPipeline = read('esm/native/builder/interior_pipeline_shared.ts');
const opsInput = read('esm/native/builder/render_interior_sketch_ops_input.ts');

test('[sketch-geometry-boundary] builder sketch/runtime geometry excludes draft strings', () => {
  assert.match(buildTypes, /export type BuilderDraftScalar = number \| string \| null \| undefined;/);
  assert.match(buildTypes, /export type BuilderPreviewScalar = BuilderDraftScalar;/);
  assert.match(buildTypes, /export type BuilderRuntimeGeometryScalar = number \| null \| undefined;/);
  assert.match(buildTypes, /export type BuilderSketchScalar = BuilderRuntimeGeometryScalar;/);
  assert.doesNotMatch(buildTypes, /export type BuilderSketchScalar = BuilderPreviewScalar;/);

  assert.match(buildTypes, /effectiveBottomY\?: BuilderRuntimeGeometryScalar;/);
  assert.match(buildTypes, /innerW\?: BuilderRuntimeGeometryScalar;/);
  assert.match(buildTypes, /moduleDoors\?: BuilderRuntimeGeometryScalar;/);
  assert.match(sharedTypes, /effectiveBottomY\?: BuilderRuntimeGeometryScalar;/);
  assert.match(sharedTypes, /moduleDoors\?: BuilderRuntimeGeometryScalar;/);
  assert.doesNotMatch(sharedTypes, /BuilderPreviewScalar/);
});

test('[sketch-geometry-boundary] services normalize draft strings before sketch runtime use', () => {
  assert.match(
    normalizer,
    /normalizeBuilderRuntimeGeometryScalar\(value: unknown\): BuilderRuntimeGeometryScalar/
  );
  assert.match(
    normalizer,
    /normalizeBuilderSketchExtrasGeometry\(value: unknown\): BuilderSketchExtrasLike \| null/
  );
  assert.match(
    normalizer,
    /normalizeInteriorSketchRuntimeGeometryArgs<T extends BuilderInteriorSketchArgsLike>/
  );
  assert.match(interiorPipeline, /normalizeBuilderSketchExtrasGeometry\(config\.sketchExtras\)/);
  assert.match(interiorPipeline, /readBuilderRuntimeGeometryNumber\(value, defaultValue\)/);
  assert.match(opsInput, /normalizeInteriorSketchRuntimeGeometryArgs\(rawInput\)/);
  assert.match(opsInput, /readBuilderRuntimeGeometryNumber\(input\.effectiveBottomY, 0\)/);
  assert.doesNotMatch(
    opsInput,
    /Number\(input\.(effectiveBottomY|effectiveTopY|innerW|woodThick|internalDepth|internalCenterX|internalZ|D|modulesLength)\s*\|\|/
  );
});
