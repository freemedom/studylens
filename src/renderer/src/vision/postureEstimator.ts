/**
 * Upper-body posture estimator from MediaPipe Pose + Face landmarks.
 *
 * Called every vision frame from `useVisionLoop` with pose landmarks and an optional
 * face nose (landmark index 1). Compared against a user-specific `PostureBaseline`
 * from a 5 s calibration (`PostureCalibrator`) to detect slouching / tilt / uneven shoulders.
 *
 * ## Landmarks used (see `poseLandmarks.ts`)
 * - Pose nose (0), left shoulder (11), right shoulder (12)
 * - Face nose preferred over pose nose when both are available (finer head position)
 *
 * ## Metrics computed
 * 1. **neckAngleDeg** — angle of the nose→shoulder-mid vector from vertical (degrees).
 *    Larger values suggest forward head / neck flexion.
 * 2. **shoulderTiltDeg** — angle of the line between shoulders in the image plane.
 *    Deviation from baseline indicates head or torso lean.
 * 3. **forwardRatio** — (nose.y − shoulderMid.y) / shoulderWidth; head drop relative to shoulders.
 * 4. **shoulderUnevenRatio** — vertical shoulder height difference / shoulderWidth.
 *
 * ## Classification (first match wins, vs personal baseline)
 * | Issue | Condition |
 * |-------|-----------|
 * | forward_head | neck angle or forwardRatio exceeds baseline + delta |
 * | shoulder_uneven | shoulderUnevenRatio > SHOULDER_UNEVEN_RATIO |
 * | head_tilt | shoulder tilt differs from baseline by > HEAD_TILT_DELTA |
 * | good | none of the above |
 *
 * Without baseline (during calibration), returns raw metrics with `postureIssue: 'unknown'`.
 */
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import {
  FORWARD_HEAD_DELTA,
  FORWARD_RATIO_DELTA,
  HEAD_TILT_DELTA,
  SHOULDER_UNEVEN_RATIO
} from '../constants/thresholds'
import {
  MIN_LANDMARK_VISIBILITY,
  MIN_SHOULDER_WIDTH_RATIO,
  POSE_LEFT_SHOULDER,
  POSE_NOSE,
  POSE_RIGHT_SHOULDER
} from '../constants/poseLandmarks'
import type { PostureBaseline, PostureIssue, PostureMetrics } from '../types/metrics'

/** Returned when pose is missing, shoulders too narrow, or landmarks not visible. */
const UNKNOWN_METRICS: PostureMetrics = {
  neckAngleDeg: 0,
  shoulderTiltDeg: 0,
  forwardRatio: 0,
  shoulderWidth: 0,
  postureIssue: 'unknown',
  postureScore: 0,
  trackable: false
}

/** MediaPipe visibility score and in-bounds check; filters occluded / off-frame points. */
function landmarkVisible(p: NormalizedLandmark): boolean {
  const visibility = p.visibility ?? 1
  return (
    visibility >= MIN_LANDMARK_VISIBILITY &&
    p.x >= 0 &&
    p.x <= 1 &&
    p.y >= 0 &&
    p.y <= 1
  )
}

/** Angle (degrees) between vector (dx, dy) and straight up. Image y grows downward, so -dy is "up". */
function angleDegFromVertical(dx: number, dy: number): number {
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return 0
  const cos = Math.max(-1, Math.min(1, -dy / len))
  return (Math.acos(cos) * 180) / Math.PI
}

