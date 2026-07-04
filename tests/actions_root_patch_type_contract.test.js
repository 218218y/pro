import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';

function runVirtualTypecheck(source) {
  const root = process.cwd();
  const file = path.join(root, '__virtual_actions_root_patch_type_contract.ts');
  const opts = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowSyntheticDefaultImports: true,
    types: [],
  };
  const host = ts.createCompilerHost(opts);
  const origRead = host.readFile.bind(host);
  const origExists = host.fileExists.bind(host);
  host.readFile = candidate =>
    path.resolve(candidate) === path.resolve(file) ? source : origRead(candidate);
  host.fileExists = candidate => path.resolve(candidate) === path.resolve(file) || origExists(candidate);

  const program = ts.createProgram([file], opts, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter(diag => path.resolve(diag.file?.fileName || '') === path.resolve(file))
    .map(diag => {
      const pos =
        diag.file && typeof diag.start === 'number'
          ? diag.file.getLineAndCharacterOfPosition(diag.start)
          : null;
      return {
        line: pos ? pos.line + 1 : null,
        message: String(ts.flattenDiagnosticMessageText(diag.messageText, ' ')),
      };
    });
}

test('[actions.patch types] public root config patch rejects known maps while store patch remains raw', () => {
  const source = `import type { ActionsNamespaceLike, StoreLike } from './types';
declare const actions: ActionsNamespaceLike;
declare const store: StoreLike;
actions.patch?.({ config: { width: 120 } });
actions.patch?.({ config: { width: 130, __replace: { width: true } } });
store.patch({ config: { handlesMap: { d1_full: 'rail' } } });
actions.patch?.({ config: { handlesMap: { d1_full: 'rail' } } });
actions.patch?.({ config: { __replace: { handlesMap: true } } });
`;

  const diagnostics = runVirtualTypecheck(source);

  assert.deepEqual(
    diagnostics.map(diag => diag.line),
    [7, 8]
  );
  assert.ok(
    diagnostics.every(diag => /not assignable/.test(diag.message)),
    diagnostics.map(diag => diag.message).join('\n')
  );
});
