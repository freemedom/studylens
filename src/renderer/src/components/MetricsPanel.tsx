import { useSessionStore } from '../store/sessionStore'
import type { ActivePostureIssue, DistanceStatus, Mood } from '../types/metrics'

const MOOD_LABELS: Record<Mood, string> = {
  focused: 'Focused',
  tired: 'Tired',
  restless: 'Restless',
  unknown: 'Unknown'
}

const MOOD_CLASS: Record<Mood, string> = {
  focused: 'mood-focused',
  tired: 'mood-tired',
  restless: 'mood-restless',
  unknown: 'mood-unknown'
}

const DISTANCE_LABELS: Record<DistanceStatus, string> = {
  good: 'Good distance',
  too_near: 'Too close',
  too_far: 'Too far',
  none: '—'
}

const POSTURE_LABELS: Record<ActivePostureIssue, string> = {
  forward_head: 'Forward head',
  head_tilt: 'Head tilt',
  shoulder_uneven: 'Uneven shoulders'
}

const POSTURE_CLASS: Record<ActivePostureIssue, string> = {
  forward_head: 'posture-bad',
  head_tilt: 'posture-bad',
  shoulder_uneven: 'posture-bad'
}

export default function MetricsPanel(): React.JSX.Element {
  const blinkCount = useSessionStore((s) => s.blinkCount)
  const blinksPerMinute = useSessionStore((s) => s.blinksPerMinute)
  const ear = useSessionStore((s) => s.ear)
  const mood = useSessionStore((s) => s.mood)
  const faceRatio = useSessionStore((s) => s.faceRatio)
  const distanceStatus = useSessionStore((s) => s.distanceStatus)
  const fatigueLevel = useSessionStore((s) => s.fatigueLevel)
  const isRunning = useSessionStore((s) => s.isRunning)
  const distanceAlerts = useSessionStore((s) => s.distanceAlerts)
  const tiredSamples = useSessionStore((s) => s.tiredSamples)
  const postureAlerts = useSessionStore((s) => s.postureAlerts)
  const postureIssues = useSessionStore((s) => s.postureIssues)
  const postureTrackable = useSessionStore((s) => s.postureTrackable)
  const neckAngleDeg = useSessionStore((s) => s.neckAngleDeg)
  const shoulderTiltDeg = useSessionStore((s) => s.shoulderTiltDeg)
  const forwardRatio = useSessionStore((s) => s.forwardRatio)
  const headOffsetRatio = useSessionStore((s) => s.headOffsetRatio)
  const postureScore = useSessionStore((s) => s.postureScore)
  const postureBaseline = useSessionStore((s) => s.postureBaseline)
  const calibrationMessage = useSessionStore((s) => s.calibrationMessage)
  const history = useSessionStore((s) => s.history)

  const distancePercent = Math.min(100, Math.round(faceRatio * 200))

  return (
    <div className="metrics-panel">
      <div className="metric-card">
        <div className="metric-label">Total blinks</div>
        <div className="metric-value">{blinkCount}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Blinks (last minute)</div>
        <div className="metric-value">{blinksPerMinute}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">EAR (eye aspect ratio)</div>
        <div className="metric-value small">{ear.toFixed(3)}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Mood</div>
        <div className={`metric-badge ${MOOD_CLASS[mood]}`}>{MOOD_LABELS[mood]}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Screen distance</div>
        <div className="metric-value small">{DISTANCE_LABELS[distanceStatus]}</div>
        <div className="distance-bar">
          <div
            className={`distance-fill status-${distanceStatus}`}
            style={{ width: `${distancePercent}%` }}
          />
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Posture</div>
        <div className="posture-badges">
          {!isRunning || !postureTrackable ? (
            <div className="metric-badge posture-unknown">Not detected</div>
          ) : postureIssues.length === 0 ? (
            <div className="metric-badge posture-good">Good posture</div>
          ) : (
            postureIssues.map((issue) => (
              <div key={issue} className={`metric-badge ${POSTURE_CLASS[issue]}`}>
                {POSTURE_LABELS[issue]}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Forward / head tilt offset</div>
        <div className="metric-value small">
          {forwardRatio.toFixed(3)} / {headOffsetRatio.toFixed(3)}
        </div>
        {postureBaseline && (
          <div className="metric-hint">
            Baseline {postureBaseline.forwardRatio.toFixed(3)} /{' '}
            {postureBaseline.headOffsetRatio.toFixed(3)}
          </div>
        )}
      </div>
      <div className="metric-card">
        <div className="metric-label">Neck angle / shoulder tilt</div>
        <div className="metric-value small">
          {neckAngleDeg.toFixed(1)}° / {shoulderTiltDeg.toFixed(1)}°
        </div>
        {postureBaseline && (
          <div className="metric-hint">
            Baseline {postureBaseline.neckAngleDeg.toFixed(1)}° /{' '}
            {postureBaseline.shoulderTiltDeg.toFixed(1)}°
          </div>
        )}
      </div>
      <div className="metric-card">
        <div className="metric-label">Posture deviation</div>
        <div className="fatigue-bar">
          <div
            className="posture-fill"
            style={{ width: `${Math.min(100, postureScore * 100)}%` }}
          />
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Fatigue level</div>
        <div className="fatigue-bar">
          <div className="fatigue-fill" style={{ width: `${fatigueLevel * 100}%` }} />
        </div>
      </div>
      {calibrationMessage && (
        <div className="calibration-message">{calibrationMessage}</div>
      )}
      {isRunning && (
        <div className="session-stats">
          <span>Distance alerts: {distanceAlerts}</span>
          <span>Fatigue events: {tiredSamples}</span>
          <span>Posture alerts: {postureAlerts}</span>
        </div>
      )}
      {history.length > 0 && (
        <div className="history">
          <h3>Recent sessions</h3>
          <ul>
            {history.slice(0, 3).map((s) => (
              <li key={s.id}>
                {new Date(s.startedAt).toLocaleString()} — {s.blinkCount} blinks, {s.tiredSamples}{' '}
                fatigue, {s.postureAlerts ?? 0} posture
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
