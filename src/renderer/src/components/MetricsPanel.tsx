import { useSessionStore } from '../store/sessionStore'
import type { DistanceStatus, Mood, PostureIssue } from '../types/metrics'

const MOOD_LABELS: Record<Mood, string> = {
  focused: '专注',
  tired: '疲劳',
  restless: '烦躁',
  unknown: '未知'
}

const MOOD_CLASS: Record<Mood, string> = {
  focused: 'mood-focused',
  tired: 'mood-tired',
  restless: 'mood-restless',
  unknown: 'mood-unknown'
}

const DISTANCE_LABELS: Record<DistanceStatus, string> = {
  good: '距离合适',
  too_near: '太近',
  too_far: '太远',
  none: '—'
}

const POSTURE_LABELS: Record<PostureIssue, string> = {
  good: '坐姿良好',
  forward_head: '颈椎前倾',
  head_tilt: '头部歪斜',
  shoulder_uneven: '高低肩',
  unknown: '未检测'
}

const POSTURE_CLASS: Record<PostureIssue, string> = {
  good: 'posture-good',
  forward_head: 'posture-bad',
  head_tilt: 'posture-bad',
  shoulder_uneven: 'posture-bad',
  unknown: 'posture-unknown'
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
  const postureIssue = useSessionStore((s) => s.postureIssue)
  const neckAngleDeg = useSessionStore((s) => s.neckAngleDeg)
  const shoulderTiltDeg = useSessionStore((s) => s.shoulderTiltDeg)
  const postureScore = useSessionStore((s) => s.postureScore)
  const postureBaseline = useSessionStore((s) => s.postureBaseline)
  const calibrationMessage = useSessionStore((s) => s.calibrationMessage)
  const history = useSessionStore((s) => s.history)

  const distancePercent = Math.min(100, Math.round(faceRatio * 200))

  return (
    <div className="metrics-panel">
      <div className="metric-card">
        <div className="metric-label">眨眼总数</div>
        <div className="metric-value">{blinkCount}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">最近 1 分钟眨眼</div>
        <div className="metric-value">{blinksPerMinute}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">EAR（眼裂比）</div>
        <div className="metric-value small">{ear.toFixed(3)}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">状态</div>
        <div className={`metric-badge ${MOOD_CLASS[mood]}`}>{MOOD_LABELS[mood]}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">屏幕距离</div>
        <div className="metric-value small">{DISTANCE_LABELS[distanceStatus]}</div>
        <div className="distance-bar">
          <div
            className={`distance-fill status-${distanceStatus}`}
            style={{ width: `${distancePercent}%` }}
          />
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">坐姿状态</div>
        <div className={`metric-badge ${POSTURE_CLASS[postureIssue]}`}>
          {POSTURE_LABELS[postureIssue]}
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">颈角 / 肩倾</div>
        <div className="metric-value small">
          {neckAngleDeg.toFixed(1)}° / {shoulderTiltDeg.toFixed(1)}°
        </div>
        {postureBaseline && (
          <div className="metric-hint">
            基准 {postureBaseline.neckAngleDeg.toFixed(1)}° /{' '}
            {postureBaseline.shoulderTiltDeg.toFixed(1)}°
          </div>
        )}
      </div>
      <div className="metric-card">
        <div className="metric-label">姿势偏差</div>
        <div className="fatigue-bar">
          <div
            className="posture-fill"
            style={{ width: `${Math.min(100, postureScore * 100)}%` }}
          />
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">疲劳指数</div>
        <div className="fatigue-bar">
          <div className="fatigue-fill" style={{ width: `${fatigueLevel * 100}%` }} />
        </div>
      </div>
      {calibrationMessage && (
        <div className="calibration-message">{calibrationMessage}</div>
      )}
      {isRunning && (
        <div className="session-stats">
          <span>距离提醒：{distanceAlerts}</span>
          <span>疲劳事件：{tiredSamples}</span>
          <span>坐姿提醒：{postureAlerts}</span>
        </div>
      )}
      {history.length > 0 && (
        <div className="history">
          <h3>最近会话</h3>
          <ul>
            {history.slice(0, 3).map((s) => (
              <li key={s.id}>
                {new Date(s.startedAt).toLocaleString()} — 眨眼 {s.blinkCount}，疲劳{' '}
                {s.tiredSamples} 次，坐姿 {s.postureAlerts ?? 0} 次
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
