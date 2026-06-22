import { create } from 'zustand'
import { matchContextRule } from '../context/matchRule'
import { isStrictRuleDeleteLocked } from '../context/ruleDeleteLock'
import {
  CONTEXT_RULES_STORAGE_KEY,
  MANUAL_MODE_STORAGE_KEY,
  SYNC_PUSH_DEBOUNCE_MS
} from '../constants/thresholds'
import {
  bumpLocalUpdatedAt,
  clearSyncToken,
  createSyncGroup,
  getSyncToken,
  isSupabaseConfigured,
  joinSyncGroup,
  pullRules,
  pushRules,
  syncRules,
  type SyncApplyResult
} from '../services/contextSync'
import type {
  ContextRule,
  ContextSource,
  GeoPoint,
  StudyMode
} from '../types/context'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'conflict' | 'unconfigured'

interface ContextState {
  activeMode: StudyMode
  contextSource: ContextSource
  matchedRuleId: string | null
  currentWifi: string | null
  currentLocation: GeoPoint | null
  locationError: string | null
  manualMode: StudyMode | null
  rules: ContextRule[]
  syncToken: string | null
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncedAt: number | null
  addWifiRule: (ssid: string, mode: StudyMode, label?: string) => void
  addLocationRule: (
    lat: number,
    lng: number,
    radiusM: number,
    mode: StudyMode,
    label?: string
  ) => void
  removeRule: (id: string) => void
  setManualMode: (mode: StudyMode | null) => void
  setCurrentWifi: (ssid: string | null) => void
  setCurrentLocation: (location: GeoPoint | null, error?: string | null) => void
  applyContextMatch: () => void
  loadPersisted: () => void
  initSync: () => Promise<void>
  createSync: () => Promise<string | null>
  joinSync: (token: string) => Promise<boolean>
  disconnectSync: () => void
  syncNow: () => Promise<void>
}

let pushDebounceTimer: number | null = null

function normalizeStudyMode(value: string): StudyMode {
  if (value === 'strict' || value === 'study' || value === 'relax') return value
  if (value === 'focus') return 'study'
  if (value === 'library') return 'strict'
  if (value === 'home' || value === 'cafe') return 'relax'
  return 'relax'
}

function normalizeRules(rules: ContextRule[]): ContextRule[] {
  return rules.map((rule) => ({ ...rule, mode: normalizeStudyMode(rule.mode) }))
}

function loadRules(): ContextRule[] {
  try {
    const raw = localStorage.getItem(CONTEXT_RULES_STORAGE_KEY)
    if (!raw) return []
    return normalizeRules(JSON.parse(raw) as ContextRule[])
  } catch {
    return []
  }
}

function saveRules(rules: ContextRule[]): void {
  localStorage.setItem(CONTEXT_RULES_STORAGE_KEY, JSON.stringify(rules))
}

function loadManualMode(): StudyMode | null {
  const raw = localStorage.getItem(MANUAL_MODE_STORAGE_KEY)
  if (!raw || raw === 'null') return null
  return normalizeStudyMode(raw)
}

function saveManualMode(mode: StudyMode | null): void {
  if (mode) {
    localStorage.setItem(MANUAL_MODE_STORAGE_KEY, mode)
  } else {
    localStorage.removeItem(MANUAL_MODE_STORAGE_KEY)
  }
}

function recomputeMatch(state: {
  rules: ContextRule[]
  manualMode: StudyMode | null
  currentWifi: string | null
  currentLocation: GeoPoint | null
}): Pick<ContextState, 'activeMode' | 'contextSource' | 'matchedRuleId'> {
  return matchContextRule({
    rules: state.rules,
    manualMode: state.manualMode,
    currentWifi: state.currentWifi,
    currentLocation: state.currentLocation
  })
}

function applyPulledRules(
  set: (
    partial:
      | Partial<ContextState>
      | ((state: ContextState) => Partial<ContextState>)
  ) => void,
  rules: ContextRule[],
  syncStatus: SyncStatus,
  syncError: string | null
): void {
  saveRules(rules)
  set((state) => {
    const next = { ...state, rules, syncStatus, syncError, lastSyncedAt: Date.now() }
    return { ...next, ...recomputeMatch(next) }
  })
}

function applySyncResult(
  set: (
    partial:
      | Partial<ContextState>
      | ((state: ContextState) => Partial<ContextState>)
  ) => void,
  result: SyncApplyResult
): void {
  if (result.action === 'pulled') {
    applyPulledRules(set, result.rules, 'idle', null)
    return
  }
  if (result.action === 'pushed') {
    set({ syncStatus: 'idle', syncError: null, lastSyncedAt: Date.now() })
    return
  }
  if (result.action === 'conflict') {
    void pullRules().then((pullResult) => {
      if (pullResult.action === 'pulled') {
        applyPulledRules(set, pullResult.rules, 'conflict', '同步冲突，已采用较新版本')
      } else {
        set({ syncStatus: 'conflict', syncError: '同步冲突，已采用较新版本' })
      }
    })
    return
  }
  if (result.action === 'error') {
    set({ syncStatus: 'error', syncError: result.message })
    return
  }
  set({ syncStatus: 'idle', syncError: null })
}

