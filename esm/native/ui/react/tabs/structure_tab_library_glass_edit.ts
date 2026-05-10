import type {
  ActionMetaLike,
  AppContainer,
  ToolsNamespaceLike,
  UiFeedbackNamespaceLike,
  UnknownRecord,
} from '../../../../../types';

import { MODES, getTools } from '../../../services/api.js';
import { enterPrimaryMode } from '../actions/modes_actions.js';
import { setCurtainChoice, setMultiEnabled } from '../../multicolor_service.js';
import { structureTabReportNonFatal } from './structure_tab_shared.js';

export const STRUCTURE_LIBRARY_GLASS_EDIT_TOAST = 'מצב זכוכית לספריות פעיל — לחץ על דלתות לבחירה';
export const STRUCTURE_LIBRARY_GLASS_EDIT_CURSOR = 'crosshair';
export const STRUCTURE_LIBRARY_GLASS_EDIT_SOURCE = 'react:structure:libraryGlass:edit';

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
  return String(value == null ? '' : value).trim();
}

function runGlassEditStep(op: string, reportNonFatal: ReportNonFatalFn, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    reportNonFatal(op, err);
  }
}

export function enterStructureLibraryGlassEditMode(args: {
  app: AppContainer;
  fb?: UiFeedbackNamespaceLike | null;
  paintId: string;
  deps?: StructureLibraryGlassEditDeps;
}): boolean {
  const paintId = normalizePaintId(args.paintId);
  if (!paintId) return false;

  const deps = args.deps || {};
  const meta: ActionMetaLike = { source: STRUCTURE_LIBRARY_GLASS_EDIT_SOURCE, immediate: true };
  const setMultiEnabledImpl = deps.setMultiEnabled || setMultiEnabled;
  const setCurtainChoiceImpl = deps.setCurtainChoice || setCurtainChoice;
  const enterPrimaryModeImpl = deps.enterPrimaryMode || enterPrimaryMode;
  const getToolsImpl = deps.getTools || getTools;
  const reportNonFatal = deps.reportNonFatal || structureTabReportNonFatal;
  const paintModeId = resolveStructureLibraryPaintModeId(deps.modes || MODES);

  runGlassEditStep('structureLibraryGlassEdit.setMultiEnabled', reportNonFatal, () =>
    setMultiEnabledImpl(args.app, true, meta)
  );
  runGlassEditStep('structureLibraryGlassEdit.setCurtainChoice', reportNonFatal, () =>
    setCurtainChoiceImpl(args.app, 'none')
  );
  runGlassEditStep('structureLibraryGlassEdit.enterPrimaryMode', reportNonFatal, () =>
    enterPrimaryModeImpl(args.app, paintModeId, {
      cursor: STRUCTURE_LIBRARY_GLASS_EDIT_CURSOR,
      toast: STRUCTURE_LIBRARY_GLASS_EDIT_TOAST,
    })
  );
  runGlassEditStep('structureLibraryGlassEdit.setPaintColor', reportNonFatal, () => {
    const tools = getToolsImpl(args.app);
    if (typeof tools.setPaintColor !== 'function')
      throw new TypeError('tools.setPaintColor is not available');
    tools.setPaintColor(paintId, meta);
  });

  return true;
}
