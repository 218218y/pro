const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'esm/native/platform/platform_services.ts'),
  'utf8'
);

test('platform render scheduler runs the first animate kick after RAF via injected browser tasks', () => {
  assert.match(
    source,
    /function scheduleRenderKickTask\(App: AppContainer, animate: \(\) => unknown\): void/
  );
  assert.match(source, /requestIdleCallbackMaybe\(App\)/);
  assert.match(source, /getBrowserTimers\(App\)\.setTimeout\(runOnce, 0\)/);
  assert.match(
    source,
    /requestAnimationFrameFn\(function __wpKickRenderLoop\(\) \{\s*scheduleRenderKickTask\(App, animate\);/,
    'render wakeups should schedule the first animate kick after the RAF callback'
  );
});
