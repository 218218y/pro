import type { RoomDesignServiceLike, UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

export type RoomDesignServiceState = RoomDesignServiceLike & UnknownRecord;

function asRoomDesignService(value: unknown): RoomDesignServiceState | null {
  return asRecord<RoomDesignServiceState>(value);
}

export function ensureRoomDesignService(App: unknown): RoomDesignServiceState {
  const service = ensureServiceSlot<RoomDesignServiceLike>(App, 'roomDesign');
  return asRoomDesignService(service) || service;
}

export function getRoomDesignServiceMaybe(App: unknown): RoomDesignServiceState | null {
  try {
    return asRoomDesignService(getServiceSlotMaybe<RoomDesignServiceLike>(App, 'roomDesign'));
  } catch {
    return null;
  }
}

export function requireRoomDesignService(
  App: unknown,
  label = 'runtime/room_design_access'
): RoomDesignServiceLike {
  const rd = getRoomDesignServiceMaybe(App);
  if (!rd)
    throw new Error(`[WardrobePro] RoomDesign service missing (${label}): expected App.services.roomDesign`);
  return rd;
}
