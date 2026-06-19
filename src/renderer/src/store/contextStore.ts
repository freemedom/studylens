import { create } from 'zustand'
import { matchContextRule } from '../context/matchRule'
import {
  CONTEXT_RULES_STORAGE_KEY,
  MANUAL_MODE_STORAGE_KEY
} from '../constants/thresholds'
import type {
  ContextRule,
  ContextSource,
  GeoPoint,
  StudyMode
} from '../types/context'

interface ContextState {
  activeMode: StudyMode
  contextSource: ContextSource
  matchedRuleId: string | null
  currentWifi: string | null
  currentLocation: GeoPoint | null
  locationError: string | null
  manualMode: StudyMode | null
  rules: ContextRule[]
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
}

function normalizeStudyMode(value: string): StudyMode {
  if (value === 'strict' || value === 'study' || value === 'relax') return value
  if (value === 'focus') return 'study'
  if (value === 'library') return 'strict'
  if (value === 'home' || value === 'cafe') return 'relax'
  return 'relax'
}

function loadRules(): ContextRule[] {
  try {
    const raw = localStorage.getItem(CONTEXT_RULES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ContextRule[]
    return parsed.map((rule) => ({ ...rule, mode: normalizeStudyMode(rule.mode) }))
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

export const useContextStore = create<ContextState>((set) => ({
  activeMode: 'relax',
  contextSource: 'default',
  matchedRuleId: null,
  currentWifi: null,
  currentLocation: null,
  locationError: null,
  manualMode: null,
  rules: [],

  loadPersisted: () => {
    const rules = loadRules()
    const manualMode = loadManualMode()
    set((state) => {
      const next = { ...state, rules, manualMode }
      return { ...next, ...recomputeMatch(next) }
    })
  },

  addWifiRule: (ssid, mode, label) => {
    const trimmed = ssid.trim()
    if (!trimmed) return
    const rule: ContextRule = {
      id: crypto.randomUUID(),
      kind: 'wifi',
      ssid: trimmed,
      mode,
      label
    }
    set((state) => {
      const rules = [...state.rules.filter((r) => !(r.kind === 'wifi' && r.ssid === trimmed)), rule]
      saveRules(rules)
      const next = { ...state, rules }
      return { ...next, ...recomputeMatch(next) }
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
      label
    }
    set((state) => {
      const rules = [...state.rules, rule]
      saveRules(rules)
      const next = { ...state, rules }
      return { ...next, ...recomputeMatch(next) }
    })
  },

  removeRule: (id) => {
    set((state) => {
      const rules = state.rules.filter((rule) => rule.id !== id)
      saveRules(rules)
      const next = { ...state, rules }
      return { ...next, ...recomputeMatch(next) }
    })
  },

  setManualMode: (mode) => {
    saveManualMode(mode)
    set((state) => {
      const next = { ...state, manualMode: mode }
      return { ...next, ...recomputeMatch(next) }
    })
  },

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
