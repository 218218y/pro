import type { ManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import { CARCASS_BASE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  normalizeBaseLegPlatformMode,
  normalizeBaseLegPlatformSideMode,
  readBaseLegOptions,
} from '../features/base_leg_support.js';
import { getBasePlinthHeightM, normalizeBasePlinthHeightCm } from '../features/base_plinth_support.js';
import {
  normalizeBaseLegPlatformFrontOverhangCm,
  normalizeBaseLegPlatformSideOverhangCm,
} from '../features/platform_overhang_support.js';
import {
  addSketchBoxDividerState,
  addSketchBoxHorizontalDividerState,
  normalizeSketchBoxBaseType,
  normalizeSketchBoxCorniceType,
  removeSketchBoxDividerState,
  removeSketchBoxHorizontalDividerState,
} from './canvas_picking_sketch_box_dividers.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { readNumber } from './canvas_picking_sketch_box_content_commit_records.js';

function readSupportHeightCm(source: unknown, key: 'heightCm' | 'basePlinthHeightCm'): unknown {
  if (source && typeof source === 'object') return (source as Record<string, unknown>)[key];
  return source;
}

function getSketchBoxAdornmentBaseHeight(baseType: unknown, source?: unknown): number {
  const normalized = normalizeSketchBoxBaseType(baseType);
  if (normalized === 'legs') {
    if (source && typeof source === 'object') {
      const heightCm = Number(readSupportHeightCm(source, 'heightCm'));
      if (Number.isFinite(heightCm) && heightCm > 0) {
        const bottomPlatformHeight =
          normalizeBaseLegPlatformMode((source as Record<string, unknown>).baseLegPlatformMode) === 'stage'
            ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM
            : 0;
        return Math.max(0.01, heightCm / 100) + bottomPlatformHeight;
      }
    }
    const bottomPlatformHeight =
      normalizeBaseLegPlatformMode((source as Record<string, unknown> | null)?.baseLegPlatformMode) ===
      'stage'
        ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM
        : 0;
    return readBaseLegOptions(source).heightM + bottomPlatformHeight;
  }
  if (normalized === 'plinth') return getBasePlinthHeightM(readSupportHeightCm(source, 'basePlinthHeightCm'));
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
    const dividerId = hoverIntent?.dividerId || '';
    const dividerAxis = hoverIntent?.dividerAxis === 'horizontal' ? 'horizontal' : 'vertical';
    if (dividerAxis === 'horizontal') {
      const dividerYNorm = hoverIntent?.dividerYNorm ?? null;
      const dividerXNorm = hoverIntent?.dividerXNorm ?? null;
      if (hoverOp === 'remove') {
        removeSketchBoxHorizontalDividerState(
          commitArgs.box,
          dividerId,
          dividerYNorm ?? undefined,
          dividerXNorm ?? undefined
        );
      } else {
        addSketchBoxHorizontalDividerState(
          commitArgs.box,
          dividerYNorm != null ? dividerYNorm : 0.5,
          dividerId,
          {
            frontZ: hoverIntent?.freePlacement === true ? hoverIntent.dividerFrontZ : undefined,
            xNorm: dividerXNorm ?? undefined,
          }
        );
      }
      return { handled: true, nextHover: null };
    }
    const dividerXNorm = hoverIntent?.dividerXNorm ?? null;
    const dividerYNorm = hoverIntent?.dividerYNorm ?? null;
    if (hoverOp === 'remove') {
      removeSketchBoxDividerState(
        commitArgs.box,
        dividerId,
        dividerXNorm ?? undefined,
        dividerYNorm ?? undefined
      );
    } else {
      addSketchBoxDividerState(commitArgs.box, dividerXNorm != null ? dividerXNorm : 0.5, dividerId, {
        frontZ: hoverIntent?.freePlacement === true ? hoverIntent.dividerFrontZ : undefined,
        yNorm: dividerYNorm ?? undefined,
      });
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
      baseLegPlatformMode: hoverIntent?.baseLegPlatformMode ?? commitArgs.hoverRec.baseLegPlatformMode,
      baseLegPlatformSideMode:
        hoverIntent?.baseLegPlatformSideMode ?? commitArgs.hoverRec.baseLegPlatformSideMode,
      baseLegPlatformSideOverhangCm:
        hoverIntent?.baseLegPlatformSideOverhangCm ?? commitArgs.hoverRec.baseLegPlatformSideOverhangCm,
      baseLegPlatformFrontOverhangCm:
        hoverIntent?.baseLegPlatformFrontOverhangCm ?? commitArgs.hoverRec.baseLegPlatformFrontOverhangCm,
      baseLegHeightCm: hoverIntent?.baseLegHeightCm ?? commitArgs.hoverRec.baseLegHeightCm,
      baseLegWidthCm: hoverIntent?.baseLegWidthCm ?? commitArgs.hoverRec.baseLegWidthCm,
    });
    const nextBasePlatformMode = normalizeBaseLegPlatformMode(
      hoverIntent?.baseLegPlatformMode ?? commitArgs.hoverRec.baseLegPlatformMode
    );
    const nextBasePlatformSideMode = normalizeBaseLegPlatformSideMode(
      hoverIntent?.baseLegPlatformSideMode ?? commitArgs.hoverRec.baseLegPlatformSideMode
    );
    const nextBasePlatformSideOverhangCm = normalizeBaseLegPlatformSideOverhangCm(
      hoverIntent?.baseLegPlatformSideOverhangCm ?? commitArgs.hoverRec.baseLegPlatformSideOverhangCm
    );
    const nextBasePlatformFrontOverhangCm = normalizeBaseLegPlatformFrontOverhangCm(
      hoverIntent?.baseLegPlatformFrontOverhangCm ?? commitArgs.hoverRec.baseLegPlatformFrontOverhangCm
    );
    const nextBasePlinthHeightCm = normalizeBasePlinthHeightCm(
      hoverIntent?.basePlinthHeightCm ?? commitArgs.hoverRec.basePlinthHeightCm
    );
    adjustSketchBoxCenterYForBaseSupport({
      box: commitArgs.box,
      nextBaseType: appliedBaseType,
      nextBaseOptions:
        appliedBaseType === 'plinth'
          ? { basePlinthHeightCm: nextBasePlinthHeightCm }
          : {
              heightCm: nextBaseOptions.heightCm,
              baseLegPlatformMode: nextBasePlatformMode,
            },
      floorY,
    });
    commitArgs.box.baseType = appliedBaseType;
    if (appliedBaseType === 'legs') {
      commitArgs.box.baseLegStyle = nextBaseOptions.style;
      commitArgs.box.baseLegColor = nextBaseOptions.color;
      commitArgs.box.baseLegPlatformMode = nextBasePlatformMode;
      commitArgs.box.baseLegPlatformSideMode = nextBasePlatformSideMode;
      commitArgs.box.baseLegPlatformSideOverhangCm = nextBasePlatformSideOverhangCm;
      commitArgs.box.baseLegPlatformFrontOverhangCm = nextBasePlatformFrontOverhangCm;
      commitArgs.box.baseLegHeightCm = nextBaseOptions.heightCm;
      commitArgs.box.baseLegWidthCm = nextBaseOptions.widthCm;
      delete commitArgs.box.basePlinthHeightCm;
    } else {
      delete commitArgs.box.baseLegStyle;
      delete commitArgs.box.baseLegColor;
      delete commitArgs.box.baseLegPlatformMode;
      delete commitArgs.box.baseLegPlatformSideMode;
      delete commitArgs.box.baseLegPlatformSideOverhangCm;
      delete commitArgs.box.baseLegPlatformFrontOverhangCm;
      delete commitArgs.box.baseLegHeightCm;
      delete commitArgs.box.baseLegWidthCm;
      if (appliedBaseType === 'plinth') {
        commitArgs.box.basePlinthHeightCm = nextBasePlinthHeightCm;
      } else {
        delete commitArgs.box.basePlinthHeightCm;
      }
    }
    return { handled: true, nextHover: null };
  }

  return { handled: false, nextHover: null };
}
