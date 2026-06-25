import { useEffect, useState } from 'react'
import { useSessionStore } from '../store/sessionStore'
import type {
  ActivePostureIssue,
  MoodEventCounts,
  PostureAlertCounts,
  SessionMood,
  SessionSummary
} from '../types/metrics'
import { formatDuration, formatSessionWhen } from '../utils/sessionFormat'

const MOOD_ORDER: SessionMood[] = ['focused', 'tired', 'restless', 'distracted']

const MOOD_LABELS: Record<SessionMood, string> = {
  focused: 'Focused',
  tired: 'Tired',
  restless: 'Restless',
  distracted: 'Distracted'
}

const POSTURE_ORDER: ActivePostureIssue[] = ['forward_head', 'head_tilt', 'shoulder_uneven']

const POSTURE_LABELS: Record<ActivePostureIssue, string> = {
  forward_head: 'Forward head',
  head_tilt: 'Head tilt',
  shoulder_uneven: 'Uneven shoulders'
}

interface SessionCardProps {
  title: string
  whenLabel?: string
  durationSec: number
  blinkCount: number
  avgBlinksPerMinute?: number
  distanceAlerts: number
  moodEvents: MoodEventCounts
  postureAlerts: PostureAlertCounts
  liveDuration?: boolean
  sessionStart?: number | null
}

function SessionCard({
  title,
  whenLabel,
  durationSec,
  blinkCount,
  avgBlinksPerMinute,
  distanceAlerts,
  moodEvents,
  postureAlerts,
  liveDuration,
  sessionStart
}: SessionCardProps): React.JSX.Element {
  const [liveDurationSec, setLiveDurationSec] = useState(durationSec)

  useEffect(() => {
    if (!liveDuration || sessionStart == null) {
      setLiveDurationSec(durationSec)
      return
    }
    const tick = (): void => {
      setLiveDurationSec(Math.max(Math.round((Date.now() - sessionStart) / 1000), 0))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [durationSec, liveDuration, sessionStart])

  const displayDuration = liveDuration ? liveDurationSec : durationSec

  return (
    <div className="metric-card session-history-card">
      <div className="session-history-card-header">
        <div className="metrics-section-title">{title}</div>
        {whenLabel && <span className="session-history-when">{whenLabel}</span>}
      </div>
      <div className="session-history-stat-grid">
        <div className="session-history-stat">
          <span className="session-history-stat-label">Duration</span>
          <span className="session-history-stat-value">{formatDuration(displayDuration)}</span>
        </div>
        <div className="session-history-stat">
          <span className="session-history-stat-label">Blinks</span>
          <span className="session-history-stat-value">{blinkCount}</span>
        </div>
        {avgBlinksPerMinute != null && (
          <div className="session-history-stat">
            <span className="session-history-stat-label">Blink rate</span>
            <span className="session-history-stat-value">{avgBlinksPerMinute}/min</span>
          </div>
        )}
        <div className="session-history-stat">
          <span className="session-history-stat-label">Distance alerts</span>
          <span className="session-history-stat-value">{distanceAlerts}</span>
        </div>
      </div>
      <div className="session-history-group">
        <div className="session-history-group-title">Mood events</div>
        <div className="session-history-stat-grid session-history-stat-grid--compact">
          {MOOD_ORDER.map((mood) => (
            <div key={mood} className="session-history-stat">
              <span className="session-history-stat-label">{MOOD_LABELS[mood]}</span>
              <span className="session-history-stat-value">{moodEvents[mood]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="session-history-group">
        <div className="session-history-group-title">Posture alerts</div>
        <div className="session-history-stat-grid session-history-stat-grid--compact">
          {POSTURE_ORDER.map((issue) => (
            <div key={issue} className="session-history-stat">
              <span className="session-history-stat-label">{POSTURE_LABELS[issue]}</span>
              <span className="session-history-stat-value">{postureAlerts[issue]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HistorySessionCard({ session }: { session: SessionSummary }): React.JSX.Element {
  return (
    <SessionCard
      title="Session"
      whenLabel={formatSessionWhen(session.startedAt)}
      durationSec={session.durationSec}
      blinkCount={session.blinkCount}
      avgBlinksPerMinute={session.avgBlinksPerMinute}
      distanceAlerts={session.distanceAlerts}
      moodEvents={session.moodEvents}
      postureAlerts={session.postureAlerts}
    />
  )
}

export default function SessionHistoryPanel(): React.JSX.Element {
  const isRunning = useSessionStore((s) => s.isRunning)
  const sessionStart = useSessionStore((s) => s.sessionStart)
  const blinkCount = useSessionStore((s) => s.blinkCount)
  const blinksPerMinute = useSessionStore((s) => s.blinksPerMinute)
  const distanceAlerts = useSessionStore((s) => s.distanceAlerts)
  const moodEvents = useSessionStore((s) => s.moodEvents)
  const postureAlerts = useSessionStore((s) => s.postureAlerts)
  const history = useSessionStore((s) => s.history)

  return (
    <div className="session-history-panel">
      {isRunning && (
        <SessionCard
          title="Current session"
          whenLabel={sessionStart ? formatSessionWhen(new Date(sessionStart).toISOString()) : undefined}
          durationSec={0}
          blinkCount={blinkCount}
          avgBlinksPerMinute={blinksPerMinute}
          distanceAlerts={distanceAlerts}
          moodEvents={moodEvents}
          postureAlerts={postureAlerts}
          liveDuration
          sessionStart={sessionStart}
        />
      )}

      <div className="metrics-section-title">Recent sessions</div>
      {history.length === 0 ? (
        <p className="session-history-empty">No sessions yet — start one from the header.</p>
      ) : (
        <div className="session-history-list">
          {history.map((session) => (
            <HistorySessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
