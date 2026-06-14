import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const doorAuthoringMeta = read('esm/native/services/canvas_picking_door_authoring_meta.ts');
const doorEditShared = read('esm/native/services/canvas_picking_door_edit_shared.ts');
const doorHingeGroove = read('esm/native/services/canvas_picking_door_hinge_groove_click.ts');
const doorRemove = read('esm/native/services/canvas_picking_door_remove_click.ts');
const doorSplitShared = read('esm/native/services/canvas_picking_door_split_click_shared.ts');
const doorSplitCustom = read('esm/native/services/canvas_picking_door_split_click_custom.ts');
const doorSplitToggle = read('esm/native/services/canvas_picking_door_split_click_toggle.ts');
const doorTrim = read('esm/native/services/canvas_picking_door_trim_click.ts');
const removablePartRemove = read('esm/native/services/canvas_picking_removable_part_remove_click.ts');

test('canvas picking door-authoring writes use one immediate structural meta owner', () => {
  assert.match(
    doorAuthoringMeta,
    /export function createCanvasPickingDoorAuthoringStructuralMeta\(source: string\): ActionMetaLike/
  );
  assert.match(
    doorAuthoringMeta,
    /export function createCanvasPickingDoorAuthoringRefreshGatedMeta\([\s\S]*App: AppContainer,[\s\S]*source: string,[\s\S]*baseMeta\?: ActionMetaLike[\s\S]*\): ActionMetaLike/
  );
  assert.match(doorAuthoringMeta, /Canvas picking door-authoring structural meta requires a source/);
  assert.match(doorAuthoringMeta, /immediate: true/);
  assert.match(doorAuthoringMeta, /__wp_metaNoBuild\(/);
  assert.doesNotMatch(doorAuthoringMeta, /noHistory:/);

  const helperImportPattern =
    /import \{[\s\S]*createCanvasPickingDoorAuthoringStructuralMeta[\s\S]*\} from '\.\/canvas_picking_door_authoring_meta\.js';/;
  const sourceFiles = [doorHingeGroove, doorRemove, doorSplitShared, doorTrim, removablePartRemove];
  for (const source of sourceFiles) {
    assert.match(source, helperImportPattern);
    assert.doesNotMatch(source, /\{\s*source:\s*[^}]*immediate:\s*true\s*\}/);
    assert.doesNotMatch(source, /\{\s*immediate:\s*true\s*,\s*source[^}]*\}/);
  }

  assert.match(
    doorEditShared,
    /import \{ createCanvasPickingDoorAuthoringRefreshGatedMeta \} from '\.\/canvas_picking_door_authoring_meta\.js';/
  );
  assert.match(doorEditShared, /createCanvasPickingDoorAuthoringRefreshGatedMeta\(App, source\)/);
  assert.doesNotMatch(doorEditShared, /__wp_metaNoBuild/);
  assert.match(
    doorHingeGroove,
    /callDoorsAction\(App, 'setHinge', hingeKey, nextHinge, createCanvasPickingDoorAuthoringStructuralMeta\('hinge:click'\)\)/
  );
  assert.match(
    doorHingeGroove,
    /writeHinge\(App, hingeKey, nextHinge, createCanvasPickingDoorAuthoringStructuralMeta\('hinge:click'\)\)/
  );
  assert.match(
    doorHingeGroove,
    /const grooveStructuralMeta = createCanvasPickingDoorAuthoringStructuralMeta\('groove:click'\)/
  );
  assert.match(doorHingeGroove, /__wp_historyBatch\(App, grooveStructuralMeta,/);
  assert.match(
    doorHingeGroove,
    /const grooveRefreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta\([\s\S]*App,[\s\S]*'groove:click',[\s\S]*grooveStructuralMeta[\s\S]*\)/
  );
  assert.match(
    doorHingeGroove,
    /const grooveCountRefreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta\([\s\S]*App,[\s\S]*'groove:click:count'[\s\S]*\)/
  );
  assert.doesNotMatch(doorHingeGroove, /__wp_metaNoBuild/);
  assert.match(
    doorRemove,
    /const structuralMeta = createCanvasPickingDoorAuthoringStructuralMeta\('removeDoors:smart'\)/
  );
  assert.match(
    doorRemove,
    /const refreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta\([\s\S]*App,[\s\S]*'removeDoors:smart',[\s\S]*structuralMeta[\s\S]*\)/
  );
  assert.doesNotMatch(doorRemove, /__wp_metaNoBuild/);
  assert.match(
    removablePartRemove,
    /const structuralMeta = createCanvasPickingDoorAuthoringStructuralMeta\('removeParts:smart'\)/
  );
  assert.match(
    removablePartRemove,
    /const refreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta\([\s\S]*App,[\s\S]*'removeParts:smart',[\s\S]*structuralMeta[\s\S]*\)/
  );
  assert.doesNotMatch(removablePartRemove, /__wp_metaNoBuild/);
  assert.match(doorTrim, /const meta = createCanvasPickingDoorAuthoringStructuralMeta\('doorTrim:click'\)/);

  assert.match(
    doorSplitShared,
    /runCanvasDoorSplitHistoryBatch\([\s\S]*source: string,[\s\S]*createCanvasPickingDoorAuthoringStructuralMeta\(source\)/
  );
  assert.match(
    doorSplitShared,
    /callDoorsAction\(App, 'setSplit', key, next, createCanvasPickingDoorAuthoringStructuralMeta\(source\)\)/
  );
  assert.match(
    doorSplitShared,
    /callDoorsAction\(App, 'setSplitBottom', key, next, createCanvasPickingDoorAuthoringStructuralMeta\(source\)\)/
  );
  assert.match(
    doorSplitShared,
    /writeMapKey\(App, 'splitDoorsMap', splitPosKey, stored, createCanvasPickingDoorAuthoringStructuralMeta\(source\)\)/
  );
  assert.match(doorSplitCustom, /runCanvasDoorSplitHistoryBatch\(App, 'splitDoors:custom'/);
  assert.match(doorSplitToggle, /runCanvasDoorSplitHistoryBatch\(App, 'splitDoorsBottom:click'/);
  assert.match(doorSplitToggle, /runCanvasDoorSplitHistoryBatch\(App, 'splitDoors:click'/);
  assert.doesNotMatch(doorSplitCustom, /\{\s*source:\s*'splitDoors:custom'[\s\S]{0,40}immediate:\s*true/);
  assert.doesNotMatch(doorSplitToggle, /\{\s*source:\s*'splitDoors/);
});
