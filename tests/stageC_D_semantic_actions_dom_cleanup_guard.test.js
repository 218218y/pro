import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';
import { readServicesApiPublicSurface } from './_services_api_bundle.js';

function read(rel) {
  return normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
}

const stateApi = read('esm/native/kernel/state_api.ts');
const stateApiConfigNamespace = [
  read('esm/native/kernel/state_api_config_namespace.ts'),
  read('esm/native/kernel/state_api_config_namespace_core.ts'),
  read('esm/native/kernel/state_api_config_namespace_maps.ts'),
].join('\n');
const stateApiShared = read('esm/native/kernel/state_api_shared.ts');
const actionsAccess = [
  read('esm/native/runtime/actions_access.ts'),
  read('esm/native/runtime/actions_access_mutations.ts'),
].join('\n');
const notesService = [
  read('esm/native/ui/notes_service.ts'),
  read('esm/native/ui/notes_service_shared.ts'),
  read('esm/native/ui/notes_service_sanitize.ts'),
  read('esm/native/ui/notes_service_runtime.ts'),
].join('\n');
const projectIo = read('esm/native/io/project_io_orchestrator.ts');
const projectIoLoadOps = [
  read('esm/native/io/project_io_orchestrator_load_ops.ts'),
  read('esm/native/io/project_io_orchestrator_load_file.ts'),
  read('esm/native/io/project_io_orchestrator_project_load.ts'),
  read('esm/native/io/project_io_orchestrator_restore.ts'),
].join('\n');
const domAccess = read('esm/native/runtime/dom_access.ts');
const exportCanvas = [
  read('esm/native/ui/export_canvas.ts'),
  read('esm/native/ui/export/export_canvas_shared.ts'),
  read('esm/native/ui/export/export_canvas_core.ts'),
  read('esm/native/ui/export/export_canvas_core_shared.ts'),
  read('esm/native/ui/export/export_canvas_core_canvas.ts'),
  read('esm/native/ui/export/export_canvas_core_feedback.ts'),
  read('esm/native/ui/export/export_canvas_scene.ts'),
  read('esm/native/ui/export/export_canvas_viewport.ts'),
  read('esm/native/ui/export/export_canvas_delivery.ts'),
  read('esm/native/ui/export/export_canvas_delivery_shared.ts'),
  read('esm/native/ui/export/export_canvas_delivery_logo.ts'),
  read('esm/native/ui/export/export_canvas_delivery_download.ts'),
  read('esm/native/ui/export/export_canvas_delivery_clipboard.ts'),
].join('\n');
const servicesApi = normalizeWhitespace(readServicesApiPublicSurface(import.meta.url));
const runtimeApi = read('esm/native/runtime/api.ts');
const kernelTypes = read('types/kernel.ts');
const overlayApp = read('esm/native/ui/react/overlay_app.tsx');
const bootReactUi = read('esm/native/ui/react/boot_react_ui.tsx');
const renderContextAccess = read('esm/native/runtime/render_context_access.ts');

test('[stageC] semantic config actions exist for notes + project snapshot restores', () => {
  assert.match(
    kernelTypes,
    /applyProjectSnapshot\?: \(snapshot: UnknownRecord, meta\?: ActionMetaLike\) => unknown;/
  );
  assert.match(kernelTypes, /applyPaintSnapshot\?: \(\s*colors: unknown,/);
  assert.match(stateApiShared, /export const PROJECT_CONFIG_REPLACE_KEYS: Record<string, true> = \{/);
  assert.match(stateApi, /installStateApiConfigNamespace\(\{/);
  assert.match(
    stateApiConfigNamespace,
    /configNs\.applyProjectSnapshot = function applyProjectSnapshot\(snapshot: UnknownRecord, meta\?: ActionMetaLike\)/
  );
  assert.match(stateApiConfigNamespace, /configNs\.applyPaintSnapshot = function applyPaintSnapshot\(/);
  assert.match(actionsAccess, /export function setSavedNotesViaActions\(/);
  assert.match(actionsAccess, /export function applyProjectConfigSnapshotViaActions\(/);
  assert.match(actionsAccess, /export function applyProjectConfigSnapshotViaActionsOrThrow\(/);
  assert.match(
    notesService,
    /export function patchSavedNotes\(App: NotesServiceApp, notes: import\('\.\.\/\.\.\/\.\.\/types'\)\.SavedNote\[], meta: ActionMetaLike\): void|export function patchSavedNotes\(App: NotesServiceApp, notes: .*SavedNote\[], meta: ActionMetaLike\): void/
  );
  assert.match(notesService, /setSavedNotesViaActions\(/);
  assert.match(notesService, /Missing actions\.config\.setSavedNotes/);
  assert.match(
    projectIoLoadOps,
    /applyProjectConfigSnapshotViaActionsOrThrow\(\s*App,\s*cfg,\s*metaNoBuild,\s*'project\.load config apply'\s*\)/
  );
  assert.doesNotMatch(notesService, /applyConfigPatch\(App, \{ savedNotes: notes \}, meta\)/);
  assert.doesNotMatch(projectIo, /cfgPatchWithReplaceKeys\(__cfg, /);
});

test('[stageD] export + overlay + boot DOM access is centralized through runtime DOM helpers', () => {
  assert.match(domAccess, /export function getHeaderLogoImageMaybe\(/);
  assert.match(domAccess, /export function getViewerContainerMaybe\(/);
  assert.match(domAccess, /export function getReactMountRootMaybe\(/);
  assert.match(domAccess, /export function ensureToastContainerMaybe\(/);
  assert.match(domAccess, /\[data-wp-logo="1"\]/);
  assert.match(domAccess, /'\.header-logo'/);
  assert.match(runtimeApi, /getHeaderLogoImageMaybe/);
  assert.match(runtimeApi, /getViewerContainerMaybe/);
  assert.match(runtimeApi, /getReactMountRootMaybe/);
  assert.match(runtimeApi, /ensureToastContainerMaybe/);
  assert.match(servicesApi, /getHeaderLogoImageMaybe/);
  assert.match(servicesApi, /getViewerContainerMaybe/);
  assert.match(servicesApi, /getReactMountRootMaybe/);
  assert.match(servicesApi, /ensureToastContainerMaybe/);
  assert.match(exportCanvas, /getHeaderLogoImageMaybe/);
  assert.match(exportCanvas, /function getExportLogoImage\(/);
  assert.match(exportCanvas, /function drawExportLogo\(/);
  assert.doesNotMatch(exportCanvas, /\.header-logo/);
  assert.doesNotMatch(exportCanvas, /getQs\(App\)/);
  assert.match(overlayApp, /ensureToastContainerMaybe\(app\)/);
  assert.doesNotMatch(overlayApp, /doc\.getElementById\('toastContainer'\)/);
  assert.match(bootReactUi, /getReactMountRootMaybe\(app, id\)/);
  assert.doesNotMatch(bootReactUi, /doc\.getElementById\(id\)/);
  assert.match(renderContextAccess, /getViewerContainerMaybe\(App\)/);
  assert.doesNotMatch(renderContextAccess, /getElementById\('viewer-container'\)/);
});
