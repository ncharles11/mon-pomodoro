import { useState, useEffect } from 'react'
import type { AppSettings, PhaseColors, SoundType } from '../types'

const STORAGE_KEY = 'mon-pomodoro-settings-v1'

// Palette cyberpunk par défaut
export const DEFAULT_SETTINGS: AppSettings = {
  colors: {
    focus:      '#ff2d78',  // rose néon
    shortBreak: '#00e5ff',  // cyan néon
    longBreak:  '#be5bfa',  // violet néon
  },
  sound: 'chime',
  durations: { focus: 25, shortBreak: 5, longBreak: 15 },
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    // Deep merge to handle new keys added in future versions
    return {
      colors:    { ...DEFAULT_SETTINGS.colors,    ...parsed.colors    },
      sound:     parsed.sound     ?? DEFAULT_SETTINGS.sound,
      durations: { ...DEFAULT_SETTINGS.durations, ...parsed.durations },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(load)

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const updateColors = (patch: Partial<PhaseColors>): void =>
    setSettings(s => ({ ...s, colors: { ...s.colors, ...patch } }))

  const updateSound = (sound: SoundType): void =>
    setSettings(s => ({ ...s, sound }))

  const updateCustomSoundName = (name: string | undefined): void =>
    setSettings(s => ({ ...s, customSoundName: name }))

  const updateDurations = (patch: Partial<AppSettings['durations']>): void =>
    setSettings(s => ({ ...s, durations: { ...s.durations, ...patch } }))

  const resetColorsToDefault = (): void =>
    setSettings(s => ({ ...s, colors: DEFAULT_SETTINGS.colors }))

  return { settings, updateColors, updateSound, updateCustomSoundName, updateDurations, resetColorsToDefault }
}
