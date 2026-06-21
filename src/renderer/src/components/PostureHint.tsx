import { useSessionStore } from '../store/sessionStore'
import type { ActivePostureIssue } from '../types/metrics'

const HINT_TEXT: Record<ActivePostureIssue, string> = {
  forward_head: '收回下巴，让耳朵与肩线对齐',
  head_tilt: '头部摆正，目视屏幕中央',
  shoulder_uneven: '双肩下沉，保持水平'
}

export default function PostureHint(): React.JSX.Element | null {
  const showPostureHint = useSessionStore((s) => s.showPostureHint)
  const postureIssues = useSessionStore((s) => s.postureIssues)

  if (!showPostureHint || postureIssues.length === 0) {
    return null
  }

  return (
    <div className="posture-hint posture-hint-multi">
      <div className="posture-hint-title">姿势提醒</div>
      {postureIssues.map((issue) => (
        <div key={issue} className={`posture-hint-text posture-hint-${issue}`}>
          {HINT_TEXT[issue]}
        </div>
      ))}
    </div>
  )
}
