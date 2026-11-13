import crypto from 'node:crypto'
import fs from 'node:fs'
import express from 'express'

const versionOf = (text) => crypto.createHash('sha1').update(text).digest('hex')

/** Run animation playback multiplier a character may have */
const MIN_ANIM_SPEED = 0.2
const MAX_ANIM_SPEED = 4

/** The settings checked and tidied: { model: { animSpeed } } for known-looking model names, or null when malformed. */
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
    const animSpeed = Number(value?.animSpeed)
    if (!/^[a-z0-9_-]{1,40}$/i.test(model) || !Number.isFinite(animSpeed)) return null
    settings[model] = { animSpeed: Math.round(Math.min(MAX_ANIM_SPEED, Math.max(MIN_ANIM_SPEED, animSpeed)) * 10) / 10 }
  }
  return settings
}

/**
 * The characters' own settings (one file, `file`: src/assets/characters/settings.json), the same on every map:
 *  - GET /api/characters   { canSave, needsLogin, version, settings: { model: { animSpeed } } }
 *  - PUT /api/characters   replaces them; `If-Match` carries the version the editor started from (409 when changed since)
 * Changed only by the signed-in admin, like the maps (server/maps.js): without an admin account the dev server lets anyone
 * (`openWrites`) and any other server nobody.
 */
export function createCharactersApp({ file, auth, openWrites = false }) {
  const app = express()
  const canSave = auth.enabled || openWrites
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
    res.json({ canSave, needsLogin: auth.enabled, version: versionOf(text), settings: readSettings(text) ?? {} })
  })

  app.put('/api/characters', express.text({ type: '*/*', limit: '64kb' }), (req, res) => {
    if (!canSave) return res.status(403).json({ error: 'saving-off' })
    if (auth.enabled && !auth.isAdmin(req)) return res.status(401).json({ error: 'login' })
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
