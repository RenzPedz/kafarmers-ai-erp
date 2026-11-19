export type TelemetryCategory =
  | 'page_view'
  | 'ai_inference'
  | 'ledger_crud'
  | 'database'
  | 'runtime_error';

export interface TelemetryEvent {
  id: string;
  event: string;
  category: TelemetryCategory;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const MAX_BUFFER_SIZE = 100;
const telemetryBuffer: TelemetryEvent[] = [];
const listeners: Set<(events: TelemetryEvent[]) => void> = new Set();

function notifyListeners(): void {
  const snapshot = [...telemetryBuffer];
  listeners.forEach((listener) => listener(snapshot));
}

export function trackEvent(
  event: string,
  category: TelemetryCategory,
  metadata?: Record<string, unknown>,
  durationMs?: number
): TelemetryEvent {
  const entry: TelemetryEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event,
    category,
    durationMs,
    metadata,
    timestamp: new Date().toISOString(),
  };

  telemetryBuffer.unshift(entry);
  if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryBuffer.pop();
  }

  const label = `[KaFarmers Monitor] [${category.toUpperCase()}] ${event}`;
  if (category === 'runtime_error') {
    console.error(label, { durationMs, ...metadata });
  } else {
    console.info(label, { durationMs, ...metadata });
  }

  notifyListeners();
  return entry;
}

export function initGlobalErrorMonitoring(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    trackEvent('uncaught_runtime_error', 'runtime_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackEvent('unhandled_promise_rejection', 'runtime_error', {
      reason:
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason),
    });
  });
}

export function getTelemetryEvents(): TelemetryEvent[] {
  return [...telemetryBuffer];
}

export function subscribeTelemetry(
  callback: (events: TelemetryEvent[]) => void
): () => void {
  listeners.add(callback);
  callback([...telemetryBuffer]);
  return () => {
    listeners.delete(callback);
  };
}
