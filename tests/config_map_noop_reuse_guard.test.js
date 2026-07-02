import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

function assertIncludesInOrder(src, parts) {
  let cursor = 0;
  for (const part of parts) {
    const idx = src.indexOf(part, cursor);
    assert.ok(idx >= 0, `expected to find ${part}`);
    cursor = idx + part.length;
  }
}

test('config map owner actions reuse normalized equivalent maps before committing', () => {
  const src = [
    read('esm/native/kernel/state_api_config_namespace.ts'),
    read('esm/native/kernel/state_api_config_namespace_maps.ts'),
    read('esm/native/kernel/state_api_config_namespace_shared.ts'),
  ].join('\n');
  assert.match(src, /function reuseEquivalentValue\(prev: unknown, next: unknown\): unknown/);
  assert.match(src, /delete configNs\['setMap'\]/);
  assert.match(src, /delete configNs\['patchMap'\]/);
  assert.doesNotMatch(src, /configNs\.setMap = function setMap/);
  assert.doesNotMatch(src, /configNs\.patchMap = function patchMap/);
  assertIncludesInOrder(src, [
    'const commitKnownMapSnapshot = <K extends KnownMapName>',
    'const cur = readNormalizedConfigMap(mapName);',
    'reuseEquivalentValue(cur, normalizeKnownMapSnapshot(mapName, nextMap))',
    'if (Object.is(cur, nextRec)) return cur;',
    'cfgPatchWithReplaceKeys({ [mapName]: nextRec }, { [mapName]: true })',
  ]);
});
