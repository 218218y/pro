import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const runtimeRoots = ['esm/native/builder', 'esm/native/services', 'esm/native/runtime', 'types'];
const runtimeGeometryScalarKeys = [
  'baseLegPlatformSideOverhangCm',
  'baseLegPlatformFrontOverhangCm',
  'stackSplitDecorativeSeparatorSideOverhangCm',
  'stackSplitDecorativeSeparatorFrontOverhangCm',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
  'chestCommodeMirrorHeightCm',
  'chestCommodeMirrorWidthCm',
  'cornerWidth',
  'cornerDoors',
  'cornerDoorCount',
  'cornerDoorsCount',
  'cornerHeight',
  'cornerHeightCm',
  'cornerDepth',
  'cornerDepthCm',
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(abs);
    } else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) {
      yield abs;
    }
  }
}

test('[scalar-geometry-type-hardening] builder/runtime scalar geometry contracts stay numeric', () => {
  const keyPattern = runtimeGeometryScalarKeys.join('|');
  const broadStringUnion = new RegExp(
    `\\b(?:${keyPattern})\\??\\s*:\\s*(?:number\\s*\\|\\s*string|string\\s*\\|\\s*number)`,
    'g'
  );
  const violations = [];
  for (const runtimeRoot of runtimeRoots) {
    for (const abs of walk(path.join(root, runtimeRoot))) {
      const source = fs.readFileSync(abs, 'utf8');
      broadStringUnion.lastIndex = 0;
      const matches = [...source.matchAll(broadStringUnion)];
      if (matches.length) {
        violations.push(`${path.relative(root, abs).replace(/\\/g, '/')}: ${matches.length}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test('[scalar-geometry-type-hardening] chest-mode UI pickup parses draft strings before builder runtime', () => {
  const pickup = read('esm/native/builder/build_wardrobe_flow_context_ui.ts');
  const pipeline = read('esm/native/builder/chest_mode_pipeline.ts');

  assert.match(pickup, /function readFiniteNumericDraft\(value: unknown\): number \| undefined/);
  assert.match(pickup, /out\.baseLegPlatformSideOverhangCm = normalizeBaseLegPlatformSideOverhangCm/);
  assert.match(pickup, /out\.basePlinthHeightCm = normalizeBasePlinthHeightCm/);
  assert.match(pickup, /out\.baseLegWidthCm = normalizeBaseLegWidthCm/);
  assert.match(pickup, /readFiniteNumericDraft\(raw\?\.chestCommodeMirrorHeightCm\)/);

  assert.match(pipeline, /widthCm\?: number;/);
  assert.match(pipeline, /drawersCount\?: number;/);
  assert.match(pipeline, /baseLegPlatformSideOverhangCm: number;/);
  assert.match(pipeline, /chestCommodeMirrorHeightCm: number;/);
  assert.doesNotMatch(pipeline, /number\s*\|\s*string|string\s*\|\s*number/);
});

test('[scalar-geometry-type-hardening] saved project schema rejects numeric strings for base geometry settings', () => {
  const schema = read('esm/native/io/project_schema_validation.ts');
  for (const key of [
    'baseLegPlatformSideOverhangCm',
    'baseLegPlatformFrontOverhangCm',
    'stackSplitDecorativeSeparatorSideOverhangCm',
    'stackSplitDecorativeSeparatorFrontOverhangCm',
    'basePlinthHeightCm',
    'baseLegHeightCm',
    'baseLegWidthCm',
  ]) {
    assert.match(schema, new RegExp(`'${key}'`));
  }
});
