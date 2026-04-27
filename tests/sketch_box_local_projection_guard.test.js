import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const LOCAL_HELPERS = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_projection_runtime_shared.ts'
);

test('[sketch-box] local projection helper binds worldToLocal to its owning object', () => {
  const src = fs.readFileSync(LOCAL_HELPERS, 'utf8');

  assert.match(src, /function __bindNodeMethod<TArgs extends unknown\[]>\(/);
  assert.match(src, /const owner = __readMutableNodeRecord\(obj\);/);
  assert.match(src, /if \(!owner\) return null;/);
  assert.match(src, /const fn = getProp\(owner, key\);/);
  assert.match(src, /return \(\.\.\.args: TArgs\) => Reflect\.apply\(fn, owner, args\);/);
  assert.match(
    src,
    /function __getWorldToLocalFn\(obj: unknown\): __BoundObjectMethod<\[__WorldToLocalArg\]> \| null \{/
  );
  assert.match(src, /worldToLocal depend on `this`/);
  assert.match(src, /return __bindNodeMethod<\[__WorldToLocalArg\]>\(obj, 'worldToLocal'\);/);
});
