import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

import { build } from 'vite';

import { createBundleBuildConfig } from './wp_bundle_emit.js';
import { buildDistModules } from './wp_bundle_dist.js';
import {
  analyzeBundleChunkTopology,
  assertBundleChunkTopology,
  CLIENT_INITIAL_BUNDLE_BUDGET,
} from './wp_bundle_chunk_graph.js';
import { createInitialBundleSubsystemSummary } from './wp_bundle_attribution_support.js';

const require = createRequire(import.meta.url);
const { createVerificationSourceIdentity } = require('./wp_verification_manifest.cjs');
const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, '.artifacts', 'bundle-attribution');

buildDistModules(projectRoot, { forceDistRebuild: false });
const config = createBundleBuildConfig({
  root: projectRoot,
  entryAbs: path.join(projectRoot, 'dist', 'esm', 'release_main.js'),
  tmpDirAbs: path.join(outputDir, 'inspect'),
  args: { buildMode: 'client', sourcemap: false, minify: true },
});
config.build.write = false;
const buildResult = await build(config);
const outputs = (Array.isArray(buildResult) ? buildResult : [buildResult]).flatMap(
  result => result.output || []
);
const chunks = outputs.filter(output => output?.type === 'chunk');
const topology = assertBundleChunkTopology(buildResult, { initialBudget: CLIENT_INITIAL_BUNDLE_BUDGET });
const staticClosure = new Set(topology.staticClosure);
const chunkRows = chunks
  .map(chunk => ({
    fileName: chunk.fileName,
    initial: staticClosure.has(chunk.fileName),
    rawBytes: Buffer.byteLength(chunk.code || ''),
    gzipBytes: zlib.gzipSync(chunk.code || '', { level: 9 }).length,
    moduleCount: Object.keys(chunk.modules || {}).length,
    imports: chunk.imports || [],
    dynamicImports: chunk.dynamicImports || [],
  }))
  .sort((left, right) => right.rawBytes - left.rawBytes);
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: createVerificationSourceIdentity(projectRoot),
  topology: analyzeBundleChunkTopology(buildResult),
  initial: topology.initial,
  chunks: chunkRows,
  subsystemAttribution: createInitialBundleSubsystemSummary(chunks, staticClosure),
};

const lines = [
  '# Initial bundle attribution',
  '',
  `Generated: ${report.generatedAt}`,
  `Source: ${report.source.digest}`,
  `Initial app closure: raw=${report.initial.rawBytes}, gzip=${report.initial.gzipBytes}, chunks=${report.initial.chunkCount}, modules=${report.initial.moduleCount}`,
  '',
  '> Subsystem bytes are bundler rendered-module lengths before final chunk minification. They are attribution evidence, not expected byte-for-byte savings.',
  '',
  '## Initial subsystem attribution',
  '',
  '| Subsystem | Rendered module bytes | Modules |',
  '|---|---:|---:|',
  ...report.subsystemAttribution.map(
    item => `| ${item.subsystem} | ${item.renderedBytes} | ${item.moduleCount} |`
  ),
  '',
  '## Chunk graph',
  '',
  '| Chunk | Initial | Raw | Gzip | Modules |',
  '|---|---|---:|---:|---:|',
  ...report.chunks.map(
    item =>
      `| ${item.fileName} | ${item.initial ? 'yes' : 'no'} | ${item.rawBytes} | ${item.gzipBytes} | ${item.moduleCount} |`
  ),
  '',
];

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputDir, 'latest.md'), `${lines.join('\n')}\n`, 'utf8');
console.log(
  `[bundle-attribution] initial raw=${report.initial.rawBytes} gzip=${report.initial.gzipBytes} chunks=${report.initial.chunkCount} modules=${report.initial.moduleCount}`
);
