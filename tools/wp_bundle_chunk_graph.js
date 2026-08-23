const DEFERRED_ENTRY_CHUNK_PATTERNS = [
  /(?:^|-)DeferredSidebarTabs(?:\.|-)/u,
  /(?:^|-)DesignTab\.view(?:\.|-)/u,
  /(?:^|-)InteriorTab\.view(?:\.|-)/u,
  /(?:^|-)SketchTab\.view(?:\.|-)/u,
  /(?:^|-)SettingsTab(?:\.|-)/u,
  /(?:^|-)OrderPdfInPlaceEditorOverlay(?:\.|-)/u,
  /(?:^|-)pdf(?:\.|-)/u,
];

function readBuildOutputs(buildResult) {
  const results = Array.isArray(buildResult) ? buildResult : [buildResult];
  return results.flatMap(result => (Array.isArray(result?.output) ? result.output : []));
}

function readChunkGraph(buildResult) {
  const chunks = readBuildOutputs(buildResult).filter(output => output?.type === 'chunk');
  const graph = new Map();
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
    if (chunk.isEntry) entries.push(fileName);
  }

  return { graph, entries };
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
  const { graph, entries } = readChunkGraph(buildResult);
  const staticCycles = findStaticCycles(graph);
  const staticClosure = collectStaticClosure(graph, entries);
  const eagerDeferredChunks = [...staticClosure]
    .filter(fileName => DEFERRED_ENTRY_CHUNK_PATTERNS.some(pattern => pattern.test(fileName)))
    .sort();

  return {
    chunkCount: graph.size,
    entries: entries.slice().sort(),
    staticCycles,
    staticClosure: [...staticClosure].sort(),
    eagerDeferredChunks,
  };
}

export function assertBundleChunkTopology(buildResult) {
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
  if (failures.length) {
    throw new Error(`[WP Bundle] Chunk topology contract failed:\n- ${failures.join('\n- ')}`);
  }
  return analysis;
}