function scheduleCloudPush(
  get: () => ContextState,
  set: (
    partial:
      | Partial<ContextState>
      | ((state: ContextState) => Partial<ContextState>)
  ) => void
): void {
  if (!get().syncToken || !isSupabaseConfigured()) return
  if (pushDebounceTimer) window.clearTimeout(pushDebounceTimer)
  pushDebounceTimer = window.setTimeout(() => {
    void (async () => {
      set({ syncStatus: 'syncing', syncError: null })
      const result = await pushRules(get().rules)
      applySyncResult(set, result)
    })()
  }, SYNC_PUSH_DEBOUNCE_MS)
}

function afterLocalRulesChange(
  state: ContextState,
  set: (
    partial:
      | Partial<ContextState>
      | ((state: ContextState) => Partial<ContextState>)
  ) => void,
  get: () => ContextState,
  rules: ContextRule[]
): Partial<ContextState> {
  saveRules(rules)
  bumpLocalUpdatedAt()
  scheduleCloudPush(get, set)
  const next = { ...state, rules }
  return { ...next, ...recomputeMatch(next) }
}

export const useContextStore = create<ContextState>((set, get) => ({
  activeMode: 'relax',
  contextSource: 'default',
  matchedRuleId: null,
  currentWifi: null,
  currentLocation: null,
  locationError: null,
  manualMode: null,
  rules: [],
  syncToken: null,
  syncStatus: (isSupabaseConfigured() ? 'idle' : 'unconfigured') as SyncStatus,
  syncError: null,
  lastSyncedAt: null,

  loadPersisted: () => {
    const rules = loadRules()
    const manualMode = loadManualMode()
    const syncToken = getSyncToken()
    set((state) => {
      const next = {
        ...state,
        rules,
        manualMode,
        syncToken,
        syncStatus: (isSupabaseConfigured() ? 'idle' : 'unconfigured') as SyncStatus
      }
      return { ...next, ...recomputeMatch(next) }
    })
    void get().initSync()
  },

  initSync: async () => {
    if (!isSupabaseConfigured()) {
      set({ syncStatus: 'unconfigured', syncToken: getSyncToken() })
      return
    }
    const syncToken = getSyncToken()
    if (!syncToken) {
      set({ syncToken: null, syncStatus: 'idle' })
      return
    }
    set({ syncToken, syncStatus: 'syncing', syncError: null })
    const result = await syncRules(get().rules)
    applySyncResult(set, result)
  },

  createSync: async () => {
    if (!isSupabaseConfigured()) return null
    set({ syncStatus: 'syncing', syncError: null })
    const result = await createSyncGroup(get().rules)
    if ('error' in result) {
      set({ syncStatus: 'error', syncError: result.error })
      return null
    }
    set({ syncToken: result.token, syncStatus: 'idle', lastSyncedAt: Date.now(), syncError: null })
    return result.token
  },

  joinSync: async (token) => {
    if (!isSupabaseConfigured()) return false
    set({ syncStatus: 'syncing', syncError: null })
    const joined = await joinSyncGroup(token)
    if ('error' in joined) {
      set({ syncStatus: 'error', syncError: joined.error })
      return false
    }
    set({ syncToken: token.trim() })
    await get().syncNow()
    return true
  },

  disconnectSync: () => {
    clearSyncToken()
    set({
      syncToken: null,
      syncStatus: (isSupabaseConfigured() ? 'idle' : 'unconfigured') as SyncStatus,
      syncError: null
    })
  },

  syncNow: async () => {
    if (!isSupabaseConfigured() || !get().syncToken) return
    set({ syncStatus: 'syncing', syncError: null })
    const result = await syncRules(get().rules)
    applySyncResult(set, result)
  },

  addWifiRule: (ssid, mode, label) => {
    const trimmed = ssid.trim()
    if (!trimmed) return
    const rule: ContextRule = {
      id: crypto.randomUUID(),
      kind: 'wifi',
      ssid: trimmed,
      mode,
      label,
      createdAt: Date.now()
    }
    set((state) => {
      const rules = [...state.rules, rule]
      return afterLocalRulesChange(state, set, get, rules)
    })
  },

  addLocationRule: (lat, lng, radiusM, mode, label) => {
    const rule: ContextRule = {
      id: crypto.randomUUID(),
      kind: 'location',
      lat,
      lng,
      radiusM,
      mode,
      label,
      createdAt: Date.now()
    }
    set((state) => {
      const rules = [...state.rules, rule]
      return afterLocalRulesChange(state, set, get, rules)
    })
  },

  removeRule: (id) => {
    set((state) => {
      const rule = state.rules.find((r) => r.id === id)
      if (rule && isStrictRuleDeleteLocked(rule)) return state
      const rules = state.rules.filter((rule) => rule.id !== id)
      return afterLocalRulesChange(state, set, get, rules)
    })
  },

  setManualMode: (mode) => {
    saveManualMode(mode)
    set((state) => {
      const next = { ...state, manualMode: mode }
      return { ...next, ...recomputeMatch(next) }
    })
  },

  // Called by useContextDetector when a new SSID is polled from the main process.
  // Updates `currentWifi`, then re-runs matchContextRule so activeMode / contextSource
  // change immediately if the network matches a saved WiFi rule (unless manualMode is set).
  setCurrentWifi: (ssid) => {
    set((state) => {
      const next = { ...state, currentWifi: ssid }
      return { ...next, ...recomputeMatch(next) }
    })
  },

  setCurrentLocation: (location, error = null) => {
    set((state) => {
      const next = { ...state, currentLocation: location, locationError: error }
      return { ...next, ...recomputeMatch(next) }
    })
  },

  applyContextMatch: () => {
    set((state) => ({ ...state, ...recomputeMatch(state) }))
  }
}))
