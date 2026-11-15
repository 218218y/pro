import type {
  ActionMetaLike,
  AppContainer,
  ToolsNamespaceLike,
  UiFeedbackNamespaceLike,
  UnknownRecord,
} from '../../../../../types';

import { MODES, getTools } from '../../../services/api.js';
import {
  encodeDoorStyleOverridePaintToken,
  type DoorStyleOverrideValue,
} from '../../../features/door_authoring/api.js';
import { enterPrimaryMode } from '../actions/modes_actions.js';
import { setCurtainChoice, setMultiEnabled } from '../../multicolor_service.js';
import { structureTabReportNonFatal } from './structure_tab_shared.js';

export const STRUCTURE_LIBRARY_GLASS_EDIT_TOAST = 'מצב זכוכית לספריות פעיל — לחץ על דלתות לבחירה';
export const STRUCTURE_LIBRARY_GLASS_EDIT_CURSOR = 'crosshair';
export const STRUCTURE_LIBRARY_GLASS_EDIT_SOURCE = 'react:structure:libraryGlass:edit';
export const STRUCTURE_LIBRARY_DOOR_STYLE_EDIT_SOURCE = 'react:structure:libraryDoorStyle:edit';
export const STRUCTURE_LIBRARY_DOOR_STYLE_EDIT_TOAST = 'מצב סגנון דלתות לספריות פעיל — לחץ על דלת לשינוי';

type EnterPrimaryModeFn = (app: AppContainer, modeId: unknown, opts?: UnknownRecord) => void;
type GetToolsFn = (app: AppContainer) => ToolsNamespaceLike;
type SetCurtainChoiceFn = (app: AppContainer, id: unknown) => void;
type SetMultiEnabledFn = (app: AppContainer, next: boolean, meta?: ActionMetaLike) => void;
type ReportNonFatalFn = (op: string, err: unknown, dedupeMs?: number) => void;

export type StructureLibraryGlassEditDeps = {
  modes?: unknown;
  enterPrimaryMode?: EnterPrimaryModeFn;
  getTools?: GetToolsFn;
  setCurtainChoice?: SetCurtainChoiceFn;
  setMultiEnabled?: SetMultiEnabledFn;
  reportNonFatal?: ReportNonFatalFn;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function resolveStructureLibraryPaintModeId(modes: unknown = MODES): string {
  const rec = isRecord(modes) ? modes : null;
  const paint = rec && typeof rec.PAINT === 'string' ? rec.PAINT.trim() : '';
  return paint || 'paint';
}

function normalizePaintId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

type LibraryPaintEditArgs = {
  app: AppContainer;
  fb?: UiFeedbackNamespaceLike | null | undefined;
  paintId: string;
  deps?: StructureLibraryGlassEditDeps;
};

type LibraryPaintEditIntent = {
  source: string;
  toast: string;
  reportPrefix: string;
  resetCurtain: boolean;
};

function runLibraryPaintEditStep(op: string, reportNonFatal: ReportNonFatalFn, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    reportNonFatal(op, err);
  }
}

/** Both library rows use the same canonical paint mode and paint tool. */
function enterStructureLibraryPaintEditMode(
  args: LibraryPaintEditArgs,
  intent: LibraryPaintEditIntent
): boolean {
  const paintId = normalizePaintId(args.paintId);
  if (!paintId) return false;

  const deps = args.deps || {};
  const meta: ActionMetaLike = { source: intent.source, immediate: true };
  const setMultiEnabledImpl = deps.setMultiEnabled || setMultiEnabled;
  const setCurtainChoiceImpl = deps.setCurtainChoice || setCurtainChoice;
  const enterPrimaryModeImpl = deps.enterPrimaryMode || enterPrimaryMode;
  const getToolsImpl = deps.getTools || getTools;
  const reportNonFatal: ReportNonFatalFn =
    deps.reportNonFatal ||
    ((op, err, dedupeMs) =>
      dedupeMs === undefined
        ? structureTabReportNonFatal(op, err)
        : structureTabReportNonFatal(op, err, dedupeMs));
  const paintModeId = resolveStructureLibraryPaintModeId(deps.modes || MODES);

  runLibraryPaintEditStep(`${intent.reportPrefix}.setMultiEnabled`, reportNonFatal, () =>
    setMultiEnabledImpl(args.app, true, meta)
  );
  if (intent.resetCurtain) {
    runLibraryPaintEditStep(`${intent.reportPrefix}.setCurtainChoice`, reportNonFatal, () =>
      setCurtainChoiceImpl(args.app, 'none')
    );
  }
  runLibraryPaintEditStep(`${intent.reportPrefix}.enterPrimaryMode`, reportNonFatal, () =>
    enterPrimaryModeImpl(args.app, paintModeId, {
      cursor: STRUCTURE_LIBRARY_GLASS_EDIT_CURSOR,
      toast: intent.toast,
    })
  );
  runLibraryPaintEditStep(`${intent.reportPrefix}.setPaintColor`, reportNonFatal, () => {
    const tools = getToolsImpl(args.app);
    if (typeof tools.setPaintColor !== 'function')
      throw new TypeError('tools.setPaintColor is not available');
    tools.setPaintColor(paintId, meta);
  });

  return true;
}

export function enterStructureLibraryGlassEditMode(args: LibraryPaintEditArgs): boolean {
  return enterStructureLibraryPaintEditMode(args, {
    source: STRUCTURE_LIBRARY_GLASS_EDIT_SOURCE,
    toast: STRUCTURE_LIBRARY_GLASS_EDIT_TOAST,
    reportPrefix: 'structureLibraryGlassEdit',
    resetCurtain: true,
  });
}

export function enterStructureLibraryDoorStyleEditMode(args: {
  app: AppContainer;
  fb?: UiFeedbackNamespaceLike | null | undefined;
  style: DoorStyleOverrideValue;
  deps?: StructureLibraryGlassEditDeps;
}): boolean {
  return enterStructureLibraryPaintEditMode(
    {
      app: args.app,
      fb: args.fb,
      paintId: encodeDoorStyleOverridePaintToken(args.style),
      ...(args.deps ? { deps: args.deps } : {}),
    },
    {
      source: STRUCTURE_LIBRARY_DOOR_STYLE_EDIT_SOURCE,
      toast: STRUCTURE_LIBRARY_DOOR_STYLE_EDIT_TOAST,
      reportPrefix: 'structureLibraryDoorStyleEdit',
      resetCurtain: false,
    }
  );
}
