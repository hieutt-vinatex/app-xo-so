/** A controllable EventSource mock for tests. */

type Listener = (ev: MessageEvent) => void;

export class MockEventSource {
  static instances: MockEventSource[] = [];
  static last(): MockEventSource {
    const inst = MockEventSource.instances[MockEventSource.instances.length - 1];
    if (!inst) throw new Error("No MockEventSource instance created");
    return inst;
  }
  static reset(): void {
    MockEventSource.instances = [];
  }

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  readonly url: string;
  private listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }

  removeEventListener(type: string, cb: Listener): void {
    this.listeners.get(type)?.delete(cb);
  }

  close(): void {
    this.closed = true;
  }

  // --- test helpers ---
  emitOpen(): void {
    this.onopen?.();
  }

  emit(type: string, data: unknown): void {
    const ev = { data: JSON.stringify(data) } as MessageEvent;
    this.listeners.get(type)?.forEach((cb) => cb(ev));
  }

  emitRaw(type: string, raw: string): void {
    const ev = { data: raw } as MessageEvent;
    this.listeners.get(type)?.forEach((cb) => cb(ev));
  }

  emitError(): void {
    this.onerror?.();
  }
}

export function installMockEventSource(): void {
  MockEventSource.reset();
  (globalThis as unknown as { EventSource: unknown }).EventSource =
    MockEventSource as unknown as typeof EventSource;
}
