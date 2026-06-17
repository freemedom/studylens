import type { Category } from '@mediapipe/tasks-vision'
import { BLINK_RATE_LOW } from '../constants/thresholds'
import type { Mood } from '../types/metrics'

function blendScore(blendshapes: Category[] | undefined, name: string): number {
  return blendshapes?.find((b) => b.categoryName === name)?.score ?? 0
}

export class ExpressionEstimator {
  private headHistory: { x: number; y: number; t: number }[] = []

  reset(): void {
    this.headHistory = []
  }

  update(
    blendshapes: Category[] | undefined,
    nose: { x: number; y: number } | undefined,
    blinksPerMinute: number,
    ear: number,
    now = Date.now()
  ): Mood {
    if (!nose) return 'unknown'

    this.headHistory.push({ x: nose.x, y: nose.y, t: now })
    this.headHistory = this.headHistory.filter((p) => now - p.t <= 2000)

    let headJitter = 0
    if (this.headHistory.length > 2) {
      for (let i = 1; i < this.headHistory.length; i++) {
        const prev = this.headHistory[i - 1]
        const curr = this.headHistory[i]
        headJitter += Math.hypot(curr.x - prev.x, curr.y - prev.y)
      }
    }

    const brow =
      blendScore(blendshapes, 'browDownLeft') +
      blendScore(blendshapes, 'browDownRight') +
      blendScore(blendshapes, 'browInnerUp')
    const mouth =
      blendScore(blendshapes, 'mouthFrownLeft') + blendScore(blendshapes, 'mouthFrownRight')

    if (blinksPerMinute < BLINK_RATE_LOW || ear < 0.19) return 'tired'
    if (headJitter > 0.035 || brow > 1.2 || mouth > 0.8) return 'restless'
    return 'focused'
  }
}
