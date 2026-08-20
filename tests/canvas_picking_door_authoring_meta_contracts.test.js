import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';
import { assertImportsFrom, getCallFacts, getFunctionSignatureFact } from './_semantic_source_contracts.js';

const readRaw = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const read = rel => normalizeWhitespace(readRaw(rel));

const doorAuthoringMeta = read('esm/native/services/canvas_picking_door_authoring_meta.ts');
const doorAuthoringMetaRaw = readRaw('esm/native/services/canvas_picking_door_authoring_meta.ts');
const doorEditShared = read('esm/native/services/canvas_picking_door_edit_shared.ts');
const doorEditSharedRaw = readRaw('esm/native/services/canvas_picking_door_edit_shared.ts');
const doorHingeGroove = read('esm/native/services/canvas_picking_door_hinge_groove_click.ts');
const doorHingeGrooveRaw = readRaw('esm/native/services/canvas_picking_door_hinge_groove_click.ts');
const doorRemove = read('esm/native/services/canvas_picking_door_remove_click.ts');
const doorRemoveRaw = readRaw('esm/native/services/canvas_picking_door_remove_click.ts');
const doorSplitSharedRaw = readRaw('esm/native/services/canvas_picking_door_split_click_shared.ts');
const doorSplitCustom = read('esm/native/services/canvas_picking_door_split_click_custom.ts');
const doorSplitCustomRaw = readRaw('esm/native/services/canvas_picking_door_split_click_custom.ts');
const doorSplitToggle = read('esm/native/services/canvas_picking_door_split_click_toggle.ts');
const doorSplitToggleRaw = readRaw('esm/native/services/canvas_picking_door_split_click_toggle.ts');
const doorTrimRaw = readRaw('esm/native/services/canvas_picking_door_trim_click.ts');
const removablePartRemove = read('esm/native/services/canvas_picking_removable_part_remove_click.ts');
const removablePartRemoveRaw = readRaw('esm/native/services/canvas_picking_removable_part_remove_click.ts');

