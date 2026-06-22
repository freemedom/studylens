import { useState } from 'react'
import { LOCATION_RADIUS_HINT, LOCATION_RADIUS_LABEL } from '../context/contextCopy'
import { getModeLabel, STUDY_MODES } from '../context/modeProfiles'
import { buildOpenStreetMapUrl } from '../context/openStreetMapUrl'
import { DEFAULT_LOCATION_RADIUS_M } from '../constants/thresholds'
import { useContextStore } from '../store/contextStore'
import type { ContextRule, StudyMode } from '../types/context'

function ruleSummary(rule: ContextRule): string {
  if (rule.kind === 'wifi') {
    return `WiFi: ${rule.ssid} → ${getModeLabel(rule.mode)}`
  }
  return `定位: ${rule.lat.toFixed(4)}, ${rule.lng.toFixed(4)} (${rule.radiusM}m) → ${getModeLabel(rule.mode)}`
}

export default function ContextModePanel(): React.JSX.Element {
  const activeMode = useContextStore((s) => s.activeMode)
  const contextSource = useContextStore((s) => s.contextSource)
  const matchedRuleId = useContextStore((s) => s.matchedRuleId)
  const currentWifi = useContextStore((s) => s.currentWifi)
  const currentLocation = useContextStore((s) => s.currentLocation)
  const locationError = useContextStore((s) => s.locationError)
  const manualMode = useContextStore((s) => s.manualMode)
  const rules = useContextStore((s) => s.rules)
  const addWifiRule = useContextStore((s) => s.addWifiRule)
  const addLocationRule = useContextStore((s) => s.addLocationRule)
  const removeRule = useContextStore((s) => s.removeRule)
  const setManualMode = useContextStore((s) => s.setManualMode)

  // Local form state for "add rule" / manual-lock controls (not the global `activeMode`).
  // Defaults pre-select sensible modes before the user clicks "添加规则" or "锁定".
  /**
   * React useState — component-local state that survives re-renders.
   *
   * Syntax: const [value, setValue] = useState(initial)
   * - `useState('study')` creates state with initial value `'study'`.
   * - Returns a 2-item array; we destructure it into:
   *     wifiMode      — current value (read in JSX, e.g. <select value={wifiMode}>)
   *     setWifiMode   — updater function; call it with the new value to change
   *                     wifiMode and trigger a re-render (e.g. on dropdown change).
   * - `setWifiMode` is NOT called on this line — only declared. It runs later in
   *   onChange={(e) => setWifiMode(e.target.value as StudyMode)}.
   *
   * This is form UI state only; global active mode lives in contextStore.
   */
  const [wifiMode, setWifiMode] = useState<StudyMode>('study')
  const [locationMode, setLocationMode] = useState<StudyMode>('study')
  const [radiusM, setRadiusM] = useState(DEFAULT_LOCATION_RADIUS_M)
  const [manualSelection, setManualSelection] = useState<StudyMode>('study')
  const matchedRule = rules.find((rule) => rule.id === matchedRuleId) ?? null

  const sourceText =
    contextSource === 'wifi' && matchedRule?.kind === 'wifi'
      ? `WiFi「${matchedRule.ssid}」`
      : contextSource === 'location' && matchedRule?.kind === 'location'
        ? `定位半径 ${matchedRule.radiusM}m`
        : contextSource === 'manual'
          ? '手动锁定'
          : '默认（无匹配规则）'

  return (
    <div className="context-mode-panel">
      <div className="metric-card">
        <div className="metric-label">当前模式</div>
        <div className={`metric-badge mode-badge mode-badge-${activeMode}`}>
          {getModeLabel(activeMode)}
        </div>
        <div className="metric-hint">来源：{sourceText}</div>
      </div>

      <div className="metric-card context-status-card">
        <div className="metric-label">当前情境</div>
        <div className="context-status-row">
          <span>WiFi</span>
          <span>{currentWifi ?? '未检测到 WiFi'}</span>
        </div>
        <div className="context-status-row">
          <span>定位</span>
          <span>
            {currentLocation
              ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
              : locationError ?? '暂无坐标'}
          </span>
        </div>
        {currentLocation && (
          <a
            className="context-map-link"
            href={buildOpenStreetMapUrl(currentLocation.lat, currentLocation.lng)}
            target="_blank"
            rel="noreferrer"
          >
            在地图中查看当前位置
          </a>
        )}
      </div>

      <div className="context-action-card">
        <div className="context-action-title">绑定当前 WiFi</div>
        <div className="context-action-row">
          <select
            className="context-select"
            value={wifiMode}
            onChange={(e) => setWifiMode(e.target.value as StudyMode)}
          >
            {STUDY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {getModeLabel(mode)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-ghost"
            disabled={!currentWifi}
            onClick={() => currentWifi && addWifiRule(currentWifi, wifiMode)}
          >
            添加规则
          </button>
        </div>
      </div>

      <div className="context-action-card">
        <div className="context-action-title">绑定当前位置</div>
        <p className="metric-hint">{LOCATION_RADIUS_HINT}</p>
        <div className="context-action-row">
          <span className="context-field-label">{LOCATION_RADIUS_LABEL}</span>
          <input
            className="context-input"
            type="number"
            min={50}
            max={5000}
            step={50}
            value={radiusM}
            onChange={(e) => setRadiusM(Number(e.target.value) || DEFAULT_LOCATION_RADIUS_M)}
          />
          <span className="context-input-suffix">m</span>
          <select
            className="context-select"
            value={locationMode}
            onChange={(e) => setLocationMode(e.target.value as StudyMode)}
          >
            {STUDY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {getModeLabel(mode)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-ghost"
            disabled={!currentLocation}
            onClick={() =>
              currentLocation &&
              addLocationRule(
                currentLocation.lat,
                currentLocation.lng,
                radiusM,
                locationMode
              )
            }
          >
            添加规则
          </button>
        </div>
      </div>

      {rules.length > 0 && (
        <div className="context-rules">
          <h3>已保存规则</h3>
          <ul>
            {rules.map((rule) => (
              <li key={rule.id}>
                <span>{ruleSummary(rule)}</span>
                <button type="button" className="btn-ghost" onClick={() => removeRule(rule.id)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="context-action-card">
        <div className="context-action-title">手动模式</div>
        <div className="context-action-row">
          <select
            className="context-select"
            value={manualSelection}
            onChange={(e) => setManualSelection(e.target.value as StudyMode)}
          >
            {STUDY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {getModeLabel(mode)}
              </option>
            ))}
          </select>
          <button type="button" className="btn-ghost" onClick={() => setManualMode(manualSelection)}>
            锁定
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={manualMode === null}
            onClick={() => setManualMode(null)}
          >
            恢复自动
          </button>
        </div>
        {manualMode && (
          <div className="metric-hint">已手动锁定为「{getModeLabel(manualMode)}」</div>
        )}
      </div>
    </div>
  )
}