/** Shoulder line angle in the image plane (0° = level shoulders). */
function shoulderTiltDeg(left: NormalizedLandmark, right: NormalizedLandmark): number {
  return (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI
}

/**
 * Pick the worst posture issue vs personal baseline. Priority: forward head > uneven shoulders > head tilt.
 */
function classifyIssue(
  neckAngleDeg: number,
  shoulderTiltDeg: number,
  forwardRatio: number,
  shoulderUnevenRatio: number,
  baseline: PostureBaseline
): PostureIssue {
  const forwardHead =
    neckAngleDeg > baseline.neckAngleDeg + FORWARD_HEAD_DELTA ||
    forwardRatio > baseline.forwardRatio + FORWARD_RATIO_DELTA
  const headTilt = Math.abs(shoulderTiltDeg - baseline.shoulderTiltDeg) > HEAD_TILT_DELTA
  const shoulderUneven = shoulderUnevenRatio > SHOULDER_UNEVEN_RATIO

  if (forwardHead) return 'forward_head'
  if (shoulderUneven) return 'shoulder_uneven'
  if (headTilt) return 'head_tilt'
  return 'good'
}

/**
 * Continuous 0–1 deviation score: max normalized excess across all four signals, capped at 1.
 * Used for the posture bar in MetricsPanel.
 */
function computePostureScore(
  neckAngleDeg: number,
  shoulderTiltDeg: number,
  forwardRatio: number,
  shoulderUnevenRatio: number,
  baseline: PostureBaseline
): number {
  const neckExcess = Math.max(0, neckAngleDeg - baseline.neckAngleDeg) / FORWARD_HEAD_DELTA
  const forwardExcess = Math.max(0, forwardRatio - baseline.forwardRatio) / FORWARD_RATIO_DELTA
  const tiltExcess =
    Math.max(0, Math.abs(shoulderTiltDeg - baseline.shoulderTiltDeg)) / HEAD_TILT_DELTA
  const unevenExcess = Math.max(0, shoulderUnevenRatio) / SHOULDER_UNEVEN_RATIO
  return Math.min(1, Math.max(neckExcess, forwardExcess, tiltExcess, unevenExcess))
}

/**
 * Estimate posture metrics for one frame.
 *
 * @param poseLandmarks — MediaPipe Pose 33-point set (normalized [0,1] coords).
 * @param faceNose — Face Landmarker nose tip; preferred over pose nose when present.
 * @param baseline — Personal good posture from calibration; null during calibration window.
 */
export function estimatePosture(
  poseLandmarks: NormalizedLandmark[] | undefined,
  faceNose: { x: number; y: number } | undefined,
  baseline: PostureBaseline | null
): PostureMetrics {
  if (!poseLandmarks?.length) return UNKNOWN_METRICS

  const leftShoulder = poseLandmarks[POSE_LEFT_SHOULDER]
  const rightShoulder = poseLandmarks[POSE_RIGHT_SHOULDER]
  const poseNose = poseLandmarks[POSE_NOSE]

  if (!leftShoulder || !rightShoulder || !poseNose) return UNKNOWN_METRICS
  if (!landmarkVisible(leftShoulder) || !landmarkVisible(rightShoulder)) {
    return UNKNOWN_METRICS
  }

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
  const shoulderWidth = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y)

  // Reject face-only framing: shoulders too close together in normalized coords.
  if (shoulderWidth < MIN_SHOULDER_WIDTH_RATIO) return UNKNOWN_METRICS

  const nose = faceNose ?? poseNose
  const neckDx = nose.x - shoulderMidX
  const neckDy = nose.y - shoulderMidY
  const neckAngleDeg = angleDegFromVertical(neckDx, neckDy)
  const tiltDeg = shoulderTiltDeg(leftShoulder, rightShoulder)
  // How far the nose sits below shoulder midline, normalized by shoulder span.
  const forwardRatio = Math.max(0, nose.y - shoulderMidY) / shoulderWidth
  const shoulderUnevenRatio = Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth

  // Calibration phase: collect raw angles only; no issue/score until baseline exists.
  if (!baseline) {
    return {
      neckAngleDeg,
      shoulderTiltDeg: tiltDeg,
      forwardRatio,
      shoulderWidth,
      postureIssue: 'unknown',
      postureScore: 0,
      trackable: true
    }
  }

  const postureIssue = classifyIssue(
    neckAngleDeg,
    tiltDeg,
    forwardRatio,
    shoulderUnevenRatio,
    baseline
  )
  const postureScore = computePostureScore(
    neckAngleDeg,
    tiltDeg,
    forwardRatio,
    shoulderUnevenRatio,
    baseline
  )

  return {
    neckAngleDeg,
    shoulderTiltDeg: tiltDeg,
    forwardRatio,
    shoulderWidth,
    postureIssue,
    postureScore,
    trackable: true
  }
}

/** User-facing alert copy for `buildAlert` in useVisionLoop (Chinese UI strings). */
export function postureAlertMessage(issue: PostureIssue): string | null {
  switch (issue) {
    case 'forward_head':
      return '请收回下巴，挺直颈椎'
    case 'head_tilt':
      return '头部保持正直，不要歪头'
    case 'shoulder_uneven':
      return '放松肩膀，保持双肩水平'
    default:
      return null
  }
}
