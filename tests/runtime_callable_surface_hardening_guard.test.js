import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { normalizeWhitespace } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const actionsAccess = [
  fs.readFileSync(path.join(process.cwd(), 'esm/native/runtime/actions_access.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/runtime/actions_access_core.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/runtime/actions_access_domains.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/runtime/actions_access_mutations.ts'), 'utf8'),
].join('\n');
const runtimeRecord = fs.readFileSync(path.join(process.cwd(), 'esm/native/runtime/record.ts'), 'utf8');
const exportCanvas = [
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export_canvas.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_shared.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_core.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_core_shared.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_core_canvas.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_core_feedback.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_scene.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_viewport.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_viewport_shared.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_viewport_camera.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_viewport_refs.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_delivery.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_delivery_shared.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/native/ui/export/export_canvas_delivery_logo.ts'), 'utf8'),
  fs.readFileSync(
    path.join(process.cwd(), 'esm/native/ui/export/export_canvas_delivery_download.ts'),
    'utf8'
  ),
  fs.readFileSync(
    path.join(process.cwd(), 'esm/native/ui/export/export_canvas_delivery_clipboard.ts'),
    'utf8'
  ),
].join('\n');
const exportOrderPdfOps = fs.readFileSync(
  path.join(process.cwd(), 'esm/native/ui/export/export_order_pdf_ops.ts'),
  'utf8'
);
const entryMain = [
  fs.readFileSync(path.join(process.cwd(), 'esm/entry_pro_main.ts'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'esm/entry_pro_main_shared.ts'), 'utf8'),
].join('\n');
const kernelTypes = fs.readFileSync(path.join(process.cwd(), 'types/kernel.ts'), 'utf8');
const buildTypes = readBuildTypesBundle(import.meta.url);
const commonTypes = fs.readFileSync(path.join(process.cwd(), 'types/common.ts'), 'utf8');

const actionsAccessNorm = normalizeWhitespace(actionsAccess);
const runtimeRecordNorm = normalizeWhitespace(runtimeRecord);
const exportCanvasNorm = normalizeWhitespace(exportCanvas);
const exportOrderPdfOpsNorm = normalizeWhitespace(exportOrderPdfOps);
const entryMainNorm = normalizeWhitespace(entryMain);
const kernelTypesNorm = normalizeWhitespace(kernelTypes);
const buildTypesNorm = normalizeWhitespace(buildTypes);
const commonTypesNorm = normalizeWhitespace(commonTypes);

test('runtime/export callable seams use canonical callable contracts instead of legacy unknown-fn aliases', () => {
  assert.match(commonTypesNorm, /export type UnknownArgs = readonly unknown\[\];/);
  assert.match(
    commonTypesNorm,
    /export type UnknownCallable<Args extends UnknownArgs = UnknownArgs, Result = unknown> = \(\.\.\.args: Args\) => Result;/
  );
  assert.match(
    commonTypesNorm,
    /export type NullableUnknownCallable<Args extends UnknownArgs = UnknownArgs, Result = unknown,> = UnknownCallable<Args, Result> \| null;/
  );
  assert.doesNotMatch(commonTypes, /export type AnyRecord =/);
  assert.doesNotMatch(commonTypes, /export type UnknownFn =/);
  assert.doesNotMatch(commonTypes, /export type NullableUnknownFn =/);

  assert.match(kernelTypesNorm, /export type SaveProjectAction = \(\) => unknown;/);
  assert.match(kernelTypesNorm, /saveProject\?: SaveProjectAction;/);
  assert.match(buildTypesNorm, /export type BuilderArgs = readonly unknown\[\];/);
  assert.match(
    buildTypesNorm,
    /export type BuilderCallable<Args extends BuilderArgs = BuilderArgs, Result = unknown> = \(\.\.\.args: Args\) => Result;/
  );
  assert.doesNotMatch(buildTypes, /BuilderUnknownFn/);
  assert.doesNotMatch(buildTypes, /NullableBuilderUnknownFn/);

  assert.match(actionsAccess, /SaveProjectAction/);
  assert.match(actionsAccess, /UnknownRecord/);
  assert.match(actionsAccessNorm, /type ActionCallable = UnknownCallable;/);
  assert.match(
    actionsAccessNorm,
    /export function getSaveProjectAction\(App: (?:AppContainer|unknown)\): SaveProjectAction \| null/
  );
  assert.doesNotMatch(actionsAccess, /\bUnknownFn\b/);

  assert.match(runtimeRecordNorm, /type CallableLike = UnknownCallable;/);
  assert.match(runtimeRecordNorm, /export function getFn<T extends CallableLike = CallableLike>\(/);
  assert.doesNotMatch(runtimeRecord, /\bUnknownFn\b/);

  assert.match(exportCanvasNorm, /type CallableLike = UnknownCallable;/);
  assert.match(exportCanvasNorm, /function isObjectLike\(v: unknown\): v is object \| CallableLike \{/);
  assert.match(
    exportCanvasNorm,
    /function callFn<Args extends readonly unknown\[\] = readonly unknown\[\], T = unknown>\(/
  );
  assert.doesNotMatch(exportCanvas, /\bUnknownFn\b/);

  assert.match(exportOrderPdfOpsNorm, /type CallableLike = UnknownCallable;/);
  assert.match(
    exportOrderPdfOpsNorm,
    /getFn: <T extends CallableLike = CallableLike>\(obj: unknown, key: string\) => T \| null;/
  );
  assert.doesNotMatch(exportOrderPdfOps, /\bUnknownFn\b/);

  assert.match(entryMainNorm, /type NoArgCallback = \(\) => unknown;/);
  assert.match(
    entryMainNorm,
    /function getNoArgMethod\(value: unknown, name: string\): NoArgCallback \| null \{/
  );
  assert.doesNotMatch(entryMain, /\bUnknownFn\b/);
});
