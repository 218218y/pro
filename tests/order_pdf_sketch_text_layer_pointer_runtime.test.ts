import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOrderPdfSketchTextLayerInteractionPreview,
  isOrderPdfSketchTextBoxChromeTarget,
  resolveOrderPdfSketchTextLayerCanvasPointerAction,
  resolveOrderPdfSketchTextLayerCreateCommitAction,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_runtime.ts';

const BASE_TEXT_BOX = {
  id: 'txt-1',
  createdAt: 1,
  x: 0.2,
  y: 0.3,
  width: 0.24,
  height: 0.18,
  color: '#111827',
  fontSize: 18,
  bold: false,
  text: 'hello',
} as const;

test('[order-pdf] text-layer pointer runtime detects chrome targets through closest-capable elements only', () => {
  assert.equal(isOrderPdfSketchTextBoxChromeTarget(null), false);
  assert.equal(isOrderPdfSketchTextBoxChromeTarget({} as EventTarget), false);
  assert.equal(
    isOrderPdfSketchTextBoxChromeTarget({
      closest: (selector: string) => (selector === '.editor' ? {} : null),
    } as unknown as EventTarget),
    true
  );
});

test('[order-pdf] text-layer pointer runtime builds interaction previews from live editor text', () => {
  const result = createOrderPdfSketchTextLayerInteractionPreview({
    textBox: BASE_TEXT_BOX,
    liveText: 'live text',
    dir: null,
    pointerId: 7,
    clientX: 100,
    clientY: 120,
    surfaceRect: { left: 0, top: 0, width: 400, height: 300 },
  });

  assert.ok(result);
  assert.equal(result?.liveSource.text, 'live text');
  assert.equal(result?.previewSession.previewBox.text, 'live text');
  assert.equal(result?.previewSession.interaction.kind, 'move');
});

test('[order-pdf] text-layer pointer runtime resolves commit-exit and create-session canvas actions canonically', () => {
  const commitExit = resolveOrderPdfSketchTextLayerCanvasPointerAction({
    activeTextBoxId: 'txt-1',
    textMode: true,
    pointerId: 1,
    clientX: 10,
    clientY: 20,
    rect: { left: 0, top: 0, width: 100, height: 100 },
  });
  assert.deepEqual(commitExit, { kind: 'commit-exit', activeTextBoxId: 'txt-1' });

  const create = resolveOrderPdfSketchTextLayerCanvasPointerAction({
    activeTextBoxId: null,
    textMode: true,
    pointerId: 9,
    clientX: 80,
    clientY: 20,
    rect: { left: 0, top: 0, width: 200, height: 100 },
  });
  assert.equal(create.kind, 'start-create');
  assert.equal(create.kind === 'start-create' ? create.session.pointerId : -1, 9);

  const draw = resolveOrderPdfSketchTextLayerCanvasPointerAction({
    activeTextBoxId: null,
    textMode: false,
    pointerId: 2,
    clientX: 10,
    clientY: 20,
    rect: { left: 0, top: 0, width: 100, height: 100 },
  });
  assert.deepEqual(draw, { kind: 'draw' });
});

test('[order-pdf] text-layer pointer runtime suppresses micro-drags and creates committed text boxes for real drags', () => {
  const createAction = resolveOrderPdfSketchTextLayerCanvasPointerAction({
    activeTextBoxId: null,
    textMode: true,
    pointerId: 5,
    clientX: 20,
    clientY: 30,
    rect: { left: 0, top: 0, width: 200, height: 100 },
  });
  assert.equal(createAction.kind, 'start-create');
  if (createAction.kind !== 'start-create') return;

  const noopCommit = resolveOrderPdfSketchTextLayerCreateCommitAction({
    session: createAction.session,
    clientX: 23,
    clientY: 32,
  });
  assert.deepEqual(noopCommit, { kind: 'noop' });

  const createdCommit = resolveOrderPdfSketchTextLayerCreateCommitAction({
    session: createAction.session,
    clientX: 120,
    clientY: 70,
  });
  assert.equal(createdCommit.kind, 'create');
  assert.equal(createdCommit.kind === 'create' ? createdCommit.textBox.color : '', '#000000');
  assert.equal(createdCommit.kind === 'create' ? createdCommit.textBox.fontSize : -1, 18);
});
