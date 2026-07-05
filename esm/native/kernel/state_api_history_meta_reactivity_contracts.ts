import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  AppContainer,
  HistoryActionsNamespaceLike,
  StoreActionsNamespaceLike,
  UnknownRecord,
} from '../../../types';
import type { RootStoreLike } from '../../../types/backend_store';

type MetaNs = NonNullable<ActionsNamespaceLike['meta']>;

export interface StateApiHistoryMetaReactivityContext {
  A: AppContainer;
  store: RootStoreLike;
  storeNs: StoreActionsNamespaceLike;
  historyNs: HistoryActionsNamespaceLike;
  metaActionsNs: MetaNs;
  asObj: <T extends UnknownRecord = UnknownRecord>(v: unknown) => T | null;
  safeCall: (fn: () => unknown) => unknown;
  normMeta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  mergeMeta: (
    meta: ActionMetaLike | UnknownRecord | null | undefined,
    defaults: ActionMetaLike,
    defaultSource: string
  ) => ActionMetaLike;
  isObj: (v: unknown) => v is UnknownRecord;
  commitMetaTouch: (meta?: ActionMetaLike) => unknown;
  asMeta: (meta: ActionMetaLike | UnknownRecord | null | undefined) => ActionMetaLike;
  commitMetaPatch: (patch: UnknownRecord, meta: ActionMetaLike) => unknown;
}
