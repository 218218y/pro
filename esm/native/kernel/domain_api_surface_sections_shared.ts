export { DOMAIN_API_SECTION_KEYS, uniqueSurfaceTargets } from './domain_api_surface_sections_contracts.js';
export type {
  DomainApiSurfaceSectionBag,
  DomainApiSurfaceSectionBindingFactory,
  DomainApiSurfaceSectionBindings,
  DomainApiSurfaceSectionKey,
  DomainApiSurfaceSectionSurfaces,
  DomainApiSurfaceSectionsContext,
  DomainApiSurfaceSectionsOwner,
  DomainApiSurfaceSectionsState,
} from './domain_api_surface_sections_contracts.js';
export {
  grooveMapSemantics,
  normalizePrefixedMapKey,
  readMapKey,
  readPrefixedToggleMapFlag,
  readToggleMapFlagForKeys,
  splitDoorBottomMapSemantics,
  splitDoorMapSemantics,
  uniqueNonEmptyKeys,
} from './domain_api_surface_sections_prefixed_maps.js';
export type { PrefixedMapSemantics } from './domain_api_surface_sections_prefixed_maps.js';
export {
  areDomainMapValuesEquivalent,
  assertDomainGenericMapWriteAllowed,
  commitCanonicalMapValue,
  commitCanonicalPrefixedMapValue,
  patchCanonicalMapValue,
  patchCanonicalPrefixedMapViaCfg,
  readDomainMapValue,
  shouldSkipCanonicalMapCommit,
  shouldSkipCanonicalPrefixedMapCommit,
  shouldSkipSimpleMapWrite,
  toggleSimpleBooleanMapValue,
  writeCanonicalMapValueDirect,
  writeSimpleMapValue,
} from './domain_api_surface_sections_map_writes.js';
export {
  canonicalRemovedDoorPartId,
  isSegmentedDoorBaseId,
  listRemovedDoorLookupKeys,
} from './domain_api_surface_sections_removed_doors.js';
