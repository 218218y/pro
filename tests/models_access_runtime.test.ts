import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cloneUnknownDetached,
  readSavedModel,
  readSavedModelList,
} from '../esm/native/runtime/models_access_shared.ts';

test('models access: cloneUnknownDetached preserves cyclic array shape while detaching from the live source', () => {
  const source: unknown[] = [];
  source.push({ label: 'root' }, source);

  const cloned = cloneUnknownDetached(source);

  assert.notEqual(cloned, source);
  assert.equal(cloned[1], cloned);
  assert.deepEqual(cloned[0], { label: 'root' });

  (cloned[0] as { label: string }).label = 'changed';
  assert.deepEqual(source[0], { label: 'root' });
});

test('models access: readSavedModel detaches cyclic array branches from imported payloads', () => {
  const tags: unknown[] = ['oak'];
  tags.push(tags);
  const raw = {
    id: 'm1',
    name: 'Model 1',
    tags,
    meta: {
      notes: [{ id: 'n1', html: '<p>x</p>' }],
    },
  };

  const model = readSavedModel(raw) as Record<string, unknown>;
  assert.ok(model);
  assert.equal(model.id, 'm1');
  assert.equal(model.name, 'Model 1');
  assert.notEqual(model.tags, tags);
  assert.equal((model.tags as unknown[])[1], model.tags);

  ((model.meta as Record<string, unknown>).notes as Array<Record<string, unknown>>)[0].html = '<p>y</p>';
  assert.equal(raw.meta.notes[0].html, '<p>x</p>');
});

test('models access: readSavedModelList keeps the first stable slot while upgrading duplicate ids to the latest entry', () => {
  const cyclic: Record<string, unknown> = { id: 'm1', name: 'Model 1 updated', meta: {} };
  cyclic.self = cyclic;

  const list = readSavedModelList([
    { id: 'm1', name: 'Model 1', version: 1 },
    cyclic,
    { id: 'm2', name: 'Model 2', blocks: [] },
  ]);

  assert.equal(list.length, 2);
  assert.equal(list[0].id, 'm1');
  assert.equal(list[0].name, 'Model 1 updated');
  assert.equal((list[0] as Record<string, unknown>).self, list[0]);
  assert.notEqual((list[0] as Record<string, unknown>).self, cyclic);
  assert.equal(list[1].id, 'm2');
});
