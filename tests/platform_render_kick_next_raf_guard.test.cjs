const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'esm/native/platform/platform_services.ts'),
  'utf8'
);

test('platform render scheduler does not defer interactive render kicks to idle work', () => {
  assert.doesNotMatch(source, /scheduleFirstRenderKick/);
  assert.doesNotMatch(source, /requestIdleCallbackMaybe/);
  assert.match(
    source,
    /requestAnimationFrameFn\(function __wpKickRenderLoop\(\) \{\s*try \{\s*animate\(\);/,
    'render wakeups should run animate directly from the next RAF callback'
  );
});
