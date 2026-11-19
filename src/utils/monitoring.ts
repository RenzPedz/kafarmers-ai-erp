export type TelemetryCategory =
  | 'ai_inference'
  | 'runtime_error'
  | 'ledger_crud';

export interface TelemetryEvent {
  id: number;
  name: string;
  category: TelemetryCategory;
  /** Arbitrary event attributes, e.g. { category, durationMs } */
  props?: Record<string, unknown>;
  timestamp: number;
}

type Listener = (events: TelemetryEvent[]) => void;

let nextId = 1;
const MAX_EVENTS = 100;
let log: TelemetryEvent[] = [];
const listeners = new Set<Listener>();

/**
 * Records a telemetry event and notifies subscribers.
 * Never throws — telemetry must not break app flows.
 */
export function trackEvent(
  name: string,
  category: TelemetryCategory,
  props?: Record<string, unknown>,
  durationMs?: number,
): void {
  try {
    const event: TelemetryEvent = {
      id: nextId++,
      name,
      category,
      props: durationMs !== undefined ? { ...props, durationMs } : props,
      timestamp: Date.now(),
    };
    log = [event, ...log].slice(0, MAX_EVENTS);
    listeners.forEach((l) => l(log));
  } catch {
    // Telemetry must never break app flows.
  }
}

/** Subscribes to the telemetry log; returns an unsubscribe function. */
export function subscribeTelemetry(listener: Listener): () => void {
  listeners.add(listener);
  listener(log);
  return () => {
    listeners.delete(listener);
  };
}

export function getTelemetryLog(): TelemetryEvent[] {
  return log;
}
