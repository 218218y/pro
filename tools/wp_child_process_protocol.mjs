import osConstants from 'node:os';
import { spawn } from 'node:child_process';

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

export function resolveChildTermination({ code, signal, requestedSignal }) {
  const normalizedRequestedSignal = requestedSignal ?? null;
  const childExitSignal = signal ?? null;
  return {
    requestedSignal: normalizedRequestedSignal,
    childExitSignal,
    exitCode: resolveChildExitCode({
      code,
      signal: childExitSignal,
      requestedSignal: normalizedRequestedSignal,
    }),
  };
}

export function terminateChildWithEscalation(
  child,
  signal,
  { graceMs = CHILD_TERMINATION_GRACE_MS, onEscalate } = {}
) {
  if (!isChildRunning(child)) return null;
  if (process.platform === 'win32' && Number.isInteger(child.pid) && child.pid > 0) {
    let treeKill = null;
    const fallbackToDirectSignal = () => {
      if (isChildRunning(child)) child.kill(signal);
    };
    try {
      treeKill = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      treeKill.once('error', fallbackToDirectSignal);
      treeKill.once('exit', code => {
        if (code !== 0) fallbackToDirectSignal();
      });
    } catch {
      fallbackToDirectSignal();
    }
  } else {
    child.kill(signal);
  }
  const timer = setTimeout(() => {
    if (!isChildRunning(child)) return;
    onEscalate?.('SIGKILL');
    child.kill('SIGKILL');
  }, graceMs);
  timer.unref?.();
  return timer;
}
