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
import type { ActivePostureIssue, PostureBaseline, PostureMetrics } from '../types/metrics'

export const POSTURE_DEBUG_KEY = 'studylens:postureDebug'

export const POSTURE_DEBUG_LOG_MS = 500

export function isPostureDebugEnabled(): boolean {
  try {
    return localStorage.getItem(POSTURE_DEBUG_KEY) === '1'
  } catch {
    return false
  }
}

export function postureIssuesEqual(a: ActivePostureIssue[], b: ActivePostureIssue[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
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
  postureIssues: ActivePostureIssue[]
  postureScore: number
  activeIssues: string[]
}

function resolveActiveIssues(triggers: PostureDebugSnapshot['triggers']): string[] {
  const active: string[] = []
  if (triggers.forwardHeadByNeck) active.push('forward_head:neck')
  if (triggers.forwardHeadByRatio) active.push('forward_head:forwardRatio')
  if (triggers.shoulderUneven) active.push('shoulder_uneven')
  if (triggers.headTilt) active.push('head_tilt')
  return active
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

  const activeIssues =
    !baseline || !metrics.trackable ? [] : resolveActiveIssues(triggers)

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
    postureIssues: metrics.postureIssues,
    postureScore: metrics.postureScore,
    activeIssues
  }
}
