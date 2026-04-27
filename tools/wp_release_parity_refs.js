import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { exists, isLocalJsRef, isLocalRef, normalizeRefText } from './wp_release_parity_shared.js';

export function collectHtmlLocalRefs(htmlText) {
  const refs = [];
  const re = /<(script|link|img)\b[^>]*\b(?:src|href)=(['"])(.*?)\2/gi;
  let m;
  while ((m = re.exec(htmlText))) {
    const tag = (m[1] || '').toLowerCase();
    const ref = m[3] || '';
    if (!isLocalRef(ref)) continue;
    refs.push({ kind: `html:${tag}`, ref });
  }
  return refs;
}

export function maskJsComments(jsText) {
  const text = String(jsText || '');
  const n = text.length;
  if (!n) return '';

  let out = '';
  let i = 0;
  let mode = 'code';
  let regexCharClass = false;
  let canStartRegex = true;
  const templateExprDepth = [];

  function setLastToken(kind) {
    canStartRegex = !(
      kind === 'word' ||
      kind === 'number' ||
      kind === 'string' ||
      kind === 'regex' ||
      kind === 'close'
    );
  }

  function maskChar(ch) {
    return ch === '\n' || ch === '\r' ? ch : ' ';
  }

  while (i < n) {
    const ch = text[i];
    const next = i + 1 < n ? text[i + 1] : '';

    if (mode === 'line-comment') {
      out += maskChar(ch);
      i += 1;
      if (ch === '\n' || ch === '\r') mode = 'code';
      continue;
    }

    if (mode === 'block-comment') {
      if (ch === '*' && next === '/') {
        out += '  ';
        i += 2;
        mode = 'code';
        continue;
      }
      out += maskChar(ch);
      i += 1;
      continue;
    }

    if (mode === 'squote') {
      out += ch;
      i += 1;
      if (ch === '\\' && i < n) {
        out += text[i];
        i += 1;
        continue;
      }
      if (ch === "'") {
        mode = 'code';
        setLastToken('string');
      }
      continue;
    }

    if (mode === 'dquote') {
      out += ch;
      i += 1;
      if (ch === '\\' && i < n) {
        out += text[i];
        i += 1;
        continue;
      }
      if (ch === '"') {
        mode = 'code';
        setLastToken('string');
      }
      continue;
    }

    if (mode === 'template') {
      out += ch;
      i += 1;
      if (ch === '\\' && i < n) {
        out += text[i];
        i += 1;
        continue;
      }
      if (ch === '`' && templateExprDepth.length === 0) {
        mode = 'code';
        setLastToken('string');
        continue;
      }
      if (ch === '$' && next === '{') {
        out += next;
        i += 1;
        templateExprDepth.push('{');
        mode = 'code';
        continue;
      }
      continue;
    }

    if (mode === 'regex') {
      out += ch;
      i += 1;
      if (ch === '\\' && i < n) {
        out += text[i];
        i += 1;
        continue;
      }
      if (regexCharClass) {
        if (ch === ']') regexCharClass = false;
        continue;
      }
      if (ch === '[') {
        regexCharClass = true;
        continue;
      }
      if (ch === '/') {
        while (i < n && /[a-z]/i.test(text[i])) {
          out += text[i];
          i += 1;
        }
        mode = 'code';
        setLastToken('regex');
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      out += '  ';
      i += 2;
      mode = 'line-comment';
      continue;
    }

    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      mode = 'block-comment';
      continue;
    }

    if (ch === "'") {
      out += ch;
      i += 1;
      mode = 'squote';
      continue;
    }

    if (ch === '"') {
      out += ch;
      i += 1;
      mode = 'dquote';
      continue;
    }

    if (ch === '`') {
      out += ch;
      i += 1;
      mode = 'template';
      continue;
    }

    if (ch === '/' && canStartRegex) {
      out += ch;
      i += 1;
      mode = 'regex';
      regexCharClass = false;
      continue;
    }

    if (ch === '}' && templateExprDepth.length) {
      templateExprDepth.pop();
      out += ch;
      i += 1;
      if (templateExprDepth.length === 0) mode = 'template';
      setLastToken('close');
      continue;
    }

    if (/[$A-Z_a-z]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[$0-9A-Z_a-z]/.test(text[j])) j += 1;
      out += text.slice(i, j);
      i = j;
      setLastToken('word');
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[0-9A-Fa-f_xXn.eE+-]/.test(text[j])) j += 1;
      out += text.slice(i, j);
      i = j;
      setLastToken('number');
      continue;
    }

    out += ch;
    i += 1;

    if (/\s/.test(ch)) continue;
    if (ch === ')' || ch === ']') setLastToken('close');
    else if (ch === '.') canStartRegex = false;
    else setLastToken('other');
  }

  return out;
}

function getStaticStringLiteralText(node) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return String(node.text || '');
  return null;
}

function isImportMetaUrl(node) {
  return !!(
    node &&
    ts.isPropertyAccessExpression(node) &&
    node.name &&
    node.name.text === 'url' &&
    ts.isMetaProperty(node.expression) &&
    node.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
    node.expression.name &&
    node.expression.name.text === 'meta'
  );
}

function visitJsRefNodes(node, refs) {
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const ref = getStaticStringLiteralText(node.arguments[0]);
    if (isLocalJsRef(ref || '')) refs.push({ kind: 'js:dynamic-import', ref: normalizeRefText(ref) });
  }

  if (ts.isImportDeclaration(node)) {
    const ref = getStaticStringLiteralText(node.moduleSpecifier);
    if (isLocalJsRef(ref || '')) refs.push({ kind: 'js:import', ref: normalizeRefText(ref) });
  }

  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL') {
    const args = Array.isArray(node.arguments) ? node.arguments : [];
    const ref = getStaticStringLiteralText(args[0]);
    if (ref && isImportMetaUrl(args[1]) && isLocalJsRef(ref)) {
      refs.push({ kind: 'js:new-url', ref: normalizeRefText(ref) });
    }
  }

  if (ts.isStringLiteralLike(node)) {
    const ref = String(node.text || '');
    if (/^\.?\/?libs\/three\.vendor(?:\.[a-f0-9]{6,64})?\.js$/i.test(ref) && isLocalJsRef(ref)) {
      refs.push({ kind: 'js:vendor-literal', ref: normalizeRefText(ref) });
    }
  }

  ts.forEachChild(node, child => visitJsRefNodes(child, refs));
}

export function collectJsLocalRefs(jsText) {
  const refs = [];
  const source = ts.createSourceFile(
    'release-parity-scan.js',
    String(jsText || ''),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  visitJsRefNodes(source, refs);
  return refs;
}

export function listFilesRecursive(rootDir, exts, options = {}) {
  const { skipDirs = [] } = options;
  const skipAbs = new Set(skipDirs.filter(Boolean).map(dir => path.resolve(dir)));
  const out = [];
  if (!exists(rootDir)) return out;
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    if (skipAbs.has(path.resolve(dir))) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!skipAbs.has(path.resolve(p))) stack.push(p);
      } else if (ent.isFile()) {
        if (!exts || exts.some(ext => ent.name.toLowerCase().endsWith(ext))) out.push(p);
      }
    }
  }
  out.sort();
  return out;
}

export function dedupeMissing(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${item.file}|${item.kind}|${item.ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
