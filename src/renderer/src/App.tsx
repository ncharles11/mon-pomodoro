import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { Play, Pause, RotateCcw, Settings, Pin, PinOff, BarChart2 } from 'lucide-react'

import { useSettings }                                    from './hooks/useSettings'
import { useActivityTracker }                             from './hooks/useActivityTracker'
import { playSound }                                     from './sounds'
import { storeCustomSound, loadCustomSound,
         deleteCustomSound }                             from './customSound'
import { ActivitySummary }                               from './components/ActivitySummary'
import { SettingsView }                                  from './components/SettingsView'
import type { Phase, AppView, SoundType }                from './types'

// ─── Config par phase ────────────────────────────────────────────────────────
const PHASE_LABELS: Record<Phase, string> = {
  focus:      'Focus',
  shortBreak: 'Pause courte',
  longBreak:  'Pause longue',
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function sendNotification(title: string, body: string): void {
  if (Notification.permission === 'granted') new Notification(title, { body })
}

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ─── SVG ring constants ──────────────────────────────────────────────────────
const R    = 108
const CIRC = 2 * Math.PI * R

// ─────────────────────────────────────────────────────────────────────────────
export default function App(): React.JSX.Element {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [phase,     setPhase]     = useState<Phase>('focus')
  const [timeLeft,  setTimeLeft]  = useState(0)           // initialised after settings load
  const [isRunning, setIsRunning] = useState(false)
  const [sessions,  setSessions]  = useState(0)           // completed focus sessions
  const [view,      setView]      = useState<AppView>('timer')
  const [isPinned,  setIsPinned]  = useState(false)

  // ── Persistent state (settings + activity) ───────────────────────────────────
  const {
    settings, updateColors, updateSound, updateCustomSoundName,
    updateDurations, resetColorsToDefault,
  } = useSettings()
  const { recordFocusSession, getWeekData, getTodayData, getWeekTotalMinutes } = useActivityTracker()

  // ── Refs to latest values (avoid stale closures in callbacks) ──────────────
  const phaseRef         = useRef(phase)
  const sessionsRef      = useRef(sessions)
  const settingsRef      = useRef(settings)
  const customSoundUrl   = useRef<string | null>(null)   // blob URL for user-uploaded sound
  const initialised      = useRef(false)
  phaseRef.current    = phase
  sessionsRef.current = sessions
  settingsRef.current = settings

  // Initialise timer from settings on first mount
  useEffect(() => {
    if (!initialised.current) {
      setTimeLeft(settings.durations.focus * 60)
      initialised.current = true
    }
  }, [settings.durations.focus])

  // Load custom sound blob URL from IndexedDB on mount
  useEffect(() => {
    loadCustomSound().then(result => {
      if (result) customSoundUrl.current = result.url
    })
  }, [])

  // ── Notification permission ──────────────────────────────────────────────────
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

  // ── Phase navigation ─────────────────────────────────────────────────────────
  const switchTo = useCallback((p: Phase): void => {
    setPhase(p)
    setTimeLeft(settingsRef.current.durations[p] * 60)
    setIsRunning(false)
    setView('timer')
  }, [])

  // ── TASK 2: Correct full reset ────────────────────────────────────────────────
  // Resets: timer → focus duration, phase → focus, sessions → 0, timer → stopped
  // Does NOT clear historical activity data (that's archived data, not a session state)
  const resetSessions = useCallback((): void => {
    setSessions(0)
    switchTo('focus')   // sets phase, timeLeft, isRunning=false, view='timer'
  }, [switchTo])

  // Soft reset: just rewind current phase timer
  const resetTimer = useCallback((): void => {
    setIsRunning(false)
    setTimeLeft(settingsRef.current.durations[phaseRef.current] * 60)
  }, [])

  // ── Custom sound handlers ─────────────────────────────────────────────────────
  const handleUploadCustomSound = useCallback(async (file: File): Promise<void> => {
    await storeCustomSound(file)
    // Revoke previous blob URL to free memory
    if (customSoundUrl.current) URL.revokeObjectURL(customSoundUrl.current)
    const result = await loadCustomSound()
    if (result) {
      customSoundUrl.current = result.url
      updateCustomSoundName(file.name)
      updateSound('custom')
      // Preview the uploaded sound immediately
      playSound('custom', result.url)
    }
  }, [updateCustomSoundName, updateSound])

  const handleClearCustomSound = useCallback((): void => {
    deleteCustomSound()
    if (customSoundUrl.current) URL.revokeObjectURL(customSoundUrl.current)
    customSoundUrl.current = null
    updateCustomSoundName(undefined)
    updateSound('chime')  // fall back to default
  }, [updateCustomSoundName, updateSound])

  /** Called when user clicks any sound button — selects + previews. */
  const handleSelectSound = useCallback((type: SoundType): void => {
    updateSound(type)
    playSound(type, customSoundUrl.current)
  }, [updateSound])

  // ── Session completion ────────────────────────────────────────────────────────
  const handleComplete = useCallback((): void => {
    setIsRunning(false)
    playSound(settingsRef.current.sound, customSoundUrl.current)

    const p = phaseRef.current
    const s = sessionsRef.current

    if (p === 'focus') {
      const next = s + 1
      setSessions(next)
      recordFocusSession(settingsRef.current.durations.focus)
      sendNotification('Pomodoro terminé !', 'Excellent travail ! Prenez une pause.')
      switchTo(next % 4 === 0 ? 'longBreak' : 'shortBreak')
    } else {
      sendNotification('Pause terminée !', 'En avant pour un nouveau focus !')
      switchTo('focus')
    }
  }, [switchTo, recordFocusSession])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space') { e.preventDefault(); setIsRunning(r => !r) }
      if (e.code === 'KeyR')  resetTimer()
      if (e.code === 'Digit1') switchTo('focus')
      if (e.code === 'Digit2') switchTo('shortBreak')
      if (e.code === 'Digit3') switchTo('longBreak')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [switchTo, resetTimer])

  // ── Timer tick ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return
    if (timeLeft <= 0) { handleComplete(); return }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1_000)
    return () => clearTimeout(id)
  }, [isRunning, timeLeft, handleComplete])

  // ── Duration change: update timer if phase matches and not running ────────────
  const handleUpdateDurations = useCallback((patch: Partial<typeof settings.durations>): void => {
    updateDurations(patch)
    const p = phaseRef.current
    const key = p as keyof typeof patch
    if (key in patch && !isRunning) {
      setTimeLeft((patch[key] as number) * 60)
    }
  }, [updateDurations, isRunning])

  // ── Pin window ────────────────────────────────────────────────────────────────
  const togglePin = useCallback(async (): Promise<void> => {
    const next = !isPinned
    setIsPinned(next)
    await window.api.toggleAlwaysOnTop(next)
  }, [isPinned])

  // ── Ring calculations ─────────────────────────────────────────────────────────
  const accentColor = settings.colors[phase]
  const total       = settings.durations[phase] * 60
  const progress    = total > 0 ? timeLeft / total : 0      // 1 = full, 0 = empty (depleting)
  const ringOffset  = CIRC * (1 - progress)

  // ── Session dot display ────────────────────────────────────────────────────────
  const cycleProgress = sessions > 0 && sessions % 4 === 0 ? 4 : sessions % 4

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Activity view
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === 'activity') {
    return (
      <div className="app" style={{ '--accent': accentColor } as CSSProperties}>
        <div className="drag-handle" aria-hidden="true" />
        <ActivitySummary
          weekData={getWeekData()}
          todayData={getTodayData()}
          weekTotalMinutes={getWeekTotalMinutes()}
          accentColor={accentColor}
          onBack={() => setView('timer')}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Settings view
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === 'settings') {
    return (
      <div className="app" style={{ '--accent': accentColor } as CSSProperties}>
        <div className="drag-handle" aria-hidden="true" />
        <SettingsView
          settings={settings}
          activePhase={phase}
          isRunning={isRunning}
          onBack={() => setView('timer')}
          onUpdateColors={updateColors}
          onUpdateDurations={handleUpdateDurations}
          onResetColors={resetColorsToDefault}
          onResetSessions={resetSessions}
          onSelectSound={handleSelectSound}
          onUploadCustomSound={handleUploadCustomSound}
          onClearCustomSound={handleClearCustomSound}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Timer view (default)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="app"
      style={{
        '--accent': accentColor,
        background: `radial-gradient(ellipse at 50% 0%, ${accentColor}1e 0%, transparent 52%), #080812`,
      } as CSSProperties}
    >
      <div className="drag-handle" aria-hidden="true" />

      {/* Header */}
      <header className="header">
        <span className="app-name">Mon Pomodoro</span>
        <div className="header-actions">
          <button
            className="btn-ghost"
            onClick={() => setView('activity')}
            title="Voir l'activité"
            aria-label="Voir le résumé d'activité"
          >
            <BarChart2 size={15} strokeWidth={2} />
          </button>
          <button
            className="btn-ghost"
            onClick={togglePin}
            title={isPinned ? 'Détacher' : 'Épingler au premier plan'}
            aria-label={isPinned ? 'Détacher la fenêtre' : 'Épingler au premier plan'}
            aria-pressed={isPinned}
          >
            {isPinned
              ? <PinOff size={15} strokeWidth={2} />
              : <Pin    size={15} strokeWidth={2} />
            }
          </button>
        </div>
      </header>

      {/* Phase tabs */}
      <nav className="tabs" role="tablist" aria-label="Phase">
        {(['focus', 'shortBreak', 'longBreak'] as Phase[]).map(p => (
          <button
            key={p}
            role="tab"
            aria-selected={phase === p}
            className={`tab${phase === p ? ' tab--active' : ''}`}
            onClick={() => switchTo(p)}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </nav>

      {/* Circular timer */}
      <div
        className="timer-wrap"
        role="timer"
        aria-live="off"
        aria-label={`${formatTime(timeLeft)} restant — ${PHASE_LABELS[phase]}`}
      >
        <svg className="ring" viewBox="0 0 260 260" aria-hidden="true">
          <circle cx="130" cy="130" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          {/* Glow */}
          <circle
            cx="130" cy="130" r={R} fill="none"
            stroke={accentColor} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={ringOffset}
            transform="rotate(-90 130 130)"
            style={{
              filter: 'blur(8px)', opacity: 0.45,
              transition: isRunning ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.45s ease, stroke 0.55s ease',
            }}
          />
          {/* Arc */}
          <circle
            cx="130" cy="130" r={R} fill="none"
            stroke={accentColor} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={ringOffset}
            transform="rotate(-90 130 130)"
            style={{
              transition: isRunning ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.45s ease, stroke 0.55s ease',
            }}
          />
        </svg>
        <div className="timer-inner">
          <div className="time-display">{formatTime(timeLeft)}</div>
          <div className="phase-label">{PHASE_LABELS[phase].toUpperCase()}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <button className="btn-icon" onClick={resetTimer} title="Réinitialiser (R)" aria-label="Réinitialiser">
          <RotateCcw size={19} strokeWidth={2.2} />
        </button>
        <button
          className="btn-primary"
          onClick={() => setIsRunning(r => !r)}
          aria-label={isRunning ? 'Mettre en pause' : 'Démarrer'}
        >
          {isRunning
            ? <><Pause size={17} strokeWidth={2.5} fill="currentColor" /> Pause</>
            : <><Play  size={17} strokeWidth={2.5} fill="currentColor" /> Démarrer</>
          }
        </button>
        <button
          className="btn-icon"
          onClick={() => setView('settings')}
          title="Paramètres"
          aria-label="Paramètres"
        >
          <Settings size={19} strokeWidth={2.2} />
        </button>
      </div>

      {/* Session dots */}
      <div className="session-track" aria-label={`${sessions} sessions, cycle ${Math.floor(sessions / 4) + 1}`}>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`dot${i < cycleProgress ? ' dot--filled' : ''}`} />
          ))}
        </div>
        <span className="session-label">
          {sessions === 0
            ? 'Prêt · Espace pour lancer'
            : `${sessions} ${sessions === 1 ? 'pomodoro' : 'pomodoros'} · Cycle ${Math.floor(sessions / 4) + 1}`
          }
        </span>
      </div>
    </div>
  )
}
