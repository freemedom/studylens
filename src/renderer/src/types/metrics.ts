export type Mood = 'focused' | 'tired' | 'restless' | 'distracted' | 'unknown'

export interface MoodSignals {
  headJitter: number
  brow: number
  mouth: number
  jawOpen: number
  gazeDown: number
}

export type DistanceStatus = 'good' | 'too_near' | 'too_far' | 'none'

export type PostureIssue =
  | 'good'
  | 'forward_head'
  | 'head_tilt'
  | 'shoulder_uneven'
  | 'unknown'

/** Actionable posture problems (excludes good / unknown). */
export type ActivePostureIssue = Exclude<PostureIssue, 'good' | 'unknown'>

export type CalibrationPhase = 'idle' | 'preparing' | 'running' | 'done'

export interface PostureBaseline {
  neckAngleDeg: number
  shoulderTiltDeg: number
  forwardRatio: number
  headOffsetRatio: number
  shoulderUnevenRatio: number
}

export interface PostureMetrics {
  neckAngleDeg: number
  shoulderTiltDeg: number
  forwardRatio: number
  headOffsetRatio: number
  shoulderWidth: number
  shoulderUnevenRatio: number
  postureIssues: ActivePostureIssue[]
  postureScore: number
  trackable: boolean
}

export interface SessionSummary {
  id: string
  startedAt: string
  endedAt: string
  blinkCount: number
  avgBlinksPerMinute: number
  distanceAlerts: number
  tiredSamples: number
  distractedSamples?: number
  postureAlerts: number
}
