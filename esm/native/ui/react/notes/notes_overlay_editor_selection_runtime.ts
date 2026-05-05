import { normalizeCssColorToHex, normalizeEditorFontSizeValue } from './notes_overlay_helpers_style.js';
import { resolveNotesToolbarFontSizeUi } from './notes_overlay_text_style_runtime.js';

export type SelectionOffsets = { start: number; end: number };
export type ToolbarSelectionState = {
  bold: boolean | null;
  color: string | null;
  fontSizeUi: string | null;
};

type SelectionEndpoint = { container: Node; offset: number };

function readElementNode(node: Node | null | undefined): Element | null {
  return node instanceof Element ? node : null;
}

function readChildNodes(node: Node | null | undefined): Node[] {
  return node ? Array.from(node.childNodes) : [];
}

function readRangeStartElement(range: Range): Element | null {
  const sc = range.startContainer;
  return readElementNode(sc) || sc.parentElement;
}

function subtreeLen(node: Node): number {
  if (node.nodeType === 3) return String(node.nodeValue || '').length;
  if (node.nodeType !== 1) return 0;

  const tag = String(readElementNode(node)?.tagName || '').toUpperCase();
  if (tag === 'BR') return 1;

  let sum = 0;
  for (const child of readChildNodes(node)) sum += subtreeLen(child);
  return sum;
}

function createSelectionOffsetReader(editor: HTMLElement) {
  return (container: Node, nodeOffset: number): number => {
    let total = 0;
    let found = false;

    const walk = (node: Node): void => {
      if (found) return;

      if (node === container) {
        if (node.nodeType === 3) {
          const len = String(node.nodeValue || '').length;
          total += Math.max(0, Math.min(nodeOffset, len));
        } else {
          const children = readChildNodes(node);
          const limit = Math.max(0, Math.min(nodeOffset, children.length));
          for (let i = 0; i < limit; i += 1) total += subtreeLen(children[i]);
        }
        found = true;
        return;
      }

      if (node.nodeType === 3) {
        total += String(node.nodeValue || '').length;
        return;
      }

      if (node.nodeType !== 1) return;

      const tag = String(readElementNode(node)?.tagName || '').toUpperCase();
      if (tag === 'BR') {
        total += 1;
        return;
      }

      for (const child of readChildNodes(node)) {
        walk(child);
        if (found) return;
      }
    };

    for (const child of readChildNodes(editor)) {
      walk(child);
      if (found) break;
    }

    return total;
  };
}

function createSelectionEndpointLocator(editor: HTMLElement) {
  return (target: number): SelectionEndpoint => {
    let remaining = target;

    const locateIn = (node: Node): SelectionEndpoint | null => {
      if (node.nodeType === 3) {
        const len = String(node.nodeValue || '').length;
        if (remaining <= len) return { container: node, offset: remaining };
        remaining -= len;
        return null;
      }

      if (node.nodeType !== 1) return null;

      const tag = String(readElementNode(node)?.tagName || '').toUpperCase();
      if (tag === 'BR') {
        if (remaining <= 1) {
          const parent = node.parentNode || editor;
          const siblings = readChildNodes(parent);
          const index = siblings.indexOf(node);
          return { container: parent, offset: index + (remaining > 0 ? 1 : 0) };
        }
        remaining -= 1;
        return null;
      }

      for (const child of readChildNodes(node)) {
        const result = locateIn(child);
        if (result) return result;
      }
      return null;
    };

    for (const child of readChildNodes(editor)) {
      const result = locateIn(child);
      if (result) return result;
    }

    return { container: editor, offset: editor.childNodes.length };
  };
}

export function getSelectionOffsetsForEditorRuntime(
  doc: Document | null | undefined,
  editor: HTMLElement | null | undefined
): SelectionOffsets | null {
  try {
    const currentDoc = doc || null;
    const currentEditor = editor || null;
    const win = currentDoc?.defaultView || null;
    if (!currentDoc || !win || !currentEditor) return null;

    const selection = typeof win.getSelection === 'function' ? win.getSelection() : null;
    if (!selection || selection.rangeCount < 1) return null;

    const range = selection.getRangeAt(0);
    if (!range || !currentEditor.contains(range.commonAncestorContainer)) return null;

    const readOffset = createSelectionOffsetReader(currentEditor);
    return {
      start: readOffset(range.startContainer, range.startOffset),
      end: readOffset(range.endContainer, range.endOffset),
    };
  } catch {
    return null;
  }
}

export function restoreSelectionOffsetsForEditorRuntime(
  doc: Document | null | undefined,
  editor: HTMLElement | null | undefined,
  offsets: SelectionOffsets | null | undefined
): void {
  const currentDoc = doc || null;
  const currentEditor = editor || null;

  try {
    const win = currentDoc?.defaultView || null;
    if (!currentDoc || !win || !currentEditor) return;

    currentEditor.focus();

    const selection = typeof win.getSelection === 'function' ? win.getSelection() : null;
    if (!selection) return;

    const maxLen = subtreeLen(currentEditor);
    const start = offsets ? Math.max(0, Math.min(offsets.start, maxLen)) : maxLen;
    const end = offsets ? Math.max(0, Math.min(offsets.end, maxLen)) : start;
    const locate = createSelectionEndpointLocator(currentEditor);
    const startPoint = locate(start);
    const endPoint = locate(end);

    const range = currentDoc.createRange();
    range.setStart(startPoint.container, startPoint.offset);
    range.setEnd(endPoint.container, endPoint.offset);

    try {
      selection.removeAllRanges();
    } catch {
      // ignore removeAllRanges failures
    }
    selection.addRange(range);
  } catch {
    // ignore restore failures
  }
}

export function readToolbarSelectionStateRuntime(
  doc: Document | null | undefined,
  editor: HTMLElement | null | undefined
): ToolbarSelectionState | null {
  try {
    const currentDoc = doc || null;
    const currentEditor = editor || null;
    const win = currentDoc?.defaultView || null;
    if (!currentDoc || !currentEditor || !win || typeof win.getSelection !== 'function') return null;

    const selection = win.getSelection();
    if (!selection || selection.rangeCount < 1) return null;

    const range = selection.getRangeAt(0);
    if (!range || !currentEditor.contains(range.commonAncestorContainer)) return null;

    let bold: boolean | null = null;
    try {
      bold = !!currentDoc.queryCommandState('bold');
    } catch {
      bold = null;
    }

    let color: string | null = null;
    try {
      color = normalizeCssColorToHex(currentDoc.queryCommandValue('foreColor'));
    } catch {
      color = null;
    }
    if (!color) {
      const node = readRangeStartElement(range);
      if (node && typeof win.getComputedStyle === 'function') {
        color = normalizeCssColorToHex(win.getComputedStyle(node).color);
      }
    }

    let nextSize: string | null = null;
    try {
      nextSize = normalizeEditorFontSizeValue(currentDoc.queryCommandValue('fontSize'));
    } catch {
      nextSize = null;
    }
    if (!nextSize) {
      const node = readRangeStartElement(range);
      if (node && typeof win.getComputedStyle === 'function') {
        nextSize = normalizeEditorFontSizeValue(win.getComputedStyle(node).fontSize);
      }
    }

    return {
      bold,
      color,
      fontSizeUi: nextSize ? resolveNotesToolbarFontSizeUi(nextSize) : null,
    };
  } catch {
    return null;
  }
}
