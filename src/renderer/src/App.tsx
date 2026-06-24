import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { Play, Pause, RotateCcw, Settings, Pin, PinOff } from 'lucide-react'

type Phase = 'focus' | 'shortBreak' | 'longBreak'

const PHASE_CONFIG: Record<Phase, { label: string; color: string; defaultMins: number }> = {
  focus:      { label: 'Focus',        color: '#ff6b6b', defaultMins: 25 },
  shortBreak: { label: 'Pause courte', color: '#69db7c', defaultMins: 5  },
  longBreak:  { label: 'Pause longue', color: '#74c0fc', defaultMins: 15 }
}

const RING_RADIUS = 108
const RING_CIRC = 2 * Math.PI * RING_RADIUS

function playBeep(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.36)
    gain.gain.setValueAtTime(0.32, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4)
    osc.start()
    osc.stop(ctx.currentTime + 1.4)
  } catch {
    // Audio not available
  }
}

function sendNotification(title: string, body: string): void {
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function App(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('focus')
  const [durations, setDurations] = useState({ focus: 25, shortBreak: 5, longBreak: 15 })
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isPinned, setIsPinned] = useState(false)

  // Refs to access current values in stable callbacks
  const phaseRef = useRef(phase)
  const sessionsRef = useRef(sessions)
  const durationsRef = useRef(durations)
  phaseRef.current = phase
  sessionsRef.current = sessions
  durationsRef.current = durations

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const switchTo = useCallback((p: Phase): void => {
    setPhase(p)
    setTimeLeft(durationsRef.current[p] * 60)
    setIsRunning(false)
    setShowSettings(false)
  }, [])

  const reset = useCallback((): void => {
    setIsRunning(false)
    setTimeLeft(durationsRef.current[phaseRef.current] * 60)
  }, [])

  const handleComplete = useCallback((): void => {
    setIsRunning(false)
    playBeep()
    const currentPhase = phaseRef.current
    const currentSessions = sessionsRef.current
    if (currentPhase === 'focus') {
      const next = currentSessions + 1
      setSessions(next)
      sendNotification('Pomodoro terminé !', 'Excellent travail ! Prenez une pause.')
      switchTo(next % 4 === 0 ? 'longBreak' : 'shortBreak')
    } else {
      sendNotification('Pause terminée !', 'En avant pour un nouveau focus !')
      switchTo('focus')
    }
  }, [switchTo])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space') { e.preventDefault(); setIsRunning(r => !r) }
      if (e.code === 'KeyR') reset()
      if (e.code === 'Digit1') switchTo('focus')
      if (e.code === 'Digit2') switchTo('shortBreak')
      if (e.code === 'Digit3') switchTo('longBreak')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [switchTo, reset])

  // Timer tick
  useEffect(() => {
    if (!isRunning) return
    if (timeLeft <= 0) {
      handleComplete()
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [isRunning, timeLeft, handleComplete])

  const togglePin = useCallback(async (): Promise<void> => {
    const next = !isPinned
    setIsPinned(next)
    await window.api.toggleAlwaysOnTop(next)
  }, [isPinned])

  // Ring calculations
  const cfg = PHASE_CONFIG[phase]
  const total = durations[phase] * 60
  const progress = total > 0 ? timeLeft / total : 0
  const ringOffset = RING_CIRC * (1 - progress)

  // Session display
  const cycleProgress = sessions > 0 && sessions % 4 === 0 ? 4 : sessions % 4
  const cycleNumber = Math.floor(sessions / 4) + 1

  return (
    <div
      className="app"
      style={{
        '--accent': cfg.color,
        background: `radial-gradient(ellipse at 50% 0%, ${cfg.color}1c 0%, transparent 52%), #0d0d15`
      } as CSSProperties}
    >
      {/* macOS drag region */}
      <div className="drag-handle" aria-hidden="true" />

      {/* Header */}
      <header className="header">
        <span className="app-name">Mon Pomodoro</span>
        <button
          className="btn-ghost"
          onClick={togglePin}
          title={isPinned ? 'Détacher (toujours visible)' : 'Épingler au premier plan'}
          aria-label={isPinned ? 'Détacher la fenêtre' : 'Épingler au premier plan'}
          aria-pressed={isPinned}
        >
          {isPinned ? <PinOff size={15} strokeWidth={2} /> : <Pin size={15} strokeWidth={2} />}
        </button>
      </header>

      {/* Phase tabs */}
      <nav className="tabs" role="tablist" aria-label="Choisir la phase">
        {(['focus', 'shortBreak', 'longBreak'] as Phase[]).map(p => (
          <button
            key={p}
            role="tab"
            aria-selected={phase === p}
            className={`tab${phase === p ? ' tab--active' : ''}`}
            onClick={() => switchTo(p)}
          >
            {PHASE_CONFIG[p].label}
          </button>
        ))}
      </nav>

      {/* Circular timer */}
      <div
        className="timer-wrap"
        role="timer"
        aria-live="off"
        aria-label={`${formatTime(timeLeft)} restant — ${cfg.label}`}
      >
        <svg className="ring" viewBox="0 0 260 260" aria-hidden="true">
          {/* Track circle */}
          <circle
            cx="130" cy="130" r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="10"
          />
          {/* Glow layer */}
          <circle
            cx="130" cy="130" r={RING_RADIUS}
            fill="none"
            stroke={cfg.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={ringOffset}
            transform="rotate(-90 130 130)"
            style={{
              filter: 'blur(7px)',
              opacity: 0.35,
              transition: isRunning
                ? 'stroke-dashoffset 1s linear'
                : 'stroke-dashoffset 0.45s ease, stroke 0.55s ease'
            }}
          />
          {/* Progress arc */}
          <circle
            cx="130" cy="130" r={RING_RADIUS}
            fill="none"
            stroke={cfg.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={ringOffset}
            transform="rotate(-90 130 130)"
            style={{
              transition: isRunning
                ? 'stroke-dashoffset 1s linear'
                : 'stroke-dashoffset 0.45s ease, stroke 0.55s ease'
            }}
          />
        </svg>

        <div className="timer-inner">
          <div className="time-display">{formatTime(timeLeft)}</div>
          <div className="phase-label">{cfg.label.toUpperCase()}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className="btn-icon"
          onClick={reset}
          title="Réinitialiser (R)"
          aria-label="Réinitialiser le minuteur"
        >
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
          onClick={() => setShowSettings(s => !s)}
          title="Paramètres"
          aria-label="Paramètres"
          aria-expanded={showSettings}
        >
          <Settings size={19} strokeWidth={2.2} />
        </button>
      </div>

      {/* Session dots */}
      <div
        className="session-track"
        aria-label={`${sessions} sessions complétées, cycle ${cycleNumber}`}
      >
        <div className="dots" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`dot${i < cycleProgress ? ' dot--filled' : ''}`} />
          ))}
        </div>
        <span className="session-label">
          {sessions === 0
            ? 'Prêt à démarrer · Espace pour lancer'
            : `${sessions} ${sessions === 1 ? 'pomodoro' : 'pomodoros'} · Cycle ${cycleNumber}`
          }
        </span>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="settings-panel" role="region" aria-label="Paramètres du minuteur">
          <div className="settings-title">Durées (minutes)</div>

          {(['focus', 'shortBreak', 'longBreak'] as Phase[]).map(p => (
            <div key={p} className="setting-row">
              <label htmlFor={`dur-${p}`}>{PHASE_CONFIG[p].label}</label>
              <div className="setting-input-wrap">
                <button
                  className="btn-stepper"
                  onClick={() => {
                    const v = Math.max(1, durations[p] - 1)
                    const next = { ...durations, [p]: v }
                    setDurations(next)
                    if (p === phase && !isRunning) setTimeLeft(v * 60)
                  }}
                  aria-label={`Diminuer ${PHASE_CONFIG[p].label}`}
                >
                  −
                </button>
                <input
                  id={`dur-${p}`}
                  type="number"
                  min={1}
                  max={90}
                  value={durations[p]}
                  onChange={e => {
                    const v = Math.max(1, Math.min(90, Number(e.target.value) || 1))
                    const next = { ...durations, [p]: v }
                    setDurations(next)
                    if (p === phase && !isRunning) setTimeLeft(v * 60)
                  }}
                  aria-label={`Durée ${PHASE_CONFIG[p].label} en minutes`}
                />
                <button
                  className="btn-stepper"
                  onClick={() => {
                    const v = Math.min(90, durations[p] + 1)
                    const next = { ...durations, [p]: v }
                    setDurations(next)
                    if (p === phase && !isRunning) setTimeLeft(v * 60)
                  }}
                  aria-label={`Augmenter ${PHASE_CONFIG[p].label}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <button
            className="btn-reset-sessions"
            onClick={() => { setSessions(0); setShowSettings(false) }}
          >
            Réinitialiser les sessions
          </button>
        </div>
      )}
    </div>
  )
}
