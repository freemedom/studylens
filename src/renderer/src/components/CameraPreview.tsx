import { useRef } from 'react'
import { useVisionLoop } from '../hooks/useVisionLoop'
import { useSessionStore } from '../store/sessionStore'

export default function CameraPreview(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isReady = useSessionStore((s) => s.isReady)
  const error = useSessionStore((s) => s.error)
  const showMesh = useSessionStore((s) => s.showMesh)
  const toggleMesh = useSessionStore((s) => s.toggleMesh)

  useVisionLoop(videoRef, canvasRef)

  return (
    <div className="camera-preview">
      <div className="camera-header">
        <span>摄像头</span>
        <button type="button" className="btn-ghost" onClick={toggleMesh}>
          {showMesh ? '隐藏网格' : '显示网格'}
        </button>
      </div>
      <div className="camera-frame">
        <video ref={videoRef} className="camera-video" muted playsInline />
        <canvas ref={canvasRef} className="camera-overlay" />
        {!isReady && !error && <div className="camera-loading">正在加载模型与摄像头…</div>}
        {error && <div className="camera-error">{error}</div>}
      </div>
    </div>
  )
}
