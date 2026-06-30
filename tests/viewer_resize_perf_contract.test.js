import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'esm/native/ui/interactions/viewer_resize.ts'),
  'utf8'
);

test('viewer resize coalesces resize work, skips unchanged canvas sizes, and cancels queued frames on cleanup', () => {
  assert.match(SOURCE, /let lastAppliedSize: ViewerSize \| null = null;/);
  assert.match(SOURCE, /isSameSize\(size, lastAppliedSize\)/);
  assert.match(SOURCE, /readResizeObserverSize\(entries, container\)/);
  assert.match(SOURCE, /const scheduleFromWindowResize = \(\) => schedule\(\);/);
  assert.match(SOURCE, /cancelAnimationFrameMaybe/);
  assert.match(SOURCE, /cancelQueuedFrame\(\);[\s\S]*ro\.disconnect\(\)/);
  assert.match(SOURCE, /if \(disposed\) return;[\s\S]*apply/);
});
