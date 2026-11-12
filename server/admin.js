import crypto from 'node:crypto'
import express from 'express'

/** A sign-in lasts this long (then the admin signs in again) */
const SESSION_MS = 30 * 24 * 60 * 60 * 1000
/** Wrong passwords from one address before it has to wait */
const MAX_FAILURES = 5
const LOCKOUT_MS = 10 * 60 * 1000

/** Equal texts, compared in constant time (a wrong guess takes as long as a right one) */
function sameText(a, b) {
  const hash = (text) => crypto.createHash('sha256').update(String(text)).digest()
  return crypto.timingSafeEqual(hash(a), hash(b))
}

/**
 * The admin: the one account (ADMIN_LOGIN / ADMIN_PASSWORD in the server's .env) allowed to change the game's maps.
 *  - POST /api/admin/login    { login, password } -> { token, login }; the editor keeps the token and sends it as
 *                             "Authorization: Bearer <token>"
 *  - POST /api/admin/logout   ends that sign-in
 *  - GET  /api/admin/me       { enabled, admin, login }: whether there is an admin account, and whether the caller is it
 * Sign-ins live in the server's memory: a restarted server asks the admin to sign in again.
 * `isAdmin(req)` / `isAdminToken(token)` tell the other parts whether a request or token is the signed-in admin's.
 */
export function createAdminAuth({ login = '', password = '' }) {
  const app = express()
  const enabled = !!login && !!password
  const sessions = new Map()
  const failures = new Map()

  const tokenOf = (req) => /^Bearer (.+)$/.exec(req.get('Authorization') || '')?.[1] ?? ''

  /** A sign-in token the server gave out and that has not run out (the online chat checks it too) */
  function isAdminToken(token) {
    const until = sessions.get(token)
    if (!until) return false
    if (until < Date.now()) {
      sessions.delete(token)
      return false
    }
    return true
  }

  const isAdmin = (req) => isAdminToken(tokenOf(req))

  app.use('/api/admin', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.get('/api/admin/me', (req, res) => {
    const admin = enabled && isAdmin(req)
    res.json({ enabled, admin, login: admin ? login : null })
  })

  app.post('/api/admin/login', express.json({ limit: '4kb' }), (req, res) => {
    if (!enabled) return res.status(403).json({ error: 'off' })
    const address = req.ip || req.socket.remoteAddress || ''
    const record = failures.get(address)
    if (record && record.count >= MAX_FAILURES && record.until > Date.now()) return res.status(429).json({ error: 'too-many' })

    if (!sameText(req.body?.login ?? '', login) || !sameText(req.body?.password ?? '', password)) {
      const count = record && record.until > Date.now() ? record.count + 1 : 1
      failures.set(address, { count, until: Date.now() + LOCKOUT_MS })
      return res.status(401).json({ error: 'wrong' })
    }
    failures.delete(address)
    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, Date.now() + SESSION_MS)
    res.json({ token, login })
  })

  app.post('/api/admin/logout', (req, res) => {
    sessions.delete(tokenOf(req))
    res.json({ ok: true })
  })

  return { app, enabled, isAdmin, isAdminToken }
}
