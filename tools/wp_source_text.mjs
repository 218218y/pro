import { readFileSync } from 'node:fs';

export function normalizeSourceText(text) {
  return typeof text === 'string' ? text.replace(/\r\n?/g, '\n') : '';
}

export function readSourceText(file) {
  return normalizeSourceText(readFileSync(file, 'utf8'));
}
