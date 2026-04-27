export async function runCloudSyncInitialPulls(args: {
  pullMainOnce: (force: boolean) => Promise<void>;
  pullSketchOnce: (force: boolean) => Promise<void>;
  pullTabsGateOnce: (force: boolean) => Promise<void>;
  pullFloatingSketchSyncPinnedOnce: (force: boolean) => Promise<void>;
  shouldContinue?: () => boolean;
}): Promise<void> {
  const { pullMainOnce, pullSketchOnce, pullTabsGateOnce, pullFloatingSketchSyncPinnedOnce, shouldContinue } =
    args;

  const canContinue = (): boolean => (typeof shouldContinue === 'function' ? shouldContinue() : true);

  if (!canContinue()) return;

  await pullMainOnce(true);
  if (!canContinue()) return;
  await pullSketchOnce(true);
  if (!canContinue()) return;
  await pullTabsGateOnce(true);
  if (!canContinue()) return;
  await pullFloatingSketchSyncPinnedOnce(true);
}
