import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDesignTabSavedSwatchesController,
  resolveSelectedSavedColor,
} from '../esm/native/ui/react/tabs/design_tab_saved_swatches_controller_runtime.ts';
import type { SavedColor } from '../esm/native/ui/react/tabs/design_tab_multicolor_panel.js';

function createFeedbackSpy() {
  const seen: Array<{ message: string; type?: string }> = [];
  return {
    seen,
    toast(message: string, type?: string) {
      seen.push({ message, type });
    },
    prompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
      cb(null);
    },
    confirm(_title: string, _message: string, onYes: () => void, _onNo?: (() => void) | null) {
      onYes();
    },
  };
}

function createAppHarness() {
  const state = {
    savedColors: [] as Array<Record<string, unknown>>,
    colorSwatchesOrder: [] as string[],
    batchCalls: 0,
    appliedChoice: '',
    appliedSource: '',
  };

  const app = {
    actions: {
      colors: {
        setSavedColors(next: Array<Record<string, unknown>>) {
          state.savedColors = Array.isArray(next) ? next.slice() : [];
        },
        setColorSwatchesOrder(next: string[]) {
          state.colorSwatchesOrder = Array.isArray(next) ? next.slice() : [];
        },
      },
      ui: {
        setColorChoice(next: string, meta?: { source?: string }) {
          state.appliedChoice = String(next || '');
          state.appliedSource = typeof meta?.source === 'string' ? meta.source : '';
        },
      },
      history: {
        batch(fn: () => void) {
          state.batchCalls += 1;
          fn();
        },
      },
    },
  } as const;

  const applyColorChoice = (choice: string, source?: string) => {
    state.appliedChoice = String(choice || '');
    state.appliedSource = String(source || '');
  };

  return { app: app as unknown, state, applyColorChoice };
}

const SAVED_COLORS: SavedColor[] = [
  { id: 'saved_a', name: 'לבן', value: '#ffffff' },
  { id: 'saved_b', name: 'שחור', value: '#000000', locked: true },
];

test('resolveSelectedSavedColor keeps saved-only active choice lookup canonical', () => {
  assert.deepEqual(resolveSelectedSavedColor(SAVED_COLORS, 'saved_a'), SAVED_COLORS[0]);
  assert.equal(resolveSelectedSavedColor(SAVED_COLORS, '#ffffff'), null);
  assert.equal(resolveSelectedSavedColor(SAVED_COLORS, 'saved_missing'), null);
});

test('saved swatches controller reorders and reports through canonical feedback seam', () => {
  const feedback = createFeedbackSpy();
  const { app, state, applyColorChoice } = createAppHarness();
  const controller = createDesignTabSavedSwatchesController({
    app: app as never,
    feedback,
    savedColors: SAVED_COLORS,
    orderedSwatches: SAVED_COLORS,
    colorChoice: 'saved_a',
    applyColorChoice,
  });

  controller.reorderByDnD('saved_a', 'saved_b', 'after');

  assert.equal(state.batchCalls, 1);
  assert.deepEqual(state.colorSwatchesOrder, ['saved_b', 'saved_a']);
  assert.deepEqual(
    state.savedColors.map(color => String(color.id)),
    ['saved_b', 'saved_a']
  );
  assert.deepEqual(feedback.seen, [{ message: 'סדר הצבעים עודכן', type: 'success' }]);
});

test('saved swatches controller toggles selected lock and routes delete flow through canonical reporter', async () => {
  const feedback = createFeedbackSpy();
  const { app, state, applyColorChoice } = createAppHarness();
  let confirmed = false;
  const customFeedback = {
    ...feedback,
    confirm(_title: string, _message: string, onYes: () => void) {
      confirmed = true;
      onYes();
    },
  };
  const controller = createDesignTabSavedSwatchesController({
    app: app as never,
    feedback: customFeedback,
    savedColors: SAVED_COLORS,
    orderedSwatches: SAVED_COLORS,
    colorChoice: 'saved_a',
    applyColorChoice,
  });

  controller.toggleSelectedLock(SAVED_COLORS[0]);
  await controller.deleteSelected(SAVED_COLORS[0]);

  assert.equal(confirmed, true);
  assert.deepEqual(
    state.savedColors.map(color => String(color.id)),
    ['saved_b']
  );
  assert.deepEqual(state.colorSwatchesOrder, ['saved_b']);
  assert.equal(state.appliedChoice, '#ffffff');
  assert.equal(state.appliedSource, 'react:design:savedColors:delete');
  assert.deepEqual(feedback.seen, [
    { message: 'הגוון ננעל', type: 'success' },
    { message: 'הגוון נמחק', type: 'success' },
  ]);
});

test('saved swatches controller leaves null selected actions inert', async () => {
  const feedback = createFeedbackSpy();
  const { app, applyColorChoice } = createAppHarness();
  const controller = createDesignTabSavedSwatchesController({
    app: app as never,
    feedback,
    savedColors: SAVED_COLORS,
    orderedSwatches: SAVED_COLORS,
    colorChoice: '',
    applyColorChoice,
  });

  controller.toggleSelectedLock(null);
  await controller.deleteSelected(null);

  assert.deepEqual(feedback.seen, []);
});
