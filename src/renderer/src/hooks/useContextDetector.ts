import { useEffect } from 'react'
import { CONTEXT_POLL_MS } from '../constants/thresholds'
import { useContextStore } from '../store/contextStore'
import type { GeoPoint } from '../types/context'

type GeolocationReadResult =
  | { ok: true; point: GeoPoint }
  | { ok: false; message: string }

function geolocationErrorMessage(code: number, platform: NodeJS.Platform): string {
  if (code === 1) return '定位权限被拒绝（请在系统设置中允许位置访问）'
  if (code === 3) return '定位请求超时'
  if (code === 2 && platform === 'win32') {
    return 'Windows 定位失败：请设置环境变量 GOOGLE_API_KEY（Google Geolocation API），或仅使用 WiFi 规则'
  }
  if (code === 2) return '定位服务不可用'
  return '定位不可用或未授权'
}

function readGeolocation(platform: NodeJS.Platform): Promise<GeolocationReadResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, message: '浏览器不支持定位' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        })
      },
      (err) => {
        resolve({ ok: false, message: geolocationErrorMessage(err.code, platform) })
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: CONTEXT_POLL_MS } // more accurate position
    )
  })
}

export function useContextDetector(): void {
  const setCurrentWifi = useContextStore((s) => s.setCurrentWifi)
  const setCurrentLocation = useContextStore((s) => s.setCurrentLocation)
  const loadPersisted = useContextStore((s) => s.loadPersisted)

  // On mount: restore WiFi/location rules and manual mode override from localStorage,
  // then recompute activeMode before the first WiFi/geolocation poll runs.
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

      const platform = await window.api.getPlatform()
      const geoReady = await window.api.isGeolocationConfigured()

      if (!geoReady && platform === 'win32') {
        if (!cancelled) {
          setCurrentLocation(
            null,
            'Windows 定位需 GOOGLE_API_KEY（见 README）；当前仅可用 WiFi / 手动模式'
          )
        }
        return
      }

      const result = await readGeolocation(platform)
      if (cancelled) return

      if (result.ok) {
        setCurrentLocation(result.point, null)
      } else {
        setCurrentLocation(null, result.message)
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
