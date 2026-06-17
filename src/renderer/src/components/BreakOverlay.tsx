import { useEffect } from 'react'
import { useSessionStore } from '../store/sessionStore'

export default function BreakOverlay(): React.JSX.Element | null {
  const showBreak = useSessionStore((s) => s.showBreak)
  const breakSecondsLeft = useSessionStore((s) => s.breakSecondsLeft)

  useEffect(() => {
    if (!showBreak) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Space') {
        useSessionStore.setState({ showBreak: false, breakSecondsLeft: 0 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showBreak])

  if (!showBreak) return null

  return (
    <div className="break-overlay">
      <div className="break-card">
        <h2>休息一下眼睛</h2>
        <p>请看向 6 米外，放松 20 秒（20-20-20 法则）</p>
        <div className="break-timer">{breakSecondsLeft}</div>
        <p className="break-hint">按空格键可提前关闭</p>
      </div>
    </div>
  )
}
