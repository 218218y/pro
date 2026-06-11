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

function pickCjsDefault(mod) {
  return mod && mod.default ? mod.default : mod;
}

let ts = null;
async function loadTypeScript() {
  if (ts) return ts;
  try {
    const mod = await import('typescript');
    ts = pickCjsDefault(mod);
    return ts;
  } catch (e) {
    console.error('[WP Three Contract] Missing dependency: typescript');
    console.error('                   Run: npm i -D typescript');
    console.error('                   Details:', String(e && e.message ? e.message : e));
    process.exitCode = 1;
    return null;
  }
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

function tsScriptKindForFile(tsApi, file) {
  const f = file.toLowerCase();
  if (f.endsWith('.tsx')) return tsApi.ScriptKind.TSX;
  if (f.endsWith('.ts')) return tsApi.ScriptKind.TS;
  if (f.endsWith('.jsx')) return tsApi.ScriptKind.JSX;
  return tsApi.ScriptKind.JS;
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

function stripTsWrappers(tsApi, node) {
  let cur = node || null;
  while (cur) {
    if (tsApi.isParenthesizedExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (tsApi.isAsExpression(cur) || tsApi.isTypeAssertionExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (tsApi.isNonNullExpression && tsApi.isNonNullExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (tsApi.isSatisfiesExpression && tsApi.isSatisfiesExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    break;
  }
  return cur;
}

function getSimpleCalleeName(tsApi, expr) {
  const callee = stripTsWrappers(tsApi, expr);
  if (!callee) return null;
  if (tsApi.isIdentifier(callee)) return callee.text;
  if (tsApi.isPropertyAccessExpression(callee) && callee.name) return callee.name.text || null;
  return null;
}

function getLiteralPropertyName(tsApi, node) {
  const value = stripTsWrappers(tsApi, node);
  if (!value) return null;
  if (tsApi.isIdentifier(value)) return value.text;
  if (tsApi.isStringLiteral(value) || tsApi.isNoSubstitutionTemplateLiteral(value)) return value.text;
  if (tsApi.isNumericLiteral(value)) return value.text;
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

function isThreeNamespaceLikeExpression(tsApi, expr, aliasNames) {
  const e = stripTsWrappers(tsApi, expr);
  if (!e) return false;

  if (tsApi.isIdentifier(e)) {
    const name = e.text;
    return !!(aliasNames && aliasNames.has(name));
  }

  if (tsApi.isPropertyAccessExpression(e)) {
    const base = stripTsWrappers(tsApi, e.expression);
    if (e.name && e.name.text === 'THREE') return true;
    return !!(base && tsApi.isIdentifier(base) && aliasNames && aliasNames.has(base.text));
  }

  if (tsApi.isElementAccessExpression(e)) {
    const base = stripTsWrappers(tsApi, e.expression);
    const arg = stripTsWrappers(tsApi, e.argumentExpression);
    if (
      arg &&
      (tsApi.isStringLiteral(arg) || tsApi.isNoSubstitutionTemplateLiteral(arg)) &&
      arg.text === 'THREE'
    ) {
      return true;
    }
    return !!(base && tsApi.isIdentifier(base) && aliasNames && aliasNames.has(base.text));
  }

  if (tsApi.isConditionalExpression(e)) {
    return (
      isThreeNamespaceLikeExpression(tsApi, e.whenTrue, aliasNames) ||
      isThreeNamespaceLikeExpression(tsApi, e.whenFalse, aliasNames)
    );
  }

  if (tsApi.isBinaryExpression(e)) {
    const op = e.operatorToken && e.operatorToken.kind;
    if (
      op === tsApi.SyntaxKind.BarBarToken ||
      op === tsApi.SyntaxKind.AmpersandAmpersandToken ||
      op === tsApi.SyntaxKind.QuestionQuestionToken
    ) {
      return (
        isThreeNamespaceLikeExpression(tsApi, e.left, aliasNames) ||
        isThreeNamespaceLikeExpression(tsApi, e.right, aliasNames)
      );
    }
  }

  if (tsApi.isCallExpression(e)) {
    const calleeName = getSimpleCalleeName(tsApi, e.expression);
    const hasAliasArg = (e.arguments || []).some(arg =>
      isThreeNamespaceLikeExpression(tsApi, arg, aliasNames)
    );
    if (hasAliasArg && looksLikeThreeAliasFactoryName(calleeName)) return true;
    if (calleeName && /^(?:_+)?(?:assert|ensure|get|resolve)THREE$/i.test(calleeName)) return true;
  }

  return false;
}

function getThreeNamespacePropName(tsApi, node, aliasNames = null) {
  if (!node) return null;
  const aliases = aliasNames || new Set(['THREE']);

  if (tsApi.isPropertyAccessExpression(node)) {
    const base = stripTsWrappers(tsApi, node.expression);
    if (base && tsApi.isIdentifier(base) && aliases.has(base.text)) {
      return node.name && node.name.text ? node.name.text : null;
    }
  }

  if (tsApi.isElementAccessExpression(node)) {
    const base = stripTsWrappers(tsApi, node.expression);
    if (base && tsApi.isIdentifier(base) && aliases.has(base.text)) {
      const arg = stripTsWrappers(tsApi, node.argumentExpression);
      if (arg && (tsApi.isStringLiteral(arg) || tsApi.isNoSubstitutionTemplateLiteral(arg))) return arg.text;
    }
  }
  return null;
}

function isThreeNamespaceWriteAccess(tsApi, node) {
  const parent = node && node.parent;
  if (!parent) return false;

  if (tsApi.isBinaryExpression(parent) && parent.left === node) {
    const op = parent.operatorToken && parent.operatorToken.kind;
    switch (op) {
      case tsApi.SyntaxKind.EqualsToken:
      case tsApi.SyntaxKind.PlusEqualsToken:
      case tsApi.SyntaxKind.MinusEqualsToken:
      case tsApi.SyntaxKind.AsteriskEqualsToken:
      case tsApi.SyntaxKind.AsteriskAsteriskEqualsToken:
      case tsApi.SyntaxKind.SlashEqualsToken:
      case tsApi.SyntaxKind.PercentEqualsToken:
      case tsApi.SyntaxKind.AmpersandEqualsToken:
      case tsApi.SyntaxKind.BarEqualsToken:
      case tsApi.SyntaxKind.CaretEqualsToken:
      case tsApi.SyntaxKind.LessThanLessThanEqualsToken:
      case tsApi.SyntaxKind.GreaterThanGreaterThanEqualsToken:
      case tsApi.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
      case tsApi.SyntaxKind.BarBarEqualsToken:
      case tsApi.SyntaxKind.AmpersandAmpersandEqualsToken:
      case tsApi.SyntaxKind.QuestionQuestionEqualsToken:
        return true;
      default:
        return false;
    }
  }
  if (tsApi.isPrefixUnaryExpression(parent) && parent.operand === node) {
    const op = parent.operator;
    return op === tsApi.SyntaxKind.PlusPlusToken || op === tsApi.SyntaxKind.MinusMinusToken;
  }
  if (tsApi.isPostfixUnaryExpression(parent) && parent.operand === node) {
    const op = parent.operator;
    return op === tsApi.SyntaxKind.PlusPlusToken || op === tsApi.SyntaxKind.MinusMinusToken;
  }
  if (tsApi.isDeleteExpression(parent) && parent.expression === node) return true;

  return false;
}

function conditionMentionsGuardForThreeSymbol(tsApi, expr, symbolName, aliasNames) {
  let found = false;
  function visit(node) {
    if (!node || found) return;

    // 'SymbolName' in THREE_ALIAS
    if (tsApi.isBinaryExpression(node) && node.operatorToken.kind === tsApi.SyntaxKind.InKeyword) {
      const left = stripTsWrappers(tsApi, node.left);
      const right = stripTsWrappers(tsApi, node.right);
      const leftText =
        left && (tsApi.isStringLiteral(left) || tsApi.isNoSubstitutionTemplateLiteral(left))
          ? left.text
          : null;
      if (leftText === symbolName && isThreeNamespaceLikeExpression(tsApi, right, aliasNames)) {
        found = true;
        return;
      }
    }

    // typeof THREE_ALIAS.SymbolName ...
    const propName = getThreeNamespacePropName(tsApi, node, aliasNames);
    if (propName === symbolName) {
      found = true;
      return;
    }

    tsApi.forEachChild(node, visit);
  }
  visit(expr);
  return found;
}

function isThreeSymbolReadInFallbackGuardContext(tsApi, node, symbolName, aliasNames) {
  let child = node;
  let cur = node ? node.parent : null;
  while (cur) {
    if (tsApi.isIfStatement(cur)) {
      // Node appears inside `if (<cond>)`
      if (child === cur.expression) {
        if (conditionMentionsGuardForThreeSymbol(tsApi, cur.expression, symbolName, aliasNames)) return true;
      }
      // Node appears inside `then` branch guarded by same symbol
      if (child === cur.thenStatement) {
        if (conditionMentionsGuardForThreeSymbol(tsApi, cur.expression, symbolName, aliasNames)) return true;
      }
      // `else` branch is not considered guarded-positive here.
    } else if (tsApi.isConditionalExpression(cur)) {
      if (child === cur.condition || child === cur.whenTrue) {
        if (conditionMentionsGuardForThreeSymbol(tsApi, cur.condition, symbolName, aliasNames)) return true;
      }
    } else if (tsApi.isBinaryExpression(cur)) {
      const op = cur.operatorToken && cur.operatorToken.kind;
      if (
        (op === tsApi.SyntaxKind.AmpersandAmpersandToken || op === tsApi.SyntaxKind.BarBarToken) &&
        child === cur.right &&
        conditionMentionsGuardForThreeSymbol(tsApi, cur.left, symbolName, aliasNames)
      ) {
        return true;
      }
    }

    child = cur;
    cur = cur.parent;
  }
  return false;
}

function collectThreeSymbolUsagesFromSource(tsApi, sourceFile, shouldIgnoreSymbol = null) {
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
    if (tsApi.isIdentifier(bindingName)) {
      if (!isLikelyThreeAliasName(bindingName.text)) return false;
      aliasNames.add(bindingName.text);
      return true;
    }
    if (tsApi.isObjectBindingPattern(bindingName)) {
      let changed = false;
      for (const el of bindingName.elements || []) {
        if (!el || el.dotDotDotToken) continue;
        if (el.name && tsApi.isIdentifier(el.name)) {
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
      if (tsApi.isVariableDeclaration(node)) {
        const init = node.initializer;
        if (node.name && init) {
          if (tsApi.isObjectBindingPattern(node.name)) {
            // const { THREE: T } = deps
            for (const el of node.name.elements || []) {
              if (!el || el.dotDotDotToken || !el.name || !tsApi.isIdentifier(el.name)) continue;
              const prop = el.propertyName || el.name;
              const propText =
                tsApi.isIdentifier(prop) ||
                tsApi.isStringLiteral(prop) ||
                tsApi.isNoSubstitutionTemplateLiteral(prop)
                  ? prop.text
                  : null;
              if (propText === 'THREE') {
                const before = aliasNames.size;
                aliasNames.add(el.name.text);
                if (aliasNames.size !== before) changed = true;
              }
            }
          } else if (isThreeNamespaceLikeExpression(tsApi, init, aliasNames)) {
            const before = aliasNames.size;
            addAliasFromBindingName(node.name);
            if (aliasNames.size !== before) changed = true;
          }
        }
      }

      if (tsApi.isBinaryExpression(node) && node.operatorToken.kind === tsApi.SyntaxKind.EqualsToken) {
        if (isThreeNamespaceLikeExpression(tsApi, node.right, aliasNames)) {
          const left = stripTsWrappers(tsApi, node.left);
          if (left && tsApi.isIdentifier(left) && isLikelyThreeAliasName(left.text)) {
            const before = aliasNames.size;
            aliasNames.add(left.text);
            if (aliasNames.size !== before) changed = true;
          }
        }
      }

      tsApi.forEachChild(node, visitAlias);
    }

    visitAlias(sourceFile);
    return changed;
  };

  for (let i = 0; i < 8; i++) {
    if (!learnAliasesPass()) break;
  }

  function visit(node) {
    // THREE.Foo / alias.Foo / THREE['Foo'] / alias['Foo']
    const threeProp = getThreeNamespacePropName(tsApi, node, aliasNames);
    if (threeProp) {
      // Namespace writes (e.g. THREE.__foo = ..., THREE['bar'] ||= ...) are app augmentations,
      // not requirements for the vendor export contract.
      if (isThreeNamespaceWriteAccess(tsApi, node)) addIgnoredWrite(threeProp);
      else
        add(threeProp, {
          fallback: isThreeSymbolReadInFallbackGuardContext(tsApi, node, threeProp, aliasNames),
        });
    }

    // getCtor(THREE, 'Box3') / getProp(THREE, 'Vector3') / similar reflective helpers.
    if (tsApi.isCallExpression(node)) {
      const calleeName = getSimpleCalleeName(tsApi, node.expression);
      const firstArg = node.arguments && node.arguments.length >= 1 ? node.arguments[0] : null;
      const secondArg = node.arguments && node.arguments.length >= 2 ? node.arguments[1] : null;
      if (
        looksLikeThreeReflectiveReadHelperName(calleeName) &&
        isThreeNamespaceLikeExpression(tsApi, firstArg, aliasNames)
      ) {
        const reflectiveProp = getLiteralPropertyName(tsApi, secondArg);
        if (reflectiveProp) {
          add(reflectiveProp, {
            fallback: isThreeSymbolReadInFallbackGuardContext(tsApi, node, reflectiveProp, aliasNames),
          });
        }
      }
    }

    // const { Foo, Bar: Baz } = THREE (or alias to THREE)
    if (tsApi.isVariableDeclaration(node) && tsApi.isObjectBindingPattern(node.name)) {
      const init = node.initializer;
      if (isThreeNamespaceLikeExpression(tsApi, init, aliasNames)) {
        for (const el of node.name.elements) {
          if (!el || (!el.propertyName && !el.name)) continue;
          if (el.dotDotDotToken) continue;
          const prop = el.propertyName || el.name;
          const propText =
            tsApi.isIdentifier(prop) ||
            tsApi.isStringLiteral(prop) ||
            tsApi.isNoSubstitutionTemplateLiteral(prop)
              ? prop.text
              : null;
          if (propText) {
            add(propText, {
              fallback: isThreeSymbolReadInFallbackGuardContext(tsApi, node, propText, aliasNames),
            });
          }
        }
      }
    }

    tsApi.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { symbols, directSymbols, fallbackSymbols, ignoredNamespaceWrites };
}

function parseJsLikeFile(tsApi, absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  return tsApi.createSourceFile(
    absPath,
    text,
    tsApi.ScriptTarget.Latest,
    true,
    tsScriptKindForFile(tsApi, absPath)
  );
}

function collectRequiredThreeSymbols({ root, scanPaths, tsApi, shouldIgnoreSymbol }) {
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
      sf = parseJsLikeFile(tsApi, f);
    } catch {
      continue;
    }
    const local = collectThreeSymbolUsagesFromSource(tsApi, sf, shouldIgnoreSymbol);
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

function collectVendorExportedSymbolsFromEntry({ root, vendorEntry, tsApi }) {
  const entryAbs = path.isAbsolute(vendorEntry) ? vendorEntry : path.join(root, vendorEntry);
  if (!exists(entryAbs)) {
    throw new Error(`[WP Three Contract] Missing vendor entry: ${posixRel(root, entryAbs)}`);
  }
  const sf = parseJsLikeFile(tsApi, entryAbs);
  const exported = new Set();
  let foundThreeObject = false;

  function addPropName(nameNode) {
    if (!nameNode) return;
    if (tsApi.isIdentifier(nameNode)) exported.add(nameNode.text);
    else if (tsApi.isStringLiteral(nameNode) || tsApi.isNoSubstitutionTemplateLiteral(nameNode))
      exported.add(nameNode.text);
    else if (tsApi.isNumericLiteral(nameNode)) exported.add(nameNode.text);
  }

  function visit(node) {
    if (tsApi.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations || []) {
        if (!tsApi.isIdentifier(decl.name) || decl.name.text !== 'THREE') continue;
        if (!decl.initializer || !tsApi.isObjectLiteralExpression(decl.initializer)) continue;
        foundThreeObject = true;
        for (const prop of decl.initializer.properties) {
          if (tsApi.isShorthandPropertyAssignment(prop)) {
            exported.add(prop.name.text);
            continue;
          }
          if (tsApi.isPropertyAssignment(prop)) {
            addPropName(prop.name);
            continue;
          }
          if (tsApi.isMethodDeclaration(prop)) {
            addPropName(prop.name);
            continue;
          }
          if (tsApi.isSpreadAssignment(prop)) {
            // Intentionally ignore spreads; current vendor entry should stay explicit.
          }
        }
      }
    }
    tsApi.forEachChild(node, visit);
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

  const tsApi = options.tsApi || (await loadTypeScript());
  if (!tsApi) {
    return { ok: false, error: 'missing_typescript' };
  }

  const root = path.resolve(args.root);
  const vendorEntry = args.vendorEntry || path.join('tools', 'three_vendor_entry.js');
  const scanPaths = Array.isArray(args.scanPaths) && args.scanPaths.length ? args.scanPaths : ['esm'];

  const shouldIgnoreSymbol = compileIgnoreMatchers(args.ignoreSymbols);
  const requiredRes = collectRequiredThreeSymbols({ root, scanPaths, tsApi, shouldIgnoreSymbol });
  const vendorRes = collectVendorExportedSymbolsFromEntry({ root, vendorEntry, tsApi });
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
