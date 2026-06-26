import {
  SHELF_GROUP_PART_ID,
  markShelfBoardUserData,
  resolveShelfPartMaterial,
} from '../features/shelf_part_identity.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  createSketchInternalDrawerCassettePartId,
  resolveSketchInternalDrawerCassetteFrameOuterWidth,
  resolveSketchInternalDrawerCassetteSideFillerWidth,
  resolveSketchInternalDrawerCassetteWoodThick,
} from '../features/sketch_internal_drawer_cassette.js';
import type { BuilderCreateBoardFn } from '../../../types';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

export type SketchInternalDrawerCassettePanelArgs = {
  createBoard?: BuilderCreateBoardFn | null;
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
  suffix: 'bottom' | 'top' | 'left' | 'right' | 'side_filler_left' | 'side_filler_right';
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
  const sideFillerWidth = resolveSketchInternalDrawerCassetteSideFillerWidth({
    outerWidth,
    woodThick,
  });
  const frameOuterWidth = resolveSketchInternalDrawerCassetteFrameOuterWidth({
    outerWidth,
    woodThick,
  });
  if (!(frameOuterWidth > woodThick * 2)) return false;

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
  const midY = args.baseY + stackH / 2;
  const leftX = args.centerX - frameOuterWidth / 2 + woodThick / 2;
  const rightX = args.centerX + frameOuterWidth / 2 - woodThick / 2;
  const panels: CassettePanelSpec[] = [
    {
      suffix: 'bottom',
      w: frameOuterWidth,
      h: woodThick,
      d: depth,
      x: args.centerX,
      y: bottomY,
      z: args.centerZ,
    },
    {
      suffix: 'top',
      w: frameOuterWidth,
      h: woodThick,
      d: depth,
      x: args.centerX,
      y: topY,
      z: args.centerZ,
    },
    {
      suffix: 'left',
      w: woodThick,
      h: fullH,
      d: depth,
      x: leftX,
      y: midY,
      z: args.centerZ,
    },
    {
      suffix: 'right',
      w: woodThick,
      h: fullH,
      d: depth,
      x: rightX,
      y: midY,
      z: args.centerZ,
    },
  ];

  if (sideFillerWidth > 0) {
    const frontInset = Math.min(
      Math.max(0, depth - DRAWER_DIMENSIONS.sketch.internalDepthMinM),
      DRAWER_DIMENSIONS.sketch.internalSideFillerFrontInsetM
    );
    const sideFillerDepth = Math.max(DRAWER_DIMENSIONS.sketch.internalDepthMinM, depth - frontInset);
    const sideFillerZ = args.centerZ - (depth - sideFillerDepth) / 2;
    panels.push(
      {
        suffix: 'side_filler_left',
        w: sideFillerWidth,
        h: fullH,
        d: sideFillerDepth,
        x: args.centerX - outerWidth / 2 + sideFillerWidth / 2,
        y: midY,
        z: sideFillerZ,
      },
      {
        suffix: 'side_filler_right',
        w: sideFillerWidth,
        h: fullH,
        d: sideFillerDepth,
        x: args.centerX + outerWidth / 2 - sideFillerWidth / 2,
        y: midY,
        z: sideFillerZ,
      }
    );
  }

  const cassettePartId = createSketchInternalDrawerCassettePartId(args.stackPartId);
  let emitted = false;
  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    const partId = cassettePartId;
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
