import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const sectionsFacade = readSource('../esm/native/kernel/domain_api_surface_sections.ts', import.meta.url);
const sectionsSharedOwner = readSource(
  '../esm/native/kernel/domain_api_surface_sections_shared.ts',
  import.meta.url
);
const sectionsStateOwner = readSource(
  '../esm/native/kernel/domain_api_surface_sections_state.ts',
  import.meta.url
);
const sectionsBindingsOwner = readSource(
  '../esm/native/kernel/domain_api_surface_sections_bindings.ts',
  import.meta.url
);
const sectionsDoorsOwner = readSource(
  '../esm/native/kernel/domain_api_surface_sections_bindings_doors.ts',
  import.meta.url
);
const sectionsDrawersDividersOwner = readSource(
  '../esm/native/kernel/domain_api_surface_sections_bindings_drawers_dividers.ts',
  import.meta.url
);
const sectionsViewFlagsTexturesOwner = readSource(
  '../esm/native/kernel/domain_api_surface_sections_bindings_view_flags_textures.ts',
  import.meta.url
);
const sectionsGroovesCurtainsOwner = readSource(
  '../esm/native/kernel/domain_api_surface_sections_bindings_grooves_curtains.ts',
  import.meta.url
);

test('[domain-api-sections] facade stays thin while shared helpers, state wiring, and binding families live in dedicated owners', () => {
  assertMatchesAll(
    assert,
    sectionsFacade,
    [
      /domain_api_surface_sections_bindings\.js/,
      /domain_api_surface_sections_state\.js/,
      /export function installDomainApiSurfaceSections\(/,
      /createDomainApiSurfaceSectionBindings\(nextState\)/,
    ],
    'sectionsFacade'
  );
  assertLacksAll(
    assert,
    sectionsFacade,
    [
      /function createDoorsActionBindings\(/,
      /function createDomainApiSurfaceSectionsState\(/,
      /function canonicalRemovedDoorPartId\(/,
      /function createGroovesActionBindings\(/,
    ],
    'sectionsFacade'
  );
});

test('[domain-api-sections] shared, state, and binding owners hold the canonical prefixed-map helpers, state readers, and family factories', () => {
  assertMatchesAll(
    assert,
    sectionsSharedOwner,
    [
      /export function canonicalRemovedDoorPartId\(/,
      /export function commitCanonicalPrefixedMapValue\(/,
      /export function writeSimpleMapValueWithFallback\(/,
      /export function shouldSkipCanonicalPrefixedMapCommit\(/,
      /export const DOMAIN_API_SECTION_KEYS = \[/,
    ],
    'sectionsSharedOwner'
  );
  assertMatchesAll(
    assert,
    sectionsStateOwner,
    [
      /export function createDomainApiSurfaceSectionsState\(/,
      /export function attachCanonicalSelectSurfaces\(/,
      /export function attachCanonicalActionSurfaces\(/,
      /readPrefixedToggleMapFlag\(/,
    ],
    'sectionsStateOwner'
  );
  assertMatchesAll(
    assert,
    sectionsBindingsOwner,
    [
      /domain_api_surface_sections_bindings_doors\.js/,
      /domain_api_surface_sections_bindings_drawers_dividers\.js/,
      /domain_api_surface_sections_bindings_view_flags_textures\.js/,
      /domain_api_surface_sections_bindings_grooves_curtains\.js/,
      /export function createDomainApiSurfaceSectionBindings\(/,
    ],
    'sectionsBindingsOwner'
  );
  assertLacksAll(
    assert,
    sectionsBindingsOwner,
    [
      /function createDoorsActionBindings\(/,
      /function createGroovesActionBindings\(/,
      /function createCurtainsActionBindings\(/,
    ],
    'sectionsBindingsOwner'
  );
  assertMatchesAll(
    assert,
    sectionsDoorsOwner,
    [/function createDoorsActionBindings\(/, /writeHinge\(/, /writeHandle\(/],
    'sectionsDoorsOwner'
  );
  assertMatchesAll(
    assert,
    sectionsDrawersDividersOwner,
    [/function createDividersActionBindings\(/, /toggleDivider\(/],
    'sectionsDrawersDividersOwner'
  );
  assertMatchesAll(
    assert,
    sectionsViewFlagsTexturesOwner,
    [/function createTexturesActionBindings\(/, /setCfgCustomUploadedDataURL\(/],
    'sectionsViewFlagsTexturesOwner'
  );
  assertMatchesAll(
    assert,
    sectionsGroovesCurtainsOwner,
    [
      /function createGroovesActionBindings\(/,
      /toggleGrooveKey\(/,
      /function createCurtainsActionBindings\(/,
    ],
    'sectionsGroovesCurtainsOwner'
  );
});
