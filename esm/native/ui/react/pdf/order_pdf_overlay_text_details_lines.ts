import { normalizeForCompare, normalizeNewlines } from './order_pdf_overlay_text_shared.js';

export type DetailsLineInfo = {
  key: string;
  label: string;
  prefix: string;
  value: string;
  raw: string;
  hasColon: boolean;
};

export type DetailsLineCollection = {
  order: string[];
  byKey: Record<string, DetailsLineInfo>;
  nonKeyLines: string[];
  labelsInOrder: string[];
};

export function normalizeLineKey(k: string): string {
  return (k || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function parseDetailsLine(line: string): DetailsLineInfo | null {
  const raw = String(line || '');
  const idx = raw.indexOf(':');
  if (idx < 0) return null;

  const label = raw.slice(0, idx).trim();
  const key = normalizeLineKey(label);
  if (!key) return null;

  const after = raw.slice(idx + 1);
  const m = after.match(/^\s*/);
  const ws = m ? m[0] : '';
  const value = after.slice(ws.length);
  const prefix = raw.slice(0, idx + 1) + ws;

  return { key, label, prefix, value, raw, hasColon: true };
}

export function collectDetailsLines(text: string): DetailsLineCollection {
  const t = normalizeNewlines(text || '');
  const lines = t.split('\n');

  const byKey: Record<string, DetailsLineInfo> = {};
  const order: string[] = [];
  const labelsInOrder: string[] = [];
  const nonKeyLines: string[] = [];

  for (const ln of lines) {
    const trimmed = (ln || '').trim();
    if (!trimmed) continue;

    const info = parseDetailsLine(ln);
    if (info) {
      if (!byKey[info.key]) {
        byKey[info.key] = info;
        order.push(info.key);
        if (info.hasColon) labelsInOrder.push(info.label);
      }
      continue;
    }

    nonKeyLines.push(ln);
  }

  return { order, byKey, nonKeyLines, labelsInOrder };
}

export function rehydrateLineBreaksUsingLabels(text: string, labelsInOrder: string[]): string {
  let out = normalizeNewlines(text || '');
  if (!out || out.indexOf('\n') >= 0 || !labelsInOrder || labelsInOrder.length < 2) return out;

  const positions: Array<{ idx: number; label: string }> = [];
  for (const lab of labelsInOrder) {
    const needle = `${lab}:`;
    const idx = out.indexOf(needle);
    if (idx >= 0) positions.push({ idx, label: lab });
  }
  positions.sort((a, b) => a.idx - b.idx);
  if (positions.length < 2) return out;

  for (let i = positions.length - 1; i >= 1; i--) {
    const p = positions[i].idx;
    if (p > 0 && out[p - 1] !== '\n') out = out.slice(0, p) + '\n' + out.slice(p);
  }
  return out;
}

export function splitInlineTailsIntoExtraLines(opts: {
  text: string;
  baseCollected: { byKey: Record<string, DetailsLineInfo> };
  aggressive?: boolean;
}): string {
  const t = normalizeNewlines(opts.text || '');
  if (!t) return t;

  const aggressive = !!opts.aggressive;
  const lines = t.split('\n');
  const out: string[] = [];

  for (const ln of lines) {
    const info = parseDetailsLine(ln);
    if (!info) {
      out.push(ln);
      continue;
    }

    const baseInfo = opts.baseCollected?.byKey ? opts.baseCollected.byKey[info.key] : null;
    if (!baseInfo) {
      out.push(ln);
      continue;
    }

    const bVal = baseInfo.value || '';
    const mVal = info.value || '';
    if (!bVal || !mVal || !mVal.startsWith(bVal)) {
      out.push(ln);
      continue;
    }

    const tail = mVal.slice(bVal.length);
    const tailTrimmed = tail.replace(/^\s+/, '');
    if (!tailTrimmed) {
      out.push(ln);
      continue;
    }

    const looksLikeCollapsedNewLine = aggressive || !/^\s/.test(tail);
    if (!looksLikeCollapsedNewLine) {
      out.push(ln);
      continue;
    }

    out.push(info.prefix + bVal);
    out.push(tailTrimmed);
  }

  return out.join('\n');
}

export function appendInlineExtra(base: string, extra: string): string {
  const b = String(base || '');
  const e = String(extra || '');
  if (!e) return b;
  if (/^\s/.test(e)) return b + e;
  if (!b) return e;
  if (/[\s\t]$/.test(b)) return b + e;

  const bNoMarks = b.replace(/[\u200e\u200f\u202a-\u202e]+$/g, '');
  const eNoMarks = e.replace(/^[\u200e\u200f\u202a-\u202e]+/g, '');
  const last = bNoMarks.slice(-1);
  const first = eNoMarks.slice(0, 1);
  const isWord = (ch: string) => /[0-9A-Za-z\u0590-\u05FF]/.test(ch);
  if (isWord(last) && isWord(first)) return b + ' ' + e;
  if (/^[,.;:!?)\]}>]/.test(e)) return b + e;
  return b + ' ' + e;
}

export function applyLineSuffixesToNewAuto(newAuto: string, suffixByKey: Record<string, string>): string {
  const t = normalizeNewlines(newAuto || '');
  return t
    .split('\n')
    .map(ln => {
      const info = parseDetailsLine(ln);
      if (!info) return ln;

      const suffix = suffixByKey[info.key];
      if (!suffix) return ln;
      if (info.value.endsWith(suffix) || info.value.endsWith(suffix.trimStart())) return ln;

      const mergedVal = appendInlineExtra(info.value, suffix);
      if (mergedVal === info.value) return ln;
      return info.prefix + mergedVal;
    })
    .join('\n');
}

