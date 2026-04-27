export type OrderPdfSketchShortcutLike = {
  key?: string | null;
  code?: string | null;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

function readShortcutKey(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasSketchShortcutModifier(event: OrderPdfSketchShortcutLike): boolean {
  return !!(event.ctrlKey || event.metaKey) && !event.altKey;
}

function isSketchUndoKey(event: OrderPdfSketchShortcutLike): boolean {
  const code = readShortcutKey(event.code);
  const key = readShortcutKey(event.key);
  return code === 'KeyZ' || key === 'z' || key === 'Z' || key === 'ז';
}

function isSketchRedoKey(event: OrderPdfSketchShortcutLike): boolean {
  const code = readShortcutKey(event.code);
  const key = readShortcutKey(event.key);
  return code === 'KeyY' || key === 'y' || key === 'Y' || key === 'ט';
}

export function isOrderPdfSketchUndoShortcut(event: OrderPdfSketchShortcutLike | null | undefined): boolean {
  if (!event || !hasSketchShortcutModifier(event)) return false;
  if (!!event.shiftKey) return false;
  return isSketchUndoKey(event);
}

export function isOrderPdfSketchRedoShortcut(event: OrderPdfSketchShortcutLike | null | undefined): boolean {
  if (!event || !hasSketchShortcutModifier(event)) return false;
  const shift = !!event.shiftKey;
  return isSketchRedoKey(event) || (shift && isSketchUndoKey(event));
}

export function isOrderPdfSketchHistoryShortcut(
  event: OrderPdfSketchShortcutLike | null | undefined
): boolean {
  return isOrderPdfSketchUndoShortcut(event) || isOrderPdfSketchRedoShortcut(event);
}
