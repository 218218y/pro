const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test('setDoorsOpen wakes the render loop even when the requested state is already current', () => {
  const lifecycle = [
    read('esm/native/services/doors_runtime_lifecycle.ts'),
    read('esm/native/services/doors_runtime_lifecycle_global.ts'),
  ].join('\n');

  assert.match(lifecycle, /if \(current === next && !forceUpdate\) \{/);
  assert.match(lifecycle, /touchDoorsRuntimeRender\(App\);\s+return;/);
  assert.match(lifecycle, /setDoorStatusCss\(App, next\);\s+touchDoorsRuntimeRender\(App\);/);
  assert.doesNotMatch(lifecycle, /setDoorStatusCss\(App, next\);\s+triggerDoorsRuntimeRender\(App, true\);/);
});
