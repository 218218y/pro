import osConstants from 'node:os';

export const CHILD_TERMINATION_GRACE_MS = 2000;

export function signalToExitCode(signal) {
  if (!signal) return 1;
  const normalized = signal.startsWith('SIG') ? signal : `SIG${signal}`;
  const code = osConstants.constants.signals[normalized];
  return Number.isInteger(code) ? 128 + code : 1;
}

export function isChildRunning(child) {
  return !!child && child.exitCode === null && child.signalCode === null;
}

export function resolveChildExitCode({ code, signal, requestedSignal }) {
  if (requestedSignal) return signalToExitCode(requestedSignal);
  if (signal) return signalToExitCode(signal);
  return code ?? 1;
}

export function terminateChildWithEscalation(
  child,
  signal,
  { graceMs = CHILD_TERMINATION_GRACE_MS, onEscalate } = {}
) {
  if (!isChildRunning(child)) return null;
  child.kill(signal);
  const timer = setTimeout(() => {
    if (!isChildRunning(child)) return;
    onEscalate?.('SIGKILL');
    child.kill('SIGKILL');
  }, graceMs);
  timer.unref?.();
  return timer;
}
