import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('[corner] 0 corner doors keeps only the pentagon connector and skips the wing', () => {
  const src = read('esm/native/builder/corner_wing_extension_emit.ts');
  assert.match(src, /const\s+cornerDoorCount\s*=\s*resolveCornerWingDoorCount\(/);
  assert.match(src, /if \(!\(cornerDoorCount > 0\)\) return;/);

  const earlyReturnPos = src.indexOf('if (!(cornerDoorCount > 0)) return;');
  const legsPos = src.indexOf("if (baseType === 'legs') {");
  assert.ok(
    earlyReturnPos >= 0 && legsPos >= 0 && earlyReturnPos < legsPos,
    'expected 0-door wing guard before leg/carcass emission'
  );
});
