import type { ManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import { readBaseLegOptions } from '../features/base_leg_support.js';
import {
  addSketchBoxDividerState,
  normalizeSketchBoxBaseType,
  normalizeSketchBoxCorniceType,
  removeSketchBoxDividerState,
} from './canvas_picking_sketch_box_dividers.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { readNumber } from './canvas_picking_sketch_box_content_commit_records.js';

function getSketchBoxAdornmentBaseHeight(baseType: unknown, source?: unknown): number {
  const normalized = normalizeSketchBoxBaseType(baseType);
  if (normalized === 'legs') {
    if (source && typeof source === 'object') {
      const rec = source as Record<string, unknown>;
      const heightM = Number(rec.heightM);
      if (Number.isFinite(heightM) && heightM > 0) return heightM;
      const heightCm = Number(rec.heightCm);
      if (Number.isFinite(heightCm) && heightCm > 0) return heightCm / 100;
    }
    return readBaseLegOptions(source).heightM;
  }
  if (normalized === 'plinth') return 0.08;
  return 0;
}

function adjustSketchBoxCenterYForBaseSupport(args: {
  box: CommitSketchModuleBoxContentArgs['box'];
  nextBaseType: string;
  nextBaseOptions: unknown;
  floorY: number;
}): void {
  const absY = readNumber(args.box.absY);
  const heightM = readNumber(args.box.heightM);
  if (absY == null || heightM == null || !(heightM > 0)) return;

  const currentBaseHeight = getSketchBoxAdornmentBaseHeight(args.box.baseType, args.box);
  const nextBaseHeight = getSketchBoxAdornmentBaseHeight(args.nextBaseType, args.nextBaseOptions);
  const supportBottomY = absY - heightM / 2 - currentBaseHeight;
  if (!Number.isFinite(args.floorY) || Math.abs(supportBottomY - args.floorY) > 0.015) return;

  args.box.absY = absY + (nextBaseHeight - currentBaseHeight);
}

export function tryCommitSketchBoxAdornment(args: {
  commitArgs: CommitSketchModuleBoxContentArgs;
  hoverIntent: ManualLayoutSketchBoxContentHoverIntent | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: null } {
  const { commitArgs, hoverIntent, hoverOp } = args;

  if (commitArgs.contentKind === 'divider') {
    const dividerXNorm = hoverIntent?.dividerXNorm ?? null;
    const dividerId = hoverIntent?.dividerId || '';
    if (hoverOp === 'remove') {
      removeSketchBoxDividerState(commitArgs.box, dividerId, dividerXNorm ?? undefined);
    } else {
      addSketchBoxDividerState(commitArgs.box, dividerXNorm != null ? dividerXNorm : 0.5, dividerId);
    }
    return { handled: true, nextHover: null };
  }

  if (commitArgs.contentKind === 'cornice') {
    if (hoverOp === 'remove') {
      commitArgs.box.hasCornice = false;
      delete commitArgs.box.corniceType;
    } else {
      commitArgs.box.hasCornice = true;
      commitArgs.box.corniceType = normalizeSketchBoxCorniceType(
        hoverIntent?.corniceType ?? commitArgs.hoverRec.corniceType
      );
    }
    return { handled: true, nextHover: null };
  }

  if (commitArgs.contentKind === 'base') {
    const floorY = typeof commitArgs.floorY === 'number' ? commitArgs.floorY : NaN;
    const nextBaseType = normalizeSketchBoxBaseType(hoverIntent?.baseType ?? commitArgs.hoverRec.baseType);
    const appliedBaseType = hoverOp === 'remove' || nextBaseType === 'none' ? 'none' : nextBaseType;
    const nextBaseOptions = readBaseLegOptions({
      baseLegStyle: hoverIntent?.baseLegStyle ?? commitArgs.hoverRec.baseLegStyle,
      baseLegColor: hoverIntent?.baseLegColor ?? commitArgs.hoverRec.baseLegColor,
      baseLegHeightCm: hoverIntent?.baseLegHeightCm ?? commitArgs.hoverRec.baseLegHeightCm,
      baseLegWidthCm: hoverIntent?.baseLegWidthCm ?? commitArgs.hoverRec.baseLegWidthCm,
    });
    adjustSketchBoxCenterYForBaseSupport({
      box: commitArgs.box,
      nextBaseType: appliedBaseType,
      nextBaseOptions,
      floorY,
    });
    commitArgs.box.baseType = appliedBaseType;
    if (appliedBaseType === 'legs') {
      commitArgs.box.baseLegStyle = nextBaseOptions.style;
      commitArgs.box.baseLegColor = nextBaseOptions.color;
      commitArgs.box.baseLegHeightCm = nextBaseOptions.heightCm;
      commitArgs.box.baseLegWidthCm = nextBaseOptions.widthCm;
    } else {
      delete commitArgs.box.baseLegStyle;
      delete commitArgs.box.baseLegColor;
      delete commitArgs.box.baseLegHeightCm;
      delete commitArgs.box.baseLegWidthCm;
    }
    return { handled: true, nextHover: null };
  }

  return { handled: false, nextHover: null };
}
