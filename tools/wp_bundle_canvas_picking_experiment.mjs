import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { build } from 'vite';

import { createBundleBuildConfig } from './wp_bundle_emit.js';
import { buildDistModules } from './wp_bundle_dist.js';
import { analyzeBundleChunkTopology } from './wp_bundle_chunk_graph.js';
import { copyDir, rmrf } from './wp_bundle_shared.js';

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, '.artifacts', 'bundle-attribution');
const sourceRoot = path.join(projectRoot, 'dist');
const require = (await import('node:module')).createRequire(import.meta.url);
const { createVerificationSourceIdentity } = require('./wp_verification_manifest.cjs');

const variants = [
  {
    name: 'whole-service-dynamic',
    interactionRisk: 'high: synchronous click/hover API would become load-dependent',
    architectureComplexity: 'high',
    boundaries: [
      {
        file: 'esm/native/services/canvas_picking_core.js',
        exports: [
          ['handleCanvasClickNDC', 'void'],
          ['handleCanvasHoverNDC', 'false'],
        ],
      },
    ],
  },
  {
    name: 'interior-family-deferred',
    interactionRisk:
      'low only if InteriorTab explicitly registers the synchronous extension before mode activation',
    architectureComplexity: 'medium: one feature-owned click/hover extension seam',
    boundaries: [
      {
        file: 'esm/native/services/canvas_picking_click_route_manual.js',
        exports: [['tryHandleCanvasPickingManualOrEmptyRoute', 'false']],
      },
      {
        file: 'esm/native/services/canvas_picking_click_route_layout.js',
        exports: [['tryHandleCanvasPickingLayoutRoute', 'false']],
      },
      {
        file: 'esm/native/services/canvas_picking_hover_flow_nonsplit_sketch.js',
        exports: [['tryHandleCanvasNonSplitSketchHover', 'false']],
      },
      {
        file: 'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_interior.js',
        exports: [['tryHandleCanvasNonSplitInteriorPreviewRoutes', 'false']],
      },
    ],
  },
  {
    name: 'manual-layout-family-deferred',
    interactionRisk: 'low only if manual-layout activation cannot precede explicit extension registration',
    architectureComplexity: 'low-medium: focused manual click/hover seam',
    boundaries: [
      {
        file: 'esm/native/services/canvas_picking_click_route_manual.js',
        exports: [['tryHandleCanvasPickingManualOrEmptyRoute', 'false']],
      },
      {
        file: 'esm/native/services/canvas_picking_hover_flow_nonsplit_sketch.js',
        exports: [['tryHandleCanvasNonSplitSketchHover', 'false']],
      },
    ],
  },
];

function createConfig(label, entryAbs) {
  const config = createBundleBuildConfig({
    root: projectRoot,
    entryAbs,
    tmpDirAbs: path.join(outputDir, `canvas-${label}-bundle`),
    args: { buildMode: 'client', sourcemap: false, minify: true },
  });
  config.build.write = false;
  return config;
}

function chunksFromBuild(buildResult) {
  return (Array.isArray(buildResult) ? buildResult : [buildResult])
    .flatMap(result => result.output || [])
    .filter(output => output?.type === 'chunk');
}

function initialModuleIds(buildResult, topology) {
  const initialChunks = new Set(topology.staticClosure || []);
  return new Set(
    chunksFromBuild(buildResult)
      .filter(chunk => initialChunks.has(chunk.fileName))
      .flatMap(chunk => Object.keys(chunk.modules || {}))
  );
}

function isCanvasPickingModule(id) {
  return /[\\/]native[\\/]services[\\/]canvas_picking(?:_|\.)/u.test(id);
}

function summarizeBuild(buildResult) {
  const topology = analyzeBundleChunkTopology(buildResult);
  const modules = initialModuleIds(buildResult, topology);
  const canvasModules = [...modules].filter(isCanvasPickingModule).sort();
  const staticClosure = new Set(topology.staticClosure || []);
  const dynamicCanvasChunks = chunksFromBuild(buildResult)
    .filter(
      chunk =>
        !staticClosure.has(chunk.fileName) && Object.keys(chunk.modules || {}).some(isCanvasPickingModule)
    )
    .map(chunk => ({
      fileName: chunk.fileName,
      rawBytes: Buffer.byteLength(String(chunk.code || '')),
      gzipBytes: zlib.gzipSync(String(chunk.code || ''), { level: 9 }).length,
      moduleCount: Object.keys(chunk.modules || {}).length,
      canvasModuleCount: Object.keys(chunk.modules || {}).filter(isCanvasPickingModule).length,
      imports: chunk.imports || [],
      dynamicImports: chunk.dynamicImports || [],
    }))
    .sort((left, right) => right.rawBytes - left.rawBytes);
  return {
    initial: topology.initial,
    initialCanvasModuleCount: canvasModules.length,
    initialCanvasModules: canvasModules,
    staticCycles: topology.staticCycles,
    staticClosure: topology.staticClosure,
    dynamicCanvasChunks,
    dynamicCanvasRawBytes: dynamicCanvasChunks.reduce((total, chunk) => total + chunk.rawBytes, 0),
    dynamicCanvasGzipBytes: dynamicCanvasChunks.reduce((total, chunk) => total + chunk.gzipBytes, 0),
  };
}

