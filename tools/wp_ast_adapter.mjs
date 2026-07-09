import path from 'node:path';
import { parseSync, visitorKeys } from 'oxc-parser';

function pickInjectedAstAdapter(mod) {
  if (mod && mod.__wpAstAdapter) return mod;
  return null;
}

export function getAstParserModule() {
  return { parseSync, visitorKeys };
}

export function requireAstParserModule() {
  return getAstParserModule();
}

const SyntaxKind = Object.freeze({
  AmpersandAmpersandEqualsToken: '&&=',
  AmpersandAmpersandToken: '&&',
  AmpersandEqualsToken: '&=',
  AnyKeyword: 'TSAnyKeyword',
  AsteriskAsteriskEqualsToken: '**=',
  AsteriskEqualsToken: '*=',
  BarBarEqualsToken: '||=',
  BarBarToken: '||',
  BarEqualsToken: '|=',
  CaretEqualsToken: '^=',
  EndOfFileToken: 'EndOfFileToken',
  EqualsToken: '=',
  ExportDeclaration: 'ExportNamedDeclaration',
  ExportSpecifier: 'ExportSpecifier',
  GreaterThanGreaterThanEqualsToken: '>>=',
  GreaterThanGreaterThanGreaterThanEqualsToken: '>>>=',
  ImportClause: 'ImportDefaultSpecifier',
  ImportKeyword: 'ImportKeyword',
  ImportSpecifier: 'ImportSpecifier',
  InKeyword: 'in',
  LessThanLessThanEqualsToken: '<<=',
  MethodDeclaration: 'MethodDefinition',
  MinusEqualsToken: '-=',
  MinusMinusToken: '--',
  NamespaceImport: 'ImportNamespaceSpecifier',
  PercentEqualsToken: '%=',
  PlusEqualsToken: '+=',
  PlusPlusToken: '++',
  PropertyDeclaration: 'PropertyDefinition',
  PropertySignature: 'TSPropertySignature',
  QuestionQuestionEqualsToken: '??=',
  QuestionQuestionToken: '??',
  SlashEqualsToken: '/=',
  TypeReference: 'TSTypeReference',
});

const ScriptKind = Object.freeze({
  JS: 'js',
  JSX: 'jsx',
  TS: 'ts',
  TSX: 'tsx',
  MTS: 'ts',
  CTS: 'ts',
});

const LanguageVariant = Object.freeze({
  Standard: 'standard',
  JSX: 'jsx',
});

function toOxcLang(scriptKind, file) {
  if (scriptKind === ScriptKind.TSX || scriptKind === 'tsx') return 'tsx';
  if (scriptKind === ScriptKind.JSX || scriptKind === 'jsx') return 'jsx';
  if (scriptKind === ScriptKind.JS || scriptKind === 'js') return 'js';
  if (scriptKind === ScriptKind.TS || scriptKind === ScriptKind.MTS || scriptKind === ScriptKind.CTS) {
    return 'ts';
  }
  const lower = String(file || '').toLowerCase();
  if (lower.endsWith('.tsx')) return 'tsx';
  if (lower.endsWith('.jsx')) return 'jsx';
  if (lower.endsWith('.ts') || lower.endsWith('.mts') || lower.endsWith('.cts')) return 'ts';
  return 'js';
}

function createLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 13 /* \r */) {
      if (text.charCodeAt(i + 1) === 10) i += 1;
      starts.push(i + 1);
    } else if (ch === 10 /* \n */) {
      starts.push(i + 1);
    }
  }
  return starts;
}

function lineAndCharacterFor(lineStarts, position) {
  const pos = Math.max(0, Number(position) || 0);
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineStarts[mid] <= pos) low = mid + 1;
    else high = mid - 1;
  }
  const line = Math.max(0, low - 1);
  return { line, character: pos - lineStarts[line] };
}

function getNodeStart(node) {
  return typeof node?.start === 'number' ? node.start : 0;
}

function getNodeEnd(node) {
  return typeof node?.end === 'number' ? node.end : getNodeStart(node);
}

