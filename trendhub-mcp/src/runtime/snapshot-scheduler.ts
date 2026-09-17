import { takeSnapshots } from "../store/snapshot.js";

export interface SnapshotSchedulerState {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastOk: number | null;
  lastTotal: number | null;
  lastError: string | null;
  skippedBecauseRunning: number;
}

type SnapshotRunner = () => Promise<
  { platform: string; ok: boolean; items: number }[]
>;

interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createSnapshotScheduler(options: {
  enabled: boolean;
  intervalMs: number;
  initialDelayMs?: number;
  runner?: SnapshotRunner;
  logger?: Logger;
}) {
  const enabled = options.enabled;
  const intervalMs = Math.max(1_000, options.intervalMs);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 30_000);
  const runner = options.runner ?? (() => takeSnapshots());
  const logger = options.logger ?? console;

  let running = false;
  let intervalTimer: NodeJS.Timeout | null = null;
  let initialTimer: NodeJS.Timeout | null = null;

  const state: SnapshotSchedulerState = {
    enabled,
    running: false,
    intervalMs,
    lastRunAt: null,
    lastSuccessAt: null,
    lastOk: null,
    lastTotal: null,
    lastError: null,
    skippedBecauseRunning: 0,
  };

  async function run(reason = "scheduled"): Promise<SnapshotSchedulerState> {
    if (!enabled) return { ...state };

    if (running) {
      state.skippedBecauseRunning += 1;
      logger.warn(`[trendhub-snapshot] skip reason=${reason}: previous run active`);
      return { ...state };
    }

    running = true;
    state.running = true;
    state.lastRunAt = new Date().toISOString();
    state.lastError = null;

    try {
      const report = await runner();
      const ok = report.filter((x) => x.ok).length;

      state.lastOk = ok;
      state.lastTotal = report.length;
      state.lastSuccessAt = new Date().toISOString();

      logger.log(
        `[trendhub-snapshot] complete reason=${reason} ok=${ok}/${report.length}`,
      );
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
      logger.error(`[trendhub-snapshot] failed reason=${reason}: ${state.lastError}`);
    } finally {
      running = false;
      state.running = false;
    }

    return { ...state };
  }

  function start(): void {
    if (!enabled || intervalTimer || initialTimer) return;

    initialTimer = setTimeout(() => {
      initialTimer = null;
      void run("initial");
    }, initialDelayMs);
    initialTimer.unref?.();

    intervalTimer = setInterval(() => {
      void run("scheduled");
    }, intervalMs);
    intervalTimer.unref?.();
  }

  function stop(): void {
    if (initialTimer) clearTimeout(initialTimer);
    if (intervalTimer) clearInterval(intervalTimer);
    initialTimer = null;
    intervalTimer = null;
  }

  return {
    start,
    stop,
    runNow: () => run("manual"),
    getState: (): SnapshotSchedulerState => ({ ...state }),
  };
}
