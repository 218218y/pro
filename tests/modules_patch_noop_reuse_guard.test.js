import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

function readBundle(rels) {
  return rels.map(read).join('\n');
}

function assertIncludesInOrder(src, parts) {
  let cursor = 0;
  for (const part of parts) {
    const idx = src.indexOf(part, cursor);
    assert.ok(idx >= 0, `expected to find ${part}`);
    cursor = idx + part.length;
  }
}

function countIncludes(src, needle) {
  return src.split(needle).length - 1;
}

test('module and corner patch helpers preserve semantic no-op reuse without binding to legacy casts', () => {
  const modulesOwner = read('esm/native/features/modules_configuration/modules_config_api.ts');
  const modulesPatch = read('esm/native/features/modules_configuration/modules_config_patch.ts');
  const modulesBundle = readBundle([
    'esm/native/features/modules_configuration/modules_config_contracts.ts',
    'esm/native/features/modules_configuration/modules_config_structure.ts',
    'esm/native/features/modules_configuration/modules_config_patch.ts',
  ]);

  assert.match(modulesOwner, /from '\.\/modules_config_contracts\.js';/);
  assert.match(modulesOwner, /from '\.\/modules_config_structure\.js';/);
  assert.match(modulesOwner, /from '\.\/modules_config_patch\.js';/);
  assert.match(
    modulesPatch,
    /function (?:shallowRecordEqual|areModuleConfigValuesEqual)\(prev: unknown, next: unknown\): boolean/
  );
  assert.match(
    modulesPatch,
    /function sameModuleListRefs\(a: ModuleConfigLike\[], b: ModuleConfigLike\[]\): boolean/
  );
  assert.match(modulesPatch, /function isDenseRecordList\(v: unknown\): v is ModuleConfigLike\[] \{/);
  assert.match(
    modulesPatch,
    /return (?:shallowRecordEqual|areModuleConfigValuesEqual)\(prevRec, base\) \? baseIn? : base;/
  );
  assertIncludesInOrder(modulesPatch, [
    'Object.is(nextVal, prevVal)',
    'isDenseRecordList(prevVal)',
    'sanitizeModulesConfigurationListForPatch(bucket, nextVal, prevVal, options)',
  ]);
  assertIncludesInOrder(modulesPatch, [
    'const rawNextItem = applyModuleRecordPatch(prevItem, patch);',
    'const normalizedNextItem = normalizePatchedModuleItem(bucket, rawNextItem, i, options);',
    'const nextItem =',
    'if (Object.is(prevItem, nextItem) && out.length === cur.length) return cur;',
    'return sameModuleListRefs(cur, out) ? cur : out;',
  ]);
  assert.ok(
    countIncludes(modulesBundle, 'resolveTopModuleDoorsForIndex(') >= 2,
    'expected modules structure/patch family to share the canonical doors seam'
  );

  const cornerOwner = read('esm/native/features/modules_configuration/corner_cells_api.ts');
  const cornerPatch = read('esm/native/features/modules_configuration/corner_cells_patch.ts');
  const cornerSnapshot = read('esm/native/features/modules_configuration/corner_cells_snapshot.ts');
  const cornerSnapshotStack = read(
    'esm/native/features/modules_configuration/corner_cells_snapshot_stack.ts'
  );
  assert.match(cornerOwner, /from '\.\/corner_cells_patch\.js';/);
  assert.match(cornerOwner, /from '\.\/corner_cells_snapshot\.js';/);

  assert.match(cornerPatch, /function shallowCornerRecordEqual\(prev: unknown, next: unknown\): boolean/);
  assert.match(cornerPatch, /function sameCornerListRefs<T>\(a: T\[], b: T\[]\): boolean/);
  assert.match(
    cornerPatch,
    /function isDenseRecordList<T extends UnknownRecord = UnknownRecord>\(v: unknown\): v is T\[] \{/
  );
  assert.match(cornerPatch, /if \(shallowCornerRecordEqual\(prevCell, cell\)\) return prevCell;/);
  assertIncludesInOrder(cornerPatch, [
    'Object.is(nextVal, prevVal)',
    'isDenseRecordList<CornerCellConfigLike>(prevVal)',
    'sanitizeCornerCellListForPatch(nextVal, prevVal)',
  ]);
  assert.match(
    cornerPatch,
    /function normalizeLowerModuleConfigForPatch\(src: unknown, i: number\): ModuleConfigLike/
  );
  assertIncludesInOrder(cornerPatch, [
    'const rawNextItem = applyCornerCellPatch(prevItem, patch);',
    'const normalizedNextItem = normalizeLowerModuleConfigForPatch(rawNextItem, i);',
    'const nextItem =',
    'if (Object.is(prevItem, nextItem) && out.length === cur.length) return cur;',
    'return sameCornerListRefs(cur, out) ? cur : out;',
  ]);

  assert.match(cornerSnapshot, /corner_cells_snapshot_stack\.js/);
  assert.match(
    cornerSnapshotStack,
    /function applyCornerConfigurationPatch<T extends UnknownRecord>\(base: T, patch: unknown\): T/
  );
  assert.match(
    cornerSnapshotStack,
    /return shallowRecordEqual\(base, target\) \? base : (?:\(target as T\)|Object\.assign\(\{\}, base, target\));/
  );
  assert.ok(
    countIncludes(cornerSnapshotStack, 'shallowCornerConfigurationRefsEqual(base, sanitized)') >= 2,
    'expected corner configuration sanitizers to reuse base refs when sanitized output is semantically unchanged'
  );
});
