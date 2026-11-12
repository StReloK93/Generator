import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'

/** Largest map file accepted on save (maps with a cover picture and many layers run to a few MB) */
const MAX_MAP_BYTES = '40mb'
/** Deleted maps are moved here (inside the maps folder), never erased */
const TRASH_DIR = '.trash'

const versionOf = (text) => crypto.createHash('sha1').update(text).digest('hex')

/** A map file name from a map's name: no path or reserved characters, not empty, not too long. */
function fileNameFor(name) {
  const clean = String(name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 60)
  return clean || 'Map'
}

/** A parsed map body, or null when it is not a map. */
function readMap(text) {
  try {
    const map = JSON.parse(text)
    const project = map?.project
    return project && project.cols > 0 && project.rows > 0 && Array.isArray(project.layers) ? map : null
  } catch {
    return null
  }
}

/**
 * The game's built-in maps, served from `mapsDir` (src/maps), managed from the editor.
 *  - GET    /api/maps         every map: { canSave, needsLogin, maps: [{ file, version, data }] }
 *  - POST   /api/maps         adds a map: body { name, map }; the file is named after `name` (made unique)
 *  - PUT    /api/maps/:file   replaces a map; `If-Match` carries the version the editor started from (409 when the file
 *                             changed since)
 *  - DELETE /api/maps/:file   moves a map into the maps folder's .trash
 * Only the signed-in admin changes maps (`auth`, server/admin.js). Without an admin account the dev server lets anyone
 * change them (`openWrites`, it runs on the developer's own computer) and any other server lets nobody.
 */
export function createMapsApp({ mapsDir, auth, openWrites = false }) {
  const app = express()
  const canSave = auth.enabled || openWrites

  const mapFiles = () => fs.readdirSync(mapsDir).filter((name) => name.toLowerCase().endsWith('.json'))
  /** An existing map by its exact file name (no paths) */
  const existing = (file) => mapFiles().find((name) => name.slice(0, -5) === file)

  /** Writes next to the file and moves it over, so a reader never sees half a map. Returns the new version. */
  const writeMap = (name, map) => {
    const file = path.join(mapsDir, name)
    const text = JSON.stringify(map)
    const temp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(temp, text)
    fs.renameSync(temp, file)
    return versionOf(text)
  }

  app.use('/api/maps', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-Match, Authorization')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  /** Changing maps: the signed-in admin (or anyone on a dev server without an admin account) */
  const mayWrite = (req, res, next) => {
    if (!canSave) return res.status(403).json({ error: 'saving-off' })
    if (auth.enabled && !auth.isAdmin(req)) return res.status(401).json({ error: 'login' })
    next()
  }
  const body = express.text({ type: '*/*', limit: MAX_MAP_BYTES })

  app.get('/api/maps', (_req, res) => {
    const maps = mapFiles().map((name) => {
      const text = fs.readFileSync(path.join(mapsDir, name), 'utf8')
      return `{"file":${JSON.stringify(name.slice(0, -5))},"version":"${versionOf(text)}","data":${text}}`
    })
    // The files are sent as they are (already JSON), not parsed and re-serialized
    res.type('json').send(`{"canSave":${canSave},"needsLogin":${auth.enabled},"maps":[${maps.join(',')}]}`)
  })

  app.post('/api/maps', mayWrite, body, (req, res) => {
    let request
    try {
      request = JSON.parse(req.body)
    } catch {
      return res.status(400).json({ error: 'invalid-json' })
    }
    const map = readMap(JSON.stringify(request?.map ?? null))
    if (!map) return res.status(400).json({ error: 'invalid-map' })

    // A free file name: "Name", "Name 2", "Name 3", ...
    const base = fileNameFor(request.name ?? map.project.name)
    const taken = new Set(mapFiles().map((name) => name.slice(0, -5).toLowerCase()))
    let file = base
    for (let n = 2; taken.has(file.toLowerCase()); n++) file = `${base} ${n}`

    const version = writeMap(`${file}.json`, map)
    res.status(201).json({ ok: true, file, version })
  })

  app.put('/api/maps/:file', mayWrite, body, (req, res) => {
    const name = existing(req.params.file)
    if (!name) return res.status(404).json({ error: 'not-found' })
    const map = readMap(req.body)
    if (!map) return res.status(400).json({ error: 'invalid-map' })

    const current = versionOf(fs.readFileSync(path.join(mapsDir, name), 'utf8'))
    const expected = req.get('If-Match')
    if (expected && expected !== current) return res.status(409).json({ error: 'changed', version: current })

    res.json({ ok: true, version: writeMap(name, map) })
  })

  app.delete('/api/maps/:file', mayWrite, (req, res) => {
    const name = existing(req.params.file)
    if (!name) return res.status(404).json({ error: 'not-found' })
    const trash = path.join(mapsDir, TRASH_DIR)
    fs.mkdirSync(trash, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    fs.renameSync(path.join(mapsDir, name), path.join(trash, `${name.slice(0, -5)} ${stamp}.json`))
    res.json({ ok: true })
  })

  return app
}
