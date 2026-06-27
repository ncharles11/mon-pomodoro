import { useState, useCallback } from 'react'
import type { DayActivity } from '../types'

const STORAGE_KEY = 'mon-pomodoro-activity-v1'

type ActivityStore = Record<string, DayActivity>

export function toDateKey(date = new Date()): string {
  // Local date as 'YYYY-MM-DD' (avoids UTC shift)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function loadStore(): ActivityStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ActivityStore) : {}
  } catch {
    return {}
  }
}

function persist(store: ActivityStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function useActivityTracker() {
  const [store, setStore] = useState<ActivityStore>(loadStore)

  /** Call when a focus session completes (pass configured duration in minutes). */
  const recordFocusSession = useCallback((focusMinutes: number): void => {
    const today = toDateKey()
    setStore(prev => {
      const existing = prev[today] ?? { date: today, focusMinutes: 0, sessions: 0 }
      const next: ActivityStore = {
        ...prev,
        [today]: {
          ...existing,
          focusMinutes: existing.focusMinutes + focusMinutes,
          sessions:     existing.sessions + 1,
        },
      }
      persist(next)
      return next
    })
  }, [])

  /** Last 7 days of data (oldest → newest, today is last). */
  const getWeekData = useCallback((): DayActivity[] => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = toDateKey(d)
      return store[key] ?? { date: key, focusMinutes: 0, sessions: 0 }
    })
  }, [store])

  const getTodayData = useCallback((): DayActivity => {
    const key = toDateKey()
    return store[key] ?? { date: key, focusMinutes: 0, sessions: 0 }
  }, [store])

  const getWeekTotalMinutes = useCallback((): number =>
    getWeekData().reduce((sum, d) => sum + d.focusMinutes, 0)
  , [getWeekData])

  return { recordFocusSession, getWeekData, getTodayData, getWeekTotalMinutes }
}
