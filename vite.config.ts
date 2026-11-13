import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { createMultiplayerApp } from './server/multiplayer.js'
import { createMapsApp } from './server/maps.js'
import { createCharactersApp } from './server/characters.js'
import { createAdminAuth } from './server/admin.js'
import { createOnline } from './server/online.js'

const mapsDir = path.resolve(__dirname, 'src/maps')
const charactersFile = path.resolve(__dirname, 'src/assets/characters/settings.json')

// Mounts the backend (admin sign-in, built-in maps, character settings, PeerJS signaling + room list) into the dev/preview server,
// so frontend and server run as one — same as `npm start` in production.
// Map changes need the admin (ADMIN_LOGIN / ADMIN_PASSWORD in .env); without an admin account the dev server takes them
// from anyone (it runs on the developer's own computer), preview from nobody.
function multiplayerServerPlugin(env: Record<string, string>): Plugin {
  const admin = createAdminAuth({ login: env.ADMIN_LOGIN, password: env.ADMIN_PASSWORD })
  return {
    name: 'defensor-multiplayer-server',
    configureServer(server) {
      server.middlewares.use(admin.app)
      server.middlewares.use(createMapsApp({ mapsDir, auth: admin, openWrites: true }))
      server.middlewares.use(createCharactersApp({ file: charactersFile, auth: admin, openWrites: true }))
      if (!server.httpServer) return
      server.middlewares.use(createMultiplayerApp(server.httpServer))
      createOnline(server.httpServer, { auth: admin })
    },
    configurePreviewServer(server) {
      server.middlewares.use(admin.app)
      server.middlewares.use(createMapsApp({ mapsDir, auth: admin }))
      server.middlewares.use(createCharactersApp({ file: charactersFile, auth: admin }))
      if (!server.httpServer) return
      server.middlewares.use(createMultiplayerApp(server.httpServer))
      createOnline(server.httpServer, { auth: admin })
    },
  }
}

import { exec } from 'child_process'

function assetAtlasWatcherPlugin(): Plugin {
  let isBuilding = false
  let debounceTimer: any = null

  function triggerAtlasBuild() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (isBuilding) return
      isBuilding = true
      console.log('🔄 [Asset Watcher] Yangi sprite aniqlandi, atlaslar va manifest avtomatik yangilanmoqda...')
      exec('node scripts/buildAtlases.js', (err, stdout, stderr) => {
        isBuilding = false
        if (err) {
          console.error('❌ [Asset Watcher Xatosi]:', stderr)
        } else {
          console.log('✅ [Asset Watcher]: Barcha WebP atlaslar va spriteManifest.json muvaffaqiyatli yangilandi!')
        }
      })
    }, 300)
  }

  return {
    name: 'vite-plugin-asset-atlas-watcher',
    configureServer(server) {
      server.watcher.on('add', (filePath) => {
        if (filePath.includes('src\\assets\\sprites') || filePath.includes('src/assets/sprites') ||
            filePath.includes('src\\assets\\characters') || filePath.includes('src/assets/characters')) {
          triggerAtlasBuild()
        }
      })
      server.watcher.on('unlink', (filePath) => {
        if (filePath.includes('src\\assets\\sprites') || filePath.includes('src/assets/sprites') ||
            filePath.includes('src\\assets\\characters') || filePath.includes('src/assets/characters')) {
          triggerAtlasBuild()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Served from the domain root; set APP_BASE (e.g. /Generator/) to host under a sub-path
  base: process.env.APP_BASE || '/',
  plugins: [
    vue(),
    tailwindcss(),
    multiplayerServerPlugin(loadEnv(mode, __dirname, '')),
    assetAtlasWatcherPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Listen on all local IPs (LAN support)
    port: 5173,
    // Maps and character settings saved from the editor are read through the API: a saved file must not reload the open pages
    watch: { ignored: ['**/src/maps/**', '**/src/assets/characters/settings.json*'] },
  },
}))
