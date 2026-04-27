import test from 'node:test';
import assert from 'node:assert/strict';

import {
  unwrapProjectEnvelope,
  detectProjectSchemaVersion,
  normalizeProjectData,
} from '../esm/native/io/project_schema.ts';

test('project schema source runtime keeps envelope/version/normalization seams stable', () => {
  const payload = unwrapProjectEnvelope({ payload: { settings: { wardrobeType: 'hinged' } } } as any);
  assert.equal((payload as any)?.settings?.wardrobeType, 'hinged');

  assert.equal(detectProjectSchemaVersion({ __version: 2, version: 1 } as any), 2);
  assert.equal(detectProjectSchemaVersion({ version: 3 } as any), 3);

  const normalized = normalizeProjectData({
    settings: { wardrobeType: 'sliding' },
    toggles: { multiColor: true },
    orderPdfEditorZoom: '1.75',
  } as any);

  assert.equal((normalized as any)?.settings?.wardrobeType, 'sliding');
  assert.equal((normalized as any)?.toggles?.multiColor, true);
  assert.equal((normalized as any)?.__schema, 'wardrobepro.project');
});
