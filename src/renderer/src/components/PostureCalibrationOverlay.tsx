import { useSessionStore } from '../store/sessionStore'

export default function PostureCalibrationOverlay(): React.JSX.Element | null {
  const calibrationPhase = useSessionStore((s) => s.calibrationPhase)
  const calibrationSecondsLeft = useSessionStore((s) => s.calibrationSecondsLeft)
  const beginCalibrationRecording = useSessionStore((s) => s.beginCalibrationRecording)
  const cancelCalibration = useSessionStore((s) => s.cancelCalibration)

  if (calibrationPhase !== 'preparing' && calibrationPhase !== 'running') return null

  if (calibrationPhase === 'preparing') {
    return (
      <div className="break-overlay calibration-overlay">
        <div className="break-card calibration-card">
          <h2>坐姿校准</h2>
          <p>请坐直，双肩放松，面向屏幕，确保双肩在画面中</p>
          <p className="break-hint">调整好后点击下方按钮开始记录你的健康坐姿基准</p>
          <button type="button" className="btn-primary" onClick={beginCalibrationRecording}>
            我已坐好，开始校准
          </button>
          <button type="button" className="btn-secondary calibration-cancel" onClick={cancelCalibration}>
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="break-overlay calibration-overlay">
      <div className="break-card calibration-card">
        <h2>坐姿校准</h2>
        <p>请坐直，双肩放松，面向屏幕，确保双肩在画面中</p>
        <div className="break-timer">{calibrationSecondsLeft}</div>
        <p className="break-hint">保持当前姿势，正在记录你的健康坐姿基准</p>
        <button type="button" className="btn-secondary calibration-cancel" onClick={cancelCalibration}>
          取消
        </button>
      </div>
    </div>
  )
}
