import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readBuildTypesBundle } from './_build_types_bundle.js';

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

test('P1: no legacy forceUpdateDoors render-ops hooks remain', () => {
  const root = path.resolve(process.cwd());

  const files = [
    'esm/native/ui/export_canvas.ts',
    'esm/native/builder/post_build_extras_pipeline.ts',
    'esm/native/builder/render_ops_extras.ts',
    'esm/native/services/doors_runtime.ts',
    'esm/native/builder/builder_deps_resolver.ts',
    'esm/native/builder/build_wardrobe_flow.ts',
    'esm/native/builder/bootstrap.ts',
  ].map(f => path.join(root, f));

  const buildTypes = readBuildTypesBundle(import.meta.url);
  assert.equal(
    buildTypes.includes('forceUpdateDoors'),
    false,
    'Unexpected forceUpdateDoors reference in build type bundle'
  );
  assert.equal(
    buildTypes.includes('__forceUpdateDoorsImpl'),
    false,
    'Unexpected __forceUpdateDoorsImpl reference in build type bundle'
  );
  assert.equal(
    buildTypes.includes('.forceUpdateDoors'),
    false,
    'Unexpected .forceUpdateDoors access in build type bundle'
  );

  for (const f of files) {
    const s = read(f);
    assert.equal(s.includes('forceUpdateDoors'), false, `Unexpected forceUpdateDoors reference in ${f}`);
    assert.equal(
      s.includes('__forceUpdateDoorsImpl'),
      false,
      `Unexpected __forceUpdateDoorsImpl reference in ${f}`
    );
    assert.equal(s.includes('.forceUpdateDoors'), false, `Unexpected .forceUpdateDoors access in ${f}`);
  }
});
