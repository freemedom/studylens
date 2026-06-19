import { ElectronAPI } from '@electron-toolkit/preload'

export interface StudyLensAPI {
  getWifiSSID: () => Promise<string | null>
  getPlatform: () => Promise<NodeJS.Platform>
  isGeolocationConfigured: () => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: StudyLensAPI
  }
}
