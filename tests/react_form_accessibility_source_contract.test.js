import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const REACT_ROOT = path.join(PROJECT_ROOT, 'esm/native/ui/react');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function readJsxFormFields(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const fields = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/<(input|select|textarea)\b/);
    if (!match) continue;

    const tag = match[1];
    const chunkLines = [];
    for (let cursor = index; cursor < Math.min(lines.length, index + 80); cursor += 1) {
      chunkLines.push(lines[cursor]);
      if (lines[cursor].includes('/>') || lines[cursor].includes(`</${tag}>`)) break;
    }

    fields.push({
      tag,
      line: index + 1,
      chunk: chunkLines.join('\n'),
      previous: lines.slice(Math.max(0, index - 14), index).join('\n'),
    });
  }

  return fields;
}

function hasAttr(source, attr) {
  return new RegExp(`\\b${attr}\\s*=`).test(source);
}

function hasAssociatedLabel(field) {
  if (/\baria-label\s*=|\baria-labelledby\s*=/.test(field.chunk)) return true;
  if (
    /<label\b[\s\S]*\bhtmlFor\s*=/.test(field.previous) ||
    /<label\b[\s\S]*\bhtmlFor\s*=/.test(field.chunk)
  ) {
    return true;
  }
  return /<label\b/.test(field.previous) && !/<\/label>/.test(field.previous);
}

test('React form fields keep Chrome Issues clean: id/name and accessible label are explicit', () => {
  const failures = [];

  for (const file of walk(REACT_ROOT)) {
    for (const field of readJsxFormFields(file)) {
      const hasIdentifier = hasAttr(field.chunk, 'id') || hasAttr(field.chunk, 'name');
      const hasLabel = hasAssociatedLabel(field);
      if (hasIdentifier && hasLabel) continue;
      failures.push(
        `${path.relative(PROJECT_ROOT, file)}:${field.line} <${field.tag}> ` +
          `identifier=${hasIdentifier ? 'ok' : 'missing'} label=${hasLabel ? 'ok' : 'missing'}`
      );
    }
  }

  assert.deepEqual(failures, []);
});
