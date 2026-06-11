import type { ActionMetaLike, UnknownRecord } from '../../../../../types';

import {
  applyUiSoftScalarPatch,
  setUiSingleDoorPos,
  setUiStructureSelect,
} from '../actions/store_actions.js';
import { normalizeSingleDoorPos } from './structure_tab_library_helpers.js';
import { applyStructureTemplateRecomputeBatch } from './structure_tab_core.js';
import {
  type CreateStructureTabStructuralControllerArgs,
  type StructureTabStructuralController,
  type StructureUiPartial,
} from './structure_tab_structural_controller_contracts.js';
import { asRecord } from './structure_tab_structural_controller_shared.js';
import { structureTabReportNonFatal } from './structure_tab_shared.js';

const STRUCTURAL_AUTO_COMMIT_SUFFIXES = [':init', ':normalize'];

function hasOwnStructuralCommitField(patch: UnknownRecord): boolean {
  return (
    Object.prototype.hasOwnProperty.call(patch, 'structureSelect') ||
    Object.prototype.hasOwnProperty.call(patch, 'singleDoorPos')
  );
}

function isAutoStructuralCommitSource(source: string): boolean {
  return STRUCTURAL_AUTO_COMMIT_SUFFIXES.some(suffix => source.endsWith(suffix));
}

function createStructuralCommitMeta(
  args: CreateStructureTabStructuralControllerArgs,
  patch: UnknownRecord,
  source: string
): ActionMetaLike {
  if (!hasOwnStructuralCommitField(patch) || isAutoStructuralCommitSource(source)) {
    return args.meta.uiOnlyImmediate(source);
  }

  if (typeof args.meta.noBuildImmediate === 'function') {
    return args.meta.noBuildImmediate(source);
  }

  return args.meta.noBuild({ immediate: true }, source);
}

export function createStructureTabStructuralSyncController(
  args: CreateStructureTabStructuralControllerArgs
): Pick<StructureTabStructuralController, 'commitStructural' | 'syncSingleDoorPos' | 'syncHingeVisibility'> {
  const commitStructural = (partial: StructureUiPartial, source: string): void => {
    const patch = asRecord(partial) || {};
    if (!Object.keys(patch).length) return;

    try {
      const actionMeta: ActionMetaLike = createStructuralCommitMeta(args, patch, source);
      applyStructureTemplateRecomputeBatch({
        app: args.app,
        source,
        meta: actionMeta,
        uiPatch: patch,
        statePatch: { ui: patch },
        mutate: () => {
          if (Object.prototype.hasOwnProperty.call(patch, 'structureSelect')) {
            setUiStructureSelect(args.app, patch.structureSelect, actionMeta);
          }
          if (Object.prototype.hasOwnProperty.call(patch, 'singleDoorPos')) {
            setUiSingleDoorPos(args.app, patch.singleDoorPos, actionMeta);
          }

          const softPatch: UnknownRecord = { ...patch };
          delete softPatch.structureSelect;
          delete softPatch.singleDoorPos;
          applyUiSoftScalarPatch(args.app, softPatch, actionMeta);
        },
      });
    } catch (err) {
      structureTabReportNonFatal('structureTabStructuralController.commitStructural', err);
    }
  };

  return {
    commitStructural,

    syncSingleDoorPos() {
      if (!args.shouldShowSingleDoor) return;

      const rawPos = String(args.singleDoorPosRaw || '').trim();
      const normalized = normalizeSingleDoorPos(args.doors, rawPos);

      if (!rawPos) {
        commitStructural({ singleDoorPos: 'left' }, 'react:structure:singleDoorPos:init');
        return;
      }

      if (!normalized) {
        commitStructural({ singleDoorPos: 'left' }, 'react:structure:singleDoorPos:normalize');
      } else if (normalized !== rawPos) {
        commitStructural({ singleDoorPos: normalized }, 'react:structure:singleDoorPos:normalize');
      }
    },

    syncHingeVisibility() {
      if (!args.shouldShowHingeBtn && args.hingeDirection) {
        args.onSetHingeDirection(false, 'react:structure:hinge:autoOff');
      }
    },
  };
}
