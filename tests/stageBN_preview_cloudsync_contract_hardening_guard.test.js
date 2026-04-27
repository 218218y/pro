import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readBuildTypesBundle } from './_build_types_bundle.js';

function read(rel) {
  return fs.readFileSync(path.resolve(rel), 'utf8');
}

test('stageBN: preview contracts expose typed domain shapes instead of raw unknown bags', () => {
  const buildTypes = readBuildTypesBundle(import.meta.url);
  assert.match(buildTypes, /export interface SketchPlacementPreviewArgsLike extends UnknownRecord \{/);
  assert.match(buildTypes, /drawers\?: PreviewDrawerEntryLike\[\] \| null;/);
  assert.match(buildTypes, /export interface InteriorLayoutHoverPreviewArgsLike extends UnknownRecord \{/);
  assert.match(buildTypes, /storageBarrier\?: PreviewStorageBarrierEntryLike \| null;/);

  const previewContracts = read('esm/native/builder/render_preview_ops_contracts.ts');
  assert.match(
    previewContracts,
    /export type SketchPlacementPreviewArgs = SketchPlacementPreviewArgsLike & PreviewValueRecord;/
  );
  assert.match(
    previewContracts,
    /export type InteriorLayoutHoverPreviewArgs = InteriorLayoutHoverPreviewArgsLike & PreviewValueRecord;/
  );
  assert.doesNotMatch(previewContracts, /kind\?: unknown;/);
  assert.doesNotMatch(previewContracts, /shelfYs\?: unknown;/);
});
