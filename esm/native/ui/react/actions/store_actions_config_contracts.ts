import type {
  ActionMetaLike,
  AppContainer,
  ConfigScalarKey,
  ConfigScalarValueMap,
} from '../../../../../types';

import { cfgSetScalar as cfgSetScalarApi } from '../../../services/api.js';

type SetCfgScalar = <K extends ConfigScalarKey>(
  app: AppContainer,
  key: K,
  value: ConfigScalarValueMap[K],
  meta?: ActionMetaLike
) => void;

const setCfgScalar: SetCfgScalar = <K extends ConfigScalarKey>(
  app: AppContainer,
  key: K,
  value: ConfigScalarValueMap[K],
  meta?: ActionMetaLike
): void => {
  void cfgSetScalarApi(app, key, value, meta);
};

export { setCfgScalar };
export type { SetCfgScalar };
