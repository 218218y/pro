import test from 'node:test';
import assert from 'node:assert/strict';

import {
  asClickable,
  asProjectFileLoadEvent,
  readProjectLoadFlightKey,
} from '../esm/native/ui/project_load_runtime_shared.ts';

test('project load runtime reads clickable wrappers without leaking the original owner', () => {
  const calls: string[] = [];
  const owner = {
    click() {
      calls.push('clicked');
      return this;
    },
    target: 'owner',
  };

  const clickable = asClickable(owner);
  assert.ok(clickable);
  assert.notEqual(clickable, owner);
  clickable?.click();
  assert.deepEqual(calls, ['clicked']);
});

test('project load runtime prefers file fingerprint over target value and ignores malformed targets', () => {
  const file = new File(['abc'], 'demo.json', {
    type: 'application/json',
    lastModified: 123,
  });

  const key = readProjectLoadFlightKey({
    currentTarget: {
      value: ' C:/fake/demo.json ',
      files: [file],
    },
  });

  assert.equal(key, 'file:s9:demo.json|n:3|s16:application/json|n:123');
  assert.equal(readProjectLoadFlightKey({ currentTarget: { value: 17 } }), null);
});

test('project load file fingerprints do not collide when delimiters occur inside file metadata', () => {
  const first = new File(['x'], 'a|n:1', { type: 'text/plain', lastModified: 2 });
  const second = new File(['x'], 'a', { type: 'n:1|text/plain', lastModified: 2 });

  assert.notEqual(readProjectLoadFlightKey(first), readProjectLoadFlightKey(second));
  assert.equal(readProjectLoadFlightKey(first), readProjectLoadFlightKey(first));
});

test('project load runtime clones plain event-like objects and rejects Blob inputs', () => {
  const event = { target: { value: '/tmp/demo.json' }, source: 'drag-drop' };
  const cloned = asProjectFileLoadEvent(event);

  assert.deepEqual(cloned, event);
  assert.notEqual(cloned, event);
  assert.equal(asProjectFileLoadEvent(new Blob(['x'])), null);
});
