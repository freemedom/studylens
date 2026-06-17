import { create } from 'zustand'
import { SESSIONS_STORAGE_KEY } from '../constants/thresholds'
import type { DistanceStatus, Mood, SessionSummary } from '../types/metrics'

interface SessionState {
  isRunning: boolean
  isReady: boolean
  error: string | null
  showMesh: boolean
  blinkCount: number
  blinksPerMinute: number
  ear: number
  mood: Mood
  faceRatio: number
  distanceStatus: DistanceStatus
  fatigueLevel: number
  alertMessage: string | null
  showBreak: boolean
  breakSecondsLeft: number
  sessionStart: number | null
  distanceAlerts: number
  tiredSamples: number
  history: SessionSummary[]
  setReady: (ready: boolean) => void
  setError: (error: string | null) => void
  toggleMesh: () => void
  startSession: () => void
  stopSession: () => void
  updateMetrics: (metrics: {
    blinkCount: number
    blinksPerMinute: number
    ear: number
    mood: Mood
    faceRatio: number
    distanceStatus: DistanceStatus
    fatigueLevel: number
    alertMessage: string | null
    showBreak: boolean
    breakSecondsLeft: number
  }) => void
  loadHistory: () => void
}

function loadSessions(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SessionSummary[]) : []
  } catch {
    return []
  }
}

function saveSession(summary: SessionSummary): void {
  const existing = loadSessions()
  const next = [summary, ...existing].slice(0, 10)
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next))
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isRunning: false,
  isReady: false,
  error: null,
  showMesh: true,
  blinkCount: 0,
  blinksPerMinute: 0,
  ear: 0,
  mood: 'unknown',
  faceRatio: 0,
  distanceStatus: 'none',
  fatigueLevel: 0,
  alertMessage: null,
  showBreak: false,
  breakSecondsLeft: 0,
  sessionStart: null,
  distanceAlerts: 0,
  tiredSamples: 0,
  history: loadSessions(),

  setReady: (ready) => set({ isReady: ready }),
  setError: (error) => set({ error }),
  toggleMesh: () => set((s) => ({ showMesh: !s.showMesh })),

  startSession: () =>
    set({
      isRunning: true,
      sessionStart: Date.now(),
      blinkCount: 0,
      blinksPerMinute: 0,
      distanceAlerts: 0,
      tiredSamples: 0,
      alertMessage: null,
      showBreak: false
    }),

  stopSession: () => {
    const state = get()
    if (state.sessionStart) {
      const durationMin = Math.max((Date.now() - state.sessionStart) / 60_000, 0.1)
      const summary: SessionSummary = {
        id: crypto.randomUUID(),
        startedAt: new Date(state.sessionStart).toISOString(),
        endedAt: new Date().toISOString(),
        blinkCount: state.blinkCount,
        avgBlinksPerMinute: Math.round(state.blinkCount / durationMin),
        distanceAlerts: state.distanceAlerts,
        tiredSamples: state.tiredSamples
      }
      saveSession(summary)
      set({ history: loadSessions() })
    }
    set({ isRunning: false, sessionStart: null })
  },

  updateMetrics: (metrics) => set(metrics),

  loadHistory: () => set({ history: loadSessions() })
}))
