export const BLINK_EAR_THRESHOLD = 0.21
export const BLINK_RATE_LOW = 10
export const FACE_RATIO_NEAR = 0.42
export const FACE_RATIO_FAR = 0.20
export const FATIGUE_BREAK_SECONDS = 20
export const BLINK_HISTORY_MS = 60_000
export const SESSIONS_STORAGE_KEY = 'studylens_sessions'

export const POSTURE_CALIBRATION_MS = 5000
export const FORWARD_RATIO_DELTA = 0.12
export const HEAD_OFFSET_DELTA = 0.06
export const SHOULDER_UNEVEN_DELTA = 0.04
export const POSTURE_ALERT_HOLD_MS = 3000

/** @deprecated No longer used for classification; kept for debug display compatibility. */
export const FORWARD_HEAD_DELTA = 12
/** @deprecated No longer used for classification; kept for debug display compatibility. */
export const HEAD_TILT_DELTA = 8
/** @deprecated No longer used for classification; kept for debug display compatibility. */
export const SHOULDER_UNEVEN_RATIO = 0.08

/** Fallback when calibration collects too few valid frames. */
export const DEFAULT_NECK_ANGLE_DEG = 15
export const DEFAULT_SHOULDER_TILT_DEG = 0
export const DEFAULT_FORWARD_RATIO = 0.35
export const DEFAULT_HEAD_OFFSET_RATIO = 0.05
export const DEFAULT_SHOULDER_UNEVEN_RATIO = 0.03

export const CONTEXT_POLL_MS = 30_000
export const CONTEXT_RULES_STORAGE_KEY = 'studylens_context_rules'
export const MANUAL_MODE_STORAGE_KEY = 'studylens_manual_mode'
export const DEFAULT_LOCATION_RADIUS_M = 300
