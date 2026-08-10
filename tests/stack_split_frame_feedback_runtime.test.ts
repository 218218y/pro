import test from 'node:test';
import assert from 'node:assert/strict';

import { notifyStackSplitFrameTopologyTransition } from '../esm/native/builder/stack_split_frame_feedback.ts';

function createFeedbackHarness() {
  const App = {} as any;
  const toasts: Array<[string, unknown]> = [];
  const showToast = (message: unknown, type?: unknown) => {
    toasts.push([String(message), type]);
  };
  return { App, toasts, showToast };
}

test('stack-split frame feedback explains temporary interaction split and later unified restoration once per transition', () => {
  const { App, toasts, showToast } = createFeedbackHarness();

  notifyStackSplitFrameTopologyTransition({
    App,
    stackSplitActive: true,
    stackSplitUnifiedFrame: true,
    removablePartInteractionActive: false,
    showToast,
  });
  notifyStackSplitFrameTopologyTransition({
    App,
    stackSplitActive: true,
    stackSplitUnifiedFrame: false,
    removablePartInteractionActive: true,
    showToast,
  });
  notifyStackSplitFrameTopologyTransition({
    App,
    stackSplitActive: true,
    stackSplitUnifiedFrame: false,
    removablePartInteractionActive: true,
    showToast,
  });
  notifyStackSplitFrameTopologyTransition({
    App,
    stackSplitActive: true,
    stackSplitUnifiedFrame: true,
    removablePartInteractionActive: false,
    showToast,
  });

  assert.equal(toasts.length, 2);
  assert.match(toasts[0]?.[0] || '', /נבנה זמנית עם שתי מסגרות נפרדות/);
  assert.match(toasts[0]?.[0] || '', /העליונה או התחתון בנפרד|העליון או התחתון בנפרד/);
  assert.equal(toasts[0]?.[1], 'info');
  assert.match(toasts[1]?.[0] || '', /חזר למסגרת אחת/);
  assert.equal(toasts[1]?.[1], 'info');
});

test('stack-split frame feedback reports structural dimension split and does not spam unchanged topology', () => {
  const { App, toasts, showToast } = createFeedbackHarness();

  notifyStackSplitFrameTopologyTransition({
    App,
    stackSplitActive: false,
    stackSplitUnifiedFrame: false,
    removablePartInteractionActive: false,
    showToast,
  });
  notifyStackSplitFrameTopologyTransition({
    App,
    stackSplitActive: true,
    stackSplitUnifiedFrame: false,
    removablePartInteractionActive: false,
    showToast,
  });
  notifyStackSplitFrameTopologyTransition({
    App,
    stackSplitActive: true,
    stackSplitUnifiedFrame: false,
    removablePartInteractionActive: false,
    showToast,
  });
  notifyStackSplitFrameTopologyTransition({
    App,
    stackSplitActive: true,
    stackSplitUnifiedFrame: true,
    removablePartInteractionActive: false,
    showToast,
  });

  assert.equal(toasts.length, 2);
  assert.match(toasts[0]?.[0] || '', /שתי מסגרות נפרדות/);
  assert.match(toasts[0]?.[0] || '', /שינוי במידות או במבנה/);
  assert.match(toasts[1]?.[0] || '', /חזר למסגרת אחת/);
});

test('stack-split frame feedback remains fail-soft when the toast transport throws', () => {
  const App = {} as any;
  const showToast = () => {
    throw new Error('toast transport unavailable');
  };

  assert.doesNotThrow(() => {
    notifyStackSplitFrameTopologyTransition({
      App,
      stackSplitActive: false,
      stackSplitUnifiedFrame: false,
      removablePartInteractionActive: false,
      showToast,
    });
    notifyStackSplitFrameTopologyTransition({
      App,
      stackSplitActive: true,
      stackSplitUnifiedFrame: false,
      removablePartInteractionActive: true,
      showToast,
    });
  });
});
