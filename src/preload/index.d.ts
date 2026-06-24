import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      toggleAlwaysOnTop: (flag: boolean) => Promise<void>
    }
  }
}
