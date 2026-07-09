#!/usr/bin/env node
/**
 * WardrobePro - Three.js vendor contract checker
 *
 * Goal:
 *  - Scan runtime source code for actual usages of `THREE.*`
 *  - Compare against the symbols exported through tools/three_vendor_entry.js
 *  - Fail fast when a used symbol is missing from the vendor entry (common release-only crash class)
 *
 * This keeps tree-shaking intact because we verify ONLY symbols that the app code actually uses.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAstAdapter } from './wp_ast_adapter.mjs';

function loadAstAdapter(options = {}) {
  const astApi = createAstAdapter({ astApi: options.astApi });
  if (astApi) return astApi;
  console.error('[WP Three Contract] Missing dependency: oxc-parser');
  console.error('                   Run: npm i -D oxc-parser');
  process.exitCode = 1;
  return null;
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function posixRel(root, p) {
  return path.relative(root, p).split(path.sep).join('/');
}

function parseArgs(argv) {
  const out = {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    scanPaths: ['esm'],
    vendorEntry: path.join('tools', 'three_vendor_entry.js'),
    manifestOut: null,
    json: false,
    quiet: false,
    strict: true,
    ignoreSymbols: ['/^__/'],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--root' || a === '-C') && argv[i + 1]) {
      out.root = path.resolve(argv[++i]);
      continue;
    }
    if (a === '--scan' && argv[i + 1]) {
      out.scanPaths.push(argv[++i]);
      continue;
    }
    if (a === '--scan-only' && argv[i + 1]) {
      out.scanPaths = [argv[++i]];
      continue;
    }
    if (a === '--vendor-entry' && argv[i + 1]) {
      out.vendorEntry = argv[++i];
      continue;
    }
    if (a === '--manifest-out' && argv[i + 1]) {
      out.manifestOut = argv[++i];
      continue;
    }
    if (a === '--json') out.json = true;
    if (a === '--quiet') out.quiet = true;
    if (a === '--no-strict') out.strict = false;
    if (a === '--ignore-symbol' && argv[i + 1]) {
      out.ignoreSymbols.push(argv[++i]);
      continue;
    }
    if (a === '--help' || a === '-h') {
      console.log(
        `
WardrobePro - Three.js vendor contract checker

Usage:
  node tools/wp_three_vendor_contract.js
  node tools/wp_three_vendor_contract.js --manifest-out dist/three_vendor_contract.json
  node tools/wp_three_vendor_contract.js --scan esm --scan types --no-strict

Options:
  -C, --root <dir>          Project root (default: repo root)
  --scan <path>             Additional path to scan (repeatable)
  --scan-only <path>        Replace default scan list with one path
  --vendor-entry <path>     Path to tools/three_vendor_entry.js
  --manifest-out <path>     Write JSON manifest/report
  --json                    Print machine-readable JSON summary
  --no-strict               Exit 0 even if missing symbols were found
  --ignore-symbol <name/re>  Ignore symbol (literal) or /regex/ (repeatable)
  --quiet                   Less console output
`.trim()
      );
      process.exit(0);
    }
  }

  // de-dup while preserving order
  const seen = new Set();
  out.scanPaths = out.scanPaths.filter(p => {
    const key = String(p || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return out;
}

function shouldScanFile(absPath) {
  const base = path.basename(absPath);
  if (base.endsWith('.d.ts')) return false;
  if (!/\.(?:js|mjs|cjs|ts|tsx)$/i.test(base)) return false;
  const norm = absPath.split(path.sep);
  if (norm.includes('node_modules')) return false;
  if (norm.includes('dist')) return false;
  if (norm.includes('.git')) return false;
  return true;
}

function walkFiles(absPath, out) {
  if (!exists(absPath)) return;
  let st;
  try {
    st = fs.statSync(absPath);
  } catch {
    return;
  }
  if (st.isFile()) {
    if (shouldScanFile(absPath)) out.push(absPath);
    return;
  }
  if (!st.isDirectory()) return;

  for (const ent of fs.readdirSync(absPath, { withFileTypes: true })) {
    const p = path.join(absPath, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
      walkFiles(p, out);
    } else if (ent.isFile()) {
      if (shouldScanFile(p)) out.push(p);
    }
  }
}

function astScriptKindForFile(astApi, file) {
  const f = file.toLowerCase();
  if (f.endsWith('.tsx')) return astApi.ScriptKind.TSX;
  if (f.endsWith('.ts')) return astApi.ScriptKind.TS;
  if (f.endsWith('.jsx')) return astApi.ScriptKind.JSX;
  return astApi.ScriptKind.JS;
}

function compileIgnoreMatchers(rawList) {
  const arr = Array.isArray(rawList) ? rawList : [];
  const matchers = [];
  for (const raw of arr) {
    const s = String(raw || '').trim();
    if (!s) continue;
    if (s.startsWith('/') && s.endsWith('/') && s.length >= 2) {
      try {
        const re = new RegExp(s.slice(1, -1));
        matchers.push(name => re.test(name));
        continue;
      } catch {
        // fall through to literal match
      }
    }
    matchers.push(name => name === s);
  }
  return name =>
    matchers.some(fn => {
      try {
        return !!fn(name);
      } catch {
        return false;
      }
    });
}

function stripTsWrappers(astApi, node) {
  let cur = node || null;
  while (cur) {
    if (astApi.isParenthesizedExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (astApi.isAsExpression(cur) || astApi.isTypeAssertionExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (astApi.isNonNullExpression && astApi.isNonNullExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (astApi.isSatisfiesExpression && astApi.isSatisfiesExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    break;
  }
  return cur;
}

function getSimpleCalleeName(astApi, expr) {
  const callee = stripTsWrappers(astApi, expr);
  if (!callee) return null;
  if (astApi.isIdentifier(callee)) return callee.text;
  if (astApi.isPropertyAccessExpression(callee) && callee.name) return callee.name.text || null;
  return null;
}

function getLiteralPropertyName(astApi, node) {
  const value = stripTsWrappers(astApi, node);
  if (!value) return null;
  if (astApi.isIdentifier(value)) return value.text;
  if (astApi.isStringLiteral(value) || astApi.isNoSubstitutionTemplateLiteral(value)) return value.text;
  if (astApi.isNumericLiteral(value)) return value.text;
  return null;
}

function looksLikeThreeAliasFactoryName(name) {
  if (!name) return false;
  if (/THREE/i.test(name)) return true;
  if (/^(?:_+)?as(?:Record|Object|Obj|Any)$/i.test(name)) return true;
  if (/^(?:to|coerce|cast|normalize)(?:Record|Object|Obj|Any)$/i.test(name)) return true;
  if (/^(?:identity|id)$/i.test(name)) return true;
  return false;
}

function isLikelyThreeAliasName(name) {
  if (!name) return false;
  if (name === 'THREE') return true;
  if (/^T\d*$/i.test(name)) return true;
  return /three/i.test(name);
}

function looksLikeThreeReflectiveReadHelperName(name) {
  if (!name) return false;
  return (
    /(?:Ctor|Prop|Member|Export|Symbol)$/i.test(name) &&
    /^(?:_+)?(?:get|read|pick|assert|ensure|require|resolve)/i.test(name)
  );
}

function isThreeNamespaceLikeExpression(astApi, expr, aliasNames) {
  const e = stripTsWrappers(astApi, expr);
  if (!e) return false;

  if (astApi.isIdentifier(e)) {
    const name = e.text;
    return !!(aliasNames && aliasNames.has(name));
  }

  if (astApi.isPropertyAccessExpression(e)) {
    const base = stripTsWrappers(astApi, e.expression);
    if (e.name && e.name.text === 'THREE') return true;
    return !!(base && astApi.isIdentifier(base) && aliasNames && aliasNames.has(base.text));
  }

  if (astApi.isElementAccessExpression(e)) {
    const base = stripTsWrappers(astApi, e.expression);
    const arg = stripTsWrappers(astApi, e.argumentExpression);
    if (
      arg &&
      (astApi.isStringLiteral(arg) || astApi.isNoSubstitutionTemplateLiteral(arg)) &&
      arg.text === 'THREE'
    ) {
      return true;
    }
    return !!(base && astApi.isIdentifier(base) && aliasNames && aliasNames.has(base.text));
  }

  if (astApi.isConditionalExpression(e)) {
    return (
      isThreeNamespaceLikeExpression(astApi, e.whenTrue, aliasNames) ||
      isThreeNamespaceLikeExpression(astApi, e.whenFalse, aliasNames)
    );
  }

  if (astApi.isBinaryExpression(e)) {
    const op = e.operatorToken && e.operatorToken.kind;
    if (
      op === astApi.SyntaxKind.BarBarToken ||
      op === astApi.SyntaxKind.AmpersandAmpersandToken ||
      op === astApi.SyntaxKind.QuestionQuestionToken
    ) {
      return (
        isThreeNamespaceLikeExpression(astApi, e.left, aliasNames) ||
        isThreeNamespaceLikeExpression(astApi, e.right, aliasNames)
      );
    }
  }

  if (astApi.isCallExpression(e)) {
    const calleeName = getSimpleCalleeName(astApi, e.expression);
    const hasAliasArg = (e.arguments || []).some(arg =>
      isThreeNamespaceLikeExpression(astApi, arg, aliasNames)
    );
    if (hasAliasArg && looksLikeThreeAliasFactoryName(calleeName)) return true;
    if (calleeName && /^(?:_+)?(?:assert|ensure|get|resolve)THREE$/i.test(calleeName)) return true;
  }

  return false;
}

function getThreeNamespacePropName(astApi, node, aliasNames = null) {
  if (!node) return null;
  const aliases = aliasNames || new Set(['THREE']);

  if (astApi.isPropertyAccessExpression(node)) {
    const base = stripTsWrappers(astApi, node.expression);
    if (base && astApi.isIdentifier(base) && aliases.has(base.text)) {
      return node.name && node.name.text ? node.name.text : null;
    }
  }

  if (astApi.isElementAccessExpression(node)) {
    const base = stripTsWrappers(astApi, node.expression);
    if (base && astApi.isIdentifier(base) && aliases.has(base.text)) {
      const arg = stripTsWrappers(astApi, node.argumentExpression);
      if (arg && (astApi.isStringLiteral(arg) || astApi.isNoSubstitutionTemplateLiteral(arg)))
        return arg.text;
    }
  }
  return null;
}

function isThreeNamespaceWriteAccess(astApi, node) {
  const parent = node && node.parent;
  if (!parent) return false;

  if (astApi.isBinaryExpression(parent) && parent.left === node) {
    const op = parent.operatorToken && parent.operatorToken.kind;
    switch (op) {
      case astApi.SyntaxKind.EqualsToken:
      case astApi.SyntaxKind.PlusEqualsToken:
      case astApi.SyntaxKind.MinusEqualsToken:
      case astApi.SyntaxKind.AsteriskEqualsToken:
      case astApi.SyntaxKind.AsteriskAsteriskEqualsToken:
      case astApi.SyntaxKind.SlashEqualsToken:
      case astApi.SyntaxKind.PercentEqualsToken:
      case astApi.SyntaxKind.AmpersandEqualsToken:
      case astApi.SyntaxKind.BarEqualsToken:
      case astApi.SyntaxKind.CaretEqualsToken:
      case astApi.SyntaxKind.LessThanLessThanEqualsToken:
      case astApi.SyntaxKind.GreaterThanGreaterThanEqualsToken:
      case astApi.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
      case astApi.SyntaxKind.BarBarEqualsToken:
      case astApi.SyntaxKind.AmpersandAmpersandEqualsToken:
      case astApi.SyntaxKind.QuestionQuestionEqualsToken:
        return true;
      default:
        return false;
    }
  }
  if (astApi.isPrefixUnaryExpression(parent) && parent.operand === node) {
    const op = parent.operator;
    return op === astApi.SyntaxKind.PlusPlusToken || op === astApi.SyntaxKind.MinusMinusToken;
  }
  if (astApi.isPostfixUnaryExpression(parent) && parent.operand === node) {
    const op = parent.operator;
    return op === astApi.SyntaxKind.PlusPlusToken || op === astApi.SyntaxKind.MinusMinusToken;
  }
  if (astApi.isDeleteExpression(parent) && parent.expression === node) return true;

  return false;
}

function conditionMentionsGuardForThreeSymbol(astApi, expr, symbolName, aliasNames) {
  let found = false;
  function visit(node) {
    if (!node || found) return;

    // 'SymbolName' in THREE_ALIAS
    if (astApi.isBinaryExpression(node) && node.operatorToken.kind === astApi.SyntaxKind.InKeyword) {
      const left = stripTsWrappers(astApi, node.left);
      const right = stripTsWrappers(astApi, node.right);
      const leftText =
        left && (astApi.isStringLiteral(left) || astApi.isNoSubstitutionTemplateLiteral(left))
          ? left.text
          : null;
      if (leftText === symbolName && isThreeNamespaceLikeExpression(astApi, right, aliasNames)) {
        found = true;
        return;
      }
    }

    // typeof THREE_ALIAS.SymbolName ...
    const propName = getThreeNamespacePropName(astApi, node, aliasNames);
    if (propName === symbolName) {
      found = true;
      return;
    }

    astApi.forEachChild(node, visit);
  }
  visit(expr);
  return found;
}

function isThreeSymbolReadInFallbackGuardContext(astApi, node, symbolName, aliasNames) {
  let child = node;
  let cur = node ? node.parent : null;
  while (cur) {
    if (astApi.isIfStatement(cur)) {
      // Node appears inside `if (<cond>)`
      if (child === cur.expression) {
        if (conditionMentionsGuardForThreeSymbol(astApi, cur.expression, symbolName, aliasNames)) return true;
      }
      // Node appears inside `then` branch guarded by same symbol
      if (child === cur.thenStatement) {
        if (conditionMentionsGuardForThreeSymbol(astApi, cur.expression, symbolName, aliasNames)) return true;
      }
      // `else` branch is not considered guarded-positive here.
    } else if (astApi.isConditionalExpression(cur)) {
      if (child === cur.condition || child === cur.whenTrue) {
        if (conditionMentionsGuardForThreeSymbol(astApi, cur.condition, symbolName, aliasNames)) return true;
      }
    } else if (astApi.isBinaryExpression(cur)) {
      const op = cur.operatorToken && cur.operatorToken.kind;
      if (
        (op === astApi.SyntaxKind.AmpersandAmpersandToken || op === astApi.SyntaxKind.BarBarToken) &&
        child === cur.right &&
        conditionMentionsGuardForThreeSymbol(astApi, cur.left, symbolName, aliasNames)
      ) {
        return true;
      }
    }

    child = cur;
    cur = cur.parent;
  }
  return false;
}

function collectThreeSymbolUsagesFromSource(astApi, sourceFile, shouldIgnoreSymbol = null) {
  const symbols = new Map(); // symbol -> total read count (direct + fallback)
  const directSymbols = new Map(); // symbol -> unguarded/direct read count
  const fallbackSymbols = new Map(); // symbol -> guarded/compat read count
  const ignoredNamespaceWrites = new Map();
  const aliasNames = new Set(['THREE']);

  const add = (name, { fallback = false } = {}) => {
    if (!name) return;
    if (shouldIgnoreSymbol && shouldIgnoreSymbol(name)) return;
    symbols.set(name, (symbols.get(name) || 0) + 1);
    const bucket = fallback ? fallbackSymbols : directSymbols;
    bucket.set(name, (bucket.get(name) || 0) + 1);
  };

  const addIgnoredWrite = name => {
    if (!name) return;
    ignoredNamespaceWrites.set(name, (ignoredNamespaceWrites.get(name) || 0) + 1);
  };

  const addAliasFromBindingName = bindingName => {
    if (!bindingName) return false;
    if (astApi.isIdentifier(bindingName)) {
      if (!isLikelyThreeAliasName(bindingName.text)) return false;
      aliasNames.add(bindingName.text);
      return true;
    }
    if (astApi.isObjectBindingPattern(bindingName)) {
      let changed = false;
      for (const el of bindingName.elements || []) {
        if (!el || el.dotDotDotToken) continue;
        if (el.name && astApi.isIdentifier(el.name)) {
          aliasNames.add(el.name.text);
          changed = true;
        }
      }
      return changed;
    }
    return false;
  };

  const learnAliasesPass = () => {
    let changed = false;

    function visitAlias(node) {
      if (astApi.isVariableDeclaration(node)) {
        const init = node.initializer;
        if (node.name && init) {
          if (astApi.isObjectBindingPattern(node.name)) {
            // const { THREE: T } = deps
            for (const el of node.name.elements || []) {
              if (!el || el.dotDotDotToken || !el.name || !astApi.isIdentifier(el.name)) continue;
              const prop = el.propertyName || el.name;
              const propText =
                astApi.isIdentifier(prop) ||
                astApi.isStringLiteral(prop) ||
                astApi.isNoSubstitutionTemplateLiteral(prop)
                  ? prop.text
                  : null;
              if (propText === 'THREE') {
                const before = aliasNames.size;
                aliasNames.add(el.name.text);
                if (aliasNames.size !== before) changed = true;
              }
            }
          } else if (isThreeNamespaceLikeExpression(astApi, init, aliasNames)) {
            const before = aliasNames.size;
            addAliasFromBindingName(node.name);
            if (aliasNames.size !== before) changed = true;
          }
        }
      }

      if (astApi.isBinaryExpression(node) && node.operatorToken.kind === astApi.SyntaxKind.EqualsToken) {
        if (isThreeNamespaceLikeExpression(astApi, node.right, aliasNames)) {
          const left = stripTsWrappers(astApi, node.left);
          if (left && astApi.isIdentifier(left) && isLikelyThreeAliasName(left.text)) {
            const before = aliasNames.size;
            aliasNames.add(left.text);
            if (aliasNames.size !== before) changed = true;
          }
        }
      }

      astApi.forEachChild(node, visitAlias);
    }

    visitAlias(sourceFile);
    return changed;
  };

  for (let i = 0; i < 8; i++) {
    if (!learnAliasesPass()) break;
  }

  function visit(node) {
    // THREE.Foo / alias.Foo / THREE['Foo'] / alias['Foo']
    const threeProp = getThreeNamespacePropName(astApi, node, aliasNames);
    if (threeProp) {
      // Namespace writes (e.g. THREE.__foo = ..., THREE['bar'] ||= ...) are app augmentations,
      // not requirements for the vendor export contract.
      if (isThreeNamespaceWriteAccess(astApi, node)) addIgnoredWrite(threeProp);
      else
        add(threeProp, {
          fallback: isThreeSymbolReadInFallbackGuardContext(astApi, node, threeProp, aliasNames),
        });
    }

    // getCtor(THREE, 'Box3') / getProp(THREE, 'Vector3') / similar reflective helpers.
    if (astApi.isCallExpression(node)) {
      const calleeName = getSimpleCalleeName(astApi, node.expression);
      const firstArg = node.arguments && node.arguments.length >= 1 ? node.arguments[0] : null;
      const secondArg = node.arguments && node.arguments.length >= 2 ? node.arguments[1] : null;
      if (
        looksLikeThreeReflectiveReadHelperName(calleeName) &&
        isThreeNamespaceLikeExpression(astApi, firstArg, aliasNames)
      ) {
        const reflectiveProp = getLiteralPropertyName(astApi, secondArg);
        if (reflectiveProp) {
          add(reflectiveProp, {
            fallback: isThreeSymbolReadInFallbackGuardContext(astApi, node, reflectiveProp, aliasNames),
          });
        }
      }
    }

    // const { Foo, Bar: Baz } = THREE (or alias to THREE)
    if (astApi.isVariableDeclaration(node) && astApi.isObjectBindingPattern(node.name)) {
      const init = node.initializer;
      if (isThreeNamespaceLikeExpression(astApi, init, aliasNames)) {
        for (const el of node.name.elements) {
          if (!el || (!el.propertyName && !el.name)) continue;
          if (el.dotDotDotToken) continue;
          const prop = el.propertyName || el.name;
          const propText =
            astApi.isIdentifier(prop) ||
            astApi.isStringLiteral(prop) ||
            astApi.isNoSubstitutionTemplateLiteral(prop)
              ? prop.text
              : null;
          if (propText) {
            add(propText, {
              fallback: isThreeSymbolReadInFallbackGuardContext(astApi, node, propText, aliasNames),
            });
          }
        }
      }
    }

    astApi.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { symbols, directSymbols, fallbackSymbols, ignoredNamespaceWrites };
}

function parseJsLikeFile(astApi, absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  return astApi.createSourceFile(absPath, text, astScriptKindForFile(astApi, absPath));
}

function collectRequiredThreeSymbols({ root, scanPaths, astApi, shouldIgnoreSymbol }) {
  const files = [];
  for (const rel of scanPaths) {
    const abs = path.isAbsolute(rel) ? rel : path.join(root, rel);
    walkFiles(abs, files);
  }
  files.sort();

  const requiredCounts = new Map();
  const directRequiredCounts = new Map();
  const fallbackRequiredCounts = new Map();
  const byFile = new Map();
  const fallbackByFile = new Map();
  const ignoredNamespaceWriteCounts = new Map();
  const ignoredNamespaceWritesByFile = new Map();

  for (const f of files) {
    let sf;
    try {
      sf = parseJsLikeFile(astApi, f);
    } catch {
      continue;
    }
    const local = collectThreeSymbolUsagesFromSource(astApi, sf, shouldIgnoreSymbol);
    const localSymbols = local && local.symbols ? local.symbols : new Map();
    const localDirectSymbols = local && local.directSymbols ? local.directSymbols : new Map();
    const localFallbackSymbols = local && local.fallbackSymbols ? local.fallbackSymbols : new Map();
    const localIgnoredWrites =
      local && local.ignoredNamespaceWrites ? local.ignoredNamespaceWrites : new Map();

    if (localIgnoredWrites.size) {
      const rel = posixRel(root, f);
      ignoredNamespaceWritesByFile.set(
        rel,
        Object.fromEntries([...localIgnoredWrites.entries()].sort((a, b) => a[0].localeCompare(b[0])))
      );
      for (const [name, count] of localIgnoredWrites.entries()) {
        ignoredNamespaceWriteCounts.set(name, (ignoredNamespaceWriteCounts.get(name) || 0) + count);
      }
    }

    if (!localSymbols.size) continue;

    const rel = posixRel(root, f);
    byFile.set(rel, Object.fromEntries([...localSymbols.entries()].sort((a, b) => a[0].localeCompare(b[0]))));
    if (localFallbackSymbols.size) {
      fallbackByFile.set(
        rel,
        Object.fromEntries([...localFallbackSymbols.entries()].sort((a, b) => a[0].localeCompare(b[0])))
      );
    }
    for (const [name, count] of localSymbols.entries()) {
      requiredCounts.set(name, (requiredCounts.get(name) || 0) + count);
    }
    for (const [name, count] of localDirectSymbols.entries()) {
      directRequiredCounts.set(name, (directRequiredCounts.get(name) || 0) + count);
    }
    for (const [name, count] of localFallbackSymbols.entries()) {
      fallbackRequiredCounts.set(name, (fallbackRequiredCounts.get(name) || 0) + count);
    }
  }

  const required = [...requiredCounts.keys()].sort((a, b) => a.localeCompare(b));
  return {
    required,
    requiredCounts,
    directRequiredCounts,
    fallbackRequiredCounts,
    byFile,
    fallbackByFile,
    scannedFileCount: files.length,
    ignoredNamespaceWriteCounts,
    ignoredNamespaceWritesByFile,
  };
}

function collectVendorExportedSymbolsFromEntry({ root, vendorEntry, astApi }) {
  const entryAbs = path.isAbsolute(vendorEntry) ? vendorEntry : path.join(root, vendorEntry);
  if (!exists(entryAbs)) {
    throw new Error(`[WP Three Contract] Missing vendor entry: ${posixRel(root, entryAbs)}`);
  }
  const sf = parseJsLikeFile(astApi, entryAbs);
  const exported = new Set();
  let foundThreeObject = false;

  function addPropName(nameNode) {
    if (!nameNode) return;
    if (astApi.isIdentifier(nameNode)) exported.add(nameNode.text);
    else if (astApi.isStringLiteral(nameNode) || astApi.isNoSubstitutionTemplateLiteral(nameNode))
      exported.add(nameNode.text);
    else if (astApi.isNumericLiteral(nameNode)) exported.add(nameNode.text);
  }

  function visit(node) {
    if (astApi.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations || []) {
        if (!astApi.isIdentifier(decl.name) || decl.name.text !== 'THREE') continue;
        if (!decl.initializer || !astApi.isObjectLiteralExpression(decl.initializer)) continue;
        foundThreeObject = true;
        for (const prop of decl.initializer.properties) {
          if (astApi.isShorthandPropertyAssignment(prop)) {
            exported.add(prop.name.text);
            continue;
          }
          if (astApi.isPropertyAssignment(prop)) {
            addPropName(prop.name);
            continue;
          }
          if (astApi.isMethodDeclaration(prop)) {
            addPropName(prop.name);
            continue;
          }
          if (astApi.isSpreadAssignment(prop)) {
            // Intentionally ignore spreads; current vendor entry should stay explicit.
          }
        }
      }
    }
    astApi.forEachChild(node, visit);
  }
  visit(sf);

  if (!foundThreeObject) {
    throw new Error(
      '[WP Three Contract] Could not find `export const THREE = { ... }` object in vendor entry'
    );
  }

  return {
    entryAbs,
    exported: [...exported].sort((a, b) => a.localeCompare(b)),
  };
}

export async function runThreeVendorContractCheck(options = {}) {
  const args = {
    ...parseArgs([]),
    ...options,
  };

  const astApi = loadAstAdapter(options);
  if (!astApi) {
    return { ok: false, error: 'missing_ast_parser' };
  }

  const root = path.resolve(args.root);
  const vendorEntry = args.vendorEntry || path.join('tools', 'three_vendor_entry.js');
  const scanPaths = Array.isArray(args.scanPaths) && args.scanPaths.length ? args.scanPaths : ['esm'];

  const shouldIgnoreSymbol = compileIgnoreMatchers(args.ignoreSymbols);
  const requiredRes = collectRequiredThreeSymbols({ root, scanPaths, astApi, shouldIgnoreSymbol });
  const vendorRes = collectVendorExportedSymbolsFromEntry({ root, vendorEntry, astApi });
  const exportedSet = new Set(vendorRes.exported);

  const directSet = new Set(requiredRes.directRequiredCounts.keys());
  const fallbackOnlyMissing = requiredRes.required.filter(
    name => !exportedSet.has(name) && !directSet.has(name)
  );
  const missing = requiredRes.required.filter(name => !exportedSet.has(name) && directSet.has(name));
  const unused = vendorRes.exported.filter(name => !requiredRes.requiredCounts.has(name));

  const report = {
    ok: missing.length === 0,
    root,
    vendorEntry: posixRel(root, vendorRes.entryAbs),
    scannedPaths: scanPaths,
    ignoredSymbols: Array.isArray(args.ignoreSymbols) ? [...args.ignoreSymbols] : [],
    scannedFileCount: requiredRes.scannedFileCount,
    filesWithThreeUsage: requiredRes.byFile.size,
    requiredCount: requiredRes.required.length,
    requiredDirectCount: requiredRes.directRequiredCounts.size,
    requiredFallbackOnlyCount: [...requiredRes.fallbackRequiredCounts.keys()].filter(
      name => !requiredRes.directRequiredCounts.has(name)
    ).length,
    exportedCount: vendorRes.exported.length,
    threeRequired: requiredRes.required,
    threeExported: vendorRes.exported,
    missing,
    missingFallbackOnly: fallbackOnlyMissing,
    unusedExported: unused,
    ignoredNamespaceWriteCount: [...requiredRes.ignoredNamespaceWriteCounts.values()].reduce(
      (a, b) => a + b,
      0
    ),
    ignoredNamespaceWriteSymbols: [...requiredRes.ignoredNamespaceWriteCounts.keys()].sort((a, b) =>
      a.localeCompare(b)
    ),
    ignoredNamespaceWriteCounts: Object.fromEntries(
      [...requiredRes.ignoredNamespaceWriteCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    ),
    usageCounts: Object.fromEntries(
      [...requiredRes.requiredCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    ),
    directUsageCounts: Object.fromEntries(
      [...requiredRes.directRequiredCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    ),
    fallbackUsageCounts: Object.fromEntries(
      [...requiredRes.fallbackRequiredCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    ),
    byFile: Object.fromEntries(requiredRes.byFile.entries()),
    fallbackByFile: Object.fromEntries(requiredRes.fallbackByFile.entries()),
    ignoredNamespaceWritesByFile: Object.fromEntries(requiredRes.ignoredNamespaceWritesByFile.entries()),
  };

  if (args.manifestOut) {
    const outAbs = path.isAbsolute(args.manifestOut) ? args.manifestOut : path.join(root, args.manifestOut);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let report;
  try {
    report = await runThreeVendorContractCheck(args);
  } catch (e) {
    console.error('[WP Three Contract] Failed:', e && e.stack ? e.stack : String(e));
    process.exit(1);
  }

  if (report && report.error) {
    process.exit(args.strict === false ? 0 : 1);
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!args.quiet) {
    console.log('[WP Three Contract] scanned files:', report.scannedFileCount);
    console.log('[WP Three Contract] files using THREE:', report.filesWithThreeUsage);
    if (report.ignoredSymbols && report.ignoredSymbols.length) {
      console.log('[WP Three Contract] ignored symbol rules:', report.ignoredSymbols.join(', '));
    }
    if (report.ignoredNamespaceWriteCount) {
      const sample = (report.ignoredNamespaceWriteSymbols || []).slice(0, 8);
      console.log(
        `[WP Three Contract] ignored THREE namespace writes: ${report.ignoredNamespaceWriteCount}` +
          (sample.length ? ` (e.g. ${sample.join(', ')})` : '')
      );
    }
    console.log(
      `[WP Three Contract] required symbols: ${report.requiredCount} (direct: ${report.requiredDirectCount}, fallback-only: ${report.requiredFallbackOnlyCount}) | vendor exported: ${report.exportedCount}`
    );
    if (report.missing.length) {
      console.error('[WP Three Contract] Missing vendor symbols (required/direct app usage, not exported):');
      for (const name of report.missing) {
        const directUses = report.directUsageCounts[name] || 0;
        const fallbackUses = report.fallbackUsageCounts[name] || 0;
        const extra = fallbackUses ? `, fallback uses: ${fallbackUses}` : '';
        console.error(`  - ${name} (direct uses: ${directUses}${extra})`);
      }
    } else {
      console.log('[WP Three Contract] OK: all direct THREE usages are exported by vendor entry.');
    }
    if (report.missingFallbackOnly.length) {
      console.log(
        '[WP Three Contract] Optional fallback-only symbols used (guarded/compat paths) but not exported:'
      );
      for (const name of report.missingFallbackOnly) {
        console.log(`  - ${name} (fallback uses: ${report.fallbackUsageCounts[name] || 0})`);
      }
    }
    if (report.unusedExported.length) {
      const sample = report.unusedExported.slice(0, 12);
      console.log(
        `[WP Three Contract] Note: ${report.unusedExported.length} vendor exports are currently unused` +
          (sample.length ? ` (e.g. ${sample.join(', ')})` : '')
      );
    }
    if (args.manifestOut) {
      const relOut = path.isAbsolute(args.manifestOut)
        ? args.manifestOut
        : posixRel(report.root, path.join(report.root, args.manifestOut));
      console.log('[WP Three Contract] manifest:', relOut);
    }
  }

  if (!report.ok && args.strict !== false) process.exit(1);
}

const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked && path.resolve(thisFile) === invoked) {
  main();
}
