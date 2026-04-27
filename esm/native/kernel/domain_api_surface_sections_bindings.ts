import { DOMAIN_API_ROOT_MAP_BINDING_FACTORIES } from './domain_api_surface_sections_bindings_root_map.js';
import { DOMAIN_API_DOORS_BINDING_FACTORIES } from './domain_api_surface_sections_bindings_doors.js';
import { DOMAIN_API_DRAWERS_DIVIDERS_BINDING_FACTORIES } from './domain_api_surface_sections_bindings_drawers_dividers.js';
import { DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES } from './domain_api_surface_sections_bindings_view_flags_textures.js';
import { DOMAIN_API_GROOVES_CURTAINS_BINDING_FACTORIES } from './domain_api_surface_sections_bindings_grooves_curtains.js';
import {
  DOMAIN_API_SECTION_KEYS,
  type DomainApiSurfaceSectionBindings,
  type DomainApiSurfaceSectionBindingFactory,
  type DomainApiSurfaceSectionKey,
  type DomainApiSurfaceSectionsState,
} from './domain_api_surface_sections_shared.js';
import { installDomainApiSurfaceSectionBindingsOnTargets } from './domain_api_surface_sections_state.js';

const DOMAIN_API_BINDING_FACTORIES: Record<
  DomainApiSurfaceSectionKey,
  DomainApiSurfaceSectionBindingFactory
> = {
  ...DOMAIN_API_ROOT_MAP_BINDING_FACTORIES,
  ...DOMAIN_API_DOORS_BINDING_FACTORIES,
  ...DOMAIN_API_DRAWERS_DIVIDERS_BINDING_FACTORIES,
  ...DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES,
  ...DOMAIN_API_GROOVES_CURTAINS_BINDING_FACTORIES,
};

export function createDomainApiSurfaceSectionBindings(
  state: DomainApiSurfaceSectionsState
): DomainApiSurfaceSectionBindings {
  const out = {} as DomainApiSurfaceSectionBindings;
  for (const key of DOMAIN_API_SECTION_KEYS) {
    out[key] = DOMAIN_API_BINDING_FACTORIES[key](state);
  }
  return out;
}

export function installDomainApiSurfaceSectionBindings(
  state: DomainApiSurfaceSectionsState,
  bindings: DomainApiSurfaceSectionBindings,
  surfaces: import('./domain_api_surface_sections_shared.js').DomainApiSurfaceSectionSurfaces
): void {
  installDomainApiSurfaceSectionBindingsOnTargets(state, bindings, surfaces);
}
