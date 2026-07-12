import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSketchBoxContentCommandEnvelope,
  decodeSketchBoxContentCommand,
  decodeSketchBoxContentCommandHover,
  SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
} from '../esm/native/services/canvas_picking_sketch_box_content_command.ts';
import { createManualLayoutSketchBoxCommandHoverRecord } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_state.ts';
import { commitSketchModuleBoxContent } from '../esm/native/services/canvas_picking_sketch_box_content_commit.ts';
import { commitSketchFreePlacementHoverRecord } from '../esm/native/services/canvas_picking_sketch_free_commit.ts';
import { tryApplyManualLayoutSketchHoverClick } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.ts';
import { withSketchBoxContentCommand } from './_sketch_box_content_command_fixture.ts';

const INTERNAL_DRAWER_COMMAND = {
  kind: 'internal-drawers',
  boxId: 'box-1',
  freePlacement: false,
  blockedReason: null,
  op: 'add',
  removeId: null,
  contentXNorm: 0.4,
  boxYNorm: 0.6,
  boxBaseYNorm: 0.42,
  drawerHeightM: 0.18,
  drawerH: 0.18,
  stackH: 0.39,
  drawerGap: 0.03,
} as const;

test('sketch-box command decoder rejects partial, mismatched and non-finite commands', () => {
  assert.deepEqual(
    decodeSketchBoxContentCommand({
      record: { kind: 'box_content' },
      expectedContentKind: 'drawers',
    }),
    { ok: false, reason: 'missing-envelope' }
  );

  assert.deepEqual(
    decodeSketchBoxContentCommand({
      record: { boxContentCommand: { version: 99, command: INTERNAL_DRAWER_COMMAND } },
      expectedContentKind: 'drawers',
    }),
    { ok: false, reason: 'unknown-version' }
  );

  assert.deepEqual(
    decodeSketchBoxContentCommand({
      record: {
        boxContentCommand: createSketchBoxContentCommandEnvelope({
          ...INTERNAL_DRAWER_COMMAND,
          drawerHeightM: Number.NaN,
        }),
      },
      expectedContentKind: 'drawers',
    }),
    { ok: false, reason: 'invalid-command' }
  );

  assert.deepEqual(
    decodeSketchBoxContentCommand({
      record: { boxContentCommand: createSketchBoxContentCommandEnvelope(INTERNAL_DRAWER_COMMAND) },
      expectedContentKind: 'ext_drawers',
    }),
    { ok: false, reason: 'content-kind-mismatch' }
  );

  assert.deepEqual(
    decodeSketchBoxContentCommand({
      record: {
        boxContentCommand: createSketchBoxContentCommandEnvelope({
          ...INTERNAL_DRAWER_COMMAND,
          op: 'add',
          removeId: 'stale-drawer-id',
        }),
      },
      expectedContentKind: 'drawers',
    }),
    { ok: false, reason: 'invalid-command' }
  );

  assert.deepEqual(
    decodeSketchBoxContentCommand({
      record: {
        boxContentCommand: createSketchBoxContentCommandEnvelope({
          kind: 'regular-external-drawers',
          boxId: 'box-1',
          freePlacement: false,
          blockedReason: null,
          op: 'remove',
          removeId: null,
          contentXNorm: 0.4,
          boxYNorm: 0.6,
          boxBaseYNorm: 0.42,
          drawerCount: 2,
          hasShoeDrawer: false,
          drawerHeightM: 0.18,
        }),
      },
      expectedContentKind: 'regular_ext_drawers',
    }),
    { ok: false, reason: 'invalid-command' }
  );

  assert.deepEqual(
    decodeSketchBoxContentCommand({
      record: {
        boxContentCommand: createSketchBoxContentCommandEnvelope({
          ...INTERNAL_DRAWER_COMMAND,
          boxId: ' box-1',
        }),
      },
      expectedContentKind: 'drawers',
    }),
    { ok: false, reason: 'invalid-command' }
  );

  assert.deepEqual(
    decodeSketchBoxContentCommand({
      record: {
        boxContentCommand: createSketchBoxContentCommandEnvelope({
          ...INTERNAL_DRAWER_COMMAND,
          hinge: 'left',
        } as never),
      },
      expectedContentKind: 'drawers',
    }),
    { ok: false, reason: 'invalid-command' }
  );
});

