import { useRef } from 'react'
import { ChevronLeft, RotateCcw, Volume2, VolumeX, Upload, Music, X } from 'lucide-react'
import { SOUND_LABELS } from '../sounds'
import { DEFAULT_SETTINGS } from '../hooks/useSettings'
import type { AppSettings, Phase, SoundType } from '../types'

const PHASES: Phase[] = ['focus', 'shortBreak', 'longBreak']
const PHASE_LABELS: Record<Phase, string> = {
  focus:      'Focus',
  shortBreak: 'Pause courte',
  longBreak:  'Pause longue',
}

// Built-in sounds shown as buttons; 'custom' is handled separately below
const BUILTIN_SOUNDS: SoundType[] = ['chime', 'bell', 'digital', 'retro', 'none']

// Accepted audio MIME types
const AUDIO_ACCEPT = 'audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/flac,audio/mp4,audio/*'

interface Props {
  settings:            AppSettings
  activePhase:         Phase
  isRunning:           boolean
  onBack:              () => void
  onUpdateColors:      (p: Partial<AppSettings['colors']>) => void
  onUpdateDurations:   (d: Partial<AppSettings['durations']>) => void
  onResetColors:       () => void
  onResetSessions:     () => void
  /** Called when a sound button is clicked — plays preview + updates setting */
  onSelectSound:       (s: SoundType) => void
  /** Called when user picks a file from the OS picker */
  onUploadCustomSound: (file: File) => Promise<void>
  /** Called when user removes the custom sound */
  onClearCustomSound:  () => void
}

