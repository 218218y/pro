import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  SHELF_GROUP_PART_ID,
  markShelfBoardUserData,
  resolveShelfPartMaterial,
} from '../features/shelf_part_identity.js';
import { asRecord } from '../runtime/record.js';
import type { UnknownRecord } from '../../../types';

type ExternalDrawerShelfBoardCreator = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: unknown,
  partId?: string
) => unknown;

type ShelfMaterialResolver = ((partId: string) => unknown) | null | undefined;

export type EmitExternalDrawerBraceShelfArgs = {
  createBoard: ExternalDrawerShelfBoardCreator;
  partId: string;
  shelfIndex?: unknown;
  innerWidth: number;
  shelfThick: number;
  depth: number;
  centerX: number;
  stackTopY: number;
  centerZ: number;
  currentBraceShelfMat: unknown;
  getPartMaterial?: ShelfMaterialResolver;
  getPartColorValue?: ShelfMaterialResolver;
  moduleIndex?: unknown;
  stackKey?: unknown;
};

export function emitExternalDrawerBraceShelf(args: EmitExternalDrawerBraceShelfArgs): unknown {
  const shelfMat = resolveShelfPartMaterial({
    partId: args.partId,
    currentShelfMat: args.currentBraceShelfMat,
    getPartColorValue: args.getPartColorValue,
    getPartMaterial: args.getPartMaterial,
  });
  const shelf = args.createBoard(
    args.innerWidth - DRAWER_DIMENSIONS.external.separatorBoardWidthClearanceM,
    args.shelfThick,
    args.depth,
    args.centerX,
    args.stackTopY - args.shelfThick / 2,
    args.centerZ,
    shelfMat,
    args.partId
  );

  const shelfRecord = asRecord<{ userData?: UnknownRecord }>(shelf);
  if (!shelfRecord) return shelf;

  const userData = (shelfRecord.userData ||= {});
  userData.partId = args.partId;
  if (typeof args.moduleIndex !== 'undefined') userData.moduleIndex = args.moduleIndex;
  if (args.stackKey === 'top' || args.stackKey === 'bottom') userData.__wpStack = args.stackKey;
  markShelfBoardUserData(userData, {
    groupPartId: SHELF_GROUP_PART_ID,
    shelfIndex: typeof args.shelfIndex === 'undefined' ? args.partId : args.shelfIndex,
    variant: 'brace',
    isBrace: true,
  });
  return shelf;
}
