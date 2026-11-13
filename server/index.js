import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createMultiplayerApp } from './multiplayer.js'
import { createMapsApp } from './maps.js'
import { createCharactersApp } from './characters.js'
import { createAdminAuth } from './admin.js'
import { createOnline } from './online.js'
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

// Built-in maps, changed from the editor by the signed-in admin (ADMIN_LOGIN / ADMIN_PASSWORD; MAPS_DIR: where the maps
// live, default src/maps)
const admin = createAdminAuth({ login: process.env.ADMIN_LOGIN, password: process.env.ADMIN_PASSWORD })
const mapsDir = process.env.MAPS_DIR ? path.resolve(rootDir, process.env.MAPS_DIR) : path.join(rootDir, 'src', 'maps')
app.use(admin.app)
app.use(createMapsApp({ mapsDir, auth: admin }))
// The characters' own settings (run animation speed), the same on every map
app.use(createCharactersApp({ file: path.join(rootDir, 'src', 'assets', 'characters', 'settings.json'), auth: admin }))
// Who is online, and the chat for all of them
createOnline(server, { auth: admin })
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
