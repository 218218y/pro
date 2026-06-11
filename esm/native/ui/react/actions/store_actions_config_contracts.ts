import type {
  ActionMetaLike,
  AppContainer,
  ConfigScalarKey,
  ConfigScalarValueMap,
  KnownMapName,
  MapsByName,
} from '../../../../../types';

import { cfgSetMap as cfgSetMapApi, cfgSetScalar as cfgSetScalarApi } from '../../../services/api.js';
import { emptyRecord, readRecord } from './store_actions_state.js';

type SetCfgScalar = {
  <K extends ConfigScalarKey>(
    app: AppContainer,
    key: K,
    value: ConfigScalarValueMap[K],
    meta?: ActionMetaLike
  ): void;
  (app: AppContainer, key: string, value: unknown, meta?: ActionMetaLike): void;
};

const setCfgScalar: SetCfgScalar = (
  app: AppContainer,
  key: string,
  value: unknown,
  meta?: ActionMetaLike
): void => {
  void cfgSetScalarApi(app, key, value, meta);
};

type SetCfgMap = {
  <K extends KnownMapName>(
    app: AppContainer,
    mapName: K,
    nextMap: MapsByName[K],
    meta?: ActionMetaLike
  ): void;
  (app: AppContainer, mapName: string, nextMap: unknown, meta?: ActionMetaLike): void;
};

const setCfgMap: SetCfgMap = (
  app: AppContainer,
  mapName: string,
  nextMap: unknown,
  meta?: ActionMetaLike
): void => {
  void cfgSetMapApi(app, mapName, readRecord(nextMap) || emptyRecord(), meta);
};

export { setCfgMap, setCfgScalar };
export type { SetCfgMap, SetCfgScalar };
