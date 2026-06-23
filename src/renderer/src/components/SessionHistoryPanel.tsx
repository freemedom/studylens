import { useSessionStore } from '../store/sessionStore'

export default function SessionHistoryPanel(): React.JSX.Element {
  const isRunning = useSessionStore((s) => s.isRunning)
  const distanceAlerts = useSessionStore((s) => s.distanceAlerts)
  const tiredSamples = useSessionStore((s) => s.tiredSamples)
  const postureAlerts = useSessionStore((s) => s.postureAlerts)
  const history = useSessionStore((s) => s.history)

  return (
    <div className="session-history-panel">
      {isRunning && (
        <div className="metric-card session-history-current">
          <div className="metrics-section-title">Current session</div>
          <div className="session-stats">
            <span>Distance alerts: {distanceAlerts}</span>
            <span>Fatigue events: {tiredSamples}</span>
            <span>Posture alerts: {postureAlerts}</span>
          </div>
        </div>
      )}

      <div className="metrics-section-title">Recent sessions</div>
      {history.length === 0 ? (
        <p className="session-history-empty">No sessions yet — start one from the header.</p>
      ) : (
        <ul className="session-history-list">
          {history.slice(0, 10).map((s) => (
            <li key={s.id}>
              {new Date(s.startedAt).toLocaleString()} — {s.blinkCount} blinks, {s.tiredSamples}{' '}
              fatigue, {s.postureAlerts ?? 0} posture
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
