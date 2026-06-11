import type { AppContainer } from '../../../types';
import {
  createDomainApiSurfaceSectionBindings,
  installDomainApiSurfaceSectionBindings,
} from './domain_api_surface_sections_bindings.js';
import {
  createDomainApiSurfaceSectionSurfaces,
  createDomainApiSurfaceSectionsState,
  prepareExistingDomainApiSurfaceSectionsContext,
  refreshDomainApiSurfaceSectionsState,
  attachCanonicalActionSurfaces,
  attachCanonicalSelectSurfaces,
} from './domain_api_surface_sections_state.js';
import type {
  DomainApiSurfaceSectionsContext,
  DomainApiSurfaceSectionsOwner,
} from './domain_api_surface_sections_shared.js';

export type { DomainApiSurfaceSectionsContext } from './domain_api_surface_sections_shared.js';

const domainApiSurfaceSectionsOwners = new WeakMap<AppContainer, DomainApiSurfaceSectionsOwner>();

function getDomainApiSurfaceSectionsOwner(
  ctx: DomainApiSurfaceSectionsContext
): DomainApiSurfaceSectionsOwner {
  const existing = domainApiSurfaceSectionsOwners.get(ctx.App);
  if (existing) {
    prepareExistingDomainApiSurfaceSectionsContext(ctx, existing.surfaces);
    const nextState = createDomainApiSurfaceSectionsState(ctx, existing.surfaces);
    refreshDomainApiSurfaceSectionsState(existing.state, nextState);
    return existing;
  }

  const nextState = createDomainApiSurfaceSectionsState(ctx);
  const owner: DomainApiSurfaceSectionsOwner = {
    state: nextState,
    bindings: createDomainApiSurfaceSectionBindings(nextState),
    surfaces: createDomainApiSurfaceSectionSurfaces(nextState),
  };
  domainApiSurfaceSectionsOwners.set(ctx.App, owner);
  return owner;
}

export function installDomainApiSurfaceSections(ctx: DomainApiSurfaceSectionsContext): void {
  const owner = getDomainApiSurfaceSectionsOwner(ctx);
  attachCanonicalSelectSurfaces(ctx.select, owner.surfaces);
  attachCanonicalActionSurfaces(ctx.App, owner.surfaces);
  installDomainApiSurfaceSectionBindings(owner.state, owner.bindings, owner.surfaces);
}
