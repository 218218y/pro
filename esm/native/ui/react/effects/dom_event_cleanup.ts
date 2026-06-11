export type DomEventCleanupErrorHandler = (op: string, err: unknown) => void;

export type DomEventTargetLike = {
  addEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) => void;
};

export type InstallDomEventListenerArgs = {
  target: DomEventTargetLike | null | undefined;
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
  removeOptions?: boolean | EventListenerOptions;
  label: string;
  onError?: DomEventCleanupErrorHandler | null;
};

const noopCleanup = (): void => {};

function reportEventCleanupError(
  onError: DomEventCleanupErrorHandler | null | undefined,
  label: string,
  phase: 'add' | 'remove',
  err: unknown
): void {
  try {
    onError?.(`${label}:${phase}EventListener`, err);
  } catch {
    // Event cleanup must never throw during React effect teardown.
  }
}

export function installDomEventListener(args: InstallDomEventListenerArgs): () => void {
  const { target, type, listener, options, removeOptions, label, onError } = args;
  const add = target && typeof target.addEventListener === 'function' ? target.addEventListener : null;
  const remove =
    target && typeof target.removeEventListener === 'function' ? target.removeEventListener : null;
  if (!target || !add || !remove) return noopCleanup;

  try {
    add.call(target, type, listener, options);
  } catch (err) {
    reportEventCleanupError(onError, label, 'add', err);
    return noopCleanup;
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    try {
      remove.call(target, type, listener, removeOptions ?? options);
    } catch (err) {
      reportEventCleanupError(onError, label, 'remove', err);
    }
  };
}

export function composeDomEventCleanups(cleanups: ReadonlyArray<() => void>): () => void {
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (let i = cleanups.length - 1; i >= 0; i -= 1) {
      cleanups[i]?.();
    }
  };
}
