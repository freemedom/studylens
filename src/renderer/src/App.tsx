import AlertBanner from './components/AlertBanner'
import BreakOverlay from './components/BreakOverlay'
import CameraPreview from './components/CameraPreview'
import FatigueOverlay from './components/FatigueOverlay'
import ModeBadge from './components/ModeBadge'
import PostureCalibrationOverlay from './components/PostureCalibrationOverlay'
import PostureHint from './components/PostureHint'
import SessionControls from './components/SessionControls'
import SidePanelTabs from './components/SidePanelTabs'
import { useContextDetector } from './hooks/useContextDetector'

function App(): React.JSX.Element {
  useContextDetector()

  return (
    <div className="app">
      <FatigueOverlay />
      <header className="app-header">
        <div>
          <h1>StudyLens</h1>
          <p className="subtitle">
            摄像头学习助手 — 眨眼 · 疲劳 · 距离 · 坐姿
            <ModeBadge />
          </p>
        </div>
        <SessionControls />
      </header>
      <AlertBanner />
      <main className="app-main">
        <CameraPreview />
        <div className="side-panels">
          <SidePanelTabs />
        </div>
      </main>
      <PostureHint />
      <BreakOverlay />
      <PostureCalibrationOverlay />
    </div>
  )
}

export default App
