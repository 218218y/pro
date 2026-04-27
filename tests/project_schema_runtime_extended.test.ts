import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProjectData } from '../esm/native/io/project_schema.ts';
import { deepCloneProjectJson } from '../esm/native/io/project_schema_shared.ts';

test('project schema deep clone fallback detaches cyclic payloads instead of returning live references', () => {
  const source: any = { settings: { wardrobeType: 'hinged' }, customMeta: { nested: { value: 7 } } };
  source.self = source;
  source.customMeta.loop = source.customMeta;

  const cloned = deepCloneProjectJson(source);
  assert.notEqual(cloned, source);
  assert.notEqual(cloned.customMeta, source.customMeta);
  assert.notEqual(cloned.customMeta.nested, source.customMeta.nested);

  cloned.customMeta.nested.value = 99;
  assert.equal(source.customMeta.nested.value, 7);
  assert.equal(cloned.self, cloned);
  assert.equal(cloned.customMeta.loop, cloned.customMeta);
});

test('project schema normalization detaches custom payload state when JSON clone path would fail', () => {
  const raw: any = {
    settings: { wardrobeType: 'sliding', projectName: 'Cycle demo' },
    toggles: { multiColor: true },
    customMeta: { nested: { enabled: true } },
  };
  raw.customMeta.self = raw.customMeta;

  const normalized = normalizeProjectData(raw);
  assert.ok(normalized);
  assert.notEqual(normalized, raw);
  assert.notEqual((normalized as any).customMeta, raw.customMeta);
  assert.notEqual((normalized as any).customMeta.nested, raw.customMeta.nested);

  (normalized as any).customMeta.nested.enabled = false;
  assert.equal(raw.customMeta.nested.enabled, true);
  assert.equal((normalized as any).__schema, 'wardrobepro.project');
});
