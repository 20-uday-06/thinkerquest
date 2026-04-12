import { syncEvents } from "@/lib/api";
import type { SyncEventItem } from "@/lib/types";

const QUEUE_KEY = "rural-assistant-offline-queue";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadQueue(): SyncEventItem[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SyncEventItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(events: SyncEventItem[]): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(events));
}

function compactQueue(events: SyncEventItem[]): SyncEventItem[] {
  if (events.length <= 1) {
    return events;
  }

  const nonProfileEvents = events.filter((event) => event.event_type !== "profile_update");
  const profileEvents = events
    .filter((event) => event.event_type === "profile_update")
    .sort((a, b) => new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime());

  const latestProfileEvent = profileEvents.length > 0 ? profileEvents[profileEvents.length - 1] : null;
  return latestProfileEvent ? [...nonProfileEvents, latestProfileEvent] : nonProfileEvents;
}

export function queueEvent(eventType: string, payload: Record<string, unknown>): void {
  if (!isBrowser()) {
    return;
  }

  const events = loadQueue();
  const newEvent: SyncEventItem = {
    client_event_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    event_type: eventType,
    payload,
    client_timestamp: new Date().toISOString(),
  };

  events.push(newEvent);
  saveQueue(compactQueue(events));
}

export async function flushQueue(): Promise<{
  sent: number;
  remaining: number;
  accepted: number;
  ignored: number;
}> {
  const events = compactQueue(loadQueue());
  if (events.length === 0) {
    return { sent: 0, remaining: 0, accepted: 0, ignored: 0 };
  }

  try {
    const result = await syncEvents(events);
    saveQueue([]);
    return {
      sent: events.length,
      remaining: 0,
      accepted: result.accepted,
      ignored: result.ignored,
    };
  } catch {
    saveQueue(events);
    return { sent: 0, remaining: events.length, accepted: 0, ignored: 0 };
  }
}
