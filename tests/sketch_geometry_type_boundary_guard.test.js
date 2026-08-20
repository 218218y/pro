import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readBuildTypesBundle } from './_build_types_bundle.js';
import {
  getInterfaceFact,
  getTypeAliasFact,
  getTypeLiteralPropertyFacts,
} from './_semantic_source_contracts.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const buildTypes = readBuildTypesBundle(import.meta.url);
const sharedTypes = read('esm/native/builder/render_interior_sketch_shared_types.ts');
const normalizer = read('esm/native/builder/render_interior_sketch_geometry_normalizer.ts');
const interiorPipeline = read('esm/native/builder/interior_pipeline_shared.ts');
const opsInput = read('esm/native/builder/render_interior_sketch_ops_input.ts');

test('[sketch-geometry-boundary] builder sketch/runtime geometry excludes draft strings', () => {
  assert.deepEqual(getTypeAliasFact(buildTypes, 'BuilderDraftScalar', 'types/build.bundle.ts'), {
    name: 'BuilderDraftScalar',
    type: 'null|number|string|undefined',
  });
  assert.deepEqual(getTypeAliasFact(buildTypes, 'BuilderPreviewScalar', 'types/build.bundle.ts'), {
    name: 'BuilderPreviewScalar',
    type: 'BuilderDraftScalar',
  });
  assert.deepEqual(getTypeAliasFact(buildTypes, 'BuilderRuntimeGeometryScalar', 'types/build.bundle.ts'), {
    name: 'BuilderRuntimeGeometryScalar',
    type: 'null|number|undefined',
  });
  assert.deepEqual(getTypeAliasFact(buildTypes, 'BuilderSketchScalar', 'types/build.bundle.ts'), {
    name: 'BuilderSketchScalar',
    type: 'BuilderRuntimeGeometryScalar',
  });

  const builderArgs = new Map(
    getInterfaceFact(buildTypes, 'BuilderInteriorSketchArgsLike', 'types/build.bundle.ts').properties.map(
      property => [property.name, property]
    )
  );
  for (const name of ['effectiveBottomY', 'innerW', 'moduleDoors']) {
    assert.deepEqual(builderArgs.get(name), {
      name,
      optional: true,
      readonly: false,
      type: 'BuilderRuntimeGeometryScalar',
    });
  }

  const renderInput = new Map(
    getTypeLiteralPropertyFacts(
      sharedTypes,
      'RenderInteriorSketchInput',
      'render_interior_sketch_shared_types.ts'
    ).map(property => [property.name, property])
  );
  for (const name of ['effectiveBottomY', 'moduleDoors']) {
    assert.deepEqual(renderInput.get(name), {
      name,
      optional: true,
      readonly: false,
      type: 'BuilderRuntimeGeometryScalar',
    });
  }
  assert.equal(
    [...renderInput.values()].some(property => property.type === 'BuilderPreviewScalar'),
    false
  );
});

test('[sketch-geometry-boundary] services normalize draft strings before sketch runtime use', () => {
  assert.match(
    normalizer,
    /normalizeBuilderRuntimeGeometryScalar\(value: unknown\): BuilderRuntimeGeometryScalar/
  );
  assert.match(
    normalizer,
    /normalizeBuilderDraftGeometryScalar\(value: unknown\): BuilderRuntimeGeometryScalar/
  );
  assert.match(
    normalizer,
    /normalizeBuilderSketchExtrasGeometry\(value: unknown\): BuilderSketchExtrasLike \| null/
  );
  assert.match(
    normalizer,
    /normalizeBuilderDraftSketchExtrasGeometry\(value: unknown\): BuilderSketchExtrasLike \| null/
  );
  assert.match(
    normalizer,
    /normalizeInteriorSketchRuntimeGeometryArgs<T extends BuilderInteriorSketchArgsLike>/
  );
  assert.match(interiorPipeline, /normalizeBuilderDraftSketchExtrasGeometry\(config\.sketchExtras\)/);
  assert.match(interiorPipeline, /readBuilderDraftGeometryNumber\(value, defaultValue\)/);
  assert.match(opsInput, /normalizeInteriorSketchRuntimeGeometryArgs\(rawInput\)/);
  assert.doesNotMatch(opsInput, /normalizeBuilderDraft/);
  assert.match(opsInput, /readBuilderRuntimeGeometryNumber\(input\.effectiveBottomY, 0\)/);
  assert.doesNotMatch(
    opsInput,
    /Number\(input\.(effectiveBottomY|effectiveTopY|innerW|woodThick|internalDepth|internalCenterX|internalZ|D|modulesLength)\s*\|\|/
  );
});
