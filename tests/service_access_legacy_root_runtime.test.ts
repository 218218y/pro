import test from 'node:test';
import assert from 'node:assert/strict';

import { getTools, getUiFeedback } from '../esm/native/runtime/service_access.ts';
import { installUiFeedback } from '../esm/native/ui/feedback.ts';

test('service_access provisions canonical services namespaces and ignores unrelated root bags', () => {
  const legacyTools = { ping: 1 } as any;
  const legacyFeedback = {
    toast(msg: string, kind?: string) {
      this.calls.push([msg, kind || null]);
    },
    calls: [] as Array<[string, string | null]>,
  } as any;
  const App: any = { tools: legacyTools, uiFeedback: legacyFeedback };

  const tools = getTools(App);
  const feedback = getUiFeedback(App);

  assert.notEqual(tools, legacyTools);
  assert.notEqual(feedback, legacyFeedback);
  assert.equal(App.services.tools, tools);
  assert.equal(App.services.uiFeedback, feedback);
  assert.equal(App.tools, legacyTools);
  assert.equal(App.uiFeedback, legacyFeedback);

  feedback.showToast('alive', 'info');
  assert.deepEqual(legacyFeedback.calls, []);
});

test('installUiFeedback preserves canonical implementations in place instead of consulting legacy root slots', () => {
  const seen: string[] = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast(message: string, kind?: string) {
          seen.push(`canonical:${kind || 'info'}:${message}`);
        },
      },
    },
    uiFeedback: {
      toast(message: string, kind?: string) {
        seen.push(`legacy:${kind || 'info'}:${message}`);
      },
    },
  };

  const feedbackBefore = getUiFeedback(App);
  const installed = installUiFeedback(App);

  assert.equal(installed, feedbackBefore);
  assert.equal(App.services.uiFeedback, feedbackBefore);

  installed?.toast('שלום', 'success');
  assert.deepEqual(seen, ['canonical:success:שלום']);
});
