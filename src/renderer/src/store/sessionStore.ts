import { create } from 'zustand'
import type {
  ActivePostureIssue,
  CalibrationPhase,
  DistanceStatus,
  Mood,
  MoodEventCounts,
  MoodSignals,
  PostureAlertCounts,
  PostureBaseline,
  SessionSummary
} from '../types/metrics'
import { emptyMoodEvents, emptyPostureAlertCounts } from '../types/metrics'
import { loadSessions, saveSession } from '../utils/sessionStorage'

interface SessionState {
  isRunning: boolean
  isReady: boolean
  error: string | null
  showMesh: boolean
  blinkCount: number
  blinksPerMinute: number
  blinkRateReady: boolean
  ear: number
  mood: Mood
  moodSignals: MoodSignals | null
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
  postureAlerts: PostureAlertCounts
  showPostureHint: boolean
  sessionStart: number | null
  distanceAlerts: number
  moodEvents: MoodEventCounts
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
    blinkRateReady: boolean
    ear: number
    mood: Mood
    moodSignals: MoodSignals | null
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

export const useSessionStore = create<SessionState>((set, get) => ({
  isRunning: false,
  isReady: false,
  error: null,
  showMesh: true,
  blinkCount: 0,
  blinksPerMinute: 0,
  blinkRateReady: false,
  ear: 0,
  mood: 'unknown',
  moodSignals: null,
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
  postureAlerts: emptyPostureAlertCounts(),
  showPostureHint: false,
  sessionStart: null,
  distanceAlerts: 0,
  moodEvents: emptyMoodEvents(),
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
      postureAlerts: emptyPostureAlertCounts(),
      blinkCount: 0,
      blinksPerMinute: 0,
      blinkRateReady: false,
      mood: 'unknown',
      moodSignals: null,
      distanceAlerts: 0,
      moodEvents: emptyMoodEvents(),
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
      const durationSec = Math.max(Math.round((Date.now() - state.sessionStart) / 1000), 1)
      const durationMin = Math.max(durationSec / 60, 0.1)
      const summary: SessionSummary = {
        id: crypto.randomUUID(),
        startedAt: new Date(state.sessionStart).toISOString(),
        endedAt: new Date().toISOString(),
        durationSec,
        blinkCount: state.blinkCount,
        avgBlinksPerMinute: Math.round(state.blinkCount / durationMin),
        distanceAlerts: state.distanceAlerts,
        moodEvents: { ...state.moodEvents },
        postureAlerts: { ...state.postureAlerts }
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
      moodSignals: null,
      showPostureHint: false
    })
  },

  updateMetrics: (metrics) => set(metrics),

  loadHistory: () => set({ history: loadSessions() })
}))