function operatorKind(operator) {
  return String(operator || '');
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function childKeysFor(node) {
  if (!node || typeof node !== 'object') return [];
  const fromOxc = visitorKeys[node.type];
  if (Array.isArray(fromOxc)) return fromOxc;
  return Object.keys(node).filter(key => {
    if (
      key === 'parent' ||
      key === 'kind' ||
      key === 'text' ||
      key === 'name' ||
      key === 'expression' ||
      key === 'moduleSpecifier' ||
      key === 'argumentExpression' ||
      key === 'operatorToken' ||
      key === 'declarationList' ||
      key === 'initializer' ||
      key === 'propertyName' ||
      key === 'dotDotDotToken' ||
      key === 'elements' ||
      key === 'parseDiagnostics' ||
      key === 'lineStarts' ||
      key === 'sourceText' ||
      key === 'fileName' ||
      key === 'getStart' ||
      key === 'getText' ||
      key === 'getLineAndCharacterOfPosition'
    ) {
      return false;
    }
    const value = node[key];
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(item => item && typeof item === 'object' && item.type);
    return !!value.type;
  });
}

function attachTextAndKind(node) {
  if (!node || typeof node !== 'object' || !node.type) return;
  node.kind = node.kind || node.type;

  if (node.type === 'Identifier' || node.type === 'PrivateIdentifier' || node.type === 'JSXIdentifier') {
    node.text = node.text || node.name || '';
  }

  if (node.type === 'Literal') {
    if (typeof node.value === 'string' || typeof node.value === 'number' || typeof node.value === 'bigint') {
      node.text = node.text || String(node.value);
    } else if (typeof node.raw === 'string') {
      node.text = node.text || node.raw;
    }
  }

  if (node.type === 'TemplateLiteral' && Array.isArray(node.expressions) && node.expressions.length === 0) {
    const quasi = node.quasis && node.quasis[0];
    node.text = node.text || String(quasi?.value?.cooked ?? quasi?.value?.raw ?? '');
  }

  if (node.type === 'ImportDeclaration') {
    node.moduleSpecifier = node.source;
  }

  if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
    node.kind = SyntaxKind.ExportDeclaration;
    node.moduleSpecifier = node.source;
  }

  if (node.type === 'ImportDefaultSpecifier') node.kind = SyntaxKind.ImportClause;
  if (node.type === 'ImportNamespaceSpecifier') node.kind = SyntaxKind.NamespaceImport;
  if (node.type === 'ImportSpecifier') node.kind = SyntaxKind.ImportSpecifier;
  if (node.type === 'ExportSpecifier') node.kind = SyntaxKind.ExportSpecifier;

  if (node.type === 'VariableDeclaration') {
    node.declarationList = node;
  }

  if (node.type === 'VariableDeclarator') {
    node.name = node.id;
    node.initializer = node.init;
  }

  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ClassDeclaration' ||
    node.type === 'ClassExpression'
  ) {
    node.name = node.id;
  }

  if (node.type === 'Property' || node.type === 'PropertyDefinition' || node.type === 'MethodDefinition') {
    node.name = node.key;
    node.initializer = node.value;
  }

  if (node.type === 'ObjectPattern') {
    node.elements = (node.properties || []).map(property => {
      if (property.type === 'RestElement') {
        property.dotDotDotToken = true;
        property.name = property.argument;
        return property;
      }
      property.name = property.value || property.key;
      property.propertyName = property.shorthand ? null : property.key;
      return property;
    });
  }

  if (node.type === 'MemberExpression') {
    node.expression = node.object;
    if (node.computed) node.argumentExpression = node.property;
    else node.name = node.property;
  }

  if (node.type === 'ChainExpression' && node.expression?.type === 'MemberExpression') {
    node.name = node.expression.property;
  }

  if (node.type === 'CallExpression' || node.type === 'NewExpression') {
    node.expression = node.callee;
  }

  if (node.type === 'ImportExpression') {
    node.expression = {
      type: 'ImportKeyword',
      kind: SyntaxKind.ImportKeyword,
      start: node.start,
      end: node.start + 6,
    };
    node.arguments = node.source ? [node.source] : [];
  }

  if (node.type === 'MetaProperty') {
    if (node.meta?.name === 'import') node.keywordToken = SyntaxKind.ImportKeyword;
    node.name = node.property;
  }

  if (node.type === 'ConditionalExpression') {
    node.condition = node.test;
    node.whenTrue = node.consequent;
    node.whenFalse = node.alternate;
  }

  if (node.type === 'IfStatement') {
    node.expression = node.test;
    node.thenStatement = node.consequent;
    node.elseStatement = node.alternate;
  }

  if (
    node.type === 'BinaryExpression' ||
    node.type === 'LogicalExpression' ||
    node.type === 'AssignmentExpression'
  ) {
    node.operatorToken = { kind: operatorKind(node.operator) };
  }

  if (node.type === 'UpdateExpression') {
    node.operand = node.argument;
    node.operator = operatorKind(node.operator);
  }

  if (node.type === 'UnaryExpression') {
    node.expression = node.argument;
    node.operator = operatorKind(node.operator);
  }
}