test('canvas picking door-authoring writes use one immediate structural meta owner', () => {
  assert.deepEqual(
    getFunctionSignatureFact(
      doorAuthoringMetaRaw,
      'createCanvasPickingDoorAuthoringStructuralMeta',
      'esm/native/services/canvas_picking_door_authoring_meta.ts'
    ),
    {
      name: 'createCanvasPickingDoorAuthoringStructuralMeta',
      async: false,
      params: [{ name: 'source', optional: false, type: 'string' }],
      returnType: 'ActionMetaLike',
    }
  );
  assert.deepEqual(
    getFunctionSignatureFact(
      doorAuthoringMetaRaw,
      'createCanvasPickingDoorAuthoringRefreshGatedMeta',
      'esm/native/services/canvas_picking_door_authoring_meta.ts'
    ),
    {
      name: 'createCanvasPickingDoorAuthoringRefreshGatedMeta',
      async: false,
      params: [
        { name: 'App', optional: false, type: 'AppContainer' },
        { name: 'source', optional: false, type: 'string' },
        { name: 'baseMeta', optional: true, type: 'ActionMetaLike' },
      ],
      returnType: 'ActionMetaLike',
    }
  );
  assert.match(doorAuthoringMeta, /Canvas picking door-authoring structural meta requires a source/);
  assert.match(doorAuthoringMeta, /immediate: true/);
  assert.match(doorAuthoringMeta, /__wp_metaNoBuild\(/);
  assert.doesNotMatch(doorAuthoringMeta, /noHistory:/);

  const sourceFiles = [
    ['canvas_picking_door_hinge_groove_click.ts', doorHingeGrooveRaw],
    ['canvas_picking_door_remove_click.ts', doorRemoveRaw],
    ['canvas_picking_door_split_click_shared.ts', doorSplitSharedRaw],
    ['canvas_picking_door_trim_click.ts', doorTrimRaw],
    ['canvas_picking_removable_part_remove_click.ts', removablePartRemoveRaw],
  ];
  for (const [fileName, source] of sourceFiles) {
    assertImportsFrom(
      assert,
      source,
      './canvas_picking_door_authoring_meta.js',
      ['createCanvasPickingDoorAuthoringStructuralMeta'],
      { label: fileName, fileName }
    );
    assert.doesNotMatch(source, /\{\s*source:\s*[^}]*immediate:\s*true\s*\}/);
    assert.doesNotMatch(source, /\{\s*immediate:\s*true\s*,\s*source[^}]*\}/);
  }

  assert.match(
    doorEditShared,
    /import \{ createCanvasPickingDoorAuthoringRefreshGatedMeta \} from '\.\/canvas_picking_door_authoring_meta\.js';/
  );
  assert.deepEqual(getCallFacts(doorEditSharedRaw, 'createCanvasPickingDoorAuthoringRefreshGatedMeta'), [
    {
      callee: 'createCanvasPickingDoorAuthoringRefreshGatedMeta',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'identifier', name: 'source' },
      ],
    },
  ]);
  assert.doesNotMatch(doorEditShared, /__wp_metaNoBuild/);
  assert.deepEqual(getCallFacts(doorHingeGrooveRaw, 'callDoorsAction'), [
    {
      callee: 'callDoorsAction',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'literal', value: 'setHinge' },
        { kind: 'identifier', name: 'hingeKey' },
        { kind: 'identifier', name: 'nextHinge' },
        {
          kind: 'call',
          callee: 'createCanvasPickingDoorAuthoringStructuralMeta',
          args: [{ kind: 'literal', value: 'hinge:click' }],
        },
      ],
    },
  ]);
  assert.deepEqual(getCallFacts(doorHingeGrooveRaw, 'writeHinge'), [
    {
      callee: 'writeHinge',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'identifier', name: 'hingeKey' },
        { kind: 'identifier', name: 'nextHinge' },
        {
          kind: 'call',
          callee: 'createCanvasPickingDoorAuthoringStructuralMeta',
          args: [{ kind: 'literal', value: 'hinge:click' }],
        },
      ],
    },
  ]);
  const hingeStructuralFacts = getCallFacts(
    doorHingeGrooveRaw,
    'createCanvasPickingDoorAuthoringStructuralMeta'
  );
  for (const expectedSource of ['hinge:click', 'groove:click']) {
    assert.ok(
      hingeStructuralFacts.some(
        call => call.args[0]?.kind === 'literal' && call.args[0].value === expectedSource
      ),
      `missing door-authoring structural source ${expectedSource}`
    );
  }
  const hingeRefreshFacts = getCallFacts(
    doorHingeGrooveRaw,
    'createCanvasPickingDoorAuthoringRefreshGatedMeta'
  );
  assert.ok(
    hingeRefreshFacts.some(
      call =>
        call.args[0]?.kind === 'identifier' &&
        call.args[0].name === 'App' &&
        call.args[1]?.kind === 'literal' &&
        call.args[1].value === 'groove:click' &&
        call.args[2]?.kind === 'identifier' &&
        call.args[2].name === 'grooveStructuralMeta'
    )
  );
  assert.ok(
    hingeRefreshFacts.some(
      call => call.args[1]?.kind === 'literal' && call.args[1].value === 'groove:click:count'
    )
  );
  assert.doesNotMatch(doorHingeGroove, /__wp_metaNoBuild/);

  assert.deepEqual(getCallFacts(doorRemoveRaw, 'createCanvasPickingDoorAuthoringStructuralMeta'), [
    {
      callee: 'createCanvasPickingDoorAuthoringStructuralMeta',
      args: [{ kind: 'literal', value: 'removeDoors:smart' }],
    },
  ]);
  assert.deepEqual(getCallFacts(doorRemoveRaw, 'createCanvasPickingDoorAuthoringRefreshGatedMeta'), [
    {
      callee: 'createCanvasPickingDoorAuthoringRefreshGatedMeta',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'literal', value: 'removeDoors:smart' },
        { kind: 'identifier', name: 'structuralMeta' },
      ],
    },
  ]);
  assert.doesNotMatch(doorRemove, /__wp_metaNoBuild/);

  assert.deepEqual(getCallFacts(removablePartRemoveRaw, 'createCanvasPickingDoorAuthoringStructuralMeta'), [
    {
      callee: 'createCanvasPickingDoorAuthoringStructuralMeta',
      args: [{ kind: 'literal', value: 'removeParts:smart' }],
    },
  ]);
  assert.deepEqual(getCallFacts(removablePartRemoveRaw, 'createCanvasPickingDoorAuthoringRefreshGatedMeta'), [
    {
      callee: 'createCanvasPickingDoorAuthoringRefreshGatedMeta',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'literal', value: 'removeParts:smart' },
        { kind: 'identifier', name: 'structuralMeta' },
      ],
    },
  ]);
  assert.doesNotMatch(removablePartRemove, /__wp_metaNoBuild/);
  assert.deepEqual(getCallFacts(doorTrimRaw, 'createCanvasPickingDoorAuthoringStructuralMeta'), [
    {
      callee: 'createCanvasPickingDoorAuthoringStructuralMeta',
      args: [{ kind: 'literal', value: 'doorTrim:click' }],
    },
  ]);

  assert.deepEqual(
    getFunctionSignatureFact(
      doorSplitSharedRaw,
      'runCanvasDoorSplitHistoryBatch',
      'esm/native/services/canvas_picking_door_split_click_shared.ts'
    ),
    {
      name: 'runCanvasDoorSplitHistoryBatch',
      async: false,
      params: [
        { name: 'App', optional: false, type: 'AppContainer' },
        { name: 'source', optional: false, type: 'string' },
        { name: 'fn', optional: false, type: 'fn()->unknown' },
      ],
      returnType: 'unknown',
    }
  );
  const splitDoorActionFacts = getCallFacts(doorSplitSharedRaw, 'callDoorsAction');
  for (const actionName of ['setSplit', 'setSplitBottom']) {
    assert.ok(
      splitDoorActionFacts.some(
        call =>
          call.args[1]?.kind === 'literal' &&
          call.args[1].value === actionName &&
          call.args[4]?.kind === 'call' &&
          call.args[4].callee === 'createCanvasPickingDoorAuthoringStructuralMeta' &&
          call.args[4].args[0]?.kind === 'identifier' &&
          call.args[4].args[0].name === 'source'
      ),
      `missing semantic split door action ${actionName}`
    );
  }
  assert.deepEqual(
    getFunctionSignatureFact(
      doorSplitSharedRaw,
      'writeCanvasDoorSplitPosList',
      'canvas_picking_door_split_click_shared.ts'
    ),
    {
      name: 'writeCanvasDoorSplitPosList',
      async: false,
      params: [
        {
          name: 'args',
          optional: false,
          type: 'type{App:AppContainer;doorBaseKey:string;nextList:number[];source:string}',
        },
      ],
      returnType: 'void',
    }
  );
  assert.deepEqual(getCallFacts(doorSplitSharedRaw, '__splitPosKey'), [
    {
      callee: '__splitPosKey',
      args: [{ kind: 'identifier', name: 'doorBaseKey' }],
    },
  ]);
  assert.deepEqual(getCallFacts(doorSplitSharedRaw, 'writeSplitPositionList'), [
    {
      callee: 'writeSplitPositionList',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'identifier', name: 'doorBaseKey' },
        { kind: 'identifier', name: 'nextList' },
        {
          kind: 'call',
          callee: 'createCanvasPickingDoorAuthoringStructuralMeta',
          args: [{ kind: 'identifier', name: 'source' }],
        },
      ],
    },
  ]);
  assert.doesNotMatch(doorSplitCustom, /splitPosKey,/);
  assert.doesNotMatch(doorSplitToggle, /splitPosKey,/);
  assert.ok(
    getCallFacts(doorSplitCustomRaw, 'runCanvasDoorSplitHistoryBatch').some(
      call => call.args[1]?.kind === 'literal' && call.args[1].value === 'splitDoors:custom'
    )
  );
  const toggleHistoryFacts = getCallFacts(doorSplitToggleRaw, 'runCanvasDoorSplitHistoryBatch');
  for (const source of ['splitDoorsBottom:click', 'splitDoors:click']) {
    assert.ok(
      toggleHistoryFacts.some(call => call.args[1]?.kind === 'literal' && call.args[1].value === source),
      `missing split history source ${source}`
    );
  }
  assert.deepEqual(
    getCallFacts(doorSplitCustomRaw, 'createCanvasPickingDoorAuthoringStructuralMeta'),
    [],
    'custom split owner should delegate structural meta through the shared history/write seams'
  );
  assert.doesNotMatch(doorSplitToggle, /\{\s*source:\s*'splitDoors/);
});
