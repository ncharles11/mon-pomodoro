import type { SoundType } from './types'

type WaveType = OscillatorType

function tone(
  ctx: AudioContext,
  freq: number,
  wave: WaveType,
  startAt: number,
  duration: number,
  volume = 0.28
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = wave
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, ctx.currentTime + startAt)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration)
  osc.start(ctx.currentTime + startAt)
  osc.stop(ctx.currentTime + startAt + duration)
}

function playChime(ctx: AudioContext): void {
  tone(ctx, 880,  'sine', 0.00, 0.55)
  tone(ctx, 1100, 'sine', 0.20, 0.55)
  tone(ctx, 1320, 'sine', 0.40, 0.85)
}

function playBell(ctx: AudioContext): void {
  // Fundamental + bright overtone for bell character
  tone(ctx, 880,  'sine',     0, 2.0, 0.35)
  tone(ctx, 1760, 'sine',     0, 1.2, 0.10)
  tone(ctx, 2640, 'triangle', 0, 0.6, 0.04)
}

function playDigital(ctx: AudioContext): void {
  tone(ctx, 880,  'square', 0.00, 0.12, 0.18)
  tone(ctx, 880,  'square', 0.16, 0.12, 0.18)
  tone(ctx, 1320, 'square', 0.32, 0.16, 0.18)
}

function playRetro(ctx: AudioContext): void {
  ;([330, 440, 550, 660, 880] as const).forEach((freq, i) => {
    tone(ctx, freq, 'square', i * 0.09, 0.12, 0.20)
  })
}

/**
 * Play a notification sound.
 * @param customUrl  Required when type === 'custom' — blob URL returned by loadCustomSound().
 */
export function playSound(type: SoundType, customUrl?: string | null): void {
  if (type === 'none') return
  if (type === 'custom') {
    if (!customUrl) return
    const audio = new Audio(customUrl)
    audio.volume = 0.85
    audio.play().catch(() => {})
    return
  }
  try {
    const ctx = new AudioContext()
    switch (type) {
      case 'chime':   playChime(ctx);   break
      case 'bell':    playBell(ctx);    break
      case 'digital': playDigital(ctx); break
      case 'retro':   playRetro(ctx);   break
    }
  } catch {
    // AudioContext not available (headless tests, etc.)
  }
}

export const SOUND_LABELS: Record<SoundType, string> = {
  chime:   'Carillon',
  bell:    'Cloche',
  digital: 'Digital',
  retro:   'Rétro',
  custom:  'Perso',
  none:    'Aucun',
}