function attachNodeMethods(node, sourceFile) {
  if (!node || typeof node !== 'object' || !node.type) return;
  if (typeof node.getStart !== 'function') {
    Object.defineProperty(node, 'getStart', {
      configurable: true,
      enumerable: false,
      value() {
        return getNodeStart(node);
      },
    });
  }
  if (typeof node.getText !== 'function') {
    Object.defineProperty(node, 'getText', {
      configurable: true,
      enumerable: false,
      value() {
        return sourceFile.sourceText.slice(getNodeStart(node), getNodeEnd(node));
      },
    });
  }
}

function normalizeAstNode(node, sourceFile, parent = null, seen = new Set()) {
  if (!node || typeof node !== 'object' || !node.type || seen.has(node)) return;
  seen.add(node);
  if (parent) {
    Object.defineProperty(node, 'parent', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: parent,
    });
  }
  attachTextAndKind(node);
  attachNodeMethods(node, sourceFile);
  for (const key of childKeysFor(node)) {
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) normalizeAstNode(child, sourceFile, node, seen);
    } else {
      normalizeAstNode(value, sourceFile, node, seen);
    }
  }
}

function normalizeParseDiagnostic(error, sourceFile, index) {
  const label = Array.isArray(error?.labels) && error.labels.length ? error.labels[0] : null;
  const start = typeof label?.span?.start === 'number' ? label.span.start : 0;
  return {
    code: `OXC${index + 1}`,
    start,
    messageText: String(error?.message || 'Parse error'),
  };
}

function createOxcSourceFile(file, text, scriptKind = null) {
  const sourceText = String(text || '');
  let result;
  try {
    result = parseSync(String(file || 'source.ts'), sourceText, {
      astType: 'ts',
      lang: toOxcLang(scriptKind, file),
      preserveParens: true,
      range: false,
      showSemanticErrors: false,
      sourceType: 'unambiguous',
    });
  } catch (error) {
    const program = { type: 'Program', body: [], start: 0, end: sourceText.length, sourceType: 'module' };
    result = {
      program,
      errors: [
        {
          message: error?.message || String(error),
          labels: [{ span: { start: 0, end: 0 } }],
        },
      ],
    };
  }

  const sourceFile = result.program || { type: 'Program', body: [], start: 0, end: sourceText.length };
  sourceFile.fileName = String(file || 'source.ts');
  sourceFile.sourceText = sourceText;
  sourceFile.lineStarts = createLineStarts(sourceText);
  sourceFile.parseDiagnostics = (Array.isArray(result.errors) ? result.errors : []).map((error, index) =>
    normalizeParseDiagnostic(error, sourceFile, index)
  );
  sourceFile.getLineAndCharacterOfPosition = position => lineAndCharacterFor(sourceFile.lineStarts, position);
  sourceFile.getStart = () => 0;
  sourceFile.getText = () => sourceText;
  normalizeAstNode(sourceFile, sourceFile, null);
  return sourceFile;
}

function predicate(...types) {
  const set = new Set(types);
  return node => !!(node && set.has(node.type));
}

