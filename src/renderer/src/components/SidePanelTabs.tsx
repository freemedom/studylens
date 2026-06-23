import { useState } from 'react'
import ContextModePanel from './ContextModePanel'
import MetricsPanel from './MetricsPanel'

type SidePanelTab = 'metrics' | 'context'

const TABS: { id: SidePanelTab; label: string }[] = [
  { id: 'metrics', label: 'Live metrics' },
  { id: 'context', label: 'Context modes' }
]

export default function SidePanelTabs(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SidePanelTab>('metrics')

  return (
    <div className="side-panel-tabs">
      <div className="side-panel-tab-bar" role="tablist" aria-label="Side panel">
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
