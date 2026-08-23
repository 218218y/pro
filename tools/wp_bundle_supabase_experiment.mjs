import fs from 'node:fs';
import path from 'node:path';

import { build } from 'vite';

import { createBundleBuildConfig } from './wp_bundle_emit.js';
import { buildDistModules } from './wp_bundle_dist.js';
import { analyzeBundleChunkTopology, assertBundleChunkTopology } from './wp_bundle_chunk_graph.js';
import { BUNDLE_CODE_SPLITTING_GROUPS } from './wp_bundle_shared.js';

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, '.artifacts', 'bundle-attribution');
const require = (await import('node:module')).createRequire(import.meta.url);
const { createVerificationSourceIdentity } = require('./wp_verification_manifest.cjs');

function createExperimentConfig(label, groups) {
  const config = createBundleBuildConfig({
    root: projectRoot,
    entryAbs: path.join(projectRoot, 'dist', 'esm', 'release_main.js'),
    tmpDirAbs: path.join(outputDir, `supabase-${label}`),
    args: { buildMode: 'client', sourcemap: false, minify: true },
  });
  config.build.write = false;
  config.build.rolldownOptions.output.codeSplitting.groups = groups;
  return config;
}

function chunksFromBuild(buildResult) {
  return (Array.isArray(buildResult) ? buildResult : [buildResult])
    .flatMap(result => result.output || [])
    .filter(output => output?.type === 'chunk');
}

function supabaseModuleIds(buildResult) {
  return Array.from(
    new Set(
      chunksFromBuild(buildResult).flatMap(chunk =>
        Object.keys(chunk.modules || {}).filter(id =>
          /[\\/]node_modules[\\/](?:@supabase[\\/]|iceberg-js[\\/])/u.test(id)
        )
      )
    )
  ).sort();
}

function findSupabaseChunks(buildResult) {
  return chunksFromBuild(buildResult)
    .filter(chunk =>
      Object.keys(chunk.modules || {}).some(id =>
        /[\\/]node_modules[\\/](?:@supabase[\\/]|iceberg-js[\\/])/u.test(id)
      )
    )
    .map(chunk => ({
      fileName: chunk.fileName,
      moduleCount: Object.keys(chunk.modules || {}).length,
      imports: chunk.imports || [],
      dynamicImports: chunk.dynamicImports || [],
    }));
}

buildDistModules(projectRoot, { forceDistRebuild: false });
const source = createVerificationSourceIdentity(projectRoot);
const genericVendorGroups = BUNDLE_CODE_SPLITTING_GROUPS.filter(group => group.name !== 'supabase');
const genericVendorBuild = await build(createExperimentConfig('generic-vendor', genericVendorGroups));
const dedicatedBuild = await build(
  createExperimentConfig('dedicated-supabase', BUNDLE_CODE_SPLITTING_GROUPS)
);
const before = analyzeBundleChunkTopology(genericVendorBuild);
const after = assertBundleChunkTopology(dedicatedBuild);
const modules = supabaseModuleIds(dedicatedBuild);

if (before.eagerDeferredModules.length === 0) {
  throw new Error('[bundle-supabase-experiment] generic vendor did not reproduce eager deferred modules');
}
if (after.eagerDeferredModules.length !== 0 || after.staticCycles.length !== 0) {
  throw new Error('[bundle-supabase-experiment] dedicated group did not produce a clean deferred topology');
}

const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source,
  before: {
    policy: 'generic node_modules vendor group',
    initial: before.initial,
    eagerDeferredModuleCount: before.eagerDeferredModules.length,
    supabaseChunks: findSupabaseChunks(genericVendorBuild),
  },
  after: {
    policy: 'dedicated Supabase ecosystem group above generic vendor',
    initial: after.initial,
    eagerDeferredModuleCount: after.eagerDeferredModules.length,
    supabaseChunks: findSupabaseChunks(dedicatedBuild),
  },
  delta: {
    rawBytes: after.initial.rawBytes - before.initial.rawBytes,
    gzipBytes: after.initial.gzipBytes - before.initial.gzipBytes,
    moduleCount: after.initial.moduleCount - before.initial.moduleCount,
    chunkCount: after.initial.chunkCount - before.initial.chunkCount,
  },
  supabaseEcosystemModuleCount: modules.length,
  supabaseEcosystemModules: modules,
};
const lines = [
  '# Supabase bundle isolation experiment',
  '',
  `Generated: ${report.generatedAt}`,
  `Source: ${source.digest}`,
  '',
  '| Policy | Initial raw | Initial gzip | Initial chunks | Initial modules | Eager deferred modules |',
  '|---|---:|---:|---:|---:|---:|',
  `| Generic vendor (before) | ${report.before.initial.rawBytes} | ${report.before.initial.gzipBytes} | ${report.before.initial.chunkCount} | ${report.before.initial.moduleCount} | ${report.before.eagerDeferredModuleCount} |`,
  `| Dedicated Supabase (after) | ${report.after.initial.rawBytes} | ${report.after.initial.gzipBytes} | ${report.after.initial.chunkCount} | ${report.after.initial.moduleCount} | ${report.after.eagerDeferredModuleCount} |`,
  `| Delta | ${report.delta.rawBytes} | ${report.delta.gzipBytes} | ${report.delta.chunkCount} | ${report.delta.moduleCount} | ${report.after.eagerDeferredModuleCount - report.before.eagerDeferredModuleCount} |`,
  '',
  `Supabase ecosystem modules: ${report.supabaseEcosystemModuleCount}.`,
  '',
];

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, 'supabase-experiment-latest.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);
fs.writeFileSync(path.join(outputDir, 'supabase-experiment-latest.md'), `${lines.join('\n')}\n`, 'utf8');
console.log(
  `[bundle-supabase-experiment] raw ${before.initial.rawBytes} -> ${after.initial.rawBytes} (${report.delta.rawBytes}); gzip ${before.initial.gzipBytes} -> ${after.initial.gzipBytes} (${report.delta.gzipBytes})`
);
