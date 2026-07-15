type ProjectLoadCoordinatorLeaseState = 'preparing' | 'critical' | 'committed' | 'finished';

export type ProjectLoadCoordinatorGenerationPort = {
  nextRestoreGeneration: () => number;
  isRestoreGenerationCurrent: (restoreGen: number) => boolean;
};

export type ProjectLoadCoordinatorLease = {
  readonly requestId: number;
  readonly state: ProjectLoadCoordinatorLeaseState;
  readonly restoreGen: number;
};

type MutableProjectLoadCoordinatorLease = {
  requestId: number;
  state: ProjectLoadCoordinatorLeaseState;
  restoreGen: number;
  superseded: boolean;
  blockedBy: MutableProjectLoadCoordinatorLease | null;
};

export class ProjectLoadSupersededError extends Error {
  readonly restoreGen: number;

  constructor(restoreGen: number, stage: string) {
    super(`[WardrobePro] project load was superseded during ${stage}.`);
    this.name = 'ProjectLoadSupersededError';
    this.restoreGen = restoreGen;
  }
}

export function isProjectLoadSupersededError(error: unknown): error is ProjectLoadSupersededError {
  return error instanceof ProjectLoadSupersededError;
}

export class ProjectLoadQueuedError extends Error {
  readonly requestId: number;

  constructor(requestId: number) {
    super(`[WardrobePro] project load ${requestId} is queued behind an active transaction.`);
    this.name = 'ProjectLoadQueuedError';
    this.requestId = requestId;
  }
}

export function isProjectLoadQueuedError(error: unknown): error is ProjectLoadQueuedError {
  return error instanceof ProjectLoadQueuedError;
}

export type ProjectLoadCoordinator = {
  begin: () => ProjectLoadCoordinatorLease;
  enterCritical: (lease: ProjectLoadCoordinatorLease, supersedeActive?: boolean) => number;
  assertCurrent: (lease: ProjectLoadCoordinatorLease, stage: string) => void;
  isCurrent: (lease: ProjectLoadCoordinatorLease) => boolean;
  markCommitted: (lease: ProjectLoadCoordinatorLease) => void;
  enqueueRetry: (
    lease: ProjectLoadCoordinatorLease,
    retry: () => void,
    onFailure: (error: unknown) => void
  ) => void;
  finish: (lease: ProjectLoadCoordinatorLease) => void;
};

type QueuedProjectLoadRetry = {
  requestId: number;
  run: () => void;
  onFailure: (error: unknown) => void;
};

const coordinators = new WeakMap<object, ProjectLoadCoordinator>();

