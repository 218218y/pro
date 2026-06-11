import type { HTMLAttributes, MutableRefObject } from 'react';

export type OrderPdfRichKind = 'details' | 'notes';

export type OrderPdfDetailsEditorHandlers = Pick<
  HTMLAttributes<HTMLDivElement>,
  | 'onKeyDown'
  | 'onBeforeInput'
  | 'onCompositionStart'
  | 'onCompositionUpdate'
  | 'onPaste'
  | 'onCut'
  | 'onInput'
>;

export type OrderPdfNotesEditorHandlers = Pick<HTMLAttributes<HTMLDivElement>, 'onInput'>;

export function createOrderPdfDetailsEditorHandlers(args: {
  detailsUserIntentRef: MutableRefObject<boolean>;
  detailsDirtyRef: MutableRefObject<boolean>;
  isRichProgrammatic: (kind: OrderPdfRichKind) => boolean;
  clearRichProgrammatic: (kind: OrderPdfRichKind) => void;
  syncRichFieldsFromDom: () => void;
  reportNonFatal: (op: string, err: unknown) => void;
}): OrderPdfDetailsEditorHandlers {
  const {
    detailsUserIntentRef,
    detailsDirtyRef,
    isRichProgrammatic,
    clearRichProgrammatic,
    syncRichFieldsFromDom,
    reportNonFatal,
  } = args;

  return {
    onKeyDown: e => {
      try {
        const isTrusted = typeof e.isTrusted === 'boolean' ? e.isTrusted : true;
        if (!isTrusted) return;

        const k = e.key;
        const ctrl = !!e.ctrlKey;
        const meta = !!e.metaKey;
        const alt = !!e.altKey;

        if (k === 'Enter' || k === 'Backspace' || k === 'Delete') detailsUserIntentRef.current = true;
        else if (typeof k === 'string' && k.length === 1 && !ctrl && !meta && !alt)
          detailsUserIntentRef.current = true;

        if (detailsUserIntentRef.current) clearRichProgrammatic('details');
      } catch (__wpErr) {
        reportNonFatal('rich:details:onKeyDown', __wpErr);
      }
    },
    onBeforeInput: e => {
      const isTrusted = typeof e.isTrusted === 'boolean' ? e.isTrusted : true;
      if (isTrusted && !isRichProgrammatic('details')) clearRichProgrammatic('details');
    },
    onCompositionStart: e => {
      const isTrusted = typeof e.isTrusted === 'boolean' ? e.isTrusted : true;
      if (!isTrusted) return;
      if (isRichProgrammatic('details')) return;
      detailsUserIntentRef.current = true;
      clearRichProgrammatic('details');
    },
    onCompositionUpdate: e => {
      const isTrusted = typeof e.isTrusted === 'boolean' ? e.isTrusted : true;
      if (!isTrusted) return;
      if (isRichProgrammatic('details')) return;
      detailsUserIntentRef.current = true;
      clearRichProgrammatic('details');
    },
    onPaste: e => {
      const isTrusted = typeof e.isTrusted === 'boolean' ? e.isTrusted : true;
      if (isTrusted && !isRichProgrammatic('details')) detailsDirtyRef.current = true;
      detailsUserIntentRef.current = false;
      clearRichProgrammatic('details');
      syncRichFieldsFromDom();
    },
    onCut: e => {
      const isTrusted = typeof e.isTrusted === 'boolean' ? e.isTrusted : true;
      if (isTrusted && !isRichProgrammatic('details')) detailsDirtyRef.current = true;
      detailsUserIntentRef.current = false;
      clearRichProgrammatic('details');
      syncRichFieldsFromDom();
    },
    onInput: e => {
      const isTrusted = typeof e.isTrusted === 'boolean' ? e.isTrusted : true;
      if (isTrusted && detailsUserIntentRef.current && !isRichProgrammatic('details'))
        detailsDirtyRef.current = true;
      detailsUserIntentRef.current = false;
      syncRichFieldsFromDom();
    },
  };
}

export function createOrderPdfNotesEditorHandlers(args: {
  syncRichFieldsFromDom: () => void;
}): OrderPdfNotesEditorHandlers {
  const { syncRichFieldsFromDom } = args;
  return {
    onInput: () => {
      syncRichFieldsFromDom();
    },
  };
}
