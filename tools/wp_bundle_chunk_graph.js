import zlib from 'node:zlib';

export const CLIENT_INITIAL_BUNDLE_BUDGET = Object.freeze({
  rawBytes: 4_550_000,
  gzipBytes: 1_100_000,
  chunkCount: 4,
  moduleCount: 2_085,
});

const DEFERRED_ENTRY_CHUNK_PATTERNS = [
  /(?:^|-)DeferredSidebarTabs(?:\.|-)/u,
  /(?:^|-)DesignTab\.view(?:\.|-)/u,
  /(?:^|-)InteriorTab\.view(?:\.|-)/u,
  /(?:^|-)SketchTab\.view(?:\.|-)/u,
  /(?:^|-)SettingsTab(?:\.|-)/u,
  /(?:^|-)OrderPdfInPlaceEditorOverlay(?:\.|-)/u,
  /(?:^|-)pdf(?:\.|-)/u,
];

const DEFERRED_INITIAL_MODULE_PATTERNS = [
  {
    label: 'Supabase remote-cloud vendor',
    test: /[\\/]node_modules[\\/](?:@supabase[\\/]|iceberg-js[\\/])/u,
  },
  {
    label: 'PDF vendor',
    test: /[\\/]node_modules[\\/](?:pdfjs-dist|pdf-lib|@pdf-lib|fontkit)[\\/]/u,
  },
];

function readBuildOutputs(buildResult) {
  const results = Array.isArray(buildResult) ? buildResult : [buildResult];
  return results.flatMap(result => (Array.isArray(result?.output) ? result.output : []));
}

function readChunkGraph(buildResult) {
  const chunks = readBuildOutputs(buildResult).filter(output => output?.type === 'chunk');
  const graph = new Map();
  const modulesByChunk = new Map();
  const chunksByFileName = new Map();
  const entries = [];

  for (const chunk of chunks) {
    const fileName = String(chunk.fileName || '').trim();
    if (!fileName) continue;
    graph.set(
      fileName,
      (Array.isArray(chunk.imports) ? chunk.imports : [])
        .map(value => String(value || '').trim())
        .filter(Boolean)
    );
    modulesByChunk.set(fileName, Object.keys(chunk.modules || {}));
    chunksByFileName.set(fileName, chunk);
    if (chunk.isEntry) entries.push(fileName);
  }

  return { graph, modulesByChunk, chunksByFileName, entries };
}

function findStaticCycles(graph) {
  const state = new Map();
  const stack = [];
  const cycles = [];
  const seen = new Set();

  function visit(fileName) {
    state.set(fileName, 1);
    stack.push(fileName);
    for (const dependency of graph.get(fileName) || []) {
      if (!graph.has(dependency)) continue;
      if (state.get(dependency) === 1) {
        const start = stack.lastIndexOf(dependency);
        const cycle = [...stack.slice(start), dependency];
        const key = [...new Set(cycle.slice(0, -1))].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
        continue;
      }
      if (!state.has(dependency)) visit(dependency);
    }
    stack.pop();
    state.set(fileName, 2);
  }

  for (const fileName of graph.keys()) {
    if (!state.has(fileName)) visit(fileName);
  }
  return cycles;
}

function collectStaticClosure(graph, entries) {
  const reachable = new Set();
  const pending = [...entries];
  while (pending.length) {
    const fileName = pending.pop();
    if (!fileName || reachable.has(fileName)) continue;
    reachable.add(fileName);
    for (const dependency of graph.get(fileName) || []) {
      if (graph.has(dependency)) pending.push(dependency);
    }
  }
  return reachable;
}

export function analyzeBundleChunkTopology(buildResult) {
  const { graph, modulesByChunk, chunksByFileName, entries } = readChunkGraph(buildResult);
  const staticCycles = findStaticCycles(graph);
  const staticClosure = collectStaticClosure(graph, entries);
  const eagerDeferredChunks = [...staticClosure]
    .filter(fileName => DEFERRED_ENTRY_CHUNK_PATTERNS.some(pattern => pattern.test(fileName)))
    .sort();
  const eagerDeferredModules = [...staticClosure]
    .flatMap(fileName =>
      (modulesByChunk.get(fileName) || []).flatMap(moduleId => {
        const rule = DEFERRED_INITIAL_MODULE_PATTERNS.find(candidate => candidate.test.test(moduleId));
        return rule ? [{ chunk: fileName, moduleId, label: rule.label }] : [];
      })
    )
    .sort((left, right) => left.moduleId.localeCompare(right.moduleId));
  const staticChunks = [...staticClosure].map(fileName => chunksByFileName.get(fileName)).filter(Boolean);
  const initial = {
    chunkCount: staticChunks.length,
    moduleCount: staticChunks.reduce((sum, chunk) => sum + Object.keys(chunk.modules || {}).length, 0),
    rawBytes: staticChunks.reduce((sum, chunk) => sum + Buffer.byteLength(String(chunk.code || '')), 0),
    gzipBytes: staticChunks.reduce(
      (sum, chunk) => sum + zlib.gzipSync(String(chunk.code || ''), { level: 9 }).length,
      0
    ),
  };

  return {
    chunkCount: graph.size,
    entries: entries.slice().sort(),
    staticCycles,
    staticClosure: [...staticClosure].sort(),
    eagerDeferredChunks,
    eagerDeferredModules,
    initial,
  };
}

export function assertBundleChunkTopology(buildResult, options = {}) {
  const analysis = analyzeBundleChunkTopology(buildResult);
  const failures = [];
  if (analysis.entries.length !== 1) {
    failures.push(`expected exactly one bundle entry, found ${analysis.entries.length}`);
  }
  for (const cycle of analysis.staticCycles) {
    failures.push(`static chunk cycle: ${cycle.join(' -> ')}`);
  }
  if (analysis.eagerDeferredChunks.length) {
    failures.push(`deferred chunks are statically reachable: ${analysis.eagerDeferredChunks.join(', ')}`);
  }
  if (analysis.eagerDeferredModules.length) {
    failures.push(
      `deferred modules are statically reachable: ${analysis.eagerDeferredModules
        .map(item => `${item.label} (${item.moduleId}) via ${item.chunk}`)
        .join(', ')}`
    );
  }
  const budget = options.initialBudget;
  if (budget && typeof budget === 'object') {
    for (const [metric, label] of [
      ['rawBytes', 'initial raw bytes'],
      ['gzipBytes', 'initial gzip bytes'],
      ['chunkCount', 'initial chunk count'],
      ['moduleCount', 'initial module count'],
    ]) {
      const maximum = Number(budget[metric]);
      const actual = Number(analysis.initial?.[metric]);
      if (Number.isFinite(maximum) && actual > maximum) {
        failures.push(`${label} exceeded budget: ${actual} > ${maximum}`);
      }
    }
  }
  if (failures.length) {
    throw new Error(`[WP Bundle] Chunk topology contract failed:\n- ${failures.join('\n- ')}`);
  }
  return analysis;
}
