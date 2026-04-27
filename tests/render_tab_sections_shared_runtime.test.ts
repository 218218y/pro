import test from 'node:test';
import assert from 'node:assert/strict';

import { handleSyntheticButtonKeyDown } from '../esm/native/ui/react/tabs/render_tab_sections_shared.ts';

test('handleSyntheticButtonKeyDown activates on Enter and Space only', () => {
  const calls: string[] = [];
  const events = ['Enter', ' ', 'Escape'].map(key => {
    let prevented = false;
    let stopped = false;
    return {
      key,
      prevented: () => prevented,
      stopped: () => stopped,
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {
        stopped = true;
      },
    };
  });

  handleSyntheticButtonKeyDown(events[0], () => calls.push('enter'));
  handleSyntheticButtonKeyDown(events[1], () => calls.push('space'));
  handleSyntheticButtonKeyDown(events[2], () => calls.push('escape'));

  assert.deepEqual(calls, ['enter', 'space']);
  assert.equal(events[0].prevented(), true);
  assert.equal(events[0].stopped(), true);
  assert.equal(events[1].prevented(), true);
  assert.equal(events[1].stopped(), true);
  assert.equal(events[2].prevented(), false);
  assert.equal(events[2].stopped(), false);
});
