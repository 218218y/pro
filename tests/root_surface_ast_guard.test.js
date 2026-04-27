import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '..', 'esm', 'native');

const forbiddenRootProps = new Set(['actions', 'store', 'deps', 'browser', 'platform', 'render', 'config']);
const allowedExts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }
    if (allowedExts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function scriptKindFor(file) {
  const ext = path.extname(file);
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function unwrapExpression(node) {
  let cur = node;
  while (
    cur &&
    (ts.isParenthesizedExpression(cur) ||
      ts.isAsExpression(cur) ||
      ts.isTypeAssertionExpression(cur) ||
      ts.isNonNullExpression(cur) ||
      ts.isSatisfiesExpression?.(cur))
  ) {
    cur = cur.expression;
  }
  return cur;
}

function calleeName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return '';
}

function isAppishParameter(name) {
  return name === 'App' || name === 'app';
}

function looksAppishFactory(name) {
  return (
    /app/i.test(name) ||
    /record/i.test(name) ||
    /object/i.test(name) ||
    /^(assertApp|asRecord|asUnknownRecord|readRecord|asObject|asApp|asAppContainer)$/.test(name)
  );
}

function buildAppishAliasSet(sf) {
  const appish = new Set();

  function exprIsAppish(expr) {
    const node = unwrapExpression(expr);
    if (!node) return false;
    if (ts.isIdentifier(node)) return appish.has(node.text) || isAppishParameter(node.text);
    if (ts.isCallExpression(node)) {
      const name = calleeName(node.expression);
      if (!looksAppishFactory(name)) return false;
      return node.arguments.some(arg => exprIsAppish(arg));
    }
    if (ts.isConditionalExpression(node)) {
      return exprIsAppish(node.whenTrue) || exprIsAppish(node.whenFalse);
    }
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === ts.SyntaxKind.QuestionQuestionToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        return exprIsAppish(node.left) || exprIsAppish(node.right);
      }
    }
    return false;
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (exprIsAppish(node.initializer)) appish.add(node.name.text);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left)
    ) {
      if (exprIsAppish(node.right)) appish.add(node.left.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return appish;
}

function isForbiddenRootAccess(node, appish) {
  if (!ts.isPropertyAccessExpression(node)) return false;
  const expr = unwrapExpression(node.expression);
  return !!(
    ts.isIdentifier(expr) &&
    (appish.has(expr.text) || isAppishParameter(expr.text)) &&
    forbiddenRootProps.has(node.name.text)
  );
}

function collectForbiddenHits(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKindFor(file));
  const hits = [];
  const appish = buildAppishAliasSet(sf);

  function visit(node) {
    if (isForbiddenRootAccess(node, appish)) {
      const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
      hits.push({
        file,
        line: line + 1,
        column: character + 1,
        text: node.getText(sf),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return hits;
}

test('live root-surface property access stays inside canonical owners even through app aliases', () => {
  const hits = collectFiles(sourceRoot).flatMap(collectForbiddenHits);
  assert.deepEqual(
    hits,
    [],
    `Unexpected direct root access found:
${hits.map(hit => `${path.relative(sourceRoot, hit.file)}:${hit.line}:${hit.column} ${hit.text}`).join('\n')}`
  );
});
