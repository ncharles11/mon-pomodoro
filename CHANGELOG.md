## [1.1.0] - 2026-06-27

### Added
- **Custom Sound**: Upload an audio file (MP3, WAV, OGG, AAC, etc.) to be used
  as the end-of-session sound; stored in IndexedDB, automatically reloaded
  on startup, and can be replaced or deleted from the settings
- **Settings**: new dedicated view accessible from the timer
  - Choose a sound from 5 built-in options (Chime, Bell, Digital, Retro, None)
    + custom sound
  - Customize colors by phase using the native color picker, with
    cyberpunk (pink / cyan / purple) and pastel presets
  - Duration settings (Focus, Short Break, Long Break) from 1 to 90 minutes
  - Button to completely reset sessions
- **Activity Tracker**: automatically records daily focus time
- **Activity View**: daily stats (sessions + minutes) and a 7-day SVG chart
  with a highlighted bar for today and weekly totals
- **Always on Top**: pin/unpin button via Electron IPC
- **Keyboard Shortcuts**: Space (play/pause), R (reset), 1/2/3 (switch phases)
- **System notifications**: alert at the end of each session or break


### Updated
- Fixed the “Reset” button: now resets the session counter,
  the phase (→ Focus), and the timer in a single action
- Complete interface redesign: cyberpunk dark theme (#080812), scrolling SVG
  ring, phase tabs, session points, native macOS drag bar
- Settings persistence in localStorage with deep merge (compatible
  with future versions without breaking existing data)
