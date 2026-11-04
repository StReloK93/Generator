import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createMultiplayerApp } from './multiplayer.js'

// Production server: the built frontend (dist/) and the multiplayer backend on one port.
const PORT = Number(process.env.PORT) || 3000
const APP_BASE = process.env.APP_BASE || '/' // must match `base` in vite.config.ts
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')

const app = express()
const server = http.createServer(app)

app.use(createMultiplayerApp(server))
app.use(APP_BASE, express.static(distDir))
// App routes (/game/<map>, /lobby/<room>, ...) are client side: a refresh or shared link gets the app shell
app.use(APP_BASE, (req, res, next) => {
  if (req.method !== 'GET' || path.extname(req.path) || !req.accepts('html')) return next()
  res.sendFile(path.join(distDir, 'index.html'))
})
if (APP_BASE !== '/') app.get('/', (_req, res) => res.redirect(APP_BASE))

server.listen(PORT, () => {
  console.log(`Defensor server: http://localhost:${PORT}${APP_BASE}`)
})
