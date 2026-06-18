import { useSessionStore } from '../store/sessionStore'
import type { PostureIssue } from '../types/metrics'

const HINT_TEXT: Record<Exclude<PostureIssue, 'good' | 'unknown'>, string> = {
  forward_head: '收回下巴，让耳朵与肩线对齐',
  head_tilt: '头部摆正，目视屏幕中央',
  shoulder_uneven: '双肩下沉，保持水平'
}

export default function PostureHint(): React.JSX.Element | null {
  const showPostureHint = useSessionStore((s) => s.showPostureHint)
  const postureIssue = useSessionStore((s) => s.postureIssue)

  if (!showPostureHint || postureIssue === 'good' || postureIssue === 'unknown') {
    return null
  }

  return (
    <div className={`posture-hint posture-hint-${postureIssue}`}>
      <div className="posture-hint-title">姿势提醒</div>
      <div className="posture-hint-text">{HINT_TEXT[postureIssue]}</div>
    </div>
  )
}
