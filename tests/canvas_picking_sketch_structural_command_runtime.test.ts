import test from 'node:test';
import assert from 'node:assert/strict';

import { commitSketchModuleBoxContent } from '../esm/native/services/canvas_picking_sketch_box_content_commit.ts';
import {
  decodeSketchStructuralCommandHover,
  SKETCH_STRUCTURAL_COMMAND_VERSION,
} from '../esm/native/services/canvas_picking_sketch_structural_command.ts';
import { withSketchStructuralCommand } from './_sketch_structural_command_fixture.ts';

test('sketch structural command decodes a canonical exact-shape shelf plan', () => {
  const hover = withSketchStructuralCommand({
    kind: 'add-shelf',
    op: 'add',
    boxId: 'box-1',
    freePlacement: true,
    blockedReason: null,
    boxYNorm: 0.4,
    contentXNorm: 0.25,
    variant: 'regular',
    depthM: 0.35,
  });

  const decoded = decodeSketchStructuralCommandHover(hover);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) throw new Error(decoded.reason);
  assert.equal(decoded.value.contentKind, 'shelf');
  assert.equal(decoded.value.command.kind, 'add-shelf');
});

test('sketch structural command rejects legacy, partial, conflicting and extra-field payloads', () => {
  const legacyPartial = {
    kind: 'box_content',
    contentKind: 'shelf',
    boxId: 'box-1',
  };
  assert.equal(decodeSketchStructuralCommandHover(legacyPartial).ok, false);

  const invalidOp = withSketchStructuralCommand({
    kind: 'add-rod',
    op: 'add',
    boxId: 'box-1',
    freePlacement: false,
    blockedReason: null,
    boxYNorm: 0.5,
    contentXNorm: 0.5,
  }) as any;
  invalidOp.boxStructuralCommand.command.op = 'blocked';
  assert.deepEqual(decodeSketchStructuralCommandHover(invalidOp), {
    ok: false,
    reason: 'invalid-command',
  });

  const missingTarget = withSketchStructuralCommand({
    kind: 'remove-storage',
    op: 'remove',
    boxId: 'box-1',
    freePlacement: false,
    blockedReason: null,
    removeId: 'storage-1',
    removeIdx: null,
  }) as any;
  missingTarget.boxStructuralCommand.command.removeId = null;
  assert.equal(decodeSketchStructuralCommandHover(missingTarget).ok, false);

  const extraField = withSketchStructuralCommand({
    kind: 'remove-base',
    op: 'remove',
    boxId: 'box-1',
    freePlacement: false,
    blockedReason: null,
  }) as any;
  extraField.boxStructuralCommand.command.baseType = 'plinth';
  assert.equal(decodeSketchStructuralCommandHover(extraField).ok, false);

  const unknownVersion = withSketchStructuralCommand({
    kind: 'remove-cornice',
    op: 'remove',
    boxId: 'box-1',
    freePlacement: false,
    blockedReason: null,
  }) as any;
  unknownVersion.boxStructuralCommand.version = SKETCH_STRUCTURAL_COMMAND_VERSION + 1;
  assert.deepEqual(decodeSketchStructuralCommandHover(unknownVersion), {
    ok: false,
    reason: 'unknown-version',
  });
});

test('sketch structural commit consumes the same decoded plan and rejects malformed hover before mutation', () => {
  const box: Record<string, unknown> = { id: 'box-1', shelves: [] };
  const validHover = withSketchStructuralCommand({
    kind: 'add-shelf',
    op: 'add',
    boxId: 'box-1',
    freePlacement: false,
    blockedReason: null,
    boxYNorm: 0.4,
    contentXNorm: 0.25,
    variant: 'regular',
    depthM: 0.35,
  });

  commitSketchModuleBoxContent({
    box,
    boxId: 'box-1',
    contentKind: 'shelf',
    hoverRec: validHover,
  });
  assert.deepEqual(
    (box.shelves as Array<Record<string, unknown>>).map(({ id: _id, ...item }) => item),
    [{ yNorm: 0.4, variant: 'regular', depthM: 0.35, xNorm: 0.25 }]
  );

  const malformed = structuredClone(validHover) as any;
  malformed.boxStructuralCommand.command.op = 'typo';
  commitSketchModuleBoxContent({
    box,
    boxId: 'box-1',
    contentKind: 'shelf',
    hoverRec: malformed,
  });
  assert.equal((box.shelves as unknown[]).length, 1);
});
