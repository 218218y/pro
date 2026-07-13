#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import viteConfigFactory from '../vite.config.mjs';
import { createBundleBuildConfig } from './wp_bundle_emit.js';
import {
  ESNEXT_BUILD_TARGET,
  ESNEXT_TYPESCRIPT_LIB,
  ESNEXT_TYPESCRIPT_TARGET,
} from './wp_esnext_target_policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function pushMismatch(violations, label, actual, expected) {
  if (actual === expected) return;
  violations.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

async function readViteConfig(mode) {
  if (typeof viteConfigFactory !== 'function') return viteConfigFactory;
  return viteConfigFactory({
    command: 'build',
    mode,
    isSsrBuild: false,
    isPreview: false,
  });
}

export async function collectEsnextTargetViolations() {
  const violations = [];

  for (const fileName of fs
    .readdirSync(ROOT)
    .filter(name => /^tsconfig(?:\..+)?\.json$/.test(name))
    .sort()) {
    const compilerOptions = readJson(fileName).compilerOptions ?? {};
    if (Object.hasOwn(compilerOptions, 'target')) {
      pushMismatch(
        violations,
        `${fileName} compilerOptions.target`,
        compilerOptions.target,
        ESNEXT_TYPESCRIPT_TARGET
      );
    }
    if (Object.hasOwn(compilerOptions, 'module')) {
      pushMismatch(
        violations,
        `${fileName} compilerOptions.module`,
        compilerOptions.module,
        ESNEXT_TYPESCRIPT_TARGET
      );
    }
    if (Object.hasOwn(compilerOptions, 'lib')) {
      const libs = compilerOptions.lib;
      if (!Array.isArray(libs) || !libs.includes(ESNEXT_TYPESCRIPT_LIB)) {
        violations.push(
          `${fileName} compilerOptions.lib must include ${JSON.stringify(ESNEXT_TYPESCRIPT_LIB)}`
        );
      }
    }
  }

  for (const mode of ['production', 'modules']) {
    const config = await readViteConfig(mode);
    pushMismatch(violations, `vite(${mode}) oxc.target`, config?.oxc?.target, ESNEXT_BUILD_TARGET);
    pushMismatch(violations, `vite(${mode}) build.target`, config?.build?.target, ESNEXT_BUILD_TARGET);
  }

  const bundleConfig = createBundleBuildConfig({
    root: ROOT,
    entryAbs: path.join(ROOT, 'dist', 'esm', 'release_main.js'),
    tmpDirAbs: path.join(ROOT, '.artifacts', 'esnext-contract-bundle'),
    args: {
      buildMode: 'client',
      minify: false,
      sourcemap: false,
    },
  });
  pushMismatch(
    violations,
    'tools/wp_bundle_emit.js build.target',
    bundleConfig?.build?.target,
    ESNEXT_BUILD_TARGET
  );

  const threeVendorSource = readText('tools/wp_three_vendor.js');
  if (
    !/import\s*\{\s*ESNEXT_BUILD_TARGET\s*\}\s*from\s*['"]\.\/wp_esnext_target_policy\.mjs['"]/.test(
      threeVendorSource
    )
  ) {
    violations.push('tools/wp_three_vendor.js must import ESNEXT_BUILD_TARGET from the canonical policy');
  }
  if (!/target:\s*ESNEXT_BUILD_TARGET\b/.test(threeVendorSource)) {
    violations.push('tools/wp_three_vendor.js must use ESNEXT_BUILD_TARGET for the Vite build target');
  }

  const productionTargetFiles = ['vite.config.mjs', 'tools/wp_bundle_emit.js', 'tools/wp_three_vendor.js'];
  const pinnedLegacyTarget = /target\s*:\s*['"]es20\d\d['"]/i;
  for (const relativePath of productionTargetFiles) {
    if (pinnedLegacyTarget.test(readText(relativePath))) {
      violations.push(`${relativePath} contains a fixed legacy ECMAScript build target`);
    }
  }

  return violations;
}

async function main() {
  const violations = await collectEsnextTargetViolations();
  if (violations.length) {
    console.error('[ESNext target contract] Failed:');
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `[ESNext target contract] OK: TypeScript=${ESNEXT_TYPESCRIPT_TARGET}, Vite/Oxc=${ESNEXT_BUILD_TARGET}`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
