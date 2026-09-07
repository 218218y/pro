import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('react background warmup only preloads the stable sidebar shell chunk', () => {
  const source = read('esm/native/ui/react/background_warmup.ts');
  assert.match(source, /warmDeferredSidebarTabsChunk\(\)/);
  assert.match(source, /const tasks:\s*WarmTask\[\]\s*=\s*\[\(\) => warmDeferredSidebarTabsChunk\(\)\];/);
  assert.match(
    source,
    /export function warmOrderPdfOverlayChunk\(\): Promise<void> \{\s*return Promise\.resolve\(\);\s*\}/s
  );

  assert.doesNotMatch(source, /warmExportCanvasModule/);
  assert.doesNotMatch(source, /warmOrderPdfEditorOpenPath/);
  assert.doesNotMatch(source, /pdfjs-dist\/build\/pdf\.worker/);
  assert.doesNotMatch(source, /fetchFirstOk/);
  assert.doesNotMatch(source, /OrderPdfInPlaceEditorOverlay\.js'\)/);
});

test('sidebar intent prefetch warms the selected tab and shared interior picking extension without startup eager-loading', () => {
  const shared = read('esm/native/ui/react/sidebar_shared.ts');
  const deferred = read('esm/native/ui/react/tabs/DeferredSidebarTabs.tsx');
  const warmup = read('esm/native/ui/react/background_warmup.ts');

  assert.match(shared, /tabId === 'interior' \|\| tabId === 'sketch'/);
  assert.match(shared, /loadCanvasPickingInteriorExtension\(\)\.catch/);
  assert.match(shared, /mod\.prefetchDeferredSidebarTabView\(tabId\)/);

  assert.match(deferred, /export function prefetchDeferredSidebarTabView\(/);
  assert.match(deferred, /tabId === 'sketch'[\s\S]*loadSketchTabViewModule\(\)/);
  assert.match(deferred, /tabId === 'interior'[\s\S]*loadInteriorTabViewModule\(\)/);
  assert.match(deferred, /tabId === 'design'[\s\S]*loadDesignTabViewModule\(\)/);
  assert.match(deferred, /tabId === 'settings'[\s\S]*loadSettingsTabModule\(\)/);

  assert.doesNotMatch(warmup, /loadCanvasPickingInteriorExtension/);
});

test('settings/sidebar intent does not prefetch export canvas chunks', () => {
  const source = read('esm/native/ui/react/use_sidebar_view_state.ts');
  assert.doesNotMatch(source, /warmExportCanvasModule/);
  assert.doesNotMatch(source, /tabId === 'settings'[\s\S]*export_canvas/);
});

test('on-demand export and pdf module imports request stale asset recovery instead of silently failing', () => {
  const recovery = read('esm/native/ui/react/release_asset_recovery.ts');
  assert.match(recovery, /export function isRecoverableModuleImportFailure\(/);
  assert.match(recovery, /Failed to fetch dynamically imported module/);
  assert.match(recovery, /Expected a JavaScript\(\?:-or-Wasm\)\? module script/);
  assert.match(recovery, /__WP_RECOVER_FROM_STALE_ASSET__/);

  const exportActions = read('esm/native/ui/react/export_actions.ts');
  assert.match(exportActions, /requestReleaseAssetRecovery/);
  assert.match(exportActions, /ensureExportModule\(app\)/);
  assert.match(exportActions, /export-canvas-module/);
  assert.match(exportActions, /export-action-module/);

  const pdfLoader = read('esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_loader.ts');
  assert.match(pdfLoader, /requestReleaseAssetRecovery/);
  assert.match(pdfLoader, /order-pdf-export-module/);

  const lazyBoundary = read('esm/native/ui/react/components/LazyErrorBoundary.tsx');
  assert.match(lazyBoundary, /requestReleaseAssetRecovery\(this\.props\.app, error, 'lazy-chunk-load'\)/);
  assert.match(lazyBoundary, /tryRecoverOrReload/);
});
