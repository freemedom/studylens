import { ElectronAPI } from '@electron-toolkit/preload'

export interface StudyLensAPI {
  getWifiSSID: () => Promise<string | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: StudyLensAPI
  }
}
