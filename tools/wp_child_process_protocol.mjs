import osConstants from 'node:os';
import { spawn } from 'node:child_process';

export const CHILD_TERMINATION_GRACE_MS = 2000;
const PROCESS_TREE_POLL_MS = 10;
const MANAGED_PROCESS_TREE = Symbol('wpManagedProcessTree');

export function spawnManagedChild(program, args, options = {}) {
  const treeMode = process.platform === 'win32' ? 'windows-tree' : 'posix-group';
  const child = spawn(program, args, {
    ...options,
    ...(treeMode === 'posix-group' ? { detached: true } : null),
  });
  Object.defineProperty(child, MANAGED_PROCESS_TREE, {
    configurable: false,
    enumerable: false,
    value: treeMode,
    writable: false,
  });
  return child;
}

export function signalToExitCode(signal) {
  if (!signal) return 1;
  const normalized = signal.startsWith('SIG') ? signal : `SIG${signal}`;
  const code = osConstants.constants.signals[normalized];
  return Number.isInteger(code) ? 128 + code : 1;
}

export function isChildRunning(child) {
  return !!child && child.exitCode === null && child.signalCode === null;
}

function isPosixProcessGroupRunning(child) {
  if (!Number.isInteger(child?.pid) || child.pid <= 0) return isChildRunning(child);
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    if (error?.code === 'EPERM') return true;
    return isChildRunning(child);
  }
}

export function isChildProcessTreeRunning(child) {
  if (child?.[MANAGED_PROCESS_TREE] === 'posix-group') return isPosixProcessGroupRunning(child);
  return isChildRunning(child);
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

function killChildDirectly(child, signal) {
  if (!isChildRunning(child)) return;
  try {
    child.kill(signal);
  } catch {}
}

function killWindowsProcessTree(child, signal) {
  return new Promise(resolve => {
    let settled = false;
    const finish = fallback => {
      if (settled) return;
      settled = true;
      if (fallback) killChildDirectly(child, signal);
      resolve();
    };
    try {
      const treeKill = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      treeKill.once('error', () => finish(true));
      treeKill.once('exit', code => finish(code !== 0));
    } catch {
      finish(true);
    }
  });
}

function signalManagedProcessTree(child, signal) {
  const treeMode = child?.[MANAGED_PROCESS_TREE];
  if (treeMode === 'windows-tree' && Number.isInteger(child?.pid) && child.pid > 0) {
    return killWindowsProcessTree(child, signal);
  }
  if (treeMode === 'posix-group' && Number.isInteger(child?.pid) && child.pid > 0) {
    try {
      process.kill(-child.pid, signal);
      return Promise.resolve();
    } catch (error) {
      if (error?.code !== 'ESRCH') killChildDirectly(child, signal);
      return Promise.resolve();
    }
  }
  killChildDirectly(child, signal);
  return Promise.resolve();
}

export function terminateChildWithEscalation(
  child,
  signal,
  {
    graceMs = CHILD_TERMINATION_GRACE_MS,
    onEscalate,
    isTreeRunning = isChildProcessTreeRunning,
    signalTree = signalManagedProcessTree,
  } = {}
) {
  if (!isTreeRunning(child)) return null;

  let escalationSignal = null;
  let deliveryPending = true;
  let settled = false;
  let resolveCompletion;
  const completion = new Promise(resolve => {
    resolveCompletion = resolve;
  });

  let graceTimer = null;
  let pollTimer = null;
  const cleanup = () => {
    if (graceTimer) clearTimeout(graceTimer);
    if (pollTimer) clearInterval(pollTimer);
    graceTimer = null;
    pollTimer = null;
  };
  const finish = cancelled => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveCompletion({
      requestedSignal: signal,
      escalationSignal,
      cancelled: cancelled === true,
    });
  };
  const finishWhenTreeStops = () => {
    if (!deliveryPending && !isTreeRunning(child)) finish(false);
  };
  const deliver = nextSignal => {
    deliveryPending = true;
    void Promise.resolve(signalTree(child, nextSignal)).finally(() => {
      deliveryPending = false;
      finishWhenTreeStops();
    });
  };

  deliver(signal);
  pollTimer = setInterval(finishWhenTreeStops, PROCESS_TREE_POLL_MS);
  graceTimer = setTimeout(() => {
    if (!isTreeRunning(child)) {
      finish(false);
      return;
    }
    escalationSignal = 'SIGKILL';
    onEscalate?.(escalationSignal);
    deliver(escalationSignal);
  }, graceMs);

  return {
    completion,
    cancel() {
      finish(true);
    },
  };
}
