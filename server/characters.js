import crypto from 'node:crypto'
import fs from 'node:fs'
import express from 'express'

const versionOf = (text) => crypto.createHash('sha1').update(text).digest('hex')

/** Each setting a character has: its range, step and value when missing (as CHARACTER_SETTING_LIMITS in the app) */
const LIMITS = {
  animSpeed: { min: 0.2, max: 4, step: 0.1, fallback: 1 },
  scale: { min: 0.3, max: 3, step: 0.05, fallback: 1 },
  offsetX: { min: -100, max: 100, step: 1, fallback: 0 },
  offsetY: { min: -100, max: 100, step: 1, fallback: 0 },
}

/** The settings checked and tidied: { model: { animSpeed, scale, offsetX, offsetY } } for known-looking model names, or null when malformed. */
function readSettings(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const settings = {}
  for (const [model, value] of Object.entries(raw)) {
    if (!/^[a-z0-9_-]{1,40}$/i.test(model) || !value || typeof value !== 'object') return null
    const tidy = {}
    for (const [key, { min, max, step, fallback }] of Object.entries(LIMITS)) {
      const n = value[key] === undefined ? fallback : Number(value[key])
      if (!Number.isFinite(n)) return null
      tidy[key] = Math.round((Math.round(Math.min(max, Math.max(min, n)) / step) * step) * 100) / 100
    }
    settings[model] = tidy
  }
  return settings
}

/**
 * The characters' own settings (one file, `file`: src/assets/characters/settings.json), the same on every map:
 *  - GET /api/characters   { canSave, version, settings: { model: { animSpeed, scale, offsetX, offsetY } } }
 *  - PUT /api/characters   replaces them; `If-Match` carries the version the editor started from (409 when changed since)
 * Changed only by the signed-in admin (the Characters page is theirs alone): a server without an admin account takes no
 * changes at all.
 */
export function createCharactersApp({ file, auth }) {
  const app = express()
  const canSave = auth.enabled
  const read = () => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '{}')

  app.use('/api/characters', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-Match, Authorization')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.get('/api/characters', (_req, res) => {
    const text = read()
    res.json({ canSave, version: versionOf(text), settings: readSettings(text) ?? {} })
  })

  app.put('/api/characters', express.text({ type: '*/*', limit: '64kb' }), (req, res) => {
    if (!canSave) return res.status(403).json({ error: 'saving-off' })
    if (!auth.isAdmin(req)) return res.status(401).json({ error: 'login' })
    const settings = readSettings(req.body)
    if (!settings) return res.status(400).json({ error: 'invalid-settings' })

    const current = versionOf(read())
    const expected = req.get('If-Match')
    if (expected && expected !== current) return res.status(409).json({ error: 'changed', version: current })

    // Written next to the file and moved over, so a reader never sees half of it
    const text = `${JSON.stringify(settings, null, 2)}\n`
    const temp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(temp, text)
    fs.renameSync(temp, file)
    res.json({ ok: true, version: versionOf(text), settings })
  })

  return app
}
