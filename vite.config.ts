import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// In-memory active rooms & message queue registry for LAN & multi-browser networking
const activeRooms = new Map<string, any>()
const roomMessageQueues = new Map<string, Array<{ id: string; senderId: string; timestamp: number; data: any }>>()

function roomDiscoveryPlugin(): Plugin {
  return {
    name: 'vite-plugin-room-discovery',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const now = Date.now()
        // Clean up stale rooms (> 20 seconds without heartbeat)
        for (const [id, room] of activeRooms.entries()) {
          if (!room || now - (room.lastHeartbeat || 0) > 20000) {
            activeRooms.delete(id)
            roomMessageQueues.delete(id)
          }
        }

        const url = req.url || ''
        if (url.includes('/api/rooms')) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.end()
            return
          }

          // 1. Room Messages Relay API: /api/rooms/:roomId/messages
          if (url.includes('/messages')) {
            const urlObj = new URL(url, 'http://localhost')
            const parts = urlObj.pathname.split('/')
            const msgIdx = parts.indexOf('messages')
            const rId = msgIdx > 0 ? parts[msgIdx - 1].toUpperCase() : ''

            if (!rId) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing roomId' }))
              return
            }

            if (req.method === 'GET') {
              const since = Number(urlObj.searchParams.get('since') || '0')
              const sender = urlObj.searchParams.get('sender') || ''
              const queue = roomMessageQueues.get(rId) || []
              const newMsgs = queue.filter(m => m.timestamp > since && m.senderId !== sender)
              res.statusCode = 200
              res.end(JSON.stringify(newMsgs.map(m => m.data)))
              return
            }

            if (req.method === 'POST') {
              let body = ''
              req.on('data', (chunk) => { body += chunk })
              req.on('end', () => {
                try {
                  const netMsg = JSON.parse(body)
                  if (netMsg) {
                    if (!roomMessageQueues.has(rId)) {
                      roomMessageQueues.set(rId, [])
                    }
                    const q = roomMessageQueues.get(rId)!
                    q.push({
                      id: netMsg.id || `${Date.now()}-${Math.random()}`,
                      senderId: netMsg.senderId || '',
                      timestamp: netMsg.timestamp || Date.now(),
                      data: netMsg,
                    })
                    // Keep last 150 messages in memory buffer
                    if (q.length > 150) {
                      q.splice(0, q.length - 150)
                    }
                  }
                  res.statusCode = 200
                  res.end(JSON.stringify({ ok: true }))
                } catch {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Invalid JSON' }))
                }
              })
              return
            }
          }

          // 2. Room Discovery List API: /api/rooms
          if (req.method === 'GET') {
            const list = Array.from(activeRooms.values())
            res.statusCode = 200
            res.end(JSON.stringify(list))
            return
          }

          // 3. Room Heartbeat Registration: POST /api/rooms
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const room = JSON.parse(body)
                if (room && room.action === 'delete') {
                  activeRooms.delete(room.roomId)
                  roomMessageQueues.delete(room.roomId)
                  res.statusCode = 200
                  res.end(JSON.stringify({ ok: true }))
                  return
                }
                if (room && room.roomId) {
                  room.lastHeartbeat = Date.now()
                  activeRooms.set(room.roomId, room)
                }
                res.statusCode = 200
                res.end(JSON.stringify({ ok: true }))
              } catch {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          // 4. Room Deletion: DELETE /api/rooms/:roomId
          if (req.method === 'DELETE') {
            const parts = url.split('?')[0].split('/')
            const roomId = parts[parts.length - 1]
            if (roomId && roomId !== 'rooms') {
              activeRooms.delete(roomId)
              roomMessageQueues.delete(roomId)
            }
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true }))
            return
          }
        }

        next()
      })
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
    roomDiscoveryPlugin(),
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
