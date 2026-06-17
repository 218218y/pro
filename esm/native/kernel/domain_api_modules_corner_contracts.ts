import type {
  ActionMetaLike,
  AppContainer,
  ConfigActionsNamespaceLike,
  ConfigStateLike,
  CornerActionsLike,
  ModulesActionsLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

import type {
  DomainCornerReportNonFatal,
  DomainModulesCornerSelectRoot,
} from './domain_api_modules_corner_shared.js';

export interface DomainApiModulesCornerContext {
  App: AppContainer;
  select: DomainModulesCornerSelectRoot;
  modulesActions: ModulesActionsLike;
  cornerActions: CornerActionsLike;
  configActions?: ConfigActionsNamespaceLike;
  _cfg: () => ConfigStateLike;
  _ui: () => UiStateLike;
  _ensureObj: (v: unknown) => UnknownRecord;
  _isRecord: (v: unknown) => v is UnknownRecord;
  _asMeta: (meta: ActionMetaLike | UnknownRecord | null | undefined) => ActionMetaLike | undefined;
  _meta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  _domainApiReportNonFatal: DomainCornerReportNonFatal;
  _markDelegatesStackPatch: (fn: unknown) => void;
}
