import type {
  ContextMatchResult,
  ContextRule,
  GeoPoint,
  StudyMode
} from '../types/context'

const DEFAULT_MODE: StudyMode = 'relax'

/**
 * Great-circle distance between two WGS84 coordinates (Haversine formula).
 * Used to test whether the user's current GPS position falls inside a
 * location rule's circular geofence (see `matchLocationRule`).
 *
 * @returns Distance in meters (Earth mean radius ≈ 6_371_000 m).
 */
function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  // Latitude/longitude deltas in radians.
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  // Haversine intermediate value `h` ∈ [0, 1]: squared half-chord length on the unit sphere.
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  // Central angle (radians) × Earth radius → arc length in meters.
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}
function matchWifiRule(rules: ContextRule[], ssid: string | null): ContextRule | null {
  if (!ssid) return null
  const normalized = ssid.trim().toLowerCase()
  return (
    rules.find(
      (rule) => rule.kind === 'wifi' && rule.ssid.trim().toLowerCase() === normalized
    ) ?? null
  )
}

function matchLocationRule(rules: ContextRule[], location: GeoPoint | null): ContextRule | null {
  if (!location) return null
  for (const rule of rules) {
    if (rule.kind !== 'location') continue
    const distance = haversineMeters(location, { lat: rule.lat, lng: rule.lng })
    if (distance <= rule.radiusM) return rule
  }
  return null
}

export function matchContextRule(input: {
  rules: ContextRule[]
  manualMode: StudyMode | null
  currentWifi: string | null
  currentLocation: GeoPoint | null
}): ContextMatchResult {
  if (input.manualMode) {
    return {
      activeMode: input.manualMode,
      contextSource: 'manual',
      matchedRuleId: null
    }
  }

  const wifiRule = matchWifiRule(input.rules, input.currentWifi)
  if (wifiRule) {
    return {
      activeMode: wifiRule.mode,
      contextSource: 'wifi',
      matchedRuleId: wifiRule.id
    }
  }

  const locationRule = matchLocationRule(input.rules, input.currentLocation)
  if (locationRule) {
    return {
      activeMode: locationRule.mode,
      contextSource: 'location',
      matchedRuleId: locationRule.id
    }
  }

  return {
    activeMode: DEFAULT_MODE,
    contextSource: 'default',
    matchedRuleId: null
  }
}
