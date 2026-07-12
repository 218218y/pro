import type { SketchStructuralCommand } from './canvas_picking_sketch_structural_command.js';
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

function readRecordNumber(source: unknown, key: string): number | null {
  if (!source || typeof source !== 'object') return readNumber(source);
  return readNumber((source as Record<string, unknown>)[key]);
}

function readBaseLegOptionsFromState(source: unknown): ReturnType<typeof readBaseLegOptions> {
  const rec = source && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  return readBaseLegOptions({
    baseLegStyle: rec.baseLegStyle,
    baseLegColor: rec.baseLegColor,
    baseLegHeightCm: readNumber(rec.baseLegHeightCm),
    baseLegWidthCm: readNumber(rec.baseLegWidthCm),
  });
}

function getSketchBoxAdornmentBaseHeight(baseType: unknown, source?: unknown): number {
  const normalized = normalizeSketchBoxBaseType(baseType);
  if (normalized === 'legs') {
    const heightCm = readRecordNumber(source, 'heightCm') ?? readRecordNumber(source, 'baseLegHeightCm');
    const bottomPlatformHeight =
      normalizeBaseLegPlatformMode((source as Record<string, unknown> | null)?.baseLegPlatformMode) ===
      'stage'
        ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM
        : 0;
    if (heightCm != null && heightCm > 0) return Math.max(0.01, heightCm / 100) + bottomPlatformHeight;
    return readBaseLegOptionsFromState(source).heightM + bottomPlatformHeight;
  }
  if (normalized === 'plinth') return getBasePlinthHeightM(readRecordNumber(source, 'basePlinthHeightCm'));
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
  structuralCommand: SketchStructuralCommand | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: null } {
  const { commitArgs, structuralCommand, hoverOp } = args;

  if (commitArgs.contentKind === 'divider') {
    if (!structuralCommand) return { handled: true, nextHover: null };
    if (structuralCommand.kind === 'remove-divider') {
      const dividerId = structuralCommand.dividerId || '';
      if (structuralCommand.axis === 'horizontal') {
        removeSketchBoxHorizontalDividerState(
          commitArgs.box,
          dividerId,
          structuralCommand.dividerYNorm ?? undefined,
          structuralCommand.dividerXNorm ?? undefined
        );
      } else {
        removeSketchBoxDividerState(
          commitArgs.box,
          dividerId,
          structuralCommand.dividerXNorm ?? undefined,
          structuralCommand.dividerYNorm ?? undefined
        );
      }
      return { handled: true, nextHover: null };
    }
    if (hoverOp !== 'add') return { handled: true, nextHover: null };
    if (structuralCommand.kind === 'add-horizontal-divider') {
      addSketchBoxHorizontalDividerState(
        commitArgs.box,
        structuralCommand.dividerYNorm,
        structuralCommand.dividerId || '',
        {
          frontZ: structuralCommand.freePlacement
            ? (structuralCommand.dividerFrontZ ?? undefined)
            : undefined,
          xNorm: structuralCommand.dividerXNorm ?? undefined,
        }
      );
      return { handled: true, nextHover: null };
    }
    if (structuralCommand.kind === 'add-vertical-divider') {
      addSketchBoxDividerState(
        commitArgs.box,
        structuralCommand.dividerXNorm,
        structuralCommand.dividerId || '',
        {
          frontZ: structuralCommand.freePlacement
            ? (structuralCommand.dividerFrontZ ?? undefined)
            : undefined,
          yNorm: structuralCommand.dividerYNorm ?? undefined,
        }
      );
    }
    return { handled: true, nextHover: null };
  }

  if (commitArgs.contentKind === 'cornice') {
    if (!structuralCommand) return { handled: true, nextHover: null };
    if (structuralCommand.kind === 'remove-cornice') {
      commitArgs.box.hasCornice = false;
      delete commitArgs.box.corniceType;
    } else if (structuralCommand.kind === 'set-cornice') {
      commitArgs.box.hasCornice = true;
      commitArgs.box.corniceType = normalizeSketchBoxCorniceType(structuralCommand.corniceType);
    }
    return { handled: true, nextHover: null };
  }

  if (commitArgs.contentKind === 'base') {
    if (!structuralCommand) return { handled: true, nextHover: null };
    const floorY = typeof commitArgs.floorY === 'number' ? commitArgs.floorY : NaN;
    const removing = structuralCommand.kind === 'remove-base';
    if (!removing && structuralCommand.kind !== 'set-base') {
      return { handled: true, nextHover: null };
    }
    const nextBaseType = removing ? 'none' : normalizeSketchBoxBaseType(structuralCommand.baseType);
    const appliedBaseType = removing || nextBaseType === 'none' ? 'none' : nextBaseType;
    const nextBaseOptions = removing
      ? readBaseLegOptions({})
      : readBaseLegOptions({
          baseLegStyle: structuralCommand.baseLegStyle,
          baseLegColor: structuralCommand.baseLegColor,
          baseLegHeightCm: structuralCommand.baseLegHeightCm,
          baseLegWidthCm: structuralCommand.baseLegWidthCm,
        });
    const nextBasePlatformMode = removing
      ? normalizeBaseLegPlatformMode(null)
      : normalizeBaseLegPlatformMode(structuralCommand.baseLegPlatformMode);
    const nextBasePlatformSideMode = removing
      ? normalizeBaseLegPlatformSideMode(null)
      : normalizeBaseLegPlatformSideMode(structuralCommand.baseLegPlatformSideMode);
    const nextBasePlatformSideOverhangCm = normalizeBaseLegPlatformSideOverhangCm(
      removing ? null : structuralCommand.baseLegPlatformSideOverhangCm
    );
    const nextBasePlatformFrontOverhangCm = normalizeBaseLegPlatformFrontOverhangCm(
      removing ? null : structuralCommand.baseLegPlatformFrontOverhangCm
    );
    const nextBasePlinthHeightCm = normalizeBasePlinthHeightCm(
      removing ? null : structuralCommand.basePlinthHeightCm
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
