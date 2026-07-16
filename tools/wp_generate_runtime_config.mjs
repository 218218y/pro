#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertRootRuntimeConfigCurrent, writeRootRuntimeConfig } from './wp_runtime_config_generation.mjs';

export function parseRuntimeConfigGenerationArgs(args = []) {
  const values = Array.isArray(args) ? args : [];
  const unknown = values.filter(value => value !== '--check' && value !== '--help');
  if (unknown.length) {
    throw new Error(`[WP Runtime Config] Unknown option(s): ${unknown.join(', ')}`);
  }
  return { check: values.includes('--check'), help: values.includes('--help') };
}

export async function runRuntimeConfigGeneration(args = process.argv.slice(2), root = process.cwd()) {
  const options = parseRuntimeConfigGenerationArgs(args);
  if (options.help) {
    console.log('Usage: node tools/wp_generate_runtime_config.mjs [--check]');
    return { help: true };
  }
  if (options.check) {
    const target = await assertRootRuntimeConfigCurrent(root);
    console.log(`[WP Runtime Config] current: ${path.relative(root, target)}`);
    return { checked: true, target };
  }
  const target = await writeRootRuntimeConfig(root);
  console.log(`[WP Runtime Config] generated: ${path.relative(root, target)}`);
  return { written: true, target };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  runRuntimeConfigGeneration().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
