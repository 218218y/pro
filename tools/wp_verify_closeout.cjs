'use strict';

const {
  CLOSEOUT_LANES,
  REPORT_JSON_PATH,
  REPORT_MD_PATH,
  assertCompatibleCloseoutState,
  assertFinalSelectionEligible,
  createCloseoutContext,
  createCloseoutPayload,
  normalizeCliArgs,
  readStatePayload,
  resolveStateFile,
  runLane,
  selectLanes,
  writeFinalReports,
  writeStatePayload,
  mergeResults,
} = require('./wp_verify_closeout_support.cjs');

function laneCommandText(lane) {
  if (Array.isArray(lane.steps) && lane.steps.length > 0) return '(grouped direct steps)';
  return [lane.command, ...(lane.args || [])].join(' ');
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function baseMeta(options, stateFile) {
  return {
    profiles: options.profiles,
    categories: options.categories,
    laneIds: options.laneIds,
    skipLaneIds: options.skipLaneIds,
    resumeFrom: options.resumeFrom,
    logDir: options.logDir,
    stateFile: stateFile || null,
  };
}

function createPayload({ options, stateFile, previous, results, requestedLaneIds, context, extraMeta = {} }) {
  return createCloseoutPayload({
    runId: previous?.runId,
    workspace: process.cwd(),
    meta: {
      ...baseMeta(options, stateFile),
      previousGeneratedAt: previous?.generatedAt || null,
      ...extraMeta,
    },
    results,
    requestedLaneIds,
    context,
  });
}

function readCompatibleState(stateFile, context) {
  const payload = readStatePayload(stateFile);
  if (!payload) return null;
  return assertCompatibleCloseoutState(payload, { context });
}

function main() {
  const options = normalizeCliArgs(process.argv.slice(2));
  const stateFile = resolveStateFile(options);
  const context = createCloseoutContext();

  if (options.resetState) {
    const resetPayload = createCloseoutPayload({
      workspace: process.cwd(),
      meta: { reset: true, stateFile },
      results: [],
      requestedLaneIds: [],
      context,
    });
    writeStatePayload(stateFile, resetPayload, { context });
    console.log(`[closeout] reset state file ${stateFile}`);
    if (!options.shouldWriteFinal && !options.fromState && !options.appendState) return;
  }

  const selectedLanes = options.fromState ? [] : selectLanes(CLOSEOUT_LANES, options);
  const selectedLaneIds = selectedLanes.map(lane => lane.id);
  if (options.shouldWriteFinal && !options.fromState) {
    assertFinalSelectionEligible(selectedLaneIds);
  }
  let statePayload = options.appendState ? readCompatibleState(stateFile, context) : null;
  if (options.appendState && !statePayload) {
    statePayload = createPayload({
      options,
      stateFile,
      previous: null,
      results: [],
      requestedLaneIds: [],
      context,
      extraMeta: { initializedState: true },
    });
  }

  let results = [];
  if (!options.fromState) {
    for (const lane of selectedLanes) {
      console.log(`\n[closeout] running ${lane.id}: ${laneCommandText(lane)}`);
      const priorResults = mergeResults(statePayload?.results || [], results);
      const result = runLane(lane, { logDir: options.logDir, priorResults });
      results.push(result);
      console.log(
        `[closeout] ${lane.id} -> ${result.status} (exit=${result.exitCode}, duration=${result.durationMs}ms)`
      );

      if (statePayload) {
        const mergedResults = mergeResults(statePayload.results || [], [result]);
        const requestedLaneIds = unique([
          ...(statePayload.selection?.requestedLaneIds || []),
          ...selectedLaneIds,
        ]);
        statePayload = createPayload({
          options,
          stateFile,
          previous: statePayload,
          results: mergedResults,
          requestedLaneIds,
          context,
          extraMeta: {
            checkpointLaneId: lane.id,
            mergedResultCount: mergedResults.length,
          },
        });
        writeStatePayload(stateFile, statePayload, { context });
        console.log(`[closeout] checkpointed state file ${stateFile} after ${lane.id}`);
      }

      if (options.stopOnFail && (result.status === 'failed' || result.status === 'runner-blocked')) {
        console.log('[closeout] aborting after first failing or runner-blocked lane');
        break;
      }
    }
  }

  let payload;
  if (options.fromState) {
    const existing = readCompatibleState(stateFile, context);
    if (!existing) {
      throw new Error(`[closeout] cannot write from missing state file ${stateFile}`);
    }
    payload = createPayload({
      options,
      stateFile,
      previous: existing,
      results: existing.results || [],
      requestedLaneIds: existing.selection?.requestedLaneIds || [],
      context,
      extraMeta: { ...existing.meta, loadedFromState: true },
    });
  } else if (statePayload) {
    payload = statePayload;
  } else {
    payload = createPayload({
      options,
      stateFile: null,
      previous: null,
      results,
      requestedLaneIds: selectedLaneIds,
      context,
    });
  }

  if (options.shouldWriteFinal) {
    writeFinalReports(payload, { jsonPath: REPORT_JSON_PATH, mdPath: REPORT_MD_PATH }, { context });
    console.log(`[closeout] wrote ${REPORT_JSON_PATH} and ${REPORT_MD_PATH}`);
  }
  process.exitCode = ['passed', 'passed-with-environment-blockers'].includes(payload.finalStatus) ? 0 : 1;
}

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exitCode = 1;
}
