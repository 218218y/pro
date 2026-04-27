import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('sketch verify split keeps stable group scripts', () => {
  const scripts = pkg.scripts;
  assert.equal(scripts['test:sketch-surfaces'], 'node tools/wp_verify_sketch_surfaces.cjs');
  const groupScripts = [
    'test:sketch-surfaces:manual-hover',
    'test:sketch-surfaces:box-hover',
    'test:sketch-surfaces:free-boxes',
    'test:sketch-surfaces:render-visuals',
  ];
  for (const key of groupScripts) {
    assert.equal(typeof scripts[key], 'string');
    assert.match(scripts[key], /wp_run_tsx_tests\.mjs/);
  }
});
