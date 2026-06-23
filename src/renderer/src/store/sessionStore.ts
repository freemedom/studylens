import { create } from 'zustand'
import { SESSIONS_STORAGE_KEY } from '../constants/thresholds'
import type {
  ActivePostureIssue,
  CalibrationPhase,
  DistanceStatus,
  Mood,
  PostureBaseline,
  SessionSummary
} from '../types/metrics'

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
  calibrationPhase: CalibrationPhase
  calibrationSecondsLeft: number
  calibrationMessage: string | null
  postureBaseline: PostureBaseline | null
  postureIssues: ActivePostureIssue[]
  postureTrackable: boolean
  neckAngleDeg: number
  shoulderTiltDeg: number
  forwardRatio: number
  headOffsetRatio: number
  postureScore: number
  postureAlerts: number
  showPostureHint: boolean
  sessionStart: number | null
  distanceAlerts: number
  tiredSamples: number
  history: SessionSummary[]
  setReady: (ready: boolean) => void
  setError: (error: string | null) => void
  toggleMesh: () => void
  startCalibration: () => void
  beginCalibrationRecording: () => void
  finishCalibration: (baseline: PostureBaseline, usedFallback: boolean) => void
  cancelCalibration: () => void
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
    postureIssues: ActivePostureIssue[]
    postureTrackable: boolean
    neckAngleDeg: number
    shoulderTiltDeg: number
    forwardRatio: number
    headOffsetRatio: number
    postureScore: number
    showPostureHint: boolean
    calibrationSecondsLeft?: number
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
  calibrationPhase: 'idle',
  calibrationSecondsLeft: 0,
  calibrationMessage: null,
  postureBaseline: null,
  postureIssues: [],
  postureTrackable: false,
  neckAngleDeg: 0,
  shoulderTiltDeg: 0,
  forwardRatio: 0,
  headOffsetRatio: 0,
  postureScore: 0,
  postureAlerts: 0,
  showPostureHint: false,
  sessionStart: null,
  distanceAlerts: 0,
  tiredSamples: 0,
  history: loadSessions(),

  setReady: (ready) => set({ isReady: ready }),
  setError: (error) => set({ error }),
  toggleMesh: () => set((s) => ({ showMesh: !s.showMesh })),

  startCalibration: () =>
    set({
      calibrationPhase: 'preparing',
      calibrationSecondsLeft: 0,
      calibrationMessage: null,
      isRunning: false,
      postureBaseline: null,
      postureAlerts: 0,
      blinkCount: 0,
      blinksPerMinute: 0,
      distanceAlerts: 0,
      tiredSamples: 0,
      alertMessage: null,
      showBreak: false,
      showPostureHint: false
    }),

  beginCalibrationRecording: () =>
    set({
      calibrationPhase: 'running',
      calibrationSecondsLeft: 5
    }),

  finishCalibration: (baseline, usedFallback) =>
    set({
      calibrationPhase: 'done',
      postureBaseline: baseline,
      isRunning: true,
      sessionStart: Date.now(),
      calibrationMessage: usedFallback
        ? 'Not enough calibration samples — using default posture baseline'
        : 'Posture calibration complete'
    }),

  cancelCalibration: () =>
    set({
      calibrationPhase: 'idle',
      calibrationSecondsLeft: 0,
      calibrationMessage: null
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
        tiredSamples: state.tiredSamples,
        postureAlerts: state.postureAlerts
      }
      saveSession(summary)
      set({ history: loadSessions() })
    }
    set({
      isRunning: false,
      sessionStart: null,
      calibrationPhase: 'idle',
      calibrationSecondsLeft: 0,
      calibrationMessage: null,
      postureBaseline: null,
      showPostureHint: false
    })
  },

  updateMetrics: (metrics) => set(metrics),

  loadHistory: () => set({ history: loadSessions() })
}))
