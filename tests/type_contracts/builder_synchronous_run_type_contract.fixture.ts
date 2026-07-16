import { runCoalescedBuild } from '../../esm/native/builder/build_runner';

import type { SynchronousBuildRun } from '../../esm/native/builder/build_runner';
import type { BuildRunnerRuntimeContext } from '../../esm/native/builder/build_runner_runtime';

declare const context: BuildRunnerRuntimeContext;
declare const buildFn: (() => unknown) & { __buildRunning?: boolean };

function assertBuilderSynchronousRunTypeContract() {
  const synchronousRun: SynchronousBuildRun<number> = () => 1;
  runCoalescedBuild({ context, bwFn: buildFn, args: [], run: synchronousRun });

  // @ts-expect-error Builder execution callbacks cannot return Promise-like results.
  const asynchronousRun: SynchronousBuildRun<Promise<number>> = async () => 1;

  // @ts-expect-error The coalesced runner rejects async callbacks at the call boundary.
  runCoalescedBuild({ context, bwFn: buildFn, args: [], run: async () => 1 });

  void asynchronousRun;
}

void assertBuilderSynchronousRunTypeContract;
