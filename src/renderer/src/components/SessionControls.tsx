import { useSessionStore } from '../store/sessionStore'

export default function SessionControls(): React.JSX.Element {
  const isRunning = useSessionStore((s) => s.isRunning)
  const isReady = useSessionStore((s) => s.isReady)
  const startSession = useSessionStore((s) => s.startSession)
  const stopSession = useSessionStore((s) => s.stopSession)

  return (
    <div className="session-controls">
      {!isRunning ? (
        <button type="button" className="btn-primary" disabled={!isReady} onClick={startSession}>
          开始学习会话
        </button>
      ) : (
        <button type="button" className="btn-secondary" onClick={stopSession}>
          结束会话
        </button>
      )}
    </div>
  )
}
