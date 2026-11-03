import { spawnManagedChild, terminateChildWithEscalation } from './wp_child_process_protocol.mjs';

export async function waitForBrowserPerfServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(Math.max(1, Math.min(2000, deadline - Date.now()))),
      });
      await response.body?.cancel();
      if (response.ok) return true;
    } catch {
      // A server may still be starting; retry within the same bounded deadline.
    }
    const remaining = deadline - Date.now();
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, Math.min(400, remaining)));
  }
  return false;
}

export function startBrowserPerfServer(launch, { cwd, env = process.env } = {}) {
  return spawnManagedChild(launch.command, launch.args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: launch.shell,
    windowsHide: true,
  });
}

export async function stopBrowserPerfServer(server) {
  if (!server) return;
  const termination = terminateChildWithEscalation(server, 'SIGTERM');
  if (termination) await termination.completion;
}
