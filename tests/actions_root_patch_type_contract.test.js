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
  const source = `import type {
  ActionsNamespaceLike,
  PatchDispatchEnvelope,
  PublicWardrobeProAction,
  WardrobeProAction,
} from './types';
import type { StoreLike } from './types/backend_store';
import type { StoreBackendAction, StorePatchAction } from './types/backend_actions';
declare const actions: ActionsNamespaceLike;
declare const store: StoreLike;
actions.patch?.({ config: { width: 120 } });
actions.patch?.({ config: { width: 130, __replace: { width: true } } });
store.patch({ config: { handlesMap: { d1_full: 'rail' } } });
actions.patch?.({ config: { handlesMap: { d1_full: 'rail' } } }); // expect-error
actions.patch?.({ config: { __replace: { handlesMap: true } } }); // expect-error
const okPatch: PatchDispatchEnvelope = { type: 'PATCH', payload: { config: { width: 120 } } };
const badPatch: PatchDispatchEnvelope = { type: 'PATCH', payload: { config: { handlesMap: { d1_full: 'rail' } } } }; // expect-error
const badPublicAction: PublicWardrobeProAction = { type: 'PATCH', payload: { config: { handlesMap: { d1_full: 'rail' } } } }; // expect-error
const badWardrobeAction: WardrobeProAction = { type: 'PATCH', payload: { config: { handlesMap: { d1_full: 'rail' } } } }; // expect-error
const rawStoreAction: StorePatchAction = { type: 'PATCH', payload: { config: { handlesMap: { d1_full: 'rail' } } } };
const rawBackendAction: StoreBackendAction = { type: 'PATCH', payload: { config: { handlesMap: { d1_full: 'rail' } } } };
void okPatch;
void badPatch;
void badPublicAction;
void badWardrobeAction;
void rawStoreAction;
void rawBackendAction;
`;

  const diagnostics = runVirtualTypecheck(source);
  const expectedLines = source
    .split('\n')
    .flatMap((line, index) => (line.includes('expect-error') ? [index + 1] : []));

  assert.deepEqual(
    diagnostics.map(diag => diag.line),
    expectedLines
  );
  assert.ok(
    diagnostics.every(diag => /not assignable/.test(diag.message)),
    diagnostics.map(diag => diag.message).join('\n')
  );
});

test('[actions.patch types] public barrel does not export raw store backend action/patch types', () => {
  const source = `import type { StorePatchPayload } from './types'; // expect-error
import type { PatchPayload } from './types'; // expect-error
import type { ConfigSlicePatch } from './types'; // expect-error
import type { RawPatchPayload } from './types'; // expect-error
import type { RawConfigSlicePatch } from './types'; // expect-error
import type { StorePatchAction } from './types'; // expect-error
import type { StoreBackendAction } from './types'; // expect-error
import type { RawWardrobeProAction } from './types'; // expect-error
import type { StoreLike } from './types'; // expect-error
import type { RootStoreLike } from './types'; // expect-error
import type { BackendStoreLike } from './types'; // expect-error
`;

  const diagnostics = runVirtualTypecheck(source);
  const expectedLines = source
    .split('\n')
    .flatMap((line, index) => (line.includes('expect-error') ? [index + 1] : []));

  assert.deepEqual(
    diagnostics.map(diag => diag.line),
    expectedLines
  );
  assert.ok(
    diagnostics.every(diag => /has no exported member/.test(diag.message)),
    diagnostics.map(diag => diag.message).join('\n')
  );
});

test('[actions.patch types] shared patch_payload module does not export raw root/config patch types', () => {
  const source = `import type { PatchPayload } from './types/patch_payload'; // expect-error
import type { ConfigSlicePatch } from './types/patch_payload'; // expect-error
import type { UiSlicePatch, RuntimeSlicePatch, ModeSlicePatch, MetaSlicePatch } from './types/patch_payload';
const uiPatch: UiSlicePatch = { __snapshot: true };
const runtimePatch: RuntimeSlicePatch = { paintColor: 'red' };
const modePatch: ModeSlicePatch = { primary: 'design' };
const metaPatch: MetaSlicePatch = { dirty: true };
void uiPatch;
void runtimePatch;
void modePatch;
void metaPatch;
`;

  const diagnostics = runVirtualTypecheck(source);
  const expectedLines = source
    .split('\n')
    .flatMap((line, index) => (line.includes('expect-error') ? [index + 1] : []));

  assert.deepEqual(
    diagnostics.map(diag => diag.line),
    expectedLines
  );
  assert.ok(
    diagnostics.every(diag => /has no exported member/.test(diag.message)),
    diagnostics.map(diag => diag.message).join('\n')
  );
});

test('[actions.patch types] public patch payload aliases reject known config maps', () => {
  const source = `import type { PublicPatchPayload, PublicConfigPatch } from './types';
const okPayload: PublicPatchPayload = { config: { width: 120 } };
const okReplacePayload: PublicPatchPayload = { config: { width: 130, __replace: { width: true } } };
const badPayload: PublicPatchPayload = { config: { handlesMap: { d1_full: 'rail' } } }; // expect-error
const badReplacePayload: PublicPatchPayload = { config: { __replace: { handlesMap: true } } }; // expect-error
const okConfig: PublicConfigPatch = { width: 120 };
const okReplaceConfig: PublicConfigPatch = { width: 130, __replace: { width: true } };
const badConfig: PublicConfigPatch = { handlesMap: { d1_full: 'rail' } }; // expect-error
const badReplaceConfig: PublicConfigPatch = { __replace: { handlesMap: true } }; // expect-error
void okPayload;
void okReplacePayload;
void badPayload;
void badReplacePayload;
void okConfig;
void okReplaceConfig;
void badConfig;
void badReplaceConfig;
`;

  const diagnostics = runVirtualTypecheck(source);
  const expectedLines = source
    .split('\n')
    .flatMap((line, index) => (line.includes('expect-error') ? [index + 1] : []));

  assert.deepEqual(
    diagnostics.map(diag => diag.line),
    expectedLines
  );
  assert.ok(
    diagnostics.every(diag => /not assignable/.test(diag.message)),
    diagnostics.map(diag => diag.message).join('\n')
  );
});

test('[actions.patch types] public store surface does not expose raw store writers', () => {
  const source = `import type { PublicStoreLike } from './types';
declare const store: PublicStoreLike;
store.getState();
store.patch({ config: { handlesMap: { d1_full: 'rail' } } }); // expect-error
store.setConfig?.({ handlesMap: { d1_full: 'rail' } }); // expect-error
store.setRoot?.({ config: {} }); // expect-error
`;

  const diagnostics = runVirtualTypecheck(source);
  const expectedLines = source
    .split('\n')
    .flatMap((line, index) => (line.includes('expect-error') ? [index + 1] : []));

  assert.deepEqual(
    diagnostics.map(diag => diag.line),
    expectedLines
  );
  assert.ok(
    diagnostics.every(diag => /does not exist/.test(diag.message)),
    diagnostics.map(diag => diag.message).join('\n')
  );
});
