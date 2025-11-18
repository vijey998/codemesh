import type { TraceEvent, TraceEventType } from "./TraceEvent";
import type { RoleName } from "../roles/Role";

type Listener = (events: TraceEvent[]) => void;

export class TraceRecorder {
  private events: TraceEvent[] = [];
  private listeners = new Set<Listener>();

  record(type: TraceEventType, summary: string, details: { role?: RoleName; tool?: string } = {}): TraceEvent {
    const event: TraceEvent = { id: `${Date.now()}-${this.events.length}`, timestamp: Date.now(), type, summary, ...details };
    this.events.push(event);
    this.emit();
    return event;
  }

  all(): TraceEvent[] { return [...this.events]; }
  clear(): void { this.events = []; this.emit(); }
  subscribe(listener: Listener): () => void { this.listeners.add(listener); listener(this.all()); return () => this.listeners.delete(listener); }
  private emit(): void { const snapshot = this.all(); this.listeners.forEach((listener) => listener(snapshot)); }
}
