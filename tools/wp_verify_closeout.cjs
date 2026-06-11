'use strict';

const {
  CLOSEOUT_LANES,
  REPORT_JSON_PATH,
  REPORT_MD_PATH,
  normalizeCliArgs,
  readStatePayload,
  resolveStateFile,
  runLane,
  selectLanes,
  summarize,
  writeReports,
  writeStatePayload,
  mergeResults,
} = require('./wp_verify_closeout_support.cjs');

function laneCommandText(lane) {
  if (Array.isArray(lane.steps) && lane.steps.length > 0) return '(grouped direct steps)';
  return [lane.command, ...(lane.args || [])].join(' ');
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

function main() {
  const options = normalizeCliArgs(process.argv.slice(2));
  const stateFile = resolveStateFile(options);

  if (options.resetState) {
    writeStatePayload(stateFile, {
      generatedAt: new Date().toISOString(),
      workspace: process.cwd(),
      meta: { reset: true, stateFile },
      summary: summarize([]),
      results: [],
    });
    console.log(`[closeout] reset state file ${stateFile}`);
    if (!options.shouldWrite && !options.fromState && !options.appendState) return;
  }

  let results = [];
  let statePayload = options.appendState ? readStatePayload(stateFile) : null;
  if (!options.fromState) {
    const lanes = selectLanes(CLOSEOUT_LANES, options);
    for (const lane of lanes) {
      console.log(`\n[closeout] running ${lane.id}: ${laneCommandText(lane)}`);
      const priorResults = mergeResults((statePayload && statePayload.results) || [], results);
      const result = runLane(lane, { logDir: options.logDir, priorResults });
      results.push(result);
      console.log(
        `[closeout] ${lane.id} -> ${result.status} (exit=${result.exitCode}, duration=${result.durationMs}ms)`
      );
      if (statePayload) {
        const mergedResults = mergeResults(statePayload.results || [], [result]);
        statePayload = {
          generatedAt: new Date().toISOString(),
          workspace: process.cwd(),
          meta: {
            ...baseMeta(options, stateFile),
            previousGeneratedAt: statePayload.generatedAt || null,
            checkpointLaneId: lane.id,
            mergedResultCount: mergedResults.length,
          },
          summary: summarize(mergedResults),
          results: mergedResults,
        };
        writeStatePayload(stateFile, statePayload);
        console.log(`[closeout] checkpointed state file ${stateFile} after ${lane.id}`);
      }
      if (options.stopOnFail && (result.status === 'failed' || result.status === 'runner-blocked')) {
        console.log('[closeout] aborting after first failing or runner-blocked lane');
        break;
      }
    }
  }

  let payload = statePayload || {
    generatedAt: new Date().toISOString(),
    workspace: process.cwd(),
    meta: baseMeta(
      options,
      options.appendState || options.fromState || options.resetState ? stateFile : null
    ),
    summary: summarize(results),
    results,
  };

  if (options.fromState) {
    const existing = readStatePayload(stateFile);
    payload = {
      generatedAt: new Date().toISOString(),
      workspace: process.cwd(),
      meta: {
        ...existing.meta,
        ...baseMeta(options, stateFile),
        loadedFromState: true,
      },
      summary: summarize(existing.results || []),
      results: existing.results || [],
    };
  }

  if (options.shouldWrite) {
    writeReports(payload, { jsonPath: REPORT_JSON_PATH, mdPath: REPORT_MD_PATH });
    console.log(`[closeout] wrote ${REPORT_JSON_PATH} and ${REPORT_MD_PATH}`);
  }
  process.exitCode = payload.summary.failed === 0 && payload.summary.runnerBlocked === 0 ? 0 : 1;
}

main();
