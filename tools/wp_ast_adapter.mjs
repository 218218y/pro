import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let cachedTypeScriptModule = null;
let typeScriptLoadFailed = false;

function pickCjsDefault(mod) {
  return mod && mod.default ? mod.default : mod;
}

export function getTypeScriptAstModule() {
  if (cachedTypeScriptModule) return cachedTypeScriptModule;
  if (typeScriptLoadFailed) return null;
  try {
    cachedTypeScriptModule = pickCjsDefault(require('typescript'));
    return cachedTypeScriptModule;
  } catch {
    typeScriptLoadFailed = true;
    return null;
  }
}

export function requireTypeScriptAstModule(label = 'AST adapter') {
  const mod = getTypeScriptAstModule();
  if (!mod) {
    throw new Error(`${label}: missing dependency: typescript`);
  }
  return mod;
}

function optionalPredicate(ts, name) {
  return typeof ts[name] === 'function' ? ts[name].bind(ts) : () => false;
}

function requiredPredicate(ts, name) {
  const fn = ts[name];
  if (typeof fn !== 'function') {
    throw new Error(`TypeScript AST API is missing ${name}`);
  }
  return fn.bind(ts);
}

function normalizeTsModule(tsModule) {
  if (!tsModule) return getTypeScriptAstModule();
  if (tsModule.__wpAstAdapter) return tsModule.__tsModule;
  return pickCjsDefault(tsModule);
}

export function createAstAdapter(options = {}) {
  const ts = normalizeTsModule(options.astApi || options.tsModule);
  if (!ts) return null;

  const adapter = {
    __wpAstAdapter: true,
    __tsModule: ts,
    SyntaxKind: ts.SyntaxKind,
    ScriptKind: ts.ScriptKind,
    LanguageVariant: ts.LanguageVariant,
    ScriptTargetLatest: ts.ScriptTarget.Latest,
    getScriptKindForFile(file) {
      const lower = String(file || '').toLowerCase();
      if (lower.endsWith('.tsx')) return ts.ScriptKind.TSX;
      if (lower.endsWith('.jsx')) return ts.ScriptKind.JSX;
      if (lower.endsWith('.mts')) return ts.ScriptKind.MTS || ts.ScriptKind.TS;
      if (lower.endsWith('.cts')) return ts.ScriptKind.CTS || ts.ScriptKind.TS;
      if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
        return ts.ScriptKind.JS;
      }
      return ts.ScriptKind.TS;
    },
    getLanguageVariantForFile(file) {
      const kind = this.getScriptKindForFile(file);
      return kind === ts.ScriptKind.TSX || kind === ts.ScriptKind.JSX
        ? ts.LanguageVariant.JSX
        : ts.LanguageVariant.Standard;
    },
    createSourceFile(file, text, scriptKind = null) {
      return ts.createSourceFile(
        file,
        String(text || ''),
        ts.ScriptTarget.Latest,
        true,
        scriptKind == null ? adapter.getScriptKindForFile(file) : scriptKind
      );
    },
    createScanner(file, text) {
      return ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        adapter.getLanguageVariantForFile(file),
        String(text || '')
      );
    },
    flattenDiagnosticMessageText(messageText) {
      return typeof ts.flattenDiagnosticMessageText === 'function'
        ? ts.flattenDiagnosticMessageText(messageText, '\n')
        : String(messageText || 'TS parse error');
    },
    getLineAndCharacterOfPosition(sourceFile, position) {
      return ts.getLineAndCharacterOfPosition(sourceFile, position);
    },
    forEachChild(node, visitor) {
      return ts.forEachChild(node, visitor);
    },
  };

  const predicateNames = [
    'isArrowFunction',
    'isAsExpression',
    'isBinaryExpression',
    'isCallExpression',
    'isConditionalExpression',
    'isConstructorDeclaration',
    'isDeleteExpression',
    'isElementAccessExpression',
    'isFunctionDeclaration',
    'isFunctionExpression',
    'isGetAccessorDeclaration',
    'isIdentifier',
    'isIfStatement',
    'isImportDeclaration',
    'isMetaProperty',
    'isMethodDeclaration',
    'isNewExpression',
    'isNoSubstitutionTemplateLiteral',
    'isNonNullExpression',
    'isNumericLiteral',
    'isObjectBindingPattern',
    'isObjectLiteralExpression',
    'isParenthesizedExpression',
    'isPostfixUnaryExpression',
    'isPrefixUnaryExpression',
    'isPropertyAccessExpression',
    'isPropertyAssignment',
    'isSatisfiesExpression',
    'isSetAccessorDeclaration',
    'isShorthandPropertyAssignment',
    'isSpreadAssignment',
    'isStringLiteral',
    'isStringLiteralLike',
    'isTypeAssertionExpression',
    'isVariableDeclaration',
    'isVariableStatement',
  ];

  const optionalPredicateNames = new Set(['isSatisfiesExpression', 'isStringLiteralLike']);
  for (const name of predicateNames) {
    adapter[name] = optionalPredicateNames.has(name)
      ? optionalPredicate(ts, name)
      : requiredPredicate(ts, name);
  }
  if (typeof ts.isStringLiteralLike !== 'function') {
    adapter.isStringLiteralLike = node =>
      adapter.isStringLiteral(node) || adapter.isNoSubstitutionTemplateLiteral(node);
  }

  return adapter;
}

