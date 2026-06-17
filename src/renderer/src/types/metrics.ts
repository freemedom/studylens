export type Mood = 'focused' | 'tired' | 'restless' | 'unknown'

export type DistanceStatus = 'good' | 'too_near' | 'too_far' | 'none'

export interface SessionSummary {
  id: string
  startedAt: string
  endedAt: string
  blinkCount: number
  avgBlinksPerMinute: number
  distanceAlerts: number
  tiredSamples: number
}
