import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 48 preset models data ownership split is anchored', () => {
  const facade = read('esm/native/data/preset_models.ts');
  const dataOwner = read('esm/native/data/preset_models_data.ts');

  assert.ok(
    lineCount(facade) <= 40,
    'preset_models.ts must stay a small public data facade instead of regrowing raw preset records'
  );

  assert.match(
    facade,
    /import \{ PRESET_MODELS_RAW \} from '\.\/preset_models_data\.js';/,
    'preset models facade must import raw records from the data owner'
  );
  assert.match(
    facade,
    /export \{ PRESET_MODELS_RAW \} from '\.\/preset_models_data\.js';/,
    'preset models facade must keep the raw public export stable'
  );
  assert.match(
    facade,
    /export const PRESET_MODELS = normalizeModelList\(PRESET_MODELS_RAW\);/,
    'preset models facade must keep canonical normalization at the public boundary'
  );
  assert.doesNotMatch(facade, /id: 'model_/, 'preset models facade must not own raw preset record literals');

  assert.match(
    dataOwner,
    /export const PRESET_MODELS_RAW = \[/,
    'raw preset records must live in the preset models data owner'
  );
  assert.match(dataOwner, /model_1765891752929/, 'data owner must retain preset record content');
  assert.doesNotMatch(
    dataOwner,
    /hingeMap:\s*\{\},\s*\r?\n\s*hingeMap:/,
    'raw preset records must not contain duplicate hingeMap keys'
  );
  assert.doesNotMatch(dataOwner, /normalizeModelList/, 'data owner must not own normalization policy');
  assert.doesNotMatch(dataOwner, /export default\s+/, 'data owner must stay named-export only');
});
