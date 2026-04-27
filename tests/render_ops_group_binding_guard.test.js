import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderOps = [
  fs.readFileSync(new URL('../esm/native/builder/render_ops.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/builder/render_ops_shared.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/builder/render_ops_shared_state.ts', import.meta.url), 'utf8'),
].join('\n');

test('[render-ops-group-binding] add/traverse wrappers preserve Three receiver binding', () => {
  assert.match(
    renderOps,
    /const addMethod = (?:groupObj\.add as BoundUnknownMethod<\[obj: unknown\]>|groupObj \? Reflect\.get\(groupObj, 'add'\) : null);[\s\S]*Reflect\.apply\(addMethod, groupObj, \[obj\]\)/
  );
  assert.match(
    renderOps,
    /const traverseMethod = (?:traversableObj\.traverse as BoundUnknownMethod<\[\(value: unknown\) => void\], void>|traversableObj \? Reflect\.get\(traversableObj, 'traverse'\) : null);[\s\S]*Reflect\.apply\(traverseMethod, traversableObj, \[fn\]\)/
  );
  assert.doesNotMatch(renderOps, /const add = groupObj\?\.add;[\s\S]*=> add\(obj\)/);
  assert.doesNotMatch(renderOps, /const traverse = traversableObj\?\.traverse;[\s\S]*=> traverse\(fn\)/);
});
