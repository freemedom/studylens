import { useEffect } from 'react'
import { CONTEXT_POLL_MS } from '../constants/thresholds'
import { useContextStore } from '../store/contextStore'
import type { GeoPoint } from '../types/context'

function readGeolocation(): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: CONTEXT_POLL_MS }
    )
  })
}

export function useContextDetector(): void {
  const setCurrentWifi = useContextStore((s) => s.setCurrentWifi)
  const setCurrentLocation = useContextStore((s) => s.setCurrentLocation)
  const loadPersisted = useContextStore((s) => s.loadPersisted)

  useEffect(() => {
    loadPersisted()
  }, [loadPersisted])

  useEffect(() => {
    let cancelled = false

    async function poll(): Promise<void> {
      try {
        const ssid = await window.api.getWifiSSID()
        if (!cancelled) setCurrentWifi(ssid)
      } catch {
        if (!cancelled) setCurrentWifi(null)
      }

      const location = await readGeolocation()
      if (!cancelled) {
        if (location) {
          setCurrentLocation(location, null)
        } else if (!navigator.geolocation) {
          setCurrentLocation(null, '浏览器不支持定位')
        } else {
          setCurrentLocation(null, '定位不可用或未授权')
        }
      }
    }

    poll()
    const timer = window.setInterval(poll, CONTEXT_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [setCurrentWifi, setCurrentLocation])
}
