#!/usr/bin/env node
import { readSourceText } from './wp_source_text.mjs';

const cleanupOwner = 'esm/native/ui/react/effects/dom_event_cleanup.ts';
const migratedFiles = [
  'esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions.ts',
  'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks.ts',
  'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_hooks.ts',
  'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_history_hooks.ts',
  'esm/native/ui/react/notes/notes_overlay_editor_workflow_events.ts',
];

const errors = [];
const ownerSource = readSourceText(cleanupOwner);
for (const pattern of [
  /export function installDomEventListener\(/,
  /export function composeDomEventCleanups\(/,
  /remove\.call\(target, type, listener/,
]) {
  if (!pattern.test(ownerSource)) errors.push(`${cleanupOwner}: missing ${pattern}`);
}
if (/as any\b/.test(ownerSource)) errors.push(`${cleanupOwner}: must not use as any`);

for (const file of migratedFiles) {
  const source = readSourceText(file);
  if (!/installDomEventListener/.test(source)) {
    errors.push(`${file}: migrated effect must use installDomEventListener`);
  }
  const withoutImports = source.replace(/^import[^\n]*addEventListener[^\n]*$/gm, '');
  if (
    /\.[a-zA-Z]*addEventListener\s*\(/.test(withoutImports) ||
    /\baddEventListener\s*\(/.test(withoutImports)
  ) {
    errors.push(`${file}: direct addEventListener is forbidden after migration`);
  }
  if (
    /\.[a-zA-Z]*removeEventListener\s*\(/.test(withoutImports) ||
    /\bremoveEventListener\s*\(/.test(withoutImports)
  ) {
    errors.push(`${file}: direct removeEventListener is forbidden after migration`);
  }
}

if (errors.length) {
  console.error('[ui-effect-cleanup-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[ui-effect-cleanup-contract] ok');