test('strict hover creation emits only the canonical command record shape', () => {
  const hover = createManualLayoutSketchBoxCommandHoverRecord({
    host: { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false, ts: 123 },
    command: INTERNAL_DRAWER_COMMAND,
  });

  assert.deepEqual(Object.keys(hover).sort(), [
    'boxContentCommand',
    'hostIsBottom',
    'hostModuleKey',
    'kind',
    'tool',
    'ts',
  ]);
  assert.equal(hover.kind, SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND);
  assert.equal('op' in hover, false);
  assert.equal('boxId' in hover, false);
  assert.equal('freePlacement' in hover, false);
  assert.equal('contentKind' in hover, false);
  assert.equal('removeId' in hover, false);
  assert.deepEqual(hover.boxContentCommand, createSketchBoxContentCommandEnvelope(INTERNAL_DRAWER_COMMAND));
  assert.deepEqual(decodeSketchBoxContentCommandHover(hover), {
    ok: true,
    value: { contentKind: 'drawers', command: INTERNAL_DRAWER_COMMAND },
  });

  assert.deepEqual(decodeSketchBoxContentCommandHover({ ...hover, op: 'remove' }), {
    ok: false,
    reason: 'noncanonical-hover-shape',
  });
  const missingIdentity = { ...hover } as Record<string, unknown>;
  delete missingIdentity.hostIsBottom;
  assert.deepEqual(decodeSketchBoxContentCommandHover(missingIdentity), {
    ok: false,
    reason: 'invalid-hover-identity',
  });
});

test('partial free-box commands are rejected before structural patch creation', () => {
  let patchCalls = 0;
  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: () => {
            patchCalls += 1;
          },
        },
      },
    } as never,
    host: { moduleKey: 2, isBottom: false },
    hoverRec: {
      kind: 'box_content',
      contentKind: 'regular_ext_drawers',
      freePlacement: true,
      boxId: 'free-1',
      op: 'add',
    },
    freeBoxContentKind: 'regular_ext_drawers',
  });

  assert.deepEqual(result, { committed: false });
  assert.equal(patchCalls, 0);
});

test('strict commit consumes a canonical command and rejects records with legacy duplicates', () => {
  const createBox = () => ({
    id: 'box-1',
    absX: 0,
    absY: 1,
    widthM: 1,
    heightM: 1,
    depthM: 0.6,
    doors: [{ id: 'door-1', xNorm: 0.5, yNorm: 0.5, hinge: 'right', enabled: true }],
  });
  const hover = withSketchBoxContentCommand(
    {},
    {
      kind: 'single-door',
      boxId: 'box-1',
      freePlacement: false,
      blockedReason: null,
      op: 'remove',
      contentXNorm: 0.5,
      boxYNorm: 0.5,
      hinge: 'right',
      doorId: 'door-1',
    }
  );

  const canonicalBox = createBox();
  commitSketchModuleBoxContent({
    box: canonicalBox as never,
    boxId: 'box-1',
    contentKind: 'door',
    hoverRec: hover,
  });
  assert.deepEqual(canonicalBox.doors ?? [], []);

  const noncanonicalBox = createBox();
  assert.equal(
    commitSketchModuleBoxContent({
      box: noncanonicalBox as never,
      boxId: 'box-1',
      contentKind: 'door',
      hoverRec: { ...hover, op: 'remove' },
    }),
    null
  );
  assert.equal(noncanonicalBox.doors.length, 1);
});

test('blocked strict command cannot mutate even when the legacy blocked field is missing', () => {
  const box: Record<string, unknown> = {
    id: 'box-1',
    absX: 0,
    absY: 1,
    widthM: 1,
    heightM: 1,
    depthM: 0.6,
  };
  const hover = withSketchBoxContentCommand({}, { ...INTERNAL_DRAWER_COMMAND, blockedReason: 'collision' });

  assert.equal(
    commitSketchModuleBoxContent({
      box: box as never,
      boxId: 'box-1',
      contentKind: 'drawers',
      hoverRec: hover,
    }),
    null
  );
  assert.equal(box.drawers, undefined);
});

test('manual-layout routing consumes malformed strict hover without creating history patch', () => {
  let patchCalls = 0;
  let clearCalls = 0;
  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 2,
    topY: 2,
    bottomY: 0,
    __gridInfo: null,
    __hoverRec: {
      kind: SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
      tool: 'sketch_door',
      hostModuleKey: 2,
      hostIsBottom: false,
      boxContentCommand: { version: 1, command: { kind: 'single-door' } },
    },
    __hoverOk: true,
    __patchConfigForKey: () => {
      patchCalls += 1;
    },
    __wp_clearSketchHover: () => {
      clearCalls += 1;
    },
  });

  assert.equal(applied, true);
  assert.equal(patchCalls, 0);
  assert.equal(clearCalls, 1);
});
