export type CloudSyncInitialPullYield = () => Promise<void> | void;

export async function runCloudSyncInitialPulls(args: {
  pullMainOnce: (force: boolean) => Promise<void>;
  pullSketchOnce: (force: boolean) => Promise<void>;
  pullTabsGateOnce: (force: boolean) => Promise<void>;
  pullFloatingSketchSyncPinnedOnce: (force: boolean) => Promise<void>;
  shouldContinue?: () => boolean;
  yieldBetweenPulls?: CloudSyncInitialPullYield;
}): Promise<void> {
  const {
    pullMainOnce,
    pullSketchOnce,
    pullTabsGateOnce,
    pullFloatingSketchSyncPinnedOnce,
    shouldContinue,
    yieldBetweenPulls,
  } = args;

  const canContinue = (): boolean => (typeof shouldContinue === 'function' ? shouldContinue() : true);
  const yieldBeforeNextPhase = async (): Promise<void> => {
    if (!canContinue() || typeof yieldBetweenPulls !== 'function') return;
    await yieldBetweenPulls();
  };

  if (!canContinue()) return;

  await pullMainOnce(true);
  await yieldBeforeNextPhase();
  if (!canContinue()) return;

  await pullSketchOnce(true);
  await yieldBeforeNextPhase();
  if (!canContinue()) return;

  await pullTabsGateOnce(true);
  await yieldBeforeNextPhase();
  if (!canContinue()) return;

  await pullFloatingSketchSyncPinnedOnce(true);
}
