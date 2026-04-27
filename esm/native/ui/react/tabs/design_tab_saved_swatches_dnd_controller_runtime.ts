import { __designTabReportNonFatal } from './design_tab_multicolor_panel.js';

import type { DesignTabSwatchDropPos, DesignTabSwatchReorderPos } from './design_tab_shared.js';

export type DesignTabSavedSwatchesDndTargetLike = {
  getBoundingClientRect: () => { left: number; width: number };
  ownerDocument?: {
    defaultView?: {
      getComputedStyle?: (node: Element) => { direction?: string };
    } | null;
  } | null;
};

export type DesignTabSavedSwatchesDragEventLike = {
  currentTarget: DesignTabSavedSwatchesDndTargetLike;
  clientX: number;
  dataTransfer?: Pick<DataTransfer, 'effectAllowed' | 'setData' | 'getData'> | null;
  preventDefault?: (() => void) | null;
  stopPropagation?: (() => void) | null;
};

type SetDragOverColorPosState = (
  value: DesignTabSwatchDropPos | ((prev: DesignTabSwatchDropPos) => DesignTabSwatchDropPos)
) => void;
type SetColorIdState = (value: string | ((prev: string) => string)) => void;

type DesignTabSavedSwatchesDndReportNonFatal = (scope: string, err: unknown) => void;

export type DesignTabSavedSwatchesDndController = {
  clearDragState: () => void;
  handleRowDragLeave: () => void;
  handleDragStart: (id: string, event: DesignTabSavedSwatchesDragEventLike) => void;
  handleDragEnd: () => void;
  handleDragOver: (id: string, event: DesignTabSavedSwatchesDragEventLike) => void;
  handleDrop: (id: string, event: DesignTabSavedSwatchesDragEventLike) => void;
  handleEndDragOver: (event: DesignTabSavedSwatchesDragEventLike) => void;
  handleEndDrop: (event: DesignTabSavedSwatchesDragEventLike) => void;
};

export type CreateDesignTabSavedSwatchesDndControllerArgs = {
  canReorderColorSwatches: boolean;
  draggingColorId: string;
  dragOverColorId: string;
  dragOverColorPos: DesignTabSwatchDropPos;
  setDraggingColorId: SetColorIdState;
  setDragOverColorId: SetColorIdState;
  setDragOverColorPos: SetDragOverColorPosState;
  reorderByDnD: (dragId: string, overId: string | null, pos: DesignTabSwatchReorderPos) => void;
  reportNonFatal?: DesignTabSavedSwatchesDndReportNonFatal;
};

function noop(): void {}

function runEventStep(
  event: { preventDefault?: (() => void) | null; stopPropagation?: (() => void) | null } | null | undefined,
  key: 'preventDefault' | 'stopPropagation'
) {
  const fn = event?.[key];
  if (typeof fn === 'function') Reflect.apply(fn, event, []);
}

function isStyleDirectionTarget(value: unknown): value is Element {
  return !!value && typeof value === 'object' && 'getBoundingClientRect' in value;
}

export function resolveDesignTabSwatchDropPos(
  target: DesignTabSavedSwatchesDndTargetLike,
  clientX: number,
  reportNonFatal: DesignTabSavedSwatchesDndReportNonFatal = __designTabReportNonFatal
): Exclude<DesignTabSwatchReorderPos, 'end'> {
  const rect = target.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;

  let rtl = false;
  try {
    const view = target.ownerDocument?.defaultView;
    rtl =
      !!view && typeof view.getComputedStyle === 'function'
        ? isStyleDirectionTarget(target)
          ? view.getComputedStyle(target).direction === 'rtl'
          : false
        : false;
  } catch (err) {
    reportNonFatal('designTabSavedSwatches:resolveDropPos', err);
  }

  const before = rtl ? clientX > midX : clientX < midX;
  return before ? 'before' : 'after';
}

export function readDesignTabDraggedColorId(
  dataTransfer?: Pick<DataTransfer, 'getData'> | null,
  reportNonFatal: DesignTabSavedSwatchesDndReportNonFatal = noop
): string {
  try {
    return String(dataTransfer?.getData('text/plain') || '');
  } catch (err) {
    reportNonFatal('designTabSavedSwatches:readDragId', err);
    return '';
  }
}

export function createDesignTabSavedSwatchesDndController(
  args: CreateDesignTabSavedSwatchesDndControllerArgs
): DesignTabSavedSwatchesDndController {
  const {
    canReorderColorSwatches,
    draggingColorId,
    dragOverColorId,
    dragOverColorPos,
    setDraggingColorId,
    setDragOverColorId,
    setDragOverColorPos,
    reorderByDnD,
    reportNonFatal = __designTabReportNonFatal,
  } = args;

  function clearDragState() {
    setDraggingColorId('');
    setDragOverColorId('');
    setDragOverColorPos('');
  }

  return {
    clearDragState,

    handleRowDragLeave() {
      if (!canReorderColorSwatches || !draggingColorId) return;
      setDragOverColorId('');
      setDragOverColorPos('');
    },

    handleDragStart(id: string, event: DesignTabSavedSwatchesDragEventLike) {
      if (!canReorderColorSwatches) return;
      try {
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', id);
        }
      } catch (err) {
        reportNonFatal('designTabSavedSwatches:dragStart', err);
      }
      setDraggingColorId(id);
      setDragOverColorId('');
      setDragOverColorPos('');
    },

    handleDragEnd() {
      if (canReorderColorSwatches) clearDragState();
    },

    handleDragOver(id: string, event: DesignTabSavedSwatchesDragEventLike) {
      if (!canReorderColorSwatches || !draggingColorId || draggingColorId === id) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      const pos = resolveDesignTabSwatchDropPos(event.currentTarget, event.clientX, reportNonFatal);
      if (dragOverColorId !== id) setDragOverColorId(id);
      if (dragOverColorPos !== pos) setDragOverColorPos(pos);
    },

    handleDrop(id: string, event: DesignTabSavedSwatchesDragEventLike) {
      if (!canReorderColorSwatches) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');

      const dragId = String(
        draggingColorId || readDesignTabDraggedColorId(event.dataTransfer, reportNonFatal)
      ).trim();
      if (dragId && dragId !== id) {
        const pos = resolveDesignTabSwatchDropPos(event.currentTarget, event.clientX, reportNonFatal);
        reorderByDnD(dragId, id, pos);
      }

      clearDragState();
    },

    handleEndDragOver(event: DesignTabSavedSwatchesDragEventLike) {
      if (!canReorderColorSwatches || !draggingColorId) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      if (dragOverColorId !== '__end__') setDragOverColorId('__end__');
      if (dragOverColorPos !== 'after') setDragOverColorPos('after');
    },

    handleEndDrop(event: DesignTabSavedSwatchesDragEventLike) {
      if (!canReorderColorSwatches) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');

      const dragId = String(
        draggingColorId || readDesignTabDraggedColorId(event.dataTransfer, reportNonFatal)
      ).trim();
      if (dragId) reorderByDnD(dragId, null, 'end');
      clearDragState();
    },
  };
}
