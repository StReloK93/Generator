import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { createMultiplayerApp } from './server/multiplayer.js'

// Mounts the multiplayer backend (PeerJS signaling + room list) into the dev/preview server,
// so frontend and server run as one — same as `npm start` in production.
function multiplayerServerPlugin(): Plugin {
  return {
    name: 'defensor-multiplayer-server',
    configureServer(server) {
      if (server.httpServer) server.middlewares.use(createMultiplayerApp(server.httpServer))
    },
    configurePreviewServer(server) {
      if (server.httpServer) server.middlewares.use(createMultiplayerApp(server.httpServer))
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
export default defineConfig({
  base: '/Generator/',
  plugins: [
    vue(),
    tailwindcss(),
    multiplayerServerPlugin(),
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
  },
})
