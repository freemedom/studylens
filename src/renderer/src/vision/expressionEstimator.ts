import type { Category } from '@mediapipe/tasks-vision'
import { BLINK_RATE_LOW } from '../constants/thresholds'
import type { Mood } from '../types/metrics'

/** Read a single MediaPipe face blendshape score by category name (0 if missing). */
function blendScore(blendshapes: Category[] | undefined, name: string): number {
  return blendshapes?.find((b) => b.categoryName === name)?.score ?? 0
}

/**
 * Heuristic mood estimator for the study session UI.
 *
 * Called once per vision frame from `useVisionLoop` with outputs from BlinkDetector
 * and MediaPipe Face Landmarker. Returns a single `Mood` label used by MetricsPanel,
 * fatigue scoring, and break suggestions.
 *
 * ## Inputs (per frame)
 * - `blendshapes` — MediaPipe ARKit-style face coefficients in [0, 1].
 * - `nose` — landmark index 1 (nose tip); proxy for head pose in normalized image space.
 * - `blinksPerMinute` — rolling count over the last 60 s (see `BLINK_HISTORY_MS`).
 * - `ear` — Eye Aspect Ratio; lower values mean more closed / droopy eyelids.
 *
 * ## Signals computed inside `update`
 * 1. **headJitter** — sum of Euclidean distances between consecutive nose positions
 *    over a 2 s sliding window. Captures fidgeting / looking away without training
 *    a separate head-pose model. Coordinates are normalized [0, 1], so thresholds
 *    are tuned empirically for webcam distance.
 * 2. **brow** — sum of `browDownLeft`, `browDownRight`, and `browInnerUp` scores.
 *    Raised inner brows and lowered outer brows often appear under concentration strain.
 * 3. **mouth** — sum of `mouthFrownLeft` and `mouthFrownRight`; frown correlates with
 *    discomfort or negative affect during long screen use.
 *
 * ## Decision tree (first match wins)
 * | Condition | Mood | Rationale |
 * |-----------|------|-----------|
 * | no nose landmark | `unknown` | face not reliably tracked |
 * | blinks/min < 10 OR EAR < 0.19 | `tired` | low blink rate and droopy eyes are classic fatigue cues (EAR 0.19 is slightly below the blink-close threshold 0.21) |
 * | headJitter > 0.035 OR brow > 1.2 OR mouth > 0.8 | `restless` | physical restlessness or expressive tension while still awake |
 * | otherwise | `focused` | stable head, normal blinks, neutral-to-attentive face |
 *
 * `tired` is checked before `restless` so physiological fatigue is not masked by movement.
 */
export class ExpressionEstimator {
  /** Recent nose positions used to measure head jitter over a sliding window. */
  private headHistory: { x: number; y: number; t: number }[] = []

  /** Clear head-movement history when a new study session starts. */
  reset(): void {
    this.headHistory = []
  }

  /**
   * Ingest one frame of face data and return the current mood label.
   * All thresholds are fixed constants chosen for demo stability, not ML calibration.
   */
  update(
    blendshapes: Category[] | undefined,
    nose: { x: number; y: number } | undefined,
    blinksPerMinute: number,
    ear: number,
    now = Date.now()
  ): Mood {
    if (!nose) return 'unknown'

    // Append current nose tip; drop samples older than 2 s so jitter reflects recent behavior.
    this.headHistory.push({ x: nose.x, y: nose.y, t: now })
    this.headHistory = this.headHistory.filter((p) => now - p.t <= 2000)

    // Total path length of the nose over the window (requires ≥3 points to be meaningful).
    let headJitter = 0
    if (this.headHistory.length > 2) {
      for (let i = 1; i < this.headHistory.length; i++) {
        const prev = this.headHistory[i - 1]
        const curr = this.headHistory[i]
        headJitter += Math.hypot(curr.x - prev.x, curr.y - prev.y)
      }
    }

    // Aggregate blendshape groups; each score is already in [0, 1], sums can exceed 1.
    const brow =
      blendScore(blendshapes, 'browDownLeft') +
      blendScore(blendshapes, 'browDownRight') +
      blendScore(blendshapes, 'browInnerUp')
    const mouth =
      blendScore(blendshapes, 'mouthFrownLeft') + blendScore(blendshapes, 'mouthFrownRight')

    // Step 1 — fatigue: infrequent blinks or partially closed eyes.
    if (blinksPerMinute < BLINK_RATE_LOW || ear < 0.19) return 'tired'
    // Step 2 — restlessness: large head motion or strained facial expression.
    if (headJitter > 0.035 || brow > 1.2 || mouth > 0.8) return 'restless'
    // Step 3 — default attentive state when no fatigue or restlessness cues fire.
    return 'focused'
  }
}
