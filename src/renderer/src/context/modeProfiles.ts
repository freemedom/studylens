import type { StudyMode } from '../types/context'

const MODE_LABELS: Record<StudyMode, string> = {
  strict: '严格',
  study: '学习',
  relax: '休闲'
}

export interface ModeProfile {
  mode: StudyMode
  label: string
  thresholdOverrides: Record<string, never>
}

/** Placeholder for future per-mode detection tuning. */
export function getModeProfile(mode: StudyMode): ModeProfile {
  return {
    mode,
    label: MODE_LABELS[mode],
    thresholdOverrides: {}
  }
}

export function getModeLabel(mode: StudyMode): string {
  return MODE_LABELS[mode]
}

export const STUDY_MODES: StudyMode[] = ['strict', 'study', 'relax']
