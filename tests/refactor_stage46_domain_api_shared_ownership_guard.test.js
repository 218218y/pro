import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.trim().split(/\r?\n/).length;
}

test('stage 46 domain API shared ownership split is anchored', () => {
  const facade = read('esm/native/kernel/domain_api_surface_sections_shared.ts');
  const contracts = read('esm/native/kernel/domain_api_surface_sections_contracts.ts');
  const prefixedMaps = read('esm/native/kernel/domain_api_surface_sections_prefixed_maps.ts');
  const mapWrites = read('esm/native/kernel/domain_api_surface_sections_map_writes.ts');
  const removedDoors = read('esm/native/kernel/domain_api_surface_sections_removed_doors.ts');

  assert.ok(lineCount(facade) <= 70, 'domain API shared seam must stay a small compatibility facade');
  for (const modulePath of [
    './domain_api_surface_sections_contracts.js',
    './domain_api_surface_sections_prefixed_maps.js',
    './domain_api_surface_sections_map_writes.js',
    './domain_api_surface_sections_removed_doors.js',
  ]) {
    assert.ok(facade.includes(modulePath), `shared facade must delegate to ${modulePath}`);
  }
  for (const implementationNeedle of [
    'function readOwnMapValue',
    'function isPlainDomainValueObject',
    'export function canonicalRemovedDoorPartId(',
    'export function commitCanonicalPrefixedMapValue(',
    'export function writeSimpleMapValue(',
  ]) {
    assert.equal(
      facade.includes(implementationNeedle),
      false,
      `shared facade must not own implementation detail ${implementationNeedle}`
    );
  }

  assert.ok(contracts.includes('export interface DomainApiSurfaceSectionsContext'));
  assert.ok(contracts.includes('export interface DomainApiSurfaceSectionsState'));
  assert.ok(contracts.includes('export const DOMAIN_API_SECTION_KEYS'));
  assert.ok(contracts.includes('export function uniqueSurfaceTargets'));
  assert.equal(contracts.includes('writeMapKey('), false, 'contracts owner must not write maps');

  assert.ok(prefixedMaps.includes('export interface PrefixedMapSemantics'));
  assert.ok(prefixedMaps.includes('export const splitDoorMapSemantics'));
  assert.ok(prefixedMaps.includes('export const grooveMapSemantics'));
  assert.ok(prefixedMaps.includes('export function readPrefixedToggleMapFlag'));
  assert.equal(
    prefixedMaps.includes('writeMapKey('),
    false,
    'prefixed-map owner must stay read/normalization only'
  );

  assert.ok(mapWrites.includes('export function areDomainMapValuesEquivalent'));
  assert.ok(mapWrites.includes('export function readDomainMapValue'));
  assert.ok(mapWrites.includes('export function shouldSkipSimpleMapWrite'));
  for (const retiredWriterNeedle of [
    'export function shouldSkipCanonicalPrefixedMapCommit',
    'export function commitCanonicalPrefixedMapValue',
    'export function writeSimpleMapValue',
    'writeCanonicalMapValueDirect',
    'patchSimpleWritableMapEntryFromOwner',
    'patchConfigMapValue',
    '_cfgMapPatch',
    'writeMapKey(',
  ]) {
    assert.equal(
      mapWrites.includes(retiredWriterNeedle),
      false,
      `domain map write helper owner must not restore retired generic writer ${retiredWriterNeedle}`
    );
  }
  assert.equal(
    mapWrites.includes('canonicalRemovedDoorPartId'),
    false,
    'map write owner must not own door-id rules'
  );

  assert.ok(removedDoors.includes('export function canonicalRemovedDoorPartId'));
  assert.ok(removedDoors.includes('export function listRemovedDoorLookupKeys'));
  assert.equal(
    removedDoors.includes('listRemovedDoorCleanupKeys'),
    false,
    'removed-door owner must not restore write-time alias cleanup'
  );
  assert.equal(
    removedDoors.includes('writeMapKey('),
    false,
    'removed-door owner must stay a pure key-policy owner'
  );
});