function installBoundary(copyRoot, boundary) {
  const fileAbs = path.join(copyRoot, boundary.file);
  if (!fs.existsSync(fileAbs)) {
    throw new Error(`[bundle-canvas-experiment] missing boundary ${boundary.file}`);
  }
  const extension = path.extname(fileAbs);
  const implAbs = `${fileAbs.slice(0, -extension.length)}_experiment_impl${extension}`;
  fs.renameSync(fileAbs, implAbs);
  const implImport = `./${path.basename(implAbs)}`;
  const lines = [
    `const loadImplementation = () => import(${JSON.stringify(implImport)});`,
    ...boundary.exports.map(([name, returnKind]) => {
      const returnStatement = returnKind === 'false' ? ' return false;' : '';
      return `export function ${name}(..._args) { void loadImplementation();${returnStatement} }`;
    }),
    '',
  ];
  fs.writeFileSync(fileAbs, lines.join('\n'), 'utf8');
}

async function buildVariant(variant) {
  const copyRoot = path.join(outputDir, `canvas-${variant.name}-source`);
  rmrf(copyRoot);
  copyDir(sourceRoot, copyRoot);
  for (const boundary of variant.boundaries) installBoundary(copyRoot, boundary);
  try {
    const buildResult = await build(
      createConfig(variant.name, path.join(copyRoot, 'esm', 'release_main.js'))
    );
    return summarizeBuild(buildResult);
  } finally {
    rmrf(copyRoot);
  }
}

buildDistModules(projectRoot, { forceDistRebuild: false });
const source = createVerificationSourceIdentity(projectRoot);
const baselineBuild = await build(createConfig('baseline', path.join(sourceRoot, 'esm', 'release_main.js')));
const baseline = summarizeBuild(baselineBuild);
const results = [];
for (const variant of variants) {
  const summary = await buildVariant(variant);
  results.push({
    name: variant.name,
    interactionRisk: variant.interactionRisk,
    architectureComplexity: variant.architectureComplexity,
    boundaries: variant.boundaries.map(item => item.file),
    ...summary,
    delta: {
      rawBytes: summary.initial.rawBytes - baseline.initial.rawBytes,
      gzipBytes: summary.initial.gzipBytes - baseline.initial.gzipBytes,
      moduleCount: summary.initial.moduleCount - baseline.initial.moduleCount,
      canvasModuleCount: summary.initialCanvasModuleCount - baseline.initialCanvasModuleCount,
    },
  });
}

const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source,
  methodology:
    'Isolated structural ceiling: copied dist modules replace selected synchronous roots with dynamic no-op boundaries. No production lifecycle or pointer behavior is changed.',
  baseline,
  variants: results,
};
const lines = [
  '# Canvas Picking bundle boundary experiment',
  '',
  `Generated: ${report.generatedAt}`,
  `Source: ${source.digest}`,
  '',
  '> These are final minified artifact measurements of isolated structural boundaries, not behavior-safe production implementations.',
  '',
  '| Variant | Initial raw | Initial gzip | Initial modules | Canvas initial modules | Raw delta | Gzip delta | Module delta | Dynamic Canvas raw/gzip | Cycles |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  `| baseline | ${baseline.initial.rawBytes} | ${baseline.initial.gzipBytes} | ${baseline.initial.moduleCount} | ${baseline.initialCanvasModuleCount} | 0 | 0 | 0 | 0 / 0 | ${baseline.staticCycles.length} |`,
  ...results.map(
    item =>
      `| ${item.name} | ${item.initial.rawBytes} | ${item.initial.gzipBytes} | ${item.initial.moduleCount} | ${item.initialCanvasModuleCount} | ${item.delta.rawBytes} | ${item.delta.gzipBytes} | ${item.delta.moduleCount} | ${item.dynamicCanvasRawBytes} / ${item.dynamicCanvasGzipBytes} | ${item.staticCycles.length} |`
  ),
  '',
  ...results.flatMap(item => [
    `## ${item.name}`,
    '',
    `Interaction risk: ${item.interactionRisk}`,
    `Architecture complexity: ${item.architectureComplexity}`,
    `Boundaries: ${item.boundaries.join(', ')}`,
    '',
    ...item.dynamicCanvasChunks.map(
      chunk =>
        `- ${chunk.fileName}: raw=${chunk.rawBytes}, gzip=${chunk.gzipBytes}, modules=${chunk.moduleCount}, canvasModules=${chunk.canvasModuleCount}, imports=${chunk.imports.join(', ') || 'none'}`
    ),
    '',
  ]),
];

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, 'canvas-picking-experiment-latest.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);
fs.writeFileSync(
  path.join(outputDir, 'canvas-picking-experiment-latest.md'),
  `${lines.join('\n')}\n`,
  'utf8'
);
console.log(
  `[bundle-canvas-experiment] baseline gzip=${baseline.initial.gzipBytes}; ${results
    .map(item => `${item.name}=${item.initial.gzipBytes} (${item.delta.gzipBytes})`)
    .join(', ')}`
);