function isStringLiteralNode(node) {
  return !!(node && node.type === 'Literal' && typeof node.value === 'string');
}

function isNumericLiteralNode(node) {
  return !!(node && node.type === 'Literal' && typeof node.value === 'number');
}

function isNoSubstitutionTemplateLiteralNode(node) {
  return !!(
    node &&
    node.type === 'TemplateLiteral' &&
    Array.isArray(node.expressions) &&
    node.expressions.length === 0 &&
    Array.isArray(node.quasis) &&
    node.quasis.length === 1
  );
}

function collectChildNodes(node) {
  const out = [];
  for (const key of childKeysFor(node)) {
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) if (child && typeof child === 'object' && child.type) out.push(child);
    } else if (value && typeof value === 'object' && value.type) {
      out.push(value);
    }
  }
  return out;
}

function collectCodeLinesFromText(text) {
  const codeLineSet = new Set();
  let line = 1;
  let lineHasCode = false;
  let state = 'code';
  let quote = '';
  let templateDepth = 0;
  let escape = false;

  function markCode(char) {
    if (!/\s/.test(char)) lineHasCode = true;
  }

  function finishLine() {
    if (lineHasCode) codeLineSet.add(line);
    line += 1;
    lineHasCode = false;
  }

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '\r') {
      if (next === '\n') i += 1;
      finishLine();
      if (state === 'line-comment') state = 'code';
      continue;
    }
    if (ch === '\n') {
      finishLine();
      if (state === 'line-comment') state = 'code';
      continue;
    }

    if (state === 'line-comment') continue;

    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        state = 'code';
        i += 1;
      }
      continue;
    }

    if (state === 'string') {
      markCode(ch);
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) state = 'code';
      continue;
    }

    if (state === 'template') {
      markCode(ch);
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '`' && templateDepth === 0) {
        state = 'code';
        continue;
      }
      if (ch === '$' && next === '{') {
        templateDepth += 1;
        i += 1;
      } else if (ch === '}' && templateDepth > 0) {
        templateDepth -= 1;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      state = 'line-comment';
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      state = 'block-comment';
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      escape = false;
      state = 'string';
      markCode(ch);
      continue;
    }
    if (ch === '`') {
      templateDepth = 0;
      escape = false;
      state = 'template';
      markCode(ch);
      continue;
    }
    markCode(ch);
  }
  if (lineHasCode) codeLineSet.add(line);
  return codeLineSet;
}

function isAnyKeywordNode(node) {
  return !!(node && (node.type === 'TSAnyKeyword' || node.kind === SyntaxKind.AnyKeyword));
}

