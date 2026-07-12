import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSketchBoxContentCommandEnvelope,
  decodeSketchBoxContentCommand,
} from '../esm/native/services/canvas_picking_sketch_box_content_command.ts';
import { createManualLayoutSketchBoxContentHoverRecord } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_state.ts';
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
});

test('strict hover creation projects routing fields from the command source of truth', () => {
  const hover = createManualLayoutSketchBoxContentHoverRecord({
    host: { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false, ts: 123 },
    contentKind: 'drawers',
    boxId: 'wrong-box',
    freePlacement: true,
    op: 'remove',
    contentXNorm: 0.9,
    boxYNorm: 0.1,
    boxBaseYNorm: 0.1,
    drawerHeightM: 0.4,
    drawerH: 0.4,
    stackH: 0.8,
    drawerGap: 0,
    command: INTERNAL_DRAWER_COMMAND,
  });

  assert.equal(hover.op, 'add');
  assert.equal(hover.boxId, 'box-1');
  assert.equal(hover.freePlacement, false);
  assert.equal(hover.contentXNorm, 0.4);
  assert.equal(hover.boxYNorm, 0.6);
  assert.equal(hover.drawerHeightM, 0.18);
  assert.deepEqual(hover.boxContentCommand, createSketchBoxContentCommandEnvelope(INTERNAL_DRAWER_COMMAND));
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

test('strict commit consumes the command rather than contradictory legacy flat fields', () => {
  const box: Record<string, unknown> = {
    id: 'box-1',
    absX: 0,
    absY: 1,
    widthM: 1,
    heightM: 1,
    depthM: 0.6,
    doors: [{ id: 'door-1', xNorm: 0.5, yNorm: 0.5, hinge: 'right', enabled: true }],
  };
  const hover = withSketchBoxContentCommand(
    {
      kind: 'box_content',
      contentKind: 'door',
      boxId: 'box-1',
      freePlacement: false,
      op: 'add',
      contentXNorm: 0.1,
      boxYNorm: 0.1,
      hinge: 'left',
      doorId: null,
    },
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

  commitSketchModuleBoxContent({
    box: box as never,
    boxId: 'box-1',
    contentKind: 'door',
    hoverRec: hover,
  });

  assert.deepEqual(box.doors ?? [], []);
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
  const hover = withSketchBoxContentCommand(
    {
      kind: 'box_content',
      contentKind: 'drawers',
      boxId: 'box-1',
      freePlacement: false,
      op: 'add',
    },
    { ...INTERNAL_DRAWER_COMMAND, blockedReason: 'collision' }
  );

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
      kind: 'box_content',
      contentKind: 'door',
      boxId: 'box-1',
      freePlacement: false,
      op: 'add',
      contentXNorm: 0.5,
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
