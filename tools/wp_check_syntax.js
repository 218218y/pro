import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { JS_EXTS, ROOT, TS_EXTS, rel } from './wp_check_shared.js';

const require = createRequire(import.meta.url);
let cachedTsModule = null;
let tsLoadFailed = false;

export function getTypeScriptModule() {
  if (cachedTsModule) return cachedTsModule;
  if (tsLoadFailed) return null;
  try {
    cachedTsModule = require('typescript');
    return cachedTsModule;
  } catch {
    tsLoadFailed = true;
    return null;
  }
}

export function nodeCheck(file, options = {}) {
  const execPath = options.execPath || process.execPath;
  const result = spawnSync(execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status === 0) return { ok: true };
  return { ok: false, msg: String(result.stderr || result.stdout || '').trim() };
}

export function tsParseCheck(file, options = {}) {
  const ts = options.tsModule || getTypeScriptModule();
  const root = options.root || ROOT;
  if (!ts) {
    return {
      ok: true,
      skipped: true,
      msg: 'typescript module not available (TS syntax-only check skipped)',
    };
  }

  try {
    const text = fs.readFileSync(file, 'utf8');
    const lower = file.toLowerCase();
    const scriptKind = lower.endsWith('.tsx')
      ? ts.ScriptKind.TSX
      : lower.endsWith('.mts')
        ? ts.ScriptKind.MTS
        : lower.endsWith('.cts')
          ? ts.ScriptKind.CTS
          : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);
    const diagnostics = Array.isArray(sourceFile.parseDiagnostics) ? sourceFile.parseDiagnostics : [];
    if (!diagnostics.length) return { ok: true, skipped: false };
    const pretty = diagnostics
      .slice(0, 10)
      .map(diag => {
        const message =
          typeof ts.flattenDiagnosticMessageText === 'function'
            ? ts.flattenDiagnosticMessageText(diag.messageText, '\n')
            : String(diag.messageText || 'TS parse error');
        const pos =
          typeof diag.start === 'number' ? sourceFile.getLineAndCharacterOfPosition(diag.start) : null;
        const where = pos ? `:${pos.line + 1}:${pos.character + 1}` : '';
        return `${rel(root, file)}${where} TS${diag.code}: ${message}`;
      })
      .join('\n');
    return { ok: false, skipped: false, msg: pretty };
  } catch (error) {
    return { ok: false, skipped: false, msg: `${rel(root, file)}: ${String(error)}` };
  }
}

export function syntaxCheck(file, options = {}) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  if (JS_EXTS.has(ext)) return { kind: 'js', ...nodeCheck(file, options) };
  if (TS_EXTS.has(ext)) return { kind: 'ts', ...tsParseCheck(file, options) };
  return { kind: 'unknown', ok: true };
}

export function runSyntaxChecks(files, options = {}) {
  const errors = [];
  let tsSyntaxSkipped = 0;
  for (const file of files) {
    const result = syntaxCheck(file, options);
    if (result.skipped) tsSyntaxSkipped += 1;
    if (!result.ok) errors.push({ file, msg: result.msg, kind: result.kind || 'unknown' });
  }
  return {
    syntaxErrors: errors.length,
    tsSyntaxSkipped,
    errors,
  };
}
