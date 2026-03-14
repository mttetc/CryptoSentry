/* eslint-disable unicorn/prefer-event-target -- Server-only: EventEmitter supports setMaxListeners */
import { EventEmitter } from 'node:events';
import type { AlertStreamEvent } from '@/types/sse-events';

const ALERT_EVENT = 'alert';

class AlertEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  emit(payload: AlertStreamEvent): void {
    this.emitter.emit(ALERT_EVENT, payload);
  }

  on(listener: (payload: AlertStreamEvent) => void): void {
    this.emitter.on(ALERT_EVENT, listener);
  }

  off(listener: (payload: AlertStreamEvent) => void): void {
    this.emitter.off(ALERT_EVENT, listener);
  }
}

function createEventBus(): AlertEventBus {
  return new AlertEventBus();
}

// Use globalThis for HMR stability in dev
const globalKey = Symbol.for('cryptosentry.alertEventBus');
const globalRecord = globalThis as unknown as Record<symbol, AlertEventBus>;

export const alertEventBus: AlertEventBus = globalRecord[globalKey] ?? createEventBus();
globalRecord[globalKey] = alertEventBus;
