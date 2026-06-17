import { useSessionStore } from '../store/sessionStore'

export default function AlertBanner(): React.JSX.Element | null {
  const alertMessage = useSessionStore((s) => s.alertMessage)
  if (!alertMessage) return null
  return <div className="alert-banner">{alertMessage}</div>
}
