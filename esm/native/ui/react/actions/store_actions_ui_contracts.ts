import type {
  ActionMetaLike,
  UiActionsNamespaceLike,
  UiRawScalarKey,
  UiRawScalarValueMap,
} from '../../../../../types';

export type StoreUiNamedActions = Partial<
  Pick<
    UiActionsNamespaceLike,
    | 'setActiveTab'
    | 'setDoorStyle'
    | 'setCorniceType'
    | 'setColorChoice'
    | 'setFlag'
    | 'setNotesEnabled'
    | 'setGlobalClickUi'
    | 'setDarkMode'
    | 'setShowContents'
    | 'setShowHanger'
    | 'setCurrentFloorType'
    | 'setCurrentLayoutType'
    | 'setGridDivisionsState'
    | 'setGridShelfVariantState'
    | 'setExtDrawerSelection'
    | 'setBaseType'
    | 'setHingeDirection'
    | 'setStructureSelect'
    | 'setSingleDoorPos'
  >
>;

export type StoreUiRawScalarWriter = {
  <K extends UiRawScalarKey>(key: K, value: UiRawScalarValueMap[K], meta?: ActionMetaLike): void;
  (key: string, value: unknown, meta?: ActionMetaLike): void;
};

export type StoreUiLightScalarKey =
  'lightingControl' | 'lastLightPreset' | 'lightAmb' | 'lightDir' | 'lightX' | 'lightY' | 'lightZ';

export type StoreUiActionRuntime = {
  readUiActions: () => StoreUiNamedActions;
  patch: (patch: unknown, meta?: ActionMetaLike) => void;
  patchSoft: (patch: unknown, meta?: ActionMetaLike) => void;
  setRawScalar: StoreUiRawScalarWriter;
  setScalar: (key: string, value: unknown, meta?: ActionMetaLike) => void;
  setScalarSoft: (key: string, value: unknown, meta?: ActionMetaLike) => void;
  setLastSelectedWallColor: (value: unknown, meta?: ActionMetaLike) => void;
  setLightScalar: (key: StoreUiLightScalarKey, value: unknown, meta?: ActionMetaLike) => void;
  patchLightingState: (patch: unknown, meta?: ActionMetaLike) => void;
};
