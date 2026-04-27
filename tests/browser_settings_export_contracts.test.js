import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const settingsBackup = readSource('../esm/native/ui/settings_backup.ts', import.meta.url);
const settingsBackupExport = readSource('../esm/native/ui/settings_backup_export.ts', import.meta.url);
const settingsBackupImport = readSource('../esm/native/ui/settings_backup_import.ts', import.meta.url);
const settingsBackupRuntime = readSource('../esm/native/ui/settings_backup_runtime.ts', import.meta.url);
const settingsBackupShared = readSource('../esm/native/ui/settings_backup_shared.ts', import.meta.url);
const settingsBackupSupport = readSource('../esm/native/ui/settings_backup_support.ts', import.meta.url);
const settingsBackupSharedContracts = readSource(
  '../esm/native/ui/settings_backup_shared_contracts.ts',
  import.meta.url
);
const settingsBackupSharedCollections = readSource(
  '../esm/native/ui/settings_backup_shared_collections.ts',
  import.meta.url
);
const settingsBackupSharedInput = readSource(
  '../esm/native/ui/settings_backup_shared_input.ts',
  import.meta.url
);
const settingsBackupImportSupport = readSource(
  '../esm/native/ui/settings_backup_import_support.ts',
  import.meta.url
);
const settingsBackupContracts = readSource('../esm/native/ui/settings_backup_contracts.ts', import.meta.url);
const settingsBackupFeedback = readSource(
  '../esm/native/ui/settings_backup_action_feedback.ts',
  import.meta.url
);
const settingsBackupPanel = readSource(
  '../esm/native/ui/react/panels/SettingsBackupPanel.tsx',
  import.meta.url
);
const uiRuntime = readSource('../esm/native/ui/runtime/ui_runtime.ts', import.meta.url);
const browserSurface = readSource('../esm/native/adapters/browser/surface.ts', import.meta.url);
const browserDom = readSource('../esm/native/adapters/browser/dom.ts', import.meta.url);
const boardFactory = readSource('../esm/native/builder/board_factory.ts', import.meta.url);
const browserEnv = readSource('../esm/native/adapters/browser/env.ts', import.meta.url);
const browserEnvShared = readSource('../esm/native/adapters/browser/env_shared.ts', import.meta.url);
const browserEnvClipboard = readSource('../esm/native/adapters/browser/env_clipboard.ts', import.meta.url);
const browserFileDownload = readSource('../esm/native/ui/browser_file_download.ts', import.meta.url);
const notesExport = readSource('../esm/native/ui/notes_export.ts', import.meta.url);
const exportCanvas = readSource('../esm/native/ui/export_canvas.ts', import.meta.url);
const pdfRuntime = bundleSources(
  [
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_window.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_api.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_loader.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_pdfjs.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const pdfImport = readSource('../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import.ts', import.meta.url);

const browserPdfBundle = bundleSources(
  [
    '../types/state.ts',
    '../types/app.ts',
    '../esm/native/adapters/browser/env.ts',
    '../esm/native/adapters/browser/ui_ops.ts',
    '../esm/native/runtime/browser_env.ts',
    '../esm/native/runtime/platform_access.ts',
    '../esm/native/platform/platform.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_extract.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_pages.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_interactive.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_attachment.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

test('settings and browser surfaces keep typed readers instead of loose bag casts', () => {
  assertMatchesAll(
    assert,
    settingsBackup,
    [
      /export \{ exportSystemSettings \} from ['\"]\.\/settings_backup_export\.js['\"];/,
      /export \{ importSystemSettings \} from ['\"]\.\/settings_backup_import\.js['\"];/,
    ],
    'settingsBackup'
  );
  assertLacksAll(
    assert,
    settingsBackup,
    [
      /function isRecord\(/,
      /function buildExportBackupData\(/,
      /function readBackupFileText\(/,
      /function mergeImportedSavedColors\(/,
      /function applyImportedStorageSettings\(/,
      /runAppActionFamilySingleFlight\(/,
      /runAppConfirmedActionFamilySingleFlight\(/,
      /as AppContainer/,
    ],
    'settingsBackup'
  );

  assertMatchesAll(
    assert,
    settingsBackupExport,
    [
      /from ['\"]\.\/settings_backup_support\.js['\"]/,
      /from ['\"]\.\/settings_backup_runtime\.js['\"]/,
      /buildExportBackupData\(App\)/,
    ],
    'settingsBackupExport'
  );

  assertMatchesAll(
    assert,
    settingsBackupImport,
    [
      /from ['\"]\.\/settings_backup_import_support\.js['\"]/,
      /from ['\"]\.\/settings_backup_runtime\.js['\"]/,
      /const file = getImportFile\(event\);/,
      /readBackupFileTextSafe\(file\)/,
    ],
    'settingsBackupImport'
  );

  assertMatchesAll(
    assert,
    settingsBackupRuntime,
    [
      /runAppActionFamilySingleFlight\(/,
      /runAppConfirmedActionFamilySingleFlight\(/,
      /const settingsBackupFlights = new WeakMap/,
    ],
    'settingsBackupRuntime'
  );

  assertMatchesAll(
    assert,
    settingsBackupShared,
    [
      /export \* from ['"]\.\/settings_backup_shared_contracts\.js['"];/,
      /export \* from ['"]\.\/settings_backup_shared_collections\.js['"];/,
      /export \* from ['"]\.\/settings_backup_shared_input\.js['"];/,
    ],
    'settingsBackupShared'
  );

  assertMatchesAll(
    assert,
    settingsBackupSharedContracts,
    [
      /export type SettingsBackupData = \{/,
      /export function cloneJsonValue<[^>]+>\(value: T\): T \{/,
      /export function sanitizeSettingsBackupJsonText\(text: string\): string \{/,
    ],
    'settingsBackupSharedContracts'
  );

  assertMatchesAll(
    assert,
    settingsBackupSharedCollections,
    [
      /export function isSettingsBackupData\(v: unknown\): v is SettingsBackupData/,
      /export function readSavedModelList\(value: unknown\): SavedModelLike\[] \{/,
      /export function parseSettingsBackup\(text: string\): SettingsBackupData \| null \{/,
    ],
    'settingsBackupSharedCollections'
  );

  assertMatchesAll(
    assert,
    settingsBackupSharedInput,
    [
      /export function getImportFile\(input: unknown\): File \| null \{/,
      /export function clearInputValue\(input: unknown\): void \{/,
    ],
    'settingsBackupSharedInput'
  );

  assertMatchesAll(
    assert,
    settingsBackupSupport,
    [
      /assertApp\(app, 'ui\/settings_backup'\)/,
      /getStorageKey\(App, 'SAVED_MODELS', 'wardrobeSavedModels'\)/,
      /getStorageKey\(App, 'SAVED_COLORS', 'wardrobeSavedColors'\)/,
      /export function buildExportBackupData\(App: AppContainer\): SettingsBackupData \{/,
    ],
    'settingsBackupSupport'
  );

  assertMatchesAll(
    assert,
    settingsBackupImportSupport,
    [
      /export async function readBackupFileTextSafe\(file: File\): Promise<ReadBackupFileTextResult> \{/,
      /readFileTextResultViaBrowser\(file, \{/,
      /export function mergeImportedSavedColors\(/,
      /export function applyImportedStorageSettings\(/,
    ],
    'settingsBackupImportSupport'
  );

  assertMatchesAll(
    assert,
    settingsBackupContracts,
    [
      /export type SettingsBackupActionKind = 'export' \| 'import';/,
      /export type SettingsBackupExportFailureReason = 'download-unavailable' \| 'busy' \| 'error';/,
      /export type SettingsBackupImportFailureReason =/,
      /export type SettingsBackupActionResult = SettingsBackupSuccessResult \| SettingsBackupFailureResult;/,
    ],
    'settingsBackupContracts'
  );

  assertMatchesAll(
    assert,
    settingsBackupFeedback,
    [
      /export function getSettingsBackupActionToast\(/,
      /export function reportSettingsBackupActionResult\(/,
      /case 'invalid-json':/,
      /case 'download-unavailable':/,
    ],
    'settingsBackupFeedback'
  );

  assertMatchesAll(
    assert,
    settingsBackupPanel,
    [
      /data-testid=\"settings-backup-panel\"/,
      /reportSettingsBackupActionResult\(fb, result\);/,
      /void exportSystemSettings\(app\)\.then\(handleResult\);/,
      /void importSystemSettings\(app, file \|\| e\)\.then\(handleResult\);/,
    ],
    'settingsBackupPanel'
  );

  assertMatchesAll(
    assert,
    uiRuntime,
    [
      /function isUiRuntime\(value: unknown\): value is UiRuntime \{/,
      /function isDisposerMap\(value: unknown\): value is DisposerMap \{/,
      /Reflect\.apply\(fn, undefined, \[\]\)/,
    ],
    'uiRuntime'
  );
  assertLacksAll(
    assert,
    uiRuntime,
    [/as UiRuntime/, /as \(\) => void/, /as Record<string, Disposer>/],
    'uiRuntime'
  );

  assertMatchesAll(
    assert,
    browserSurface,
    [
      /ensureBrowserSurface\(App\)/,
      /installBrowserDialogsAdapter\(App\);/,
      /installBrowserEnvAdapter\(App\);/,
      /installDoorStatusCssAdapter\(App\);/,
    ],
    'browserSurface'
  );
  assertLacksAll(
    assert,
    browserSurface,
    [/as UnknownBag/, /App as AppContainer & \{ browser\?: unknown \}/],
    'browserSurface'
  );

  assertMatchesAll(
    assert,
    browserDom,
    [
      /type CanvasFactory = (?:\(w\?: number, h\?: number\)|NonNullable<PlatformNamespace\['createCanvas'\]>)/,
      /function createCanvasFactory\(doc: Document\): CanvasFactory \{/,
      /installStableSurfaceMethod<CanvasFactory>\(platform, 'createCanvas', '__wpCreateCanvas', \(\) => \{/,
    ],
    'browserDom'
  );
  assertLacksAll(assert, browserDom, [/App as UnknownBag/, /const next = \{\} as UnknownBag/], 'browserDom');

  assertMatchesAll(
    assert,
    boardFactory,
    [
      /function readBoardFactoryArgs\(args: unknown\): BoardFactoryArgs \| null \{/,
      /function attachBoardContext\(/,
      /const ro = getBuilderRenderOps\(App\);/,
    ],
    'boardFactory'
  );
  assertLacksAll(
    assert,
    boardFactory,
    [/getBuilderRenderOps\(App\) as RenderOpsLike/, /const App = a\.App as AppContainer/],
    'boardFactory'
  );
});

test('export, browser, and pdf flows stay on services-barrel and typed callable seams', () => {
  assertMatchesAll(
    assert,
    exportCanvas,
    [
      /from ['"]\.\.\/services\/api\.js['"]/,
      /createExportOrderPdfOps\(/,
      /createExportCanvasWorkflowOps\(/,
      /export const buildOrderPdfInteractiveBlobFromDraft\s*=\s*__orderPdfOps\.buildOrderPdfInteractiveBlobFromDraft;/,
      /export const exportRenderAndSketch\s*=\s*__workflowOps\.exportRenderAndSketch;/,
    ],
    'exportCanvas'
  );
  assertLacksAll(assert, exportCanvas, [/from ['"]\.\.\/runtime\//], 'exportCanvas');

  assertMatchesAll(assert, notesExport, [/from ['"]\.\.\/services\/api\.js['"]/], 'notesExport');
  assertLacksAll(assert, notesExport, [/from ['"]\.\.\/runtime\//], 'notesExport');

  assertMatchesAll(
    assert,
    settingsBackup,
    [/settings_backup_export\.js/, /settings_backup_import\.js/],
    'settingsBackup imports'
  );
  assertMatchesAll(
    assert,
    settingsBackupExport,
    [/from ['"]\.\/settings_backup_support\.js['"]/, /from ['"]\.\/settings_backup_runtime\.js['"]/],
    'settingsBackup export imports'
  );
  assertMatchesAll(
    assert,
    settingsBackupImport,
    [
      /from ['"]\.\/settings_backup_import_support\.js['"]/,
      /from ['"]\.\/settings_backup_runtime\.js['"]/,
      /from ['"]\.\.\/services\/api\.js['"]/,
    ],
    'settingsBackup import imports'
  );
  assertLacksAll(assert, settingsBackup, [/from ['"]\.\.\/runtime\/api\.js['"]/], 'settingsBackup imports');

  assertMatchesAll(
    assert,
    browserEnv,
    [/env_shared\.js/, /env_surface\.js/, /env_clipboard\.js/],
    'browserEnv'
  );
  assertMatchesAll(
    assert,
    browserEnvShared,
    [
      /export type DelayPromise = Promise<boolean> & \{ cancel\?: \(\) => void \};/,
      /getDepsNamespaceMaybe<Partial<BrowserDeps>>\(App, 'browser'\)/,
    ],
    'browserEnvShared'
  );
  assertMatchesAll(
    assert,
    browserEnvClipboard,
    [
      /export type ClipboardWriteTextLike = NonNullable<BrowserEnvSurface\['clipboardWriteText'\]>;/,
      /export function installBrowserClipboardSurface\(/,
    ],
    'browserEnvClipboard'
  );
  assertMatchesAll(assert, pdfRuntime, [/getFn<T>\(obj: unknown, key: string\): T \| null/], 'pdfRuntime');
  assertMatchesAll(
    assert,
    pdfImport,
    [
      /order_pdf_overlay_pdf_import_extract\.js/,
      /order_pdf_overlay_pdf_import_pages\.js/,
      /order_pdf_overlay_pdf_import_interactive\.js/,
    ],
    'pdfImport'
  );
  assertMatchesAll(
    assert,
    browserFileDownload,
    [
      /export function downloadTextResultViaBrowser\(/,
      /export function downloadJsonTextResultViaBrowser\(/,
      /export function downloadJsonObjectResultViaBrowser\(/,
      /triggerBlobDownloadResultViaBrowser\(/,
    ],
    'browserFileDownload'
  );

  assertLacksAll(assert, browserPdfBundle, [/\.\.\.args:\s*unknown\[\]/], 'browserPdfBundle');
});
