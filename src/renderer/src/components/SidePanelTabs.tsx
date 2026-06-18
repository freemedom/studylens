import { useState } from 'react'
import ContextModePanel from './ContextModePanel'
import MetricsPanel from './MetricsPanel'

type SidePanelTab = 'metrics' | 'context'

const TABS: { id: SidePanelTab; label: string }[] = [
  { id: 'metrics', label: '实时指标' },
  { id: 'context', label: '情境模式' }
]

export default function SidePanelTabs(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SidePanelTab>('metrics')

  return (
    <div className="side-panel-tabs">
      <div className="side-panel-tab-bar" role="tablist" aria-label="侧栏面板">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`side-panel-tab${activeTab === tab.id ? ' active' : ''}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="side-panel-content" role="tabpanel">
        {activeTab === 'metrics' ? <MetricsPanel /> : <ContextModePanel />}
      </div>
    </div>
  )
}
