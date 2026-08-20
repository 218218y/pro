import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getCallFacts } from './_semantic_source_contracts.js';

const renderOps = [
  fs.readFileSync(new URL('../esm/native/builder/render_ops.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/builder/render_ops_shared.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/builder/render_ops_shared_state.ts', import.meta.url), 'utf8'),
].join('\n');

test('[render-ops-group-binding] add/traverse wrappers preserve Three receiver binding', () => {
  const applyCalls = getCallFacts(
    fs.readFileSync(new URL('../esm/native/builder/render_ops_shared_state.ts', import.meta.url), 'utf8'),
    'Reflect.apply',
    'render_ops_shared_state.ts'
  );
  assert.ok(
    applyCalls.some(
      call =>
        call.args[0]?.name === 'addMethod' &&
        call.args[1]?.name === 'groupObj' &&
        call.args[2]?.kind === 'array' &&
        call.args[2].elements?.[0]?.name === 'obj'
    )
  );
  assert.ok(
    applyCalls.some(
      call =>
        call.args[0]?.name === 'traverseMethod' &&
        call.args[1]?.name === 'traversableObj' &&
        call.args[2]?.kind === 'array' &&
        call.args[2].elements?.[0]?.name === 'fn'
    )
  );
  assert.doesNotMatch(renderOps, /const add = groupObj\?\.add;[\s\S]*=> add\(obj\)/);
  assert.doesNotMatch(renderOps, /const traverse = traversableObj\?\.traverse;[\s\S]*=> traverse\(fn\)/);
});
