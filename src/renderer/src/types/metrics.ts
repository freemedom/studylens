export type Mood = 'focused' | 'tired' | 'restless' | 'unknown'

export type DistanceStatus = 'good' | 'too_near' | 'too_far' | 'none'

export type PostureIssue =
  | 'good'
  | 'forward_head'
  | 'head_tilt'
  | 'shoulder_uneven'
  | 'unknown'

export type CalibrationPhase = 'idle' | 'running' | 'done'

export interface PostureBaseline {
  neckAngleDeg: number
  shoulderTiltDeg: number
  forwardRatio: number
}

export interface PostureMetrics {
  neckAngleDeg: number
  shoulderTiltDeg: number
  forwardRatio: number
  shoulderWidth: number
  shoulderUnevenRatio: number
  postureIssue: PostureIssue
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
  postureAlerts: number
}