export function requireAstAdapter(label = 'AST adapter', options = {}) {
  const adapter = createAstAdapter(options);
  if (!adapter) {
    throw new Error(`${label}: missing dependency: typescript`);
  }
  return adapter;
}

export function createSourceFile(file, text, options = {}) {
  const ast = options.astApi || requireAstAdapter(options.label || 'AST source parser', options);
  return ast.createSourceFile(file, text, options.scriptKind ?? null);
}

export function walkAst(node, visitor, options = {}) {
  const ast = options.astApi || requireAstAdapter(options.label || 'AST walker', options);
  function visit(cur) {
    visitor(cur);
    ast.forEachChild(cur, visit);
  }
  visit(node);
}

export function collectCodeLineNumbers(file, text, options = {}) {
  const ast = options.astApi || requireAstAdapter(options.label || 'AST token scanner', options);
  const sourceFile = options.sourceFile || ast.createSourceFile(file, text);
  const codeLineSet = new Set();
  const scanner = ast.createScanner(file, text);
  let token = scanner.scan();
  while (token !== ast.SyntaxKind.EndOfFileToken) {
    const tokenText = scanner.getTokenText();
    if (tokenText && /\S/.test(tokenText)) {
      const start = scanner.getTokenPos();
      const end = scanner.getTextPos();
      const startLine = ast.getLineAndCharacterOfPosition(sourceFile, start).line + 1;
      const endLine = ast.getLineAndCharacterOfPosition(sourceFile, Math.max(start, end - 1)).line + 1;
      for (let line = startLine; line <= endLine; line += 1) codeLineSet.add(line);
    }
    token = scanner.scan();
  }
  return codeLineSet;
}

export function countFunctionLikeNodes(sourceFile, options = {}) {
  const ast = options.astApi || requireAstAdapter(options.label || 'AST function counter', options);
  let count = 0;
  function visit(node) {
    if (
      ast.isFunctionDeclaration(node) ||
      ast.isFunctionExpression(node) ||
      ast.isArrowFunction(node) ||
      ast.isMethodDeclaration(node) ||
      ast.isConstructorDeclaration(node) ||
      ast.isGetAccessorDeclaration(node) ||
      ast.isSetAccessorDeclaration(node)
    ) {
      count += 1;
    }
    ast.forEachChild(node, visit);
  }
  visit(sourceFile);
  return count;
}

export function createTypeHotspotCounts() {
  return {
    explicitAny: 0,
    asExpression: 0,
    angleAssertion: 0,
    nonNull: 0,
  };
}

export function collectTypeHotspotCounts(sourceFile, options = {}) {
  const ast = options.astApi || requireAstAdapter(options.label || 'AST type hotspot collector', options);
  const counts = createTypeHotspotCounts();

  function visitTypeNode(typeNode) {
    if (!typeNode) return;
    if (typeNode.kind === ast.SyntaxKind.AnyKeyword) counts.explicitAny += 1;
    ast.forEachChild(typeNode, visitTypeNode);
  }

  function visit(node) {
    if (ast.isAsExpression(node)) counts.asExpression += 1;
    if (ast.isTypeAssertionExpression(node)) counts.angleAssertion += 1;
    if (ast.isNonNullExpression(node)) counts.nonNull += 1;
    if ('type' in node && node.type) visitTypeNode(node.type);
    ast.forEachChild(node, visit);
  }

  visit(sourceFile);
  return counts;
}

export function formatParseDiagnostic({ astApi, root, file, sourceFile, diagnostic, rel }) {
  const ast = astApi || requireAstAdapter('AST diagnostic formatter');
  const message = ast.flattenDiagnosticMessageText(diagnostic.messageText);
  const pos =
    typeof diagnostic.start === 'number' ? sourceFile.getLineAndCharacterOfPosition(diagnostic.start) : null;
  const where = pos ? `:${pos.line + 1}:${pos.character + 1}` : '';
  const relPath = typeof rel === 'function' ? rel(root, file) : path.relative(root || process.cwd(), file);
  return `${relPath}${where} TS${diagnostic.code}: ${message}`;
}