export function SettingsView({
  settings, activePhase, isRunning,
  onBack, onUpdateColors, onUpdateDurations, onResetColors, onResetSessions,
  onSelectSound, onUploadCustomSound, onClearCustomSound,
}: Props): React.JSX.Element {
  const accent       = settings.colors[activePhase]
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return
    await onUploadCustomSound(file)
    // Reset so the same file can be re-selected if the user clears and re-uploads
    e.target.value = ''
  }

  const hasCustomSound = Boolean(settings.customSoundName)

  return (
    <div className="full-view settings-view">
      {/* Header */}
      <div className="full-view__header">
        <button className="btn-back" onClick={onBack} aria-label="Retour au minuteur">
          <ChevronLeft size={16} strokeWidth={2.5} />
          Retour
        </button>
        <span className="full-view__title">Paramètres</span>
        <div style={{ width: 72 }} />
      </div>

      <div className="settings-scroll">

        {/* ── Son ─────────────────────────────────────────────── */}
        <section className="settings-section">
          <div className="settings-section__title">
            <Volume2 size={13} />
            Son de fin de session
          </div>

          {/* Built-in sound buttons */}
          <div className="sound-grid">
            {BUILTIN_SOUNDS.map(s => (
              <button
                key={s}
                className={`sound-btn${settings.sound === s ? ' sound-btn--active' : ''}`}
                style={settings.sound === s ? { borderColor: accent, color: accent } : undefined}
                onClick={() => onSelectSound(s)}
                aria-pressed={settings.sound === s}
              >
                {s === 'none' ? <VolumeX size={12} /> : <Volume2 size={12} />}
                {SOUND_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Custom sound row */}
          <div className="custom-sound-section">
            <div className="custom-sound-label">
              <Music size={12} />
              Son personnalisé (MP3, WAV, OGG…)
            </div>

            {hasCustomSound ? (
              /* File loaded — show name + select + remove */
              <div
                className={`custom-sound-file${settings.sound === 'custom' ? ' custom-sound-file--active' : ''}`}
                style={settings.sound === 'custom' ? { borderColor: accent } : undefined}
              >
                <button
                  className="custom-sound-file__select"
                  onClick={() => onSelectSound('custom')}
                  aria-pressed={settings.sound === 'custom'}
                  title="Utiliser ce son"
                >
                  <Music size={13} style={{ color: settings.sound === 'custom' ? accent : undefined }} />
                  <span className="custom-sound-file__name">{settings.customSoundName}</span>
                </button>

                <div className="custom-sound-file__actions">
                  <button
                    className="custom-sound-file__replace"
                    onClick={() => fileInputRef.current?.click()}
                    title="Remplacer le fichier"
                    aria-label="Remplacer le son personnalisé"
                  >
                    <Upload size={13} />
                  </button>
                  <button
                    className="custom-sound-file__remove"
                    onClick={onClearCustomSound}
                    title="Supprimer le son personnalisé"
                    aria-label="Supprimer le son personnalisé"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              /* No file — show upload button */
              <button
                className="custom-sound-upload"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choisir un fichier audio"
              >
                <Upload size={14} />
                Choisir un fichier audio…
              </button>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={AUDIO_ACCEPT}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          </div>
        </section>

        {/* ── Couleurs ─────────────────────────────────────────── */}
        <section className="settings-section">
          <div className="settings-section__title">
            Couleurs des phases
            <button
              className="btn-inline-reset"
              onClick={onResetColors}
              title="Réinitialiser aux couleurs cyberpunk"
              aria-label="Réinitialiser aux couleurs cyberpunk"
            >
              <RotateCcw size={11} />
              Cyberpunk
            </button>
          </div>
          {PHASES.map(p => (
            <div key={p} className="color-row">
              <label htmlFor={`color-${p}`} className="color-row__label">
                <span className="color-row__dot" style={{ background: settings.colors[p] }} aria-hidden="true" />
                {PHASE_LABELS[p]}
              </label>
              <div className="color-row__right">
                <span className="color-row__hex">{settings.colors[p].toUpperCase()}</span>
                <input
                  id={`color-${p}`}
                  type="color"
                  value={settings.colors[p]}
                  onChange={e => onUpdateColors({ [p]: e.target.value })}
                  aria-label={`Couleur ${PHASE_LABELS[p]}`}
                />
              </div>
            </div>
          ))}
          <div className="color-presets">
            <span className="color-presets__label">Présets</span>
            <div className="preset-group">
              {PHASES.map(p => (
                <div
                  key={p}
                  className="preset-swatch"
                  style={{ background: DEFAULT_SETTINGS.colors[p] }}
                  title={`Cyberpunk — ${PHASE_LABELS[p]}: ${DEFAULT_SETTINGS.colors[p]}`}
                  onClick={() => onUpdateColors({ [p]: DEFAULT_SETTINGS.colors[p] })}
                  role="button" tabIndex={0}
                  aria-label={`Cyberpunk pour ${PHASE_LABELS[p]}`}
                  onKeyDown={e => e.key === 'Enter' && onUpdateColors({ [p]: DEFAULT_SETTINGS.colors[p] })}
                />
              ))}
            </div>
            <div className="preset-group">
              {(['#ff6b6b', '#69db7c', '#74c0fc'] as const).map((c, i) => (
                <div
                  key={c}
                  className="preset-swatch"
                  style={{ background: c }}
                  title={`Pastel — ${PHASE_LABELS[PHASES[i]]}: ${c}`}
                  onClick={() => onUpdateColors({ [PHASES[i]]: c })}
                  role="button" tabIndex={0}
                  aria-label={`Pastel pour ${PHASE_LABELS[PHASES[i]]}`}
                  onKeyDown={e => e.key === 'Enter' && onUpdateColors({ [PHASES[i]]: c })}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Durées ───────────────────────────────────────────── */}
        <section className="settings-section">
          <div className="settings-section__title">Durées (minutes)</div>
          {PHASES.map(p => (
            <div key={p} className="duration-row">
              <label htmlFor={`dur-${p}`}>{PHASE_LABELS[p]}</label>
              <div className="stepper-wrap">
                <button
                  className="btn-stepper"
                  onClick={() => onUpdateDurations({ [p]: Math.max(1, settings.durations[p] - 1) })}
                  disabled={settings.durations[p] <= 1}
                  aria-label={`Diminuer ${PHASE_LABELS[p]}`}
                >−</button>
                <input
                  id={`dur-${p}`}
                  type="number" min={1} max={90}
                  value={settings.durations[p]}
                  onChange={e => {
                    const v = Math.max(1, Math.min(90, Number(e.target.value) || 1))
                    onUpdateDurations({ [p]: v })
                  }}
                  aria-label={`Durée ${PHASE_LABELS[p]} en minutes`}
                />
                <button
                  className="btn-stepper"
                  onClick={() => onUpdateDurations({ [p]: Math.min(90, settings.durations[p] + 1) })}
                  disabled={settings.durations[p] >= 90}
                  aria-label={`Augmenter ${PHASE_LABELS[p]}`}
                >+</button>
              </div>
            </div>
          ))}
          {isRunning && (
            <p className="settings-note">
              ⏱ Le minuteur en cours ne sera pas affecté par les changements de durée.
            </p>
          )}
        </section>

        {/* ── Réinitialisation ─────────────────────────────────── */}
        <section className="settings-section settings-section--danger">
          <div className="settings-section__title">Session</div>
          <button className="btn-danger-reset" onClick={onResetSessions}>
            Réinitialiser les sessions et revenir au Focus
          </button>
        </section>

      </div>
    </div>
  )
}
