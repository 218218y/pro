import {
  SHELF_GROUP_PART_ID,
  markShelfBoardUserData,
  resolveShelfPartMaterial,
} from '../features/shelf_part_identity.js';
import {
  createSketchInternalDrawerCassettePanelPartId,
  resolveSketchInternalDrawerCassetteWoodThick,
} from '../features/sketch_internal_drawer_cassette.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

type CreateBoardFn = (
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: unknown,
  partId: string
) => unknown;

export type SketchInternalDrawerCassettePanelArgs = {
  createBoard?: CreateBoardFn | null;
  stackPartId: string;
  centerX: number;
  baseY: number;
  centerZ: number;
  outerWidth: number;
  depth: number;
  stackH: number;
  woodThick?: unknown;
  currentShelfMat?: unknown;
  fallbackMaterial?: unknown;
  getPartMaterial?: ((partId: string) => unknown) | null;
  getPartColorValue?: ((partId: string) => unknown) | null;
};

type CassettePanelSpec = {
  suffix: 'bottom' | 'top' | 'left' | 'right';
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
};

function asRecord(value: unknown): InteriorValueRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    ? (value as InteriorValueRecord)
    : null;
}

function readFinitePositive(value: unknown): number | null {
  const n = typeof value === 'number' ? value : value != null && value !== '' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function emitSketchInternalDrawerCassettePanels(args: SketchInternalDrawerCassettePanelArgs): boolean {
  if (typeof args.createBoard !== 'function') return false;
  if (!args.stackPartId) return false;
  const outerWidth = readFinitePositive(args.outerWidth);
  const depth = readFinitePositive(args.depth);
  const stackH = readFinitePositive(args.stackH);
  if (outerWidth == null || depth == null || stackH == null) return false;
  const woodThick = resolveSketchInternalDrawerCassetteWoodThick(args.woodThick);
  if (!(outerWidth > woodThick * 2)) return false;

  const panelMat = (partId: string) =>
    resolveShelfPartMaterial({
      partId,
      groupPartId: SHELF_GROUP_PART_ID,
      currentShelfMat: args.currentShelfMat || args.fallbackMaterial,
      getPartMaterial: args.getPartMaterial,
      getPartColorValue: args.getPartColorValue,
    });

  const fullH = stackH + woodThick * 2;
  const bottomY = args.baseY - woodThick / 2;
  const topY = args.baseY + stackH + woodThick / 2;
  const leftX = args.centerX - outerWidth / 2 + woodThick / 2;
  const rightX = args.centerX + outerWidth / 2 - woodThick / 2;
  const panels: CassettePanelSpec[] = [
    { suffix: 'bottom', w: outerWidth, h: woodThick, d: depth, x: args.centerX, y: bottomY, z: args.centerZ },
    { suffix: 'top', w: outerWidth, h: woodThick, d: depth, x: args.centerX, y: topY, z: args.centerZ },
    {
      suffix: 'left',
      w: woodThick,
      h: fullH,
      d: depth,
      x: leftX,
      y: args.baseY + stackH / 2,
      z: args.centerZ,
    },
    {
      suffix: 'right',
      w: woodThick,
      h: fullH,
      d: depth,
      x: rightX,
      y: args.baseY + stackH / 2,
      z: args.centerZ,
    },
  ];

  let emitted = false;
  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    const partId = createSketchInternalDrawerCassettePanelPartId({
      stackPartId: args.stackPartId,
      panel: panel.suffix,
    });
    const mesh = args.createBoard(
      panel.w,
      panel.h,
      panel.d,
      panel.x,
      panel.y,
      panel.z,
      panelMat(partId),
      partId
    );
    const rec = asRecord(mesh);
    if (rec) {
      const userData = asRecord(rec.userData) || {};
      rec.userData = userData;
      userData.__wpInternalDrawerCassette = true;
      userData.__wpInternalDrawerCassettePanel = panel.suffix;
      userData.__wpInternalDrawerCassetteStackPartId = args.stackPartId;
      markShelfBoardUserData(userData, {
        groupPartId: SHELF_GROUP_PART_ID,
        shelfIndex: `internal_drawer_cassette_${args.stackPartId}_${panel.suffix}`,
        variant: 'regular',
        isBrace: false,
      });
    }
    emitted = true;
  }
  return emitted;
}
