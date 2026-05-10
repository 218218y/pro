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

export const STRUCTURE_LIBRARY_GLASS_EDIT_TOAST = 'מצב זכוכית לספריות פעיל — לחץ על דלתות לבחירה';
export const STRUCTURE_LIBRARY_GLASS_EDIT_CURSOR = 'crosshair';
export const STRUCTURE_LIBRARY_GLASS_EDIT_SOURCE = 'react:structure:libraryGlass:edit';

type EnterPrimaryModeFn = (app: AppContainer, modeId: unknown, opts?: UnknownRecord) => void;
type GetToolsFn = (app: AppContainer) => ToolsNamespaceLike;
type SetCurtainChoiceFn = (app: AppContainer, id: unknown) => void;
type SetMultiEnabledFn = (app: AppContainer, next: boolean, meta?: ActionMetaLike) => void;

export type StructureLibraryGlassEditDeps = {
  modes?: unknown;
  enterPrimaryMode?: EnterPrimaryModeFn;
  getTools?: GetToolsFn;
  setCurtainChoice?: SetCurtainChoiceFn;
  setMultiEnabled?: SetMultiEnabledFn;
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

function safeCall(fn: () => void): void {
  try {
    fn();
  } catch {
    // Editing-mode wiring is best effort: each side effect below has its own fallback.
  }
}

function toast(fb: UiFeedbackNamespaceLike | null | undefined, message: string, type: string): void {
  safeCall(() => {
    const fn = typeof fb?.toast === 'function' ? fb.toast : null;
    if (fn) fn(message, type);
  });
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
  const paintModeId = resolveStructureLibraryPaintModeId(deps.modes || MODES);

  safeCall(() => setMultiEnabledImpl(args.app, true, meta));
  safeCall(() => setCurtainChoiceImpl(args.app, 'none'));
  safeCall(() =>
    enterPrimaryModeImpl(args.app, paintModeId, {
      cursor: STRUCTURE_LIBRARY_GLASS_EDIT_CURSOR,
      toast: STRUCTURE_LIBRARY_GLASS_EDIT_TOAST,
    })
  );
  safeCall(() => {
    const tools = getToolsImpl(args.app);
    if (typeof tools.setPaintColor === 'function') tools.setPaintColor(paintId, meta);
  });

  toast(args.fb, STRUCTURE_LIBRARY_GLASS_EDIT_TOAST, 'info');
  return true;
}
