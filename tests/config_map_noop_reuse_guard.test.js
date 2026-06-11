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

test('config map actions reuse shallow-equivalent maps before committing', () => {
  const src = [
    read('esm/native/kernel/state_api_config_namespace.ts'),
    read('esm/native/kernel/state_api_config_namespace_maps.ts'),
    read('esm/native/kernel/state_api_config_namespace_shared.ts'),
  ].join('\n');
  assert.match(src, /function reuseEquivalentValue\(prev: unknown, next: unknown\): unknown/);
  assertIncludesInOrder(src, [
    'configNs.setMap = function setMap',
    'const cur = asRecord(safeCall(() => configNs.map?.(key))) || {};',
    'reuseEquivalentValue(cur, isRecord(nextMap) ? shallowCloneObj(nextMap) : {})',
    'if (Object.is(cur, nextRec)) return cur;',
    "const m = normMeta(meta, 'actions.config:setMap');",
  ]);
  assertIncludesInOrder(src, [
    'configNs.patchMap = function patchMap',
    'const cur = asRecord(safeCall(() => configNs.map?.(key))) || {};',
    'const nextRec = reuseEquivalentValue(cur, next);',
    'if (Object.is(cur, nextRec)) return cur;',
    "const m = normMeta(meta, 'actions.config:patchMap');",
  ]);
});