export function commonPrefixLen(a: string, b: string): number {
  const aa = (a || '').replace(/\u00a0/g, ' ');
  const bb = (b || '').replace(/\u00a0/g, ' ');
  const n = Math.min(aa.length, bb.length);
  let i = 0;
  for (; i < n; i++) {
    if (aa.charCodeAt(i) !== bb.charCodeAt(i)) break;
  }
  return i;
}

export function commonSuffixLen(a: string, b: string): number {
  const aa = (a || '').replace(/\u00a0/g, ' ');
  const bb = (b || '').replace(/\u00a0/g, ' ');
  const n = Math.min(aa.length, bb.length);
  let i = 0;
  for (; i < n; i++) {
    if (aa.charCodeAt(aa.length - 1 - i) !== bb.charCodeAt(bb.length - 1 - i)) break;
  }
  return i;
}

export function extractManualTailFromValue(baseVal: string, modVal: string): string {
  const b = (baseVal || '').replace(/\u00a0/g, ' ');
  const m = (modVal || '').replace(/\u00a0/g, ' ');
  if (!m) return '';
  if (m.startsWith(b)) return m.slice(b.length);

  const pre = commonPrefixLen(b, m);
  const minPre = Math.max(4, Math.min(18, Math.floor(b.length * 0.25)));
  if (pre < minPre) return m;

  const bRest = b.slice(pre);
  const mRest = m.slice(pre);
  const suf = commonSuffixLen(bRest, mRest);
  const minSuf = Math.max(3, Math.min(18, Math.floor(bRest.length * 0.25)));
  if (suf >= minSuf) {
    const core = mRest.slice(0, Math.max(0, mRest.length - suf));
    return core || '';
  }

  return m.slice(pre);
}

export function injectExtraLinesPreservingPositions(opts: {
  mergedAuto: string;
  baseCollected: DetailsLineCollection;
  modifiedText: string;
  newAuto: string;
}): { mergedAuto: string; extrasList: string[] } {
  const newAutoLineSet = new Set(
    normalizeNewlines(opts.newAuto || '')
      .split('\n')
      .map(s => normalizeForCompare(s))
      .filter(Boolean)
  );

  const modifiedLinesAll = normalizeNewlines(opts.modifiedText || '').split('\n');
  const entries: Array<
    { kind: 'known'; idx: number; key: string } | { kind: 'extra'; idx: number; line: string }
  > = [];

  for (let i = 0; i < modifiedLinesAll.length; i++) {
    const raw0 = String(modifiedLinesAll[i] || '').replace(/\u00a0/g, ' ');
    const isBlank = raw0.trim().length === 0;
    const info = !isBlank ? parseDetailsLine(raw0) : null;

    if (info && opts.baseCollected.byKey[info.key]) {
      entries.push({ kind: 'known', idx: i, key: info.key });
      continue;
    }

    entries.push({ kind: 'extra', idx: i, line: isBlank ? '' : info ? info.raw : raw0 });
  }

  const known = entries.filter((e): e is { kind: 'known'; idx: number; key: string } => e.kind === 'known');
  if (!entries.some(e => e.kind === 'extra')) {
    return { mergedAuto: normalizeNewlines(opts.mergedAuto || ''), extrasList: [] };
  }

  const firstKnownIdx = known.length ? known[0].idx : -1;
  const lastKnownIdx = known.length ? known[known.length - 1].idx : -1;
  const extrasAfterByKey: Record<string, string[]> = {};
  const addExtra = (anchor: string, line: string) => {
    const a = anchor || '__end__';
    (extrasAfterByKey[a] ||= []).push(line);
  };

  for (const e of entries) {
    if (e.kind !== 'extra') continue;

    const rawLine0 = String(e.line ?? '').replace(/\u00a0/g, ' ');
    const isBlank = rawLine0.trim().length === 0;
    const rawLine = isBlank ? '' : rawLine0.replace(/\s+$/g, '');

    if (!isBlank) {
      const norm = normalizeForCompare(rawLine);
      if (norm && newAutoLineSet.has(norm)) continue;
    }

    if (known.length && e.idx > lastKnownIdx) {
      addExtra('__end__', rawLine);
      continue;
    }
    if (known.length && e.idx < firstKnownIdx) {
      addExtra('__start__', rawLine);
      continue;
    }

    let prev: { idx: number; key: string } | null = null;
    for (let i = known.length - 1; i >= 0; i--) {
      if (known[i].idx < e.idx) {
        prev = known[i];
        break;
      }
    }

    if (prev) addExtra(prev.key, rawLine);
    else addExtra('__start__', rawLine);
  }

  const hasExtras = Object.keys(extrasAfterByKey).some(k => (extrasAfterByKey[k] || []).length > 0);
  if (!hasExtras) return { mergedAuto: normalizeNewlines(opts.mergedAuto || ''), extrasList: [] };

  const baseLines = normalizeNewlines(opts.mergedAuto || '').split('\n');
  const stitched: string[] = [];

  const head = extrasAfterByKey['__start__'];
  if (head?.length) stitched.push(...head);

  for (const ln of baseLines) {
    const info = parseDetailsLine(ln);
    const extrasHere = info ? extrasAfterByKey[info.key] : null;
    stitched.push(ln);
    if (extrasHere?.length) stitched.push(...extrasHere);
  }

  const tail = extrasAfterByKey['__end__'];
  if (tail?.length) stitched.push(...tail);

  const extrasList = Object.keys(extrasAfterByKey)
    .reduce<string[]>((acc, k) => acc.concat(extrasAfterByKey[k] || []), [])
    .map(s => String(s ?? ''));

  return { mergedAuto: stitched.join('\n'), extrasList };
}
