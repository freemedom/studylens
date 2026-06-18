import type { StudyMode } from '../types/context'

const MODE_LABELS: Record<StudyMode, string> = {
  focus: '专注',
  home: '居家',
  library: '图书馆',
  cafe: '咖啡馆'
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

export const STUDY_MODES: StudyMode[] = ['focus', 'home', 'library', 'cafe']
