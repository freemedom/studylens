import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { FACE_RATIO_FAR, FACE_RATIO_NEAR } from '../constants/thresholds'
import type { DistanceStatus } from '../types/metrics'

export function estimateFaceRatio(landmarks: NormalizedLandmark[]): number {
  let minX = 1
  let maxX = 0
  for (const p of landmarks) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
  }
  return maxX - minX
}

export function estimateDistanceStatus(faceRatio: number): DistanceStatus {
  if (faceRatio <= 0) return 'none'
  if (faceRatio > FACE_RATIO_NEAR) return 'too_near'
  if (faceRatio < FACE_RATIO_FAR) return 'too_far'
  return 'good'
}
