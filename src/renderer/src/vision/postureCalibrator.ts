import {
  DEFAULT_FORWARD_RATIO,
  DEFAULT_NECK_ANGLE_DEG,
  DEFAULT_SHOULDER_TILT_DEG,
  POSTURE_CALIBRATION_MS
} from '../constants/thresholds'
import type { PostureBaseline, PostureMetrics } from '../types/metrics'

interface CalibrationSample {
  neckAngleDeg: number
  shoulderTiltDeg: number
  forwardRatio: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export class PostureCalibrator {
  private startedAt: number | null = null
  private samples: CalibrationSample[] = []
  private frameCount = 0

  reset(): void {
    this.startedAt = null
    this.samples = []
    this.frameCount = 0
  }

  start(now: number): void {
    this.startedAt = now
    this.samples = []
    this.frameCount = 0
  }

  isActive(): boolean {
    return this.startedAt !== null
  }

  addSample(metrics: PostureMetrics): void {
    this.frameCount += 1
    if (!metrics.trackable) return
    this.samples.push({
      neckAngleDeg: metrics.neckAngleDeg,
      shoulderTiltDeg: metrics.shoulderTiltDeg,
      forwardRatio: metrics.forwardRatio
    })
  }

  getSecondsLeft(now: number): number {
    if (!this.startedAt) return 0
    const elapsed = now - this.startedAt
    return Math.max(0, Math.ceil((POSTURE_CALIBRATION_MS - elapsed) / 1000))
  }

  isComplete(now: number): boolean {
    if (!this.startedAt) return false
    return now - this.startedAt >= POSTURE_CALIBRATION_MS
  }

  finish(): { baseline: PostureBaseline; usedFallback: boolean } {
    const validRatio = this.frameCount > 0 ? this.samples.length / this.frameCount : 0
    const usedFallback = validRatio < 0.5 || this.samples.length === 0

    if (usedFallback) {
      return {
        baseline: {
          neckAngleDeg: DEFAULT_NECK_ANGLE_DEG,
          shoulderTiltDeg: DEFAULT_SHOULDER_TILT_DEG,
          forwardRatio: DEFAULT_FORWARD_RATIO
        },
        usedFallback: true
      }
    }

    return {
      baseline: {
        neckAngleDeg: median(this.samples.map((s) => s.neckAngleDeg)),
        shoulderTiltDeg: median(this.samples.map((s) => s.shoulderTiltDeg)),
        forwardRatio: median(this.samples.map((s) => s.forwardRatio))
      },
      usedFallback: false
    }
  }
}
