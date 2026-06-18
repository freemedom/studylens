export type StudyMode = 'focus' | 'home' | 'library' | 'cafe'

export type ContextSource = 'wifi' | 'location' | 'manual' | 'default'

export type WifiContextRule = {
  id: string
  kind: 'wifi'
  ssid: string
  mode: StudyMode
  label?: string
}

export type LocationContextRule = {
  id: string
  kind: 'location'
  lat: number
  lng: number
  radiusM: number
  mode: StudyMode
  label?: string
}

export type ContextRule = WifiContextRule | LocationContextRule

export interface GeoPoint {
  lat: number
  lng: number
}

export interface ContextMatchResult {
  activeMode: StudyMode
  contextSource: ContextSource
  matchedRuleId: string | null
}
