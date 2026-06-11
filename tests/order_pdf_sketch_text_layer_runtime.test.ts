import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderPdfSketchPersistedTextBoxMap,
  resolveOrderPdfSketchCommitTextBoxSource,
  resolveOrderPdfSketchCreateRectStyle,
  resolveOrderPdfSketchPersistLiveTextBox,
  shouldResetOrderPdfSketchInteractionPreview,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_runtime.ts';

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

test('[order-pdf] text layer runtime builds canonical persisted text-box lookup maps', () => {
  assert.deepEqual(buildOrderPdfSketchPersistedTextBoxMap([BASE_TEXT_BOX]), {
    'txt-1': BASE_TEXT_BOX,
  });
});

test('[order-pdf] text layer runtime suppresses no-op persistence writes', () => {
  const result = resolveOrderPdfSketchPersistLiveTextBox({
    textBox: BASE_TEXT_BOX,
    allowDelete: true,
    persistedTextBoxes: { 'txt-1': BASE_TEXT_BOX },
    readEditorText: () => 'hello',
  });

  assert.equal(result.kept, true);
  assert.equal(result.action, 'noop');
  assert.equal(result.nextTextBox.text, 'hello');
  assert.deepEqual(result.nextPersistedTextBoxes, { 'txt-1': BASE_TEXT_BOX });
});

test('[order-pdf] text layer runtime turns empty live text into a delete only when the box already exists', () => {
  const result = resolveOrderPdfSketchPersistLiveTextBox({
    textBox: BASE_TEXT_BOX,
    allowDelete: true,
    persistedTextBoxes: { 'txt-1': BASE_TEXT_BOX },
    readEditorText: () => '   ',
  });

  assert.equal(result.kept, false);
  assert.equal(result.action, 'delete');
  assert.deepEqual(result.nextPersistedTextBoxes, {});
});

test('[order-pdf] text layer runtime keeps new empty drafts quiet instead of emitting phantom deletes', () => {
  const result = resolveOrderPdfSketchPersistLiveTextBox({
    textBox: BASE_TEXT_BOX,
    allowDelete: true,
    persistedTextBoxes: {},
    readEditorText: () => '',
  });

  assert.equal(result.kept, false);
  assert.equal(result.action, 'noop');
  assert.deepEqual(result.nextPersistedTextBoxes, {});
});

test('[order-pdf] text layer runtime resolves commit sources from the live preview before falling back to persisted boxes', () => {
  const previewBox = { ...BASE_TEXT_BOX, text: 'preview' };
  assert.equal(
    resolveOrderPdfSketchCommitTextBoxSource({
      id: 'txt-1',
      interactionPreviewBox: previewBox,
      textBoxes: [BASE_TEXT_BOX],
    }),
    previewBox
  );
  assert.deepEqual(
    resolveOrderPdfSketchCommitTextBoxSource({
      id: 'txt-1',
      interactionPreviewBox: null,
      textBoxes: [BASE_TEXT_BOX],
    }),
    BASE_TEXT_BOX
  );
  assert.equal(
    resolveOrderPdfSketchCommitTextBoxSource({
      id: 'missing',
      interactionPreviewBox: null,
      textBoxes: [BASE_TEXT_BOX],
    }),
    null
  );
});

test('[order-pdf] text layer runtime invalidates previews whose source box disappeared from persisted state', () => {
  assert.equal(
    shouldResetOrderPdfSketchInteractionPreview({
      interactionPreviewBox: BASE_TEXT_BOX,
      textBoxes: [],
    }),
    true
  );
  assert.equal(
    shouldResetOrderPdfSketchInteractionPreview({
      interactionPreviewBox: BASE_TEXT_BOX,
      textBoxes: [BASE_TEXT_BOX],
    }),
    false
  );
});

test('[order-pdf] text layer runtime derives create-rect styles only while text mode is active', () => {
  const style = resolveOrderPdfSketchCreateRectStyle({
    textMode: true,
    createSession: {
      pointerId: 1,
      startClientX: 10,
      startClientY: 20,
      surfaceRect: { left: 0, top: 0, width: 100, height: 100 },
      start: { x: 0.1, y: 0.2 },
      current: { x: 0.4, y: 0.5 },
    },
  });
  assert.equal(style?.left, '10%');
  assert.equal(style?.top, '20%');
  assert.equal(style?.width, '30.000000000000004%');
  assert.equal(style?.height, '30%');
  assert.equal(resolveOrderPdfSketchCreateRectStyle({ textMode: false, createSession: null }), null);
});
