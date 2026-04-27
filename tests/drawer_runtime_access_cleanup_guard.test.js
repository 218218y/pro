import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function stripNoise(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
}

const doorsAccess = [
  read('esm/native/runtime/doors_access.ts'),
  read('esm/native/runtime/doors_access_services.ts'),
  read('esm/native/runtime/doors_access_drawers.ts'),
  read('esm/native/runtime/doors_access_doors.ts'),
].join('\n');
const doorsRuntimeRaw = [
  read('esm/native/services/doors_runtime.ts'),
  read('esm/native/services/doors_runtime_visuals.ts'),
  read('esm/native/services/doors_runtime_visuals_doors.ts'),
  read('esm/native/services/doors_runtime_visuals_drawers.ts'),
].join('\n');
const canvasClickRaw = [
  read('esm/native/services/canvas_picking_click_flow.ts'),
  read('esm/native/services/canvas_picking_click_route.ts'),
  read('esm/native/services/canvas_picking_click_route_layout.ts'),
].join('\n');
const drawerModeRaw = [
  read('esm/native/services/canvas_picking_drawer_mode_flow.ts'),
  read('esm/native/services/canvas_picking_drawer_mode_flow_divider.ts'),
].join('\n');
const canvasBundle = stripNoise([canvasClickRaw, drawerModeRaw].join('\n'));
const bootstrapRaw = read('esm/native/builder/bootstrap.ts');
const bootstrapDrawerMetaRaw = read('esm/native/builder/bootstrap_drawer_meta.ts');
const bootstrap = stripNoise(bootstrapRaw);
const bootstrapDrawerMeta = stripNoise(bootstrapDrawerMetaRaw);

test('[drawer-runtime-access] runtime helper exposes canonical drawer service/runtime helpers', () => {
  assert.match(doorsAccess, /export function ensureDrawerService\(/);
  assert.match(doorsAccess, /export function getDrawerService\(/);
  assert.match(doorsAccess, /export function initDrawerRuntime\(/);
  assert.match(doorsAccess, /export function getDrawerMetaMap\(/);
  assert.match(doorsAccess, /export function setDrawerMetaEntry\(/);
  assert.match(doorsAccess, /export function setDrawerRebuildIntent\(/);
  assert.match(doorsAccess, /export function consumeDrawerRebuildIntent\(/);
});

test('[drawer-runtime-access] hot-path callers go through runtime/doors_access helpers', () => {
  assert.match(canvasClickRaw, /tryHandleCanvasDrawerModeClick\(\{/);
  assert.match(drawerModeRaw, /setDrawerRebuildIntent\(App, targetDrawerId\)/);
  assert.match(bootstrapDrawerMetaRaw, /consumeDrawerRebuildIntent\(App\)/);
  assert.doesNotMatch(canvasBundle, /App\.services\.drawer\.runtime/);
  assert.doesNotMatch(bootstrap, /App\.services\.drawer\.runtime/);
  assert.doesNotMatch(bootstrapDrawerMeta, /App\.services\.drawer\.runtime/);
});

test('[drawer-runtime-access] doors runtime uses centralized drawer meta/runtime helpers', () => {
  assert.match(doorsRuntimeRaw, /ensureDoorsService\(App\)/);
  assert.match(doorsRuntimeRaw, /resetDrawerMetaMap\(App\)/);
  assert.match(doorsRuntimeRaw, /setDrawerMetaEntry\(App, (?:d|drawer)\.id/);
  assert.match(doorsRuntimeRaw, /getDrawerMetaEntry\(App, sid\)/);
  assert.match(doorsRuntimeRaw, /initDrawerRuntime\(App\)/);
  assert.match(doorsRuntimeRaw, /ensureDrawerMetaMap\(App\)/);
  assert.match(doorsRuntimeRaw, /setPlatformHasInternalDrawers\(App, hasInternal\)/);
});
