import type {
  ActionMetaLike,
  AppContainer,
  HandlesMap,
  HingeMap,
  MapsByName,
  ModulesConfigurationLike,
} from '../../../../../types';

import {
  readCurtainMapSnapshot,
  readDoorSpecialMapSnapshot,
  readHandlesMapSnapshot,
  readHingeMapSnapshot,
  readIndividualColorsMapSnapshot,
  setCfgCornerConfiguration as setCfgCornerConfigurationApi,
  setCfgCurtainMap as setCfgCurtainMapApi,
  setCfgDoorSpecialMap as setCfgDoorSpecialMapApi,
  setCfgHandlesMap as setCfgHandlesMapApi,
  setCfgHingeMap as setCfgHingeMapApi,
  setCfgIndividualColors as setCfgIndividualColorsApi,
  setCfgManualWidth as setCfgManualWidthApi,
  setCfgLowerModulesConfiguration as setCfgLowerModulesConfigurationApi,
  setCfgModulesConfiguration as setCfgModulesConfigurationApi,
  setCfgWardrobeType as setCfgWardrobeTypeApi,
} from '../../../services/api.js';
import { getConfigNamespace, readRecord } from './store_actions_state.js';

function setCfgHingeMap(app: AppContainer, next: HingeMap | unknown, meta?: ActionMetaLike): void {
  const normalized = Object.assign(Object.create(null), readHingeMapSnapshot(next));
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setHingeMap === 'function') {
    cfgNs.setHingeMap(normalized, meta);
    return;
  }
  void setCfgHingeMapApi(app, normalized, meta);
}

function setCfgHandlesMap(app: AppContainer, next: HandlesMap | unknown, meta?: ActionMetaLike): void {
  const normalized = Object.assign(Object.create(null), readHandlesMapSnapshot(next));
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setHandlesMap === 'function') {
    cfgNs.setHandlesMap(normalized, meta);
    return;
  }
  void setCfgHandlesMapApi(app, normalized, meta);
}

function setCfgModulesConfiguration(
  app: AppContainer,
  next: ModulesConfigurationLike | unknown,
  meta?: ActionMetaLike
): void {
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setModulesConfiguration === 'function') {
    cfgNs.setModulesConfiguration(Array.isArray(next) ? next.filter(readRecord) : [], meta);
    return;
  }
  void setCfgModulesConfigurationApi(app, next, meta);
}

function setCfgLowerModulesConfiguration(
  app: AppContainer,
  next: ModulesConfigurationLike | unknown,
  meta?: ActionMetaLike
): void {
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setLowerModulesConfiguration === 'function') {
    cfgNs.setLowerModulesConfiguration(Array.isArray(next) ? next.filter(readRecord) : [], meta);
    return;
  }
  void setCfgLowerModulesConfigurationApi(app, next, meta);
}

function setCfgIndividualColors(
  app: AppContainer,
  value: MapsByName['individualColors'] | unknown,
  meta?: ActionMetaLike
): void {
  void setCfgIndividualColorsApi(app, readIndividualColorsMapSnapshot(value), meta);
}

function setCfgCurtainMap(
  app: AppContainer,
  value: MapsByName['curtainMap'] | unknown,
  meta?: ActionMetaLike
): void {
  void setCfgCurtainMapApi(app, readCurtainMapSnapshot(value), meta);
}

function setCfgDoorSpecialMap(
  app: AppContainer,
  value: MapsByName['doorSpecialMap'] | unknown,
  meta?: ActionMetaLike
): void {
  void setCfgDoorSpecialMapApi(app, readDoorSpecialMapSnapshot(value), meta);
}

function setCfgWardrobeType(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  void setCfgWardrobeTypeApi(app, value, meta);
}

function setCfgManualWidth(app: AppContainer, on: boolean | unknown, meta?: ActionMetaLike): void {
  void setCfgManualWidthApi(app, !!on, meta);
}

function setCfgCornerConfiguration(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  void setCfgCornerConfigurationApi(app, value, meta);
}

export {
  setCfgCornerConfiguration,
  setCfgCurtainMap,
  setCfgDoorSpecialMap,
  setCfgHandlesMap,
  setCfgHingeMap,
  setCfgIndividualColors,
  setCfgLowerModulesConfiguration,
  setCfgManualWidth,
  setCfgModulesConfiguration,
  setCfgWardrobeType,
};
