import type { AppContainer } from '../../../types';
import type { DomainSelectSurface } from './domain_api_shared.js';
import { ensureServiceSlot, getServiceSlotMaybe } from '../runtime/services_root_access.js';

type DomainApiInstallState = { installed?: boolean };

export function readDomainApiInstallState(app: unknown): DomainApiInstallState | null {
  return getServiceSlotMaybe<DomainApiInstallState>(app, 'domainApi');
}

export function ensureDomainApiInstallState(app: unknown): DomainApiInstallState {
  return ensureServiceSlot<DomainApiInstallState>(app, 'domainApi');
}

export function createDomainSelectSurface(): DomainSelectSurface {
  return {
    doors: {},
    drawers: {},
    dividers: {},
    view: {},
    flags: {},
    room: {},
    colors: {},
    grooves: {},
    curtains: {},
    modules: {},
    corner: {},
    textures: {},
  };
}

export function isDomainApiInstalled(app: unknown): boolean {
  return readDomainApiInstallState(app)?.installed === true;
}

export type DomainApiInstallRoot = AppContainer;