function createProjectLoadCoordinator(
  generation: ProjectLoadCoordinatorGenerationPort
): ProjectLoadCoordinator {
  let nextRequestId = 0;
  let active: MutableProjectLoadCoordinatorLease | null = null;
  let drainingRetries = false;
  const queuedRetries: QueuedProjectLoadRetry[] = [];
  const owned = new WeakSet<object>();

  const readOwnedLease = (lease: ProjectLoadCoordinatorLease): MutableProjectLoadCoordinatorLease => {
    if (!lease || typeof lease !== 'object' || !owned.has(lease)) {
      throw new Error('[WardrobePro] project load coordinator rejected a foreign transaction lease.');
    }
    return lease as MutableProjectLoadCoordinatorLease;
  };

  const throwSuperseded = (lease: MutableProjectLoadCoordinatorLease, stage: string): never => {
    throw new ProjectLoadSupersededError(lease.restoreGen, stage);
  };

  const assertCurrent = (lease: MutableProjectLoadCoordinatorLease, stage: string): void => {
    if (
      lease.state !== 'critical' ||
      active !== lease ||
      lease.superseded ||
      !generation.isRestoreGenerationCurrent(lease.restoreGen)
    ) {
      throwSuperseded(lease, stage);
    }
  };

  const drainRetries = (): void => {
    if (drainingRetries || active) return;
    drainingRetries = true;
    try {
      while (!active && queuedRetries.length) {
        queuedRetries.sort((left, right) => left.requestId - right.requestId);
        const retry = queuedRetries.shift();
        if (!retry) continue;
        try {
          retry.run();
        } catch (error) {
          try {
            retry.onFailure(error);
          } catch {
            // A diagnostic failure cannot corrupt an already compensated transaction chain.
          }
        }
      }
    } finally {
      drainingRetries = false;
    }
  };

  return {
    begin(): ProjectLoadCoordinatorLease {
      // A successor may complete pure validation while another request owns admission.
      // Superseding is delayed until enterCritical so invalid input cannot cancel valid work.
      const predecessor =
        active && (active.state === 'preparing' || active.state === 'critical') ? active : null;

      const lease: MutableProjectLoadCoordinatorLease = {
        requestId: (nextRequestId += 1),
        state: 'preparing',
        restoreGen: 0,
        superseded: false,
        blockedBy: predecessor,
      };
      owned.add(lease);
      if (!predecessor) active = lease;
      return lease;
    },

    enterCritical(value: ProjectLoadCoordinatorLease, supersedeActive = true): number {
      const lease = readOwnedLease(value);
      if (lease.state !== 'preparing') {
        throw new Error(
          `[WardrobePro] project load transaction ${lease.requestId} cannot enter critical state from ${lease.state}.`
        );
      }
      if (
        lease.blockedBy &&
        (lease.blockedBy.state === 'preparing' || lease.blockedBy.state === 'critical')
      ) {
        if (supersedeActive) lease.blockedBy.superseded = true;
        throw new ProjectLoadQueuedError(lease.requestId);
      }
      if (lease.superseded) throwSuperseded(lease, 'critical admission');
      if (active && active !== lease) throwSuperseded(lease, 'critical admission');

      active = lease;
      const restoreGen = generation.nextRestoreGeneration();
      if (restoreGen <= 0) {
        throw new Error('[WardrobePro] project load coordinator could not allocate a restore generation.');
      }
      lease.restoreGen = restoreGen;
      lease.state = 'critical';
      return restoreGen;
    },

    assertCurrent(value: ProjectLoadCoordinatorLease, stage: string): void {
      assertCurrent(readOwnedLease(value), stage);
    },

    isCurrent(value: ProjectLoadCoordinatorLease): boolean {
      const lease = readOwnedLease(value);
      if (lease.state !== 'critical' && lease.state !== 'committed') return false;
      return !lease.superseded && generation.isRestoreGenerationCurrent(lease.restoreGen);
    },

    markCommitted(value: ProjectLoadCoordinatorLease): void {
      const lease = readOwnedLease(value);
      assertCurrent(lease, 'business commit');
      lease.state = 'committed';
      if (active === lease) active = null;
    },

    enqueueRetry(
      value: ProjectLoadCoordinatorLease,
      retry: () => void,
      onFailure: (error: unknown) => void
    ): void {
      const lease = readOwnedLease(value);
      if (
        lease.state !== 'preparing' ||
        !lease.blockedBy ||
        (lease.blockedBy.state !== 'preparing' && lease.blockedBy.state !== 'critical')
      ) {
        throw new Error(
          `[WardrobePro] project load transaction ${lease.requestId} cannot queue from ${lease.state}.`
        );
      }
      if (typeof retry !== 'function' || typeof onFailure !== 'function') {
        throw new Error('[WardrobePro] project load retry requires run and failure callbacks.');
      }
      queuedRetries.push({ requestId: lease.requestId, run: retry, onFailure });
    },

    finish(value: ProjectLoadCoordinatorLease): void {
      const lease = readOwnedLease(value);
      if (lease.state === 'finished') {
        throw new Error(
          `[WardrobePro] project load transaction ${lease.requestId} was finished more than once.`
        );
      }
      const releasedOwner = active === lease;
      lease.state = 'finished';
      if (releasedOwner) active = null;
      if (releasedOwner) drainRetries();
    },
  };
}

export function getProjectLoadCoordinator(
  App: object,
  generation: ProjectLoadCoordinatorGenerationPort
): ProjectLoadCoordinator {
  if (!App || typeof App !== 'object') {
    throw new Error('[WardrobePro] project load coordinator requires an App owner.');
  }
  if (
    !generation ||
    typeof generation.nextRestoreGeneration !== 'function' ||
    typeof generation.isRestoreGenerationCurrent !== 'function'
  ) {
    throw new Error('[WardrobePro] project load coordinator requires a restore-generation port.');
  }
  const existing = coordinators.get(App);
  if (existing) return existing;
  const coordinator = createProjectLoadCoordinator(generation);
  coordinators.set(App, coordinator);
  return coordinator;
}
