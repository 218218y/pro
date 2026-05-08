import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadDoorStyleOverridesModule() {
  const file = path.join(process.cwd(), 'esm/native/features/door_style_overrides.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[door-style-overrides] tokens, map normalization, and effective style resolution stay canonical', () => {
  const mod = loadDoorStyleOverridesModule();

  assert.equal(mod.encodeDoorStyleOverridePaintToken('profile'), '__wp_door_style__:profile');
  assert.equal(mod.parseDoorStyleOverridePaintToken('__wp_door_style__:tom'), 'tom');
  assert.equal(mod.parseDoorStyleOverridePaintToken('mirror'), null);

  const map = mod.readDoorStyleMap({
    d1: 'tom',
    d1_full: 'profile',
    drawer_1: 'tom',
    bad: 'glass',
    nil: null,
  });
  assert.deepEqual(Object.keys(map).sort(), ['d1_full', 'drawer_1']);
  assert.equal(map.d1_full, 'profile');
  assert.equal(map.drawer_1, 'tom');

  assert.equal(mod.toDoorStyleOverrideMapKey('d7'), 'd7_full');
  assert.equal(mod.toDoorStyleOverrideMapKey('drawer_9'), 'drawer_9');
  assert.equal(mod.resolveDoorStyleOverrideValue({ d7_full: 'tom' }, 'd7'), 'tom');
  assert.equal(mod.resolveDoorStyleOverrideValue({ d7: 'profile' }, 'd7_top'), null);
  assert.equal(
    mod.resolveDoorStyleOverrideValue(mod.readDoorStyleMap({ d7: 'profile' }), 'd7_top'),
    'profile'
  );
  assert.equal(mod.resolveDoorStyleOverrideValue({ d7_full: 'profile' }, 'd7_top'), 'profile');
  assert.equal(mod.resolveDoorStyleOverrideValue({ d7_full: 'tom' }, 'd7_mid1'), 'tom');
  assert.equal(mod.resolveEffectiveDoorStyle('flat', { d7_full: 'profile' }, 'd7_bot'), 'profile');
  assert.equal(mod.resolveEffectiveDoorStyle('flat', { drawer_4: 'profile' }, 'drawer_4'), 'profile');
  assert.equal(mod.resolveEffectiveDoorStyle('tom', {}, 'drawer_4'), 'tom');
});