export function createAstAdapter(options = {}) {
  const injected = pickInjectedAstAdapter(options.astApi);
  if (injected) return injected;

  const adapter = {
    __wpAstAdapter: true,
    __parser: 'oxc-parser',
    SyntaxKind,
    ScriptKind,
    LanguageVariant,
    ScriptTargetLatest: 'latest',
    getScriptKindForFile(file) {
      const lower = String(file || '').toLowerCase();
      if (lower.endsWith('.tsx')) return ScriptKind.TSX;
      if (lower.endsWith('.jsx')) return ScriptKind.JSX;
      if (lower.endsWith('.mts')) return ScriptKind.MTS;
      if (lower.endsWith('.cts')) return ScriptKind.CTS;
      if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return ScriptKind.JS;
      return ScriptKind.TS;
    },
    getLanguageVariantForFile(file) {
      const kind = this.getScriptKindForFile(file);
      return kind === ScriptKind.TSX || kind === ScriptKind.JSX
        ? LanguageVariant.JSX
        : LanguageVariant.Standard;
    },
    createSourceFile(file, text, scriptKind = null) {
      return createOxcSourceFile(
        file,
        text,
        scriptKind == null ? adapter.getScriptKindForFile(file) : scriptKind
      );
    },
    flattenDiagnosticMessageText(messageText) {
      return String(messageText || 'Parse error');
    },
    getLineAndCharacterOfPosition(sourceFile, position) {
      if (sourceFile && typeof sourceFile.getLineAndCharacterOfPosition === 'function') {
        return sourceFile.getLineAndCharacterOfPosition(position);
      }
      return lineAndCharacterFor(createLineStarts(String(sourceFile?.sourceText || '')), position);
    },
    forEachChild(node, visitor) {
      for (const child of collectChildNodes(node)) visitor(child);
    },
    isArrowFunction: predicate('ArrowFunctionExpression'),
    isAsExpression: predicate('TSAsExpression'),
    isBinaryExpression: predicate('BinaryExpression', 'LogicalExpression', 'AssignmentExpression'),
    isCallExpression: predicate('CallExpression', 'ImportExpression'),
    isConditionalExpression: predicate('ConditionalExpression'),
    isConstructorDeclaration: predicate('MethodDefinition', 'TSAbstractMethodDefinition'),
    isDeleteExpression: node => !!(node && node.type === 'UnaryExpression' && node.operator === 'delete'),
    isElementAccessExpression: node => !!(node && node.type === 'MemberExpression' && !!node.computed),
    isFunctionDeclaration: predicate('FunctionDeclaration'),
    isFunctionExpression: predicate('FunctionExpression'),
    isGetAccessorDeclaration: node => !!(node && (node.kind === 'get' || node.type === 'AccessorProperty')),
    isIdentifier: predicate('Identifier', 'JSXIdentifier'),
    isIfStatement: predicate('IfStatement'),
    isImportDeclaration: predicate('ImportDeclaration'),
    isMetaProperty: predicate('MetaProperty'),
    isMethodDeclaration: node =>
      !!(node && (node.type === 'MethodDefinition' || (node.type === 'Property' && node.method))),
    isNewExpression: predicate('NewExpression'),
    isNoSubstitutionTemplateLiteral: isNoSubstitutionTemplateLiteralNode,
    isNonNullExpression: predicate('TSNonNullExpression'),
    isNumericLiteral: isNumericLiteralNode,
    isObjectBindingPattern: predicate('ObjectPattern'),
    isObjectLiteralExpression: predicate('ObjectExpression'),
    isParenthesizedExpression: predicate('ParenthesizedExpression'),
    isPostfixUnaryExpression: node => !!(node && node.type === 'UpdateExpression' && node.prefix === false),
    isPrefixUnaryExpression: node => !!(node && node.type === 'UpdateExpression' && node.prefix === true),
    isPropertyAccessExpression: node => !!(node && node.type === 'MemberExpression' && !node.computed),
    isPropertyAssignment: node => !!(node && node.type === 'Property' && !node.method && !node.shorthand),
    isSatisfiesExpression: predicate('TSSatisfiesExpression'),
    isSetAccessorDeclaration: node => !!(node && node.kind === 'set'),
    isShorthandPropertyAssignment: node => !!(node && node.type === 'Property' && !!node.shorthand),
    isSpreadAssignment: predicate('SpreadElement', 'ExperimentalSpreadProperty'),
    isStringLiteral: isStringLiteralNode,
    isStringLiteralLike: node => isStringLiteralNode(node) || isNoSubstitutionTemplateLiteralNode(node),
    isTypeAssertionExpression: predicate('TSTypeAssertion'),
    isVariableDeclaration: predicate('VariableDeclarator'),
    isVariableStatement: predicate('VariableDeclaration'),
  };
  return adapter;
}

export function requireAstAdapter(label = 'AST adapter', options = {}) {
  const adapter = createAstAdapter(options);
  if (!adapter) {
    throw new Error(`${label}: missing dependency: oxc-parser`);
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

export function collectCodeLineNumbers(_file, text) {
  return collectCodeLinesFromText(String(text || ''));
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

  function visit(node) {
    if (isAnyKeywordNode(node)) counts.explicitAny += 1;
    if (ast.isAsExpression(node)) counts.asExpression += 1;
    if (ast.isTypeAssertionExpression(node)) counts.angleAssertion += 1;
    if (ast.isNonNullExpression(node)) counts.nonNull += 1;
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
  return `${relPath}${where} OXC: ${message}`;
}
