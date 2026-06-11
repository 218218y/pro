import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TOOLCHAIN_FAMILIES = [
  {
    name: 'build-dist',
    entry: 'tools/wp_build_dist.js',
    maxLines: 50,
    imports: ['./wp_build_dist_shared.js', './wp_build_dist_state.js', './wp_build_dist_flow.js'],
    forbiddenEntryNeedles: ['function copyDir(', 'function runTypescriptDistBuild('],
    modules: [
      {
        path: 'tools/wp_build_dist_shared.js',
        requiredNeedles: ['export function resolveProjectRoot(', 'export function copyDirContents('],
        forbiddenNeedles: ['export function parseBuildDistArgs('],
      },
      {
        path: 'tools/wp_build_dist_state.js',
        requiredNeedles: ['export function parseBuildDistArgs(', 'export function resolveBuildDistPaths('],
        forbiddenNeedles: ['export function runBuildDistFlow('],
      },
      {
        path: 'tools/wp_build_dist_assets.js',
        requiredNeedles: ['export function copyStaticDistAssets('],
        forbiddenNeedles: ['export function parseBuildDistArgs('],
      },
      {
        path: 'tools/wp_build_dist_flow.js',
        requiredNeedles: ['export function runBuildDistFlow(', 'export function runTypescriptDistBuild('],
        forbiddenNeedles: ['export function createBuildDistHelpText('],
      },
    ],
  },
  {
    name: 'bundle',
    entry: 'tools/wp_bundle.js',
    maxLines: 70,
    imports: ['./wp_bundle_shared.js', './wp_bundle_state.js', './wp_bundle_dist.js', './wp_bundle_emit.js'],
    forbiddenEntryNeedles: ['function shouldRebuildDistModules(', 'await viteBuild('],
    modules: [
      {
        path: 'tools/wp_bundle_shared.js',
        requiredNeedles: [
          'export const BUNDLE_CODE_SPLITTING_GROUPS = [',
          'export async function loadViteBuild(',
        ],
        forbiddenNeedles: ['export function parseBundleArgs('],
      },
      {
        path: 'tools/wp_bundle_state.js',
        requiredNeedles: ['export function parseBundleArgs(', 'export function resolveBundlePaths('],
        forbiddenNeedles: ['export function buildDistModules('],
      },
      {
        path: 'tools/wp_bundle_dist.js',
        requiredNeedles: ['export function shouldRebuildDistModules(', 'export function buildDistModules('],
        forbiddenNeedles: ['export function cleanOldBundleArtifacts('],
      },
      {
        path: 'tools/wp_bundle_emit.js',
        requiredNeedles: [
          'export function cleanOldBundleArtifacts(',
          'export async function buildBundleArtifacts(',
        ],
        forbiddenNeedles: ['export function shouldRebuildDistModules('],
      },
    ],
  },
  {
    name: 'check',
    entry: 'tools/wp_check.js',
    maxLines: 140,
    imports: ['./wp_check_shared.js', './wp_check_state.js', './wp_check_syntax.js', './wp_check_policy.js'],
    forbiddenEntryNeedles: ['function tsParseCheck(', 'function countOccurrences(', 'function assertGate('],
    modules: [
      {
        path: 'tools/wp_check_shared.js',
        requiredNeedles: ['export function walkSourceFiles(', 'export function writeBaseline('],
        forbiddenNeedles: ['export function parseCheckArgs('],
      },
      {
        path: 'tools/wp_check_state.js',
        requiredNeedles: [
          'export function parseCheckArgs(',
          'export function detectMode(',
          'export function resolvePolicyNeedles(',
        ],
        forbiddenNeedles: ['export function tsParseCheck('],
      },
      {
        path: 'tools/wp_check_syntax.js',
        requiredNeedles: ['export function tsParseCheck(', 'export function runSyntaxChecks('],
        forbiddenNeedles: ['export function assertStrict('],
      },
      {
        path: 'tools/wp_check_policy.js',
        requiredNeedles: [
          'export function collectPolicyStats(',
          'export function assertGate(',
          'export function assertStrict(',
        ],
        forbiddenNeedles: ['export function walkSourceFiles('],
      },
    ],
  },
  {
    name: 'release',
    entry: 'tools/wp_release.js',
    maxLines: 260,
    imports: [
      './wp_release_shared.js',
      './wp_release_state.js',
      './wp_release_finalize.js',
      './wp_release_hashing.js',
      './wp_release_build.js',
    ],
    forbiddenEntryNeedles: [
      'function buildNoCacheUpdateScript(',
      'const metaNoCache = [',
      'Bundle is stale vs sources/dist modules',
    ],
    modules: [
      {
        path: 'tools/wp_release_state.js',
        requiredNeedles: ['export function parseReleaseArgs(', 'export function resolveReleasePaths('],
        forbiddenNeedles: ['function maybeMinifyHtml('],
      },
      {
        path: 'tools/wp_release_finalize.js',
        requiredNeedles: [
          'export function resolveFinalReleaseAssets(',
          'export function rewriteReleaseHtml(',
          'export function writeReleaseMetadata(',
        ],
        forbiddenNeedles: ['export function maybeObfuscateReleaseJs('],
      },
      {
        path: 'tools/wp_release_hashing.js',
        requiredNeedles: ['export function applyContentHashingToRelease('],
        forbiddenNeedles: ['export function writeReleaseMetadata('],
      },
      {
        path: 'tools/wp_release_build.js',
        requiredNeedles: [
          'export function ensureDistBundleCurrent(',
          'export async function maybeMinifyBundle(',
        ],
        forbiddenNeedles: ['export function writeReleaseMetadata('],
      },
      {
        path: 'tools/wp_release_shared.js',
        requiredNeedles: ['export function newestMtimeUnder(', 'export function shortHashOfFile('],
        forbiddenNeedles: ['export function parseReleaseArgs('],
      },
    ],
  },
  {
    name: 'release-parity',
    entry: 'tools/wp_release_parity.js',
    maxLines: 40,
    imports: [
      './wp_release_parity_shared.js',
      './wp_release_parity_checks.js',
      './wp_release_parity_console.js',
    ],
    forbiddenEntryNeedles: ['function collectJsLocalRefs(', 'function checkBuildSiteArtifacts('],
    modules: [
      {
        path: 'tools/wp_release_parity_shared.js',
        requiredNeedles: [
          'export function parseArgs(',
          'export function resolveRefFile(',
          'export function formatRefForConsole(',
        ],
        forbiddenNeedles: ['export function collectJsLocalRefs('],
      },
      {
        path: 'tools/wp_release_parity_refs.js',
        requiredNeedles: [
          'export function collectHtmlLocalRefs(',
          'export function collectJsLocalRefs(',
          'export function listFilesRecursive(',
        ],
        forbiddenNeedles: ['export function checkBuildSiteArtifacts('],
      },
      {
        path: 'tools/wp_release_parity_artifacts.js',
        requiredNeedles: [
          'export function checkBuildSiteArtifacts(',
          'collectHtmlLocalRefs',
          'collectJsLocalRefs',
        ],
        forbiddenNeedles: ['runThreeVendorContractCheck'],
      },
      {
        path: 'tools/wp_release_parity_checks.js',
        requiredNeedles: [
          'export async function runReleaseParityChecks(',
          'runThreeVendorContractCheck',
          'checkBuildSiteArtifacts',
        ],
        forbiddenNeedles: ['function maskJsComments('],
      },
      {
        path: 'tools/wp_release_parity_console.js',
        requiredNeedles: ['export function printReleaseParityReport(', 'formatRefForConsole'],
        forbiddenNeedles: ['runThreeVendorContractCheck'],
      },
    ],
  },
  {
    name: 'test',
    entry: 'tools/wp_test.js',
    maxLines: 50,
    imports: ['./wp_test_shared.js', './wp_test_state.js', './wp_test_flow.js'],
    forbiddenEntryNeedles: ['function ensureDistBuilt(', 'function listTestFiles(', 'spawnSync('],
    modules: [
      {
        path: 'tools/wp_test_shared.js',
        requiredNeedles: ['export function listTestFiles(', 'export function getNodeArgs('],
        forbiddenNeedles: ['export function parseTestArgs('],
      },
      {
        path: 'tools/wp_test_state.js',
        requiredNeedles: ['export function parseTestArgs(', 'export function selectRunnableTests('],
        forbiddenNeedles: ['export function ensureDistBuilt('],
      },
      {
        path: 'tools/wp_test_flow.js',
        requiredNeedles: ['export function ensureDistBuilt(', 'export function runTestFlow('],
        forbiddenNeedles: ['export function parseTestArgs('],
      },
    ],
  },
  {
    name: 'typecheck',
    entry: 'tools/wp_typecheck.js',
    maxLines: 45,
    imports: ['./wp_typecheck_shared.js', './wp_typecheck_state.js', './wp_typecheck_flow.js'],
    forbiddenEntryNeedles: ['function resolveTsc(', 'function run('],
    modules: [
      {
        path: 'tools/wp_typecheck_shared.js',
        requiredNeedles: ['export function resolveTsc(', 'export function runTypecheckCommand('],
        forbiddenNeedles: ['export function parseTypecheckArgs('],
      },
      {
        path: 'tools/wp_typecheck_state.js',
        requiredNeedles: [
          'export function parseTypecheckArgs(',
          'export function resolveTypecheckModes(',
          'export const MODE_TO_CONFIG',
        ],
        forbiddenNeedles: ['export function resolveTsc('],
      },
      {
        path: 'tools/wp_typecheck_flow.js',
        requiredNeedles: ['export function runTypecheckFlow('],
        forbiddenNeedles: ['export function parseTypecheckArgs('],
      },
    ],
  },
  {
    name: 'verify-lane',
    entry: 'tools/wp_verify_lane.js',
    maxLines: 70,
    imports: ['./wp_verify_shared.js', './wp_verify_lane_state.js', './wp_verify_lane_flow.js'],
    forbiddenEntryNeedles: ['function runVerifyLane(', 'const VERIFY_LANE_CATALOG ='],
    modules: [
      {
        path: 'tools/wp_verify_lane_catalog.js',
        requiredNeedles: [
          'export const VERIFY_LANE_CATALOG = Object.freeze({',
          'export function flattenVerifyLaneScripts(',
          'export function flattenVerifyLanePlan(',
        ],
        forbiddenNeedles: ['export function parseVerifyLaneArgs('],
      },
      {
        path: 'tools/wp_verify_lane_state.js',
        requiredNeedles: [
          'export function parseVerifyLaneArgs(',
          'export function createVerifyLaneHelpText(',
        ],
        forbiddenNeedles: ['export function runVerifyLane('],
      },
      {
        path: 'tools/wp_verify_lane_flow.js',
        requiredNeedles: [
          'export function planVerifyLaneRun(',
          'export function runVerifyLanePlan(',
          'export function runVerifyLane(',
          'flattenVerifyLanePlan',
        ],
        forbiddenNeedles: ['export function parseVerifyLaneArgs('],
      },
    ],
  },

  {
    name: 'perf-smoke',
    entry: 'tools/wp_perf_smoke.mjs',
    maxLines: 90,
    imports: ['./wp_perf_smoke_state.js', './wp_perf_smoke_shared.js', './wp_perf_smoke_flow.js'],
    forbiddenEntryNeedles: ['function createPerfSmokeBaseline(', 'function runPerfSmokeScript('],
    modules: [
      {
        path: 'tools/wp_perf_smoke_state.js',
        requiredNeedles: ['export function parsePerfSmokeArgs(', 'export function createPerfSmokeHelpText('],
        forbiddenNeedles: ['export function runPerfSmokeFlow('],
      },
      {
        path: 'tools/wp_perf_smoke_shared.js',
        requiredNeedles: [
          'export const DEFAULT_PERF_SMOKE_LANES = Object.freeze([',
          'export function resolvePerfSmokePlan(',
          'export function createPerfSmokeBaseline(',
          'export function evaluatePerfSmokeBaseline(',
        ],
        forbiddenNeedles: ['export function parsePerfSmokeArgs('],
      },
      {
        path: 'tools/wp_perf_smoke_flow.js',
        requiredNeedles: [
          'export function runPerfSmokeFlow(',
          'createPerfSmokeBaseline',
          'runPerfSmokeScript',
        ],
        forbiddenNeedles: ['export function createPerfSmokeHelpText('],
      },
    ],
  },
  {
    name: 'verify',
    entry: 'tools/wp_verify.js',
    maxLines: 90,
    imports: ['./wp_verify_shared.js', './wp_verify_state.js', './wp_verify_flow.js'],
    forbiddenEntryNeedles: ['function runCmd(', 'function ensureDistBuilt('],
    modules: [
      {
        path: 'tools/wp_verify_shared.js',
        requiredNeedles: ['export function runCmd(', 'export function npmRunCapture('],
        forbiddenNeedles: ['export function parseVerifyArgs('],
      },
      {
        path: 'tools/wp_verify_state.js',
        requiredNeedles: [
          'export function parseVerifyArgs(',
          'export function classifyFormatCheckResult(',
          'export function createVerifySuccessMessage(',
        ],
        forbiddenNeedles: ['export function runVerifyFlow('],
      },
      {
        path: 'tools/wp_verify_flow.js',
        requiredNeedles: ['export function ensureDistBuilt(', 'export function runVerifyFlow('],
        forbiddenNeedles: ['export function parseVerifyArgs('],
      },
    ],
  },
];

for (const family of TOOLCHAIN_FAMILIES) {
  test(`[toolchain] ${family.name} keeps one thin entrypoint plus canonical owner modules`, () => {
    const entry = read(family.entry);
    for (const specifier of family.imports) {
      assert.match(entry, new RegExp(`from '${escapeRegex(specifier)}';`));
    }
    assert.ok(entry.split('\n').length < family.maxLines, `${family.name} entrypoint should stay thin`);
    for (const needle of family.forbiddenEntryNeedles) {
      assert.doesNotMatch(entry, new RegExp(escapeRegex(needle)));
    }

    for (const mod of family.modules) {
      const source = read(mod.path);
      for (const needle of mod.requiredNeedles) {
        assert.match(source, new RegExp(escapeRegex(needle)));
      }
      for (const needle of mod.forbiddenNeedles) {
        assert.doesNotMatch(source, new RegExp(escapeRegex(needle)));
      }
    }
  });
}
