export function extractInsertionsGreedy(
  base: string,
  modified: string
): Array<{ pos: number; text: string }> {
  const b = base || '';
  const m = modified || '';
  const out: Array<{ pos: number; text: string }> = [];

  let i = 0;
  let j = 0;

  while (i < b.length && j < m.length) {
    if (b.charCodeAt(i) === m.charCodeAt(j)) {
      i++;
      j++;
      continue;
    }

    const next = m.indexOf(b[i], j);
    if (next === -1) {
      const rest = m.slice(j);
      if (rest) out.push({ pos: i, text: rest });
      j = m.length;
      break;
    }

    const inserted = m.slice(j, next);
    if (inserted) out.push({ pos: i, text: inserted });
    j = next;
  }

  if (j < m.length) {
    const tail = m.slice(j);
    if (tail) out.push({ pos: i, text: tail });
  }

  const merged: Array<{ pos: number; text: string }> = [];
  for (const ins of out) {
    const last = merged.length ? merged[merged.length - 1] : null;
    if (last && last.pos === ins.pos) last.text += ins.text;
    else merged.push(ins);
  }
  return merged;
}

export function applyInsertionsToNewAuto(
  base: string,
  insertions: Array<{ pos: number; text: string }>,
  newAuto: string
): string {
  let out = newAuto || '';
  const b = base || '';
  const ins = (insertions || []).slice().sort((a, c) => a.pos - c.pos);

  for (const it of ins) {
    if (!it || !it.text) continue;

    const pos = Math.max(0, Math.min(b.length, it.pos | 0));
    const before = b.slice(Math.max(0, pos - 24), pos);
    const after = b.slice(pos, Math.min(b.length, pos + 24));

    let insertAt = -1;
    if (before && after) {
      const combo = before + after;
      const idxCombo = out.indexOf(combo);
      if (idxCombo >= 0) insertAt = idxCombo + before.length;
    }

    if (insertAt < 0 && before) {
      const idxBefore = out.lastIndexOf(before);
      if (idxBefore >= 0) insertAt = idxBefore + before.length;
    }

    if (insertAt < 0 && after) {
      const idxAfter = out.indexOf(after);
      if (idxAfter >= 0) insertAt = idxAfter;
    }

    if (insertAt < 0) insertAt = out.length;
    out = out.slice(0, insertAt) + it.text + out.slice(insertAt);
  }

  return out;
}

export function buildPreviewFromInsertions(insertions: Array<{ pos: number; text: string }>): string {
  const pieces = (insertions || [])
    .map(x => (x && typeof x.text === 'string' ? x.text : ''))
    .filter(t => !!t && t.trim().length > 0);

  const joined = pieces.join('').trim();
  if (!joined) return '';
  return joined.slice(0, 220);
}
