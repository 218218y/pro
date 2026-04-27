import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('[stageAS-final] preset/stack/corner surfaces stop introducing fresh AnyRecord bags', () => {
  const moduleCfg = read('esm/native/features/stack_split/module_config.ts');
  const presets = read('esm/native/data/preset_models.ts');
  const cornerGeom = read('esm/native/builder/corner_geometry_plan.ts');
  const cornerCarcass = read('esm/native/builder/corner_wing_carcass_emit.ts');
  const cornerCarcassShared = read('esm/native/builder/corner_wing_carcass_shared.ts');
  const cornerCarcassShell = read('esm/native/builder/corner_wing_carcass_shell.ts');

  assert.match(
    moduleCfg,
    /import type \{[\s\S]*UnknownRecord,[\s\S]*\} from '\.\.\/\.\.\/\.\.\/\.\.\/types';/
  );
  assert.doesNotMatch(moduleCfg, /type AnyRecord = Record<string, unknown>/);
  assert.match(moduleCfg, /function isRecord\(v: unknown\): v is UnknownRecord/);

  assert.match(presets, /import \{[^}]*normalizeModelList[^}]*\} from '\.\/model_record_normalizer\.js';/);
  assert.match(presets, /export const PRESET_MODELS = normalizeModelList\(PRESET_MODELS_RAW\);/);
  assert.match(
    presets,
    /export \{ (?:normalizeModelRecord, normalizeModelList|normalizeModelList, normalizeModelRecord) \} from '\.\/model_record_normalizer\.js';/
  );
  assert.doesNotMatch(presets, /export default\s+/);
  assert.doesNotMatch(presets, /@typedef \{import\('\.\.\.\/types'\)\.AnyRecord\} AnyRecord/);
  assert.doesNotMatch(presets, /AnyRecord/);
  assert.doesNotMatch(presets, /services\/api\.js/);
  assert.doesNotMatch(presets, /\(App\.services as Record<string, unknown>\)\.models/);

  assert.match(cornerGeom, /export type UnknownRecord = ValueRecord;/);
  assert.doesNotMatch(cornerGeom, /export type AnyRecord = ValueRecord;/);
  assert.match(
    cornerGeom,
    /function readCornerCellInput\(cellCfg: ValueRecord \| null \| undefined\): CornerCellInputLike \| null \{/
  );
  assert.doesNotMatch(cornerGeom, /return cellCfg as CornerCellInputLike;/);

  assert.doesNotMatch(
    cornerCarcassShared,
    /import type \{ AnyRecord, CornerCell \} from '\.\/corner_geometry_plan\.js';/
  );
  assert.match(cornerCarcassShared, /__individualColors: UnknownRecord;/);
  assert.match(
    cornerCarcassShared,
    /export function cloneMaterialWithSide\([\s\S]*cloneMaybe: <T>\(value: T\) => T[\s\S]*\): unknown \{/
  );
  assert.match(cornerCarcass, /corner_wing_carcass_shared\.js/);
  assert.match(cornerCarcass, /corner_wing_carcass_shell\.js/);
  assert.doesNotMatch(
    cornerCarcass,
    /return cloned && typeof cloned === 'object' \? \{ \.\.\.\(cloned as UnknownRecord\) \} : \{\};/
  );
  assert.doesNotMatch(cornerCarcass, /const rightMatRec = __rightMat as MeshMaterialLike;/);
  assert.doesNotMatch(cornerCarcass, /const leftMatRec = __leftMat as MeshMaterialLike;/);
});
