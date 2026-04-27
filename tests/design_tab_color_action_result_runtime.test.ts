import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDesignTabColorActionErrorResult,
  buildDesignTabColorActionFailure,
  buildDesignTabColorActionSuccess,
  normalizeDesignTabColorActionReason,
  normalizeDesignTabColorActionResult,
} from '../esm/native/ui/react/tabs/design_tab_color_action_result.ts';

test('design tab color action result runtime: normalizes kind-specific failure reasons', () => {
  assert.equal(normalizeDesignTabColorActionReason('delete-color', 'missing_selection'), 'missing-selection');
  assert.equal(normalizeDesignTabColorActionReason('delete-color', 'canceled'), 'cancelled');
  assert.equal(normalizeDesignTabColorActionReason('upload-texture', 'unsupported'), 'unavailable');
  assert.equal(normalizeDesignTabColorActionReason('upload-texture', 'error'), 'read-failed');
  assert.equal(normalizeDesignTabColorActionReason('save-custom-color', 'weird'), 'error');
});

test('design tab color action result runtime: normalizes soft failure objects into canonical results', () => {
  assert.deepEqual(
    normalizeDesignTabColorActionResult({
      ok: false,
      kind: 'delete-color',
      reason: 'missing_selection',
      id: ' saved_1 ',
    }),
    buildDesignTabColorActionFailure('delete-color', 'missing-selection', { id: 'saved_1' })
  );

  assert.deepEqual(
    normalizeDesignTabColorActionResult({
      ok: false,
      kind: 'upload-texture',
      reason: 'unsupported',
      message: ' no reader ',
    }),
    buildDesignTabColorActionFailure('upload-texture', 'unavailable', {}, 'no reader')
  );
});

test('design tab color action result runtime: normalizes success payloads and drops broken upload successes', () => {
  assert.deepEqual(
    normalizeDesignTabColorActionResult({
      ok: true,
      kind: 'toggle-lock',
      id: ' saved_2 ',
      locked: 1,
      name: ' כהה ',
    }),
    buildDesignTabColorActionSuccess('toggle-lock', { id: 'saved_2', locked: false, name: 'כהה' })
  );

  assert.deepEqual(
    normalizeDesignTabColorActionResult({ ok: true, kind: 'upload-texture', textureName: 'wood.png' }),
    buildDesignTabColorActionFailure('upload-texture', 'read-failed')
  );
});

test('design tab color action result runtime: preserves real error messages from unknown throws', () => {
  assert.deepEqual(
    buildDesignTabColorActionErrorResult('save-custom-color', { message: ' prompt exploded ' }, 'fallback'),
    buildDesignTabColorActionFailure('save-custom-color', 'error', {}, 'prompt exploded')
  );
});

test('design tab color action result runtime: normalizes busy reasons for single-flight protected color actions', () => {
  assert.equal(normalizeDesignTabColorActionReason('delete-color', 'busy'), 'busy');
  assert.equal(normalizeDesignTabColorActionReason('upload-texture', 'busy'), 'busy');
  assert.equal(normalizeDesignTabColorActionReason('save-custom-color', 'busy'), 'busy');

  assert.deepEqual(
    normalizeDesignTabColorActionResult({ ok: false, kind: 'save-custom-color', reason: 'busy' }),
    buildDesignTabColorActionFailure('save-custom-color', 'busy')
  );
});

test('design tab color action result runtime: normalization keeps kind-specific fields only', () => {
  assert.deepEqual(
    normalizeDesignTabColorActionResult({
      ok: true,
      kind: 'toggle-lock',
      id: ' saved_3 ',
      name: ' בהיר ',
      locked: true,
      textureName: 'ignored.png',
      dataUrl: 'ignored',
    }),
    buildDesignTabColorActionSuccess('toggle-lock', { id: 'saved_3', name: 'בהיר', locked: true })
  );

  assert.deepEqual(
    normalizeDesignTabColorActionResult({
      ok: false,
      kind: 'upload-texture',
      reason: 'unsupported',
      textureName: ' wood.png ',
      id: 'ignored',
      name: 'ignored',
      message: ' אין reader ',
    }),
    buildDesignTabColorActionFailure(
      'upload-texture',
      'unavailable',
      { textureName: 'wood.png' },
      'אין reader'
    )
  );
});
