import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createAstAdapter, formatParseDiagnostic, getAstParserModule } from './wp_ast_adapter.mjs';
import { JS_EXTS, ROOT, TS_EXTS, rel } from './wp_check_shared.js';

export function getTypeScriptModule() {
  return getAstParserModule();
}

export function nodeCheck(file, options = {}) {
  const execPath = options.execPath || process.execPath;
  const result = spawnSync(execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status === 0) return { ok: true };
  return { ok: false, msg: String(result.stderr || result.stdout || '').trim() };
}

export function tsParseCheck(file, options = {}) {
  const astApi = options.astApi || createAstAdapter({ astApi: options.astApi });
  const root = options.root || ROOT;
  if (!astApi) {
    return {
      ok: true,
      skipped: true,
      msg: 'oxc-parser module not available (TS syntax-only check skipped)',
    };
  }

  try {
    const text = fs.readFileSync(file, 'utf8');
    const sourceFile = astApi.createSourceFile(file, text, astApi.getScriptKindForFile(file));
    const diagnostics = Array.isArray(sourceFile.parseDiagnostics) ? sourceFile.parseDiagnostics : [];
    if (!diagnostics.length) return { ok: true, skipped: false };
    const pretty = diagnostics
      .slice(0, 10)
      .map(diagnostic => formatParseDiagnostic({ astApi, root, file, sourceFile, diagnostic, rel }))
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
