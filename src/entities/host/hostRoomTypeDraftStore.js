import { storageAdapter } from '../../services/storage/storageAdapter.js'
import {
  buildInitialRoomLotPlan,
  normalizeRoomLots,
  roomLotTotalUnits,
} from './roomLotModel.js'

export const HOST_ROOM_TYPE_DRAFT_KEY = 'movera:host-room-type-drafts:v1'
export const HOST_ROOM_LOT_DRAFT_KEY = HOST_ROOM_TYPE_DRAFT_KEY

function readAllDrafts() {
  const value = storageAdapter.getJson(HOST_ROOM_TYPE_DRAFT_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizePlan(value, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {}
  const legacyLots = Array.isArray(source.roomLots)
    ? source.roomLots
    : Array.isArray(source.roomTypes)
      ? source.roomTypes
      : []

  if (!legacyLots.length) return buildInitialRoomLotPlan(fallback)

  const roomLots = normalizeRoomLots(legacyLots, fallback)
  const distributed = roomLotTotalUnits(roomLots)
  const requestedTotal = Math.round(Number(source.totalRooms))
  const totalRooms = Number.isFinite(requestedTotal) && requestedTotal > 0 ? requestedTotal : distributed

  return {
    totalRooms: Math.max(roomLots.length, totalRooms),
    roomLots,
  }
}

export function readHostRoomLotDraft(userId, fallback = {}) {
  if (!userId) return buildInitialRoomLotPlan(fallback)
  return normalizePlan(readAllDrafts()[userId], fallback)
}

export function writeHostRoomLotDraft(userId, plan, fallback = {}) {
  if (!userId) return buildInitialRoomLotPlan(fallback)
  const normalized = normalizePlan(plan, fallback)
  const drafts = readAllDrafts()
  drafts[userId] = {
    totalRooms: normalized.totalRooms,
    roomLots: normalized.roomLots,
    roomTypes: normalized.roomLots,
    updatedAt: new Date().toISOString(),
  }
  storageAdapter.setJson(HOST_ROOM_TYPE_DRAFT_KEY, drafts)
  return normalized
}

// Legacy compatibility while the rest of the prototype migrates from roomTypes to roomLots.
export function readHostRoomTypeDraft(userId, fallback = {}) {
  return readHostRoomLotDraft(userId, fallback).roomLots
}

export function writeHostRoomTypeDraft(userId, roomTypes, fallback = {}) {
  const roomLots = normalizeRoomLots(roomTypes, fallback)
  const plan = writeHostRoomLotDraft(userId, {
    totalRooms: roomLotTotalUnits(roomLots),
    roomLots,
  }, fallback)
  return plan.roomLots
}

export function clearHostRoomTypeDraft(userId) {
  if (!userId) return
  const drafts = readAllDrafts()
  delete drafts[userId]
  storageAdapter.setJson(HOST_ROOM_TYPE_DRAFT_KEY, drafts)
}

export const clearHostRoomLotDraft = clearHostRoomTypeDraft
