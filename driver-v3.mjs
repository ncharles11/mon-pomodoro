import { _electron as electron } from 'playwright-core'
import { join } from 'node:path'
import fs from 'node:fs'

const APP   = '/Users/charlesaugustendiaye/mon-pomodoro'
const SHOTS = process.env.SHOTS
fs.mkdirSync(SHOTS, { recursive: true })

const bin = join(APP, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
const app = await electron.launch({ executablePath: bin, args: [APP], timeout: 30_000 })
await new Promise(r => setTimeout(r, 3000))
const page = app.windows().find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow()
await page.waitForLoadState('domcontentloaded')
await new Promise(r => setTimeout(r, 2000))

const ss = name => page.screenshot({ path: join(SHOTS, name + '.png') })

// Go to settings
await page.evaluate(() => document.querySelectorAll('.btn-icon')[1]?.click())
await new Promise(r => setTimeout(r, 700))
await ss('settings-top')

// Scroll to reveal the upload button  
await page.evaluate(() => document.querySelector('.settings-scroll')?.scrollBy(0, 40))
await new Promise(r => setTimeout(r, 300))
await ss('settings-sound-section')

await app.close()
console.log('Done')
