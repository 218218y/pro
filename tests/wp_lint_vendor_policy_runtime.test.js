import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

test('strict quality gates keep generated Three mirrors out of style checks while preserving vendor contract coverage', () => {
  const eslintConfig = read('eslint.config.js');
  const lintRunner = read('tools/wp_lint.js');
  const prettierIgnore = read('.prettierignore');
  const verifyFlow = read('tools/wp_verify_flow.js');
  const syncThree = read('tools/wp_sync_three_libs.mjs');
  const packageJson = JSON.parse(read('package.json'));

  assert.match(eslintConfig, /'tools\/three_addons\/\*\*'/);
  assert.match(prettierIgnore, /^tools\/three_addons\/$/m);
  assert.match(syncThree, /'tools\/three_addons\/OrbitControls\.js'/);
  assert.match(syncThree, /'tools\/three_addons\/RoundedBoxGeometry\.js'/);
  assert.match(verifyFlow, /args:\s*\['tools\/wp_three_vendor_contract\.js'\]/);
  assert.equal(packageJson.scripts['lint:strict'], 'node tools/wp_lint.js --profile migrate --strict');
  assert.match(lintRunner, /strict \? '0' : '999999'/);
});
