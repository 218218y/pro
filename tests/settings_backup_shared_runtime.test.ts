import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cloneJsonValue,
  mergeSavedColorLists,
  readCanonicalSavedColorOrder,
  readSavedColorEntry,
  readSavedColorList,
  readSavedModelList,
  resolveColorSwatchesOrder,
  sanitizeColorSwatchesOrder,
} from '../esm/native/ui/settings_backup_shared.ts';

test('settings backup cloneJsonValue detaches cyclic nested payloads without returning the live source', () => {
  const nested = { value: 7 } as Record<string, unknown>;
  const source = { nested } as Record<string, unknown>;
  source.self = source;

  const cloned = cloneJsonValue(source) as Record<string, unknown>;
  assert.notEqual(cloned, source);
  assert.notEqual(cloned.nested, nested);
  assert.equal((cloned.self as Record<string, unknown>).nested, cloned.nested);

  (cloned.nested as Record<string, unknown>).value = 99;
  assert.equal(nested.value, 7);
});

test('settings backup saved color list collapses duplicate ids and upgrades legacy strings to object entries', () => {
  const normalized = readSavedColorList([
    'wood-oak',
    { id: ' wood-oak ', value: '#deb887', textureData: { grain: 'oak' } },
    { id: 'solid-white', value: '#ffffff' },
    'solid-white',
    { id: 'solid-white', value: '#eeeeee' },
  ]);

  assert.deepEqual(normalized, [
    { id: 'wood-oak', value: '#deb887', textureData: { grain: 'oak' } },
    { id: 'solid-white', value: '#ffffff' },
  ]);
});

test('settings backup saved color merge upgrades existing legacy/string entries to richer object payloads without duplicating ids', () => {
  const current = ['wood-oak', { id: 'solid-white', value: '#ffffff' }];
  const imported = [
    { id: ' wood-oak ', value: '#deb887', textureData: { grain: 'oak' } },
    { id: 'solid-white', value: '#ffffff', textureData: { sheen: 'matte' } },
  ];

  const merged = mergeSavedColorLists(current, imported);

  assert.equal(merged.added, 0);
  assert.equal(merged.changed, true);
  assert.deepEqual(merged.list, [
    { id: 'wood-oak', value: '#deb887', textureData: { grain: 'oak' } },
    { id: 'solid-white', value: '#ffffff', textureData: { sheen: 'matte' } },
  ]);
});

test('settings backup saved color merge canonicalizes duplicate current aliases even when no new colors are imported', () => {
  const current = ['oak', { id: 'oak', value: '#deb887' }, { id: 'solid', value: '#ffffff' }, 'solid'];
  const merged = mergeSavedColorLists(current, []);

  assert.equal(merged.added, 0);
  assert.equal(merged.changed, true);
  assert.deepEqual(merged.list, [
    { id: 'oak', value: '#deb887' },
    { id: 'solid', value: '#ffffff' },
  ]);
});

test('settings backup saved color entries are detached deeply from imported payloads', () => {
  const textureData = { nested: { tone: 'oak' } };
  const entry = { id: 'tone-1', textureData };

  const normalized = readSavedColorEntry(entry) as Record<string, unknown>;
  assert.notEqual(normalized, entry);
  assert.notEqual(normalized.textureData, textureData);
  assert.notEqual((normalized.textureData as Record<string, unknown>).nested, textureData.nested);

  ((normalized.textureData as Record<string, unknown>).nested as Record<string, unknown>).tone = 'walnut';
  assert.equal((textureData.nested as Record<string, unknown>).tone, 'oak');
});

test('settings backup saved model list detaches nested payloads from imported model records', () => {
  const savedNotes = [{ id: 'n1', blocks: [{ html: '<p>x</p>' }] }];
  const raw = [{ id: 'm1', name: 'Model 1', savedNotes }];

  const models = readSavedModelList(raw);
  assert.equal(models.length, 1);
  const model = models[0] as Record<string, unknown>;
  const modelSavedNotes = model.savedNotes as Array<Record<string, unknown>>;

  assert.notEqual(modelSavedNotes, savedNotes);
  assert.notEqual(modelSavedNotes[0], savedNotes[0]);
  assert.notEqual(modelSavedNotes[0].blocks, savedNotes[0].blocks);

  (modelSavedNotes[0].blocks as Array<Record<string, unknown>>)[0].html = '<p>changed</p>';
  assert.equal((savedNotes[0].blocks[0] as Record<string, unknown>).html, '<p>x</p>');
});

test('settings backup saved model list keeps the latest duplicate entry while preserving the first stable slot', () => {
  const models = readSavedModelList([
    { id: 'm1', name: 'Model 1', width: 100 },
    { id: 'm2', name: 'Model 2', width: 200 },
    { id: ' m1 ', name: 'Model 1 updated', width: 180, savedNotes: [{ id: 'n1', text: 'latest' }] },
  ]);

  assert.equal(models.length, 2);
  assert.equal(models[0].id, 'm1');
  assert.equal(models[0].name, 'Model 1 updated');
  assert.equal(models[0].width, 180);
  assert.deepEqual(models[0].savedNotes, [{ id: 'n1', text: 'latest' }]);
  assert.equal(models[1].id, 'm2');
});

test('settings backup saved model list detaches cyclic self branches on the latest duplicate entry', () => {
  const cyclic: Record<string, unknown> = { id: 'm1', name: 'Model 1 updated', meta: {} };
  cyclic.self = cyclic;

  const models = readSavedModelList([{ id: 'm1', name: 'Model 1', width: 100 }, cyclic]);

  assert.equal(models.length, 1);
  assert.equal(models[0].id, 'm1');
  assert.equal(models[0].name, 'Model 1 updated');
  const detachedSelf = (models[0] as Record<string, unknown>).self as Record<string, unknown>;
  assert.notEqual(detachedSelf, cyclic);
  assert.equal(detachedSelf.id, 'm1');
  assert.equal(detachedSelf.name, 'Model 1 updated');
});
test('settings backup color swatch order appends canonical fallback ids after imported priority ids', () => {
  const savedColors = [
    { id: 'existing', value: '#111111' },
    { id: 'new-color', value: '#fff' },
    { id: '7', value: '#000' },
  ];

  assert.deepEqual(
    sanitizeColorSwatchesOrder(savedColors, [' new-color ', 7, 'new-color'], ['existing', '7', 'missing']),
    ['new-color', '7', 'existing']
  );
});

test('settings backup canonical saved color order collapses duplicate ids while keeping the richer normalized entry order', () => {
  const savedColors = [
    'oak',
    { id: ' oak ', value: '#deb887', textureData: { grain: 'oak' } },
    { id: 'solid', value: '#ffffff' },
    'solid',
  ];

  assert.deepEqual(readCanonicalSavedColorOrder(savedColors), ['oak', 'solid']);
});

test('settings backup resolved swatch order shares one canonical precedence chain across preferred and fallback orders', () => {
  const savedColors = [
    { id: 'existing', value: '#111111' },
    { id: 'live-only', value: '#444444' },
    { id: 'storage-only', value: '#777777' },
    { id: 'new-color', value: '#ffffff' },
  ];

  assert.deepEqual(
    resolveColorSwatchesOrder(
      savedColors,
      [' new-color ', 'missing', 'new-color'],
      ['live-only', 'existing'],
      ['storage-only', 'existing', 'missing'],
      ['existing', 'new-color', 'storage-only']
    ),
    ['new-color', 'live-only', 'existing', 'storage-only']
  );
});
