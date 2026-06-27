export type Phase = 'focus' | 'shortBreak' | 'longBreak'
export type SoundType = 'chime' | 'bell' | 'digital' | 'retro' | 'custom' | 'none'
export type AppView = 'timer' | 'activity' | 'settings'

export interface PhaseColors {
  focus: string
  shortBreak: string
  longBreak: string
}

export interface AppSettings {
  colors: PhaseColors
  sound: SoundType
  durations: { focus: number; shortBreak: number; longBreak: number }
  customSoundName?: string   // display name only — actual file lives in IndexedDB
}

export interface DayActivity {
  date: string  // 'YYYY-MM-DD'
  focusMinutes: number
  sessions: number
}
