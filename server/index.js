import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createMultiplayerApp } from './multiplayer.js'
import { startTurnServer } from './turn.js'
import { startTelegramBot } from './telegramBot.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Server settings (PORT, APP_BASE, TURN_*) from .env in the project folder, whatever folder the process starts in (IIS)
const envFile = path.join(rootDir, '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

// Production server: the built frontend (dist/) and the multiplayer backend on one port.
const PORT = Number(process.env.PORT) || 3000
const APP_BASE = process.env.APP_BASE || '/' // must match `base` in vite.config.ts
const distDir = path.join(rootDir, 'dist')

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

startTurnServer()
startTelegramBot()
server.listen(PORT, () => {
  console.log(`Realms server: http://localhost:${PORT}${APP_BASE}`)
})
