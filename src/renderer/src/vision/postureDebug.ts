/**
 * Console-only posture debugging (no UI panel).
 *
 * Enable in DevTools:
 *   localStorage.setItem('studylens:postureDebug', '1')
 * Disable:
 *   localStorage.removeItem('studylens:postureDebug')
 * Then refresh or restart the session. Open Electron DevTools to see logs.
 */
import {
  FORWARD_HEAD_DELTA,
  FORWARD_RATIO_DELTA,
  HEAD_TILT_DELTA,
  SHOULDER_UNEVEN_RATIO
} from '../constants/thresholds'
import { MIN_SHOULDER_WIDTH_RATIO } from '../constants/poseLandmarks'
import type { PostureBaseline, PostureIssue, PostureMetrics } from '../types/metrics'

export const POSTURE_DEBUG_KEY = 'studylens:postureDebug'

export const POSTURE_DEBUG_LOG_MS = 500

export function isPostureDebugEnabled(): boolean {
  try {
    return localStorage.getItem(POSTURE_DEBUG_KEY) === '1'
  } catch {
    return false
  }
}

export interface PostureDebugSnapshot {
  trackable: boolean
  shoulderWidth: number
  minShoulderWidth: number
  neckAngleDeg: number
  shoulderTiltDeg: number
  forwardRatio: number
  shoulderUnevenRatio: number
  baseline: PostureBaseline | null
  deltas: { neck: number; forward: number; tilt: number; uneven: number }
  thresholds: {
    FORWARD_HEAD_DELTA: number
    FORWARD_RATIO_DELTA: number
    HEAD_TILT_DELTA: number
    SHOULDER_UNEVEN_RATIO: number
  }
  triggers: {
    forwardHeadByNeck: boolean
    forwardHeadByRatio: boolean
    shoulderUneven: boolean
    headTilt: boolean
  }
  postureIssue: PostureIssue
  postureScore: number
  winningRule: string | null
}

function resolveWinningRule(triggers: PostureDebugSnapshot['triggers']): string | null {
  if (triggers.forwardHeadByNeck) return 'forward_head:neck'
  if (triggers.forwardHeadByRatio) return 'forward_head:forwardRatio'
  if (triggers.shoulderUneven) return 'shoulder_uneven'
  if (triggers.headTilt) return 'head_tilt'
  return 'good'
}

export function buildPostureDebugSnapshot(
  metrics: PostureMetrics,
  baseline: PostureBaseline | null
): PostureDebugSnapshot {
  const neckDelta = baseline ? metrics.neckAngleDeg - baseline.neckAngleDeg : 0
  const forwardDelta = baseline ? metrics.forwardRatio - baseline.forwardRatio : 0
  const tiltDelta = baseline ? Math.abs(metrics.shoulderTiltDeg - baseline.shoulderTiltDeg) : 0

  const forwardHeadByNeck = baseline
    ? metrics.neckAngleDeg > baseline.neckAngleDeg + FORWARD_HEAD_DELTA
    : false
  const forwardHeadByRatio = baseline
    ? metrics.forwardRatio > baseline.forwardRatio + FORWARD_RATIO_DELTA
    : false
  const shoulderUneven = metrics.shoulderUnevenRatio > SHOULDER_UNEVEN_RATIO
  const headTilt = baseline
    ? Math.abs(metrics.shoulderTiltDeg - baseline.shoulderTiltDeg) > HEAD_TILT_DELTA
    : false

  const triggers = {
    forwardHeadByNeck,
    forwardHeadByRatio,
    shoulderUneven,
    headTilt
  }

  const winningRule =
    !baseline || !metrics.trackable ? null : resolveWinningRule(triggers)

  return {
    trackable: metrics.trackable,
    shoulderWidth: metrics.shoulderWidth,
    minShoulderWidth: MIN_SHOULDER_WIDTH_RATIO,
    neckAngleDeg: metrics.neckAngleDeg,
    shoulderTiltDeg: metrics.shoulderTiltDeg,
    forwardRatio: metrics.forwardRatio,
    shoulderUnevenRatio: metrics.shoulderUnevenRatio,
    baseline,
    deltas: {
      neck: neckDelta,
      forward: forwardDelta,
      tilt: tiltDelta,
      uneven: metrics.shoulderUnevenRatio
    },
    thresholds: {
      FORWARD_HEAD_DELTA,
      FORWARD_RATIO_DELTA,
      HEAD_TILT_DELTA,
      SHOULDER_UNEVEN_RATIO
    },
    triggers,
    postureIssue: metrics.postureIssue,
    postureScore: metrics.postureScore,
    winningRule
  }
}
