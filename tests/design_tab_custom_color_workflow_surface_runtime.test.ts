import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDesignTabCustomColorWorkflowController,
  createPrevCustomState,
  readDesignTabCustomDraftColor,
  readTextureFileFromEvent,
} from '../esm/native/ui/react/tabs/design_tab_custom_color_workflow_controller_runtime.ts';
import {
  SAVED_COLORS,
  createAppHarness,
  createFeedbackSpy,
  createStateBag,
} from './design_tab_custom_color_workflow_runtime_helpers.ts';

test('custom color workflow helpers keep canonical draft and prev-state semantics', () => {
  assert.equal(readDesignTabCustomDraftColor('#ffffff'), '#d0d4d8');
  assert.equal(readDesignTabCustomDraftColor('#112233'), '#112233');
  assert.equal(readDesignTabCustomDraftColor('custom'), '#d0d4d8');
  assert.deepEqual(createPrevCustomState('#abcabc', 'data:old'), {
    choice: '#abcabc',
    customUploaded: 'data:old',
  });
  const file = { name: 'tex.png' } as Blob & File;
  assert.equal(readTextureFileFromEvent({ target: { files: [file] } }), file);
  assert.equal(readTextureFileFromEvent({ target: { files: [] } }), null);
});

test('custom color workflow controller opens and cancels through canonical state restoration', () => {
  const feedback = createFeedbackSpy();
  const { app, state, applyColorChoice } = createAppHarness();
  const stateBag = createStateBag();
  const fileRef = { current: { value: 'picked' } };
  const prevRef = { current: null as { choice: string; customUploaded: string } | null };
  const controller = createDesignTabCustomColorWorkflowController({
    app: app as never,
    colorChoice: '#ffffff',
    customUploadedDataURL: 'data:new',
    feedback,
    savedColors: SAVED_COLORS,
    orderedSwatches: SAVED_COLORS,
    applyColorChoice,
    customOpen: false,
    draftColor: '#d0d4d8',
    draftTextureData: null,
    fileRef,
    prevRef,
    ...stateBag,
  });

  controller.openCustom();
  assert.equal(stateBag.bag.customOpen, true);
  assert.equal(stateBag.bag.draftColor, '#d0d4d8');
  assert.equal(stateBag.bag.draftTextureData, null);
  assert.equal(fileRef.current?.value, '');
  assert.deepEqual(prevRef.current, { choice: '#ffffff', customUploaded: 'data:new' });

  prevRef.current = { choice: '#334455', customUploaded: 'data:old' };
  controller.cancelCustom();
  assert.equal(stateBag.bag.customOpen, false);
  assert.equal(state.customUploadedDataURL, 'data:old');
  assert.equal(state.appliedChoice, '#334455');
  assert.equal(state.appliedSource, 'react:design:custom:cancel');
  assert.deepEqual(feedback.seen, []);
});

test('custom color workflow controller removes texture through canonical flow without extra toast noise', () => {
  const feedback = createFeedbackSpy();
  const { app, state, applyColorChoice } = createAppHarness();
  const stateBag = createStateBag();
  const fileRef = { current: { value: 'picked' } };
  const controller = createDesignTabCustomColorWorkflowController({
    app: app as never,
    colorChoice: 'custom',
    customUploadedDataURL: 'data:image/png;base64,AAA=',
    feedback,
    savedColors: SAVED_COLORS,
    orderedSwatches: SAVED_COLORS,
    applyColorChoice,
    customOpen: true,
    draftColor: '#102030',
    draftTextureData: 'data:image/png;base64,AAA=',
    fileRef,
    prevRef: { current: null },
    ...stateBag,
  });

  controller.removeTexture();

  assert.equal(stateBag.bag.draftTextureData, null);
  assert.equal(state.customUploadedDataURL, null);
  assert.equal(state.appliedChoice, '#102030');
  assert.equal(state.appliedSource, 'react:design:custom:removeTexture');
  assert.equal(fileRef.current?.value, '');
  assert.deepEqual(feedback.seen, []);
});
