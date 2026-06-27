import { ChevronLeft, Flame, Target } from 'lucide-react'
import { toDateKey } from '../hooks/useActivityTracker'
import type { DayActivity } from '../types'

interface Props {
  weekData:         DayActivity[]
  todayData:        DayActivity
  weekTotalMinutes: number
  accentColor:      string
  onBack:           () => void
}

function fmtMinutes(mins: number): string {
  if (mins === 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function getDayLabel(dateStr: string): string {
  // Parse as local date to avoid UTC shift
  const [y, mo, d] = dateStr.split('-').map(Number)
  const date = new Date(y, mo - 1, d)
  return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()]
}

// ─── Bar chart constants ───────────────────────────────────────────────────
const CHART_W   = 350
const CHART_H   = 110
const BAR_W     = 36
const SLOT_W    = CHART_W / 7  // 50px per day slot
const BAR_X     = (SLOT_W - BAR_W) / 2  // center bar in slot

export function ActivitySummary({ weekData, todayData, weekTotalMinutes, accentColor, onBack }: Props): React.JSX.Element {
  const todayKey = toDateKey()
  const maxMins  = Math.max(...weekData.map(d => d.focusMinutes), 60)
  const totalSessions = weekData.reduce((s, d) => s + d.sessions, 0)
  const activeDays    = weekData.filter(d => d.sessions > 0).length

  return (
    <div className="full-view">
      {/* Header */}
      <div className="full-view__header">
        <button className="btn-back" onClick={onBack} aria-label="Retour au minuteur">
          <ChevronLeft size={16} strokeWidth={2.5} />
          Retour
        </button>
        <span className="full-view__title">Activité</span>
        <div style={{ width: 72 }} />
      </div>

      {/* Today cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card__icon" style={{ color: accentColor }}>
            <Flame size={18} />
          </div>
          <div className="stat-card__value" style={{ color: accentColor }}>
            {fmtMinutes(todayData.focusMinutes)}
          </div>
          <div className="stat-card__label">Focus aujourd'hui</div>
        </div>
        <div className="stat-card__divider" />
        <div className="stat-card">
          <div className="stat-card__icon" style={{ color: accentColor }}>
            <Target size={18} />
          </div>
          <div className="stat-card__value" style={{ color: accentColor }}>
            {todayData.sessions}
          </div>
          <div className="stat-card__label">
            {todayData.sessions <= 1 ? 'Session' : 'Sessions'}
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="chart-section">
        <div className="chart-section__header">
          <span className="chart-section__title">7 derniers jours</span>
          <span className="chart-section__total" style={{ color: accentColor }}>
            {fmtMinutes(weekTotalMinutes)}
          </span>
        </div>

        <svg
          className="week-chart"
          viewBox={`0 0 ${CHART_W} ${CHART_H + 26}`}
          role="img"
          aria-label="Graphique de focus sur 7 jours"
        >
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={accentColor} stopOpacity="1"  />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.6"/>
            </linearGradient>
            <linearGradient id="barGradDim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={accentColor} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.15"/>
            </linearGradient>
          </defs>

          {weekData.map((day, i) => {
            const slotX  = i * SLOT_W
            const barX   = slotX + BAR_X
            const ratio  = day.focusMinutes / maxMins
            const barH   = day.focusMinutes > 0 ? Math.max(6, ratio * CHART_H) : 0
            const barY   = CHART_H - barH
            const isToday = day.date === todayKey

            return (
              <g key={day.date}>
                {/* Track */}
                <rect
                  x={barX} y={0}
                  width={BAR_W} height={CHART_H}
                  rx={6} fill="rgba(255,255,255,0.05)"
                />
                {/* Bar */}
                {barH > 0 && (
                  <rect
                    x={barX} y={barY}
                    width={BAR_W} height={barH}
                    rx={6}
                    fill={isToday ? 'url(#barGrad)' : 'url(#barGradDim)'}
                  />
                )}
                {/* Glow on today */}
                {barH > 0 && isToday && (
                  <rect
                    x={barX} y={barY}
                    width={BAR_W} height={barH}
                    rx={6}
                    fill={accentColor}
                    opacity={0.25}
                    style={{ filter: 'blur(6px)' }}
                  />
                )}
                {/* Day label */}
                <text
                  x={slotX + SLOT_W / 2}
                  y={CHART_H + 18}
                  textAnchor="middle"
                  fill={isToday ? accentColor : 'rgba(255,255,255,0.28)'}
                  fontSize={11}
                  fontWeight={isToday ? 600 : 400}
                  fontFamily="inherit"
                >
                  {getDayLabel(day.date)}
                </text>
                {/* Tooltip value above bar */}
                {day.focusMinutes > 0 && (
                  <text
                    x={slotX + SLOT_W / 2}
                    y={Math.max(barY - 5, 10)}
                    textAnchor="middle"
                    fill={isToday ? accentColor : 'rgba(255,255,255,0.3)'}
                    fontSize={9}
                    fontFamily="inherit"
                  >
                    {fmtMinutes(day.focusMinutes)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Weekly totals */}
      <div className="week-totals">
        <div className="week-total">
          <span className="week-total__value">{totalSessions}</span>
          <span className="week-total__label">Sessions</span>
        </div>
        <div className="week-total__sep" />
        <div className="week-total">
          <span className="week-total__value">{activeDays}</span>
          <span className="week-total__label">Jours actifs</span>
        </div>
        <div className="week-total__sep" />
        <div className="week-total">
          <span className="week-total__value">{fmtMinutes(weekTotalMinutes)}</span>
          <span className="week-total__label">Focus total</span>
        </div>
      </div>
    </div>
  )
}
