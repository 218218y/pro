import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bundleSources,
  readSource,
  assertMatchesAll,
  assertMatchesAny,
  assertLacksAll,
} from './_source_bundle.js';

const notesTypes = readSource('../types/notes.ts', import.meta.url);
const typesIndex = readSource('../types/index.ts', import.meta.url);
const notesAccess = bundleSources(
  [
    '../esm/native/runtime/notes_access.ts',
    '../esm/native/runtime/notes_access_shared.ts',
    '../esm/native/runtime/notes_access_services.ts',
    '../esm/native/runtime/notes_access_actions.ts',
  ],
  import.meta.url
);
const notesService = bundleSources(
  [
    '../esm/native/ui/notes_service.ts',
    '../esm/native/ui/notes_service_shared.ts',
    '../esm/native/ui/notes_service_sanitize.ts',
    '../esm/native/ui/notes_service_runtime.ts',
  ],
  import.meta.url
);
const notesOverlayBundle = bundleSources(
  [
    '../esm/native/ui/react/notes/NotesOverlay.tsx',
    '../esm/native/ui/react/notes/notes_overlay_helpers.tsx',
    '../esm/native/ui/react/notes/notes_overlay_helpers_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_helpers_style.ts',
    '../esm/native/ui/react/notes/notes_overlay_helpers_services.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_note_card_preview.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card_toolbar.tsx',
  ],
  import.meta.url
);
const settingsBackup = readSource('../esm/native/ui/settings_backup.ts', import.meta.url);
const settingsBackupExport = readSource('../esm/native/ui/settings_backup_export.ts', import.meta.url);
const settingsBackupImport = readSource('../esm/native/ui/settings_backup_import.ts', import.meta.url);
const settingsBackupRuntime = readSource('../esm/native/ui/settings_backup_runtime.ts', import.meta.url);
const settingsBackupShared = readSource('../esm/native/ui/settings_backup_shared.ts', import.meta.url);
const settingsBackupSupport = readSource('../esm/native/ui/settings_backup_support.ts', import.meta.url);
const settingsBackupImportSupport = readSource(
  '../esm/native/ui/settings_backup_import_support.ts',
  import.meta.url
);
const storageAccess = readSource('../esm/native/runtime/storage_access.ts', import.meta.url);

test('[stageB] notes service seam uses shared typed notes surfaces', () => {
  assertMatchesAll(assert, typesIndex, [/export \* from '\.\/notes';/], 'typesIndex');
  assertMatchesAll(
    assert,
    notesTypes,
    [/export interface NotesServiceAppLike extends Partial<AppContainer>/],
    'notesTypes'
  );
  assertMatchesAny(
    assert,
    notesTypes,
    [
      /export interface NotesNamespaceLike extends AnyRecord/,
      /export interface NotesNamespaceLike extends UnknownRecord/,
    ],
    'notesTypes'
  );
  assertMatchesAll(
    assert,
    notesAccess,
    [
      /getNotesServiceMaybe\(App: unknown\): NotesNamespaceLike \| null/,
      /ensureNotesRuntime\(App: unknown\): NotesRuntimeNamespaceLike/,
    ],
    'notesAccess'
  );
  assertMatchesAll(
    assert,
    notesService,
    [
      /export type NotesNamespace = NotesNamespaceLike;/,
      /(?:MetaActionsNamespaceLike|NotesMetaActionsLike)/,
      /(?:const notesMeta = createNotesMetaBuilder\(App\);|const build = \(source: string, metaIn\?: ActionMetaLike\): ActionMetaLike => \{)/,
      /typeof metaNs\.noBuild === 'function' && typeof metaNs\.noHistory === 'function'/,
      /const seed = buildFallback\(source, metaIn\);/,
      /return metaNs\.noBuild\(metaNs\.noHistory\(seed,\s*source\),\s*source\);/,
      /notesNs\.persist = \(meta\?: (?:ActionMetaLike \| UnknownRecord|AnyRecord)\) => \{/,
      /const payload = notesMeta\.build\('notes:react',/,
      /typeof metaNs\.persist === 'function'/,
      /metaNs\.persist\(payload\)/,
    ],
    'notesService'
  );
  assertMatchesAll(
    assert,
    notesOverlayBundle,
    [/NotesNamespaceLike as NotesNamespace/],
    'notesOverlayBundle'
  );
  assertLacksAll(
    assert,
    notesOverlayBundle,
    [/from '\.\.\/\.\.\/notes_service\.js';[\s\S]*type NotesNamespace/],
    'notesOverlayBundle'
  );
});

test('[stageB] settings backup uses typed backup payload + storage seam helpers', () => {
  assertMatchesAll(
    assert,
    settingsBackup,
    [/settings_backup_export\.js/, /settings_backup_import\.js/],
    'settingsBackup'
  );
  assertMatchesAll(
    assert,
    settingsBackupExport,
    [/settings_backup_support\.js/, /settings_backup_runtime\.js/, /buildExportBackupData\(App\)/],
    'settingsBackupExport'
  );
  assertMatchesAll(
    assert,
    settingsBackupImport,
    [
      /settings_backup_import_support\.js/,
      /settings_backup_runtime\.js/,
      /const file = getImportFile\(event\);/,
    ],
    'settingsBackupImport'
  );
  assertMatchesAll(
    assert,
    settingsBackupRuntime,
    [/runAppActionFamilySingleFlight\(/, /runAppConfirmedActionFamilySingleFlight\(/],
    'settingsBackupRuntime'
  );
  assertMatchesAll(
    assert,
    `${settingsBackupShared}\n${readSource('../esm/native/ui/settings_backup_shared_contracts.ts', import.meta.url)}\n${readSource('../esm/native/ui/settings_backup_shared_collections.ts', import.meta.url)}`,
    [
      /export type SettingsBackupData = \{/,
      /export function isSettingsBackupData\(v: unknown\): v is SettingsBackupData/,
      /export function parseSettingsBackup\(text: string\): SettingsBackupData \| null \{/,
    ],
    'settingsBackupShared'
  );
  assertMatchesAll(
    assert,
    settingsBackupSupport,
    [
      /getStorageKey\(App, 'SAVED_MODELS', 'wardrobeSavedModels'\)/,
      /getStorageKey\(App, 'SAVED_COLORS', 'wardrobeSavedColors'\)/,
      /export function buildExportBackupData\(App: AppContainer\): SettingsBackupData \{/,
    ],
    'settingsBackupSupport'
  );
  assertMatchesAll(
    assert,
    settingsBackupImportSupport,
    [/readFileTextResultViaBrowser\(file, \{/, /export function applyImportedStorageSettings\(/],
    'settingsBackupImportSupport'
  );
  assertLacksAll(
    assert,
    settingsBackup,
    [/App && \(App as any\)\.services/, /\(data as any\)\./],
    'settingsBackup'
  );
  assertMatchesAll(
    assert,
    storageAccess,
    [/getStorageServiceMaybe\(App: unknown\): StorageNamespaceLike \| null/],
    'storageAccess'
  );
});
