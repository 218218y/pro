import type { DragEventLike, InputChangeEventLike } from './order_pdf_overlay_interactions_shared.js';

type ToastLike = { toast: (message: string, level: 'success' | 'warning' | 'error' | 'info') => void };

export function readInputSelectedFile(e: InputChangeEventLike | null | undefined): File | null {
  const file = e?.target?.files && e.target.files[0] ? e.target.files[0] : null;
  try {
    if (e?.target) e.target.value = '';
  } catch {
    // Allow same file re-selection even when the browser disallows value reset.
  }
  return file;
}

export function readDroppedFile(e: DragEventLike | null | undefined): File | null {
  const dt = e?.dataTransfer;
  return dt && dt.files && dt.files[0] ? dt.files[0] : null;
}

export function isPdfFileLike(file: Pick<File, 'type' | 'name'> | null | undefined): boolean {
  if (!file) return false;
  const name = String(file.name || '').toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf');
}

export async function loadPdfFileFromInput(args: {
  event: InputChangeEventLike | null | undefined;
  fb: ToastLike;
  loadPdfIntoEditor: (file: File) => Promise<unknown>;
}): Promise<void> {
  const { event, fb, loadPdfIntoEditor } = args;
  const file = readInputSelectedFile(event);
  if (!file) return;
  if (!isPdfFileLike(file)) {
    fb.toast('בחר קובץ PDF', 'error');
    return;
  }
  await loadPdfIntoEditor(file);
}

export async function loadPdfFileFromDrop(args: {
  event: DragEventLike | null | undefined;
  fb: ToastLike;
  loadPdfIntoEditor: (file: File) => Promise<unknown>;
}): Promise<void> {
  const { event, fb, loadPdfIntoEditor } = args;
  const file = readDroppedFile(event);
  if (!file) return;
  if (!isPdfFileLike(file)) {
    fb.toast('יש לגרור קובץ PDF', 'error');
    return;
  }
  await loadPdfIntoEditor(file);
}
