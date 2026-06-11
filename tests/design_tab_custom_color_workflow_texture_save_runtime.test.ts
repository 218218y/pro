import test from 'node:test';
import assert from 'node:assert/strict';

import { createDesignTabCustomColorWorkflowController } from '../esm/native/ui/react/tabs/design_tab_custom_color_workflow_controller_runtime.ts';
import {
  SAVED_COLORS,
  createAppHarness,
  createFeedbackSpy,
  createStateBag,
} from './design_tab_custom_color_workflow_runtime_helpers.ts';

test('custom color workflow controller uploads texture through canonical feedback seam', async () => {
  const OriginalFileReader = globalThis.FileReader;
  class FakeFileReader {
    result: string | null = null;
    error: Error | null = null;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    readAsDataURL(_file: Blob | File) {
      this.result = 'data:image/png;base64,AAA=';
      if (this.onload) this.onload();
    }
  }
  // @ts-expect-error test shim
  globalThis.FileReader = FakeFileReader;
  try {
    const feedback = createFeedbackSpy();
    const { app, state, applyColorChoice } = createAppHarness();
    const stateBag = createStateBag();
    const controller = createDesignTabCustomColorWorkflowController({
      app: app as never,
      colorChoice: '#112233',
      customUploadedDataURL: '',
      feedback,
      savedColors: SAVED_COLORS,
      orderedSwatches: SAVED_COLORS,
      applyColorChoice,
      customOpen: true,
      draftColor: '#112233',
      draftTextureData: null,
      fileRef: { current: { value: 'picked' } },
      prevRef: { current: null },
      ...stateBag,
    });

    await controller.onPickTextureFile({ target: { files: [{ name: 'wood.png' } as Blob & File] } });

    assert.equal(stateBag.bag.draftTextureData, 'data:image/png;base64,AAA=');
    assert.equal(stateBag.bag.draftTextureName, 'wood.png');
    assert.equal(state.customUploadedDataURL, 'data:image/png;base64,AAA=');
    assert.equal(state.appliedChoice, 'custom');
    assert.equal(state.appliedSource, 'react:design:custom:pickTexture');
    assert.deepEqual(feedback.seen, [{ message: 'תמונה נטענה!', type: 'success' }]);
  } finally {
    globalThis.FileReader = OriginalFileReader;
  }
});

test('custom color workflow controller saves custom color through canonical prompt/result flow', async () => {
  const originalNow = Date.now;
  Date.now = () => 1;
  try {
    const feedback = createFeedbackSpy();
    const { app, state, applyColorChoice } = createAppHarness();
    const stateBag = createStateBag();
    const fileRef = { current: { value: 'picked' } };
    const controller = createDesignTabCustomColorWorkflowController({
      app: app as never,
      colorChoice: '#102030',
      customUploadedDataURL: '',
      feedback,
      savedColors: SAVED_COLORS,
      orderedSwatches: SAVED_COLORS,
      applyColorChoice,
      customOpen: true,
      draftColor: '#102030',
      draftTextureData: null,
      fileRef,
      prevRef: { current: null },
      ...stateBag,
    });

    await controller.saveCustom();

    assert.equal(state.batchCalls, 0);
    assert.equal(stateBag.bag.customOpen, false);
    assert.equal(stateBag.bag.draftTextureData, null);
    assert.equal(fileRef.current?.value, '');
    assert.deepEqual(
      state.savedColors.map(color => String(color.id)),
      ['saved_a', 'saved_1']
    );
    assert.deepEqual(state.colorSwatchesOrder, ['saved_a', 'saved_1']);
    assert.equal(state.appliedChoice, 'saved_1');
    assert.equal(state.appliedSource, 'react:design:savedColors:add');
    assert.deepEqual(feedback.seen, [{ message: 'נשמר גוון חדש', type: 'success' }]);
  } finally {
    Date.now = originalNow;
  }
});
