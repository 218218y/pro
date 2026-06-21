import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasCurrentProjectSchema,
  detectProjectSchemaVersion,
  normalizeProjectData,
  PROJECT_SCHEMA_ID,
  PROJECT_SCHEMA_VERSION,
} from '../esm/native/io/project_schema.ts';

test('project schema source runtime accepts only current top-level schema data', () => {
  assert.equal(hasCurrentProjectSchema({ payload: { settings: { wardrobeType: 'hinged' } } } as any), false);

  assert.equal(
    detectProjectSchemaVersion({ __version: PROJECT_SCHEMA_VERSION, version: 1 } as any),
    PROJECT_SCHEMA_VERSION
  );
  assert.equal(detectProjectSchemaVersion({ version: 3 } as any), 0);

  const normalized = normalizeProjectData({
    __schema: PROJECT_SCHEMA_ID,
    __version: PROJECT_SCHEMA_VERSION,
    settings: { wardrobeType: 'sliding', width: 160, height: 240, depth: 55, doors: 4 },
    toggles: { multiColor: true },
    orderPdfEditorZoom: 1.75,
  } as any);

  assert.equal((normalized as any)?.settings?.wardrobeType, 'sliding');
  assert.equal((normalized as any)?.toggles?.multiColor, true);
  assert.equal((normalized as any)?.__schema, PROJECT_SCHEMA_ID);

  assert.equal(
    normalizeProjectData({ settings: { wardrobeType: 'sliding' }, toggles: { multiColor: true } } as any),
    null
  );
});
