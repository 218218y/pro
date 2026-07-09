import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAstAdapter } from '../tools/wp_ast_adapter.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '..', 'esm', 'native');
const astApi = requireAstAdapter('Root Surface AST Guard');

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
  return astApi.getScriptKindForFile(file);
}

function unwrapExpression(node) {
  let cur = node;
  while (
    cur &&
    (astApi.isParenthesizedExpression(cur) ||
      astApi.isAsExpression(cur) ||
      astApi.isTypeAssertionExpression(cur) ||
      astApi.isNonNullExpression(cur) ||
      astApi.isSatisfiesExpression?.(cur))
  ) {
    cur = cur.expression;
  }
  return cur;
}

function calleeName(expr) {
  if (astApi.isIdentifier(expr)) return expr.text;
  if (astApi.isPropertyAccessExpression(expr)) return expr.name.text;
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
    if (astApi.isIdentifier(node)) return appish.has(node.text) || isAppishParameter(node.text);
    if (astApi.isCallExpression(node)) {
      const name = calleeName(node.expression);
      if (!looksAppishFactory(name)) return false;
      return node.arguments.some(arg => exprIsAppish(arg));
    }
    if (astApi.isConditionalExpression(node)) {
      return exprIsAppish(node.whenTrue) || exprIsAppish(node.whenFalse);
    }
    if (astApi.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === astApi.SyntaxKind.QuestionQuestionToken ||
        op === astApi.SyntaxKind.BarBarToken ||
        op === astApi.SyntaxKind.AmpersandAmpersandToken
      ) {
        return exprIsAppish(node.left) || exprIsAppish(node.right);
      }
    }
    return false;
  }

  function visit(node) {
    if (astApi.isVariableDeclaration(node) && astApi.isIdentifier(node.name) && node.initializer) {
      if (exprIsAppish(node.initializer)) appish.add(node.name.text);
    }
    if (
      astApi.isBinaryExpression(node) &&
      node.operatorToken.kind === astApi.SyntaxKind.EqualsToken &&
      astApi.isIdentifier(node.left)
    ) {
      if (exprIsAppish(node.right)) appish.add(node.left.text);
    }
    astApi.forEachChild(node, visit);
  }

  visit(sf);
  return appish;
}

function isForbiddenRootAccess(node, appish) {
  if (!astApi.isPropertyAccessExpression(node)) return false;
  const expr = unwrapExpression(node.expression);
  return !!(
    astApi.isIdentifier(expr) &&
    (appish.has(expr.text) || isAppishParameter(expr.text)) &&
    forbiddenRootProps.has(node.name.text)
  );
}

function collectForbiddenHits(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = astApi.createSourceFile(file, source, scriptKindFor(file));
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
    astApi.forEachChild(node, visit);
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
