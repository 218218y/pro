import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import type {
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  UnknownCallable,
} from '../../../types';
import type {
  AddFoldedClothesLike,
  GroupLike,
  ThreeCornerCellLike,
  ValueRecord,
} from './corner_wing_cell_shared.js';
import type { CornerCellCfg } from './corner_geometry_plan.js';

type CreateRodLike = (yPos: number, limitHeight?: number | null) => void;

type CornerWingCellSketchExtrasParams = {
  App: unknown;
  THREE: ThreeCornerCellLike;
  wingGroup: GroupLike;
  cfg: unknown;
  cfgCell: CornerCellCfg;
  cellIdx: number;
  cellKey: string;
  stackKey: string;
  cellD: number;
  shelfMat: unknown;
  bodyMat: unknown;
  effectiveBottomY: number;
  effectiveTopY: number;
  localGridStep: number;
  cellInnerW: number;
  woodThick: number;
  __internalDepth: number;
  cellInnerCenterX: number;
  __fullDepthCenterZ: number;
  __z: (z: number) => number;
  getCornerMat: (partId: string, fallback: unknown) => unknown;
  getPartColorValue?: (partId: string) => unknown;
  createDoorVisual: BuilderCreateDoorVisualFn;
  createInternalDrawerBox: BuilderCreateInternalDrawerBoxFn;
  addOutlines: (mesh: unknown) => void;
  showContentsEnabled: boolean;
  addFoldedClothes: AddFoldedClothesLike;
  createRod: CreateRodLike;
  asRecord: (value: unknown) => ValueRecord;
};

export function applyCornerWingCellSketchExtras(params: CornerWingCellSketchExtrasParams): void {
  const {
    App,
    THREE,
    wingGroup,
    cfg,
    cfgCell,
    cellIdx,
    cellKey,
    stackKey,
    cellD,
    shelfMat,
    bodyMat,
    effectiveBottomY,
    effectiveTopY,
    localGridStep,
    cellInnerW,
    woodThick,
    __internalDepth,
    cellInnerCenterX,
    __fullDepthCenterZ,
    __z,
    getCornerMat,
    getPartColorValue,
    createDoorVisual,
    createInternalDrawerBox,
    addOutlines,
    showContentsEnabled,
    addFoldedClothes,
    createRod,
    asRecord,
  } = params;

  try {
    const extra = asRecord(cfgCell).sketchExtras;
    if (!extra) return;
    const roX = asRecord(getBuilderRenderOps(App));

    type AnyFn = UnknownCallable;
    const __readCallable = (v: unknown): AnyFn | null => {
      if (typeof v !== 'function') return null;
      const next: AnyFn = (...args) => Reflect.apply(v, undefined, args);
      return next;
    };

    const fnX = roX ? __readCallable(roX.applyInteriorSketchExtras) : null;
    if (!fnX) return;

    const createBoard = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: unknown,
      partId: string
    ) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.0001, w), Math.max(0.0001, h), Math.max(0.0001, d)),
        mat
      );
      m.position.set(x, y, z);
      m.userData = m.userData || {};
      m.userData.partId = partId;
      m.userData.moduleIndex = cellKey;
      m.castShadow = false;
      m.receiveShadow = false;
      addOutlines(m);
      wingGroup.add(m);
      return m;
    };

    const extrasArgs: ValueRecord = {
      App,
      THREE,
      wardrobeGroup: wingGroup,
      cfg,
      config: cfgCell,
      createBoard,
      createRod,
      currentShelfMat: shelfMat,
      bodyMat,
      effectiveBottomY,
      effectiveTopY,
      localGridStep,
      innerW: cellInnerW,
      woodThick,
      internalDepth: __internalDepth,
      internalCenterX: cellInnerCenterX,
      internalZ: __fullDepthCenterZ,
      // Corner sketch extras must render against the *cell* depth/front plane,
      // not the full wing depth, otherwise sketch external drawers start from the
      // middle of the volume and protrude outside the facade.
      D: cellD,
      externalFrontZ: __z(0),
      moduleIndex: cellIdx,
      moduleKey: cellKey,
      stackKey,
      // Multi-color support for sketch extras in corner wing.
      getPartMaterial: (pid: string) => getCornerMat(pid, bodyMat),
      getPartColorValue,
      createDoorVisual,
      createInternalDrawerBox,
      addOutlines,
      showContentsEnabled,
      addFoldedClothes,
      sketchExtras: extra,
    };
    fnX(extrasArgs);
  } catch (_e) {
    // ignore
  }
}
