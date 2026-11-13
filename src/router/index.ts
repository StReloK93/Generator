import { createRouter,  createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/play',
    name: 'play',
    component: () => import('../views/PlayView.vue'),
  },
  {
    path: '/multiplayer',
    name: 'multiplayer',
    component: () => import('../views/MultiplayerView.vue'),
  },
  {
    path: '/editor/:mapId?',
    name: 'editor',
    component: () => import('../views/EditorView.vue'),
  },
  {
    path: '/asset-editor',
    name: 'asset-editor',
    component: () => import('../views/AssetEditorView.vue'),
  },
  {
    path: '/characters',
    name: 'characters',
    component: () => import('../views/CharacterSettingsView.vue'),
  },
  {
    path: '/projectile-editor',
    name: 'projectile-editor',
    component: () => import('../views/ProjectileEditorView.vue'),
  },
  {
    path: '/lobby/:roomId/:mapId?',
    name: 'lobby',
    component: () => import('../views/LobbyView.vue'),
  },
  {
    path: '/game/:mapId?',
    name: 'game',
    component: () => import('../views/GameView.vue'),
  },
  {
    path: '/game/:mapId/room/:roomId',
    name: 'room-game',
    component: () => import('../views/GameView.vue'),
  },
  {
    path: '/editor-game/:mapId?',
    name: 'editor-game',
    component: () => import('../views/EditorGameView.vue'),
  },
  // Unknown routes go home
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Telegram opens the Mini App with its launch data in the hash (#tgWebAppData=...) and sometimes the query
// (?tgWebAppStartParam=...). The SDK has read them already: drop them and stay on the page that was opened
// (a bot button can open /lobby/<room> directly).
router.beforeEach((to) => {
  const telegramQuery = Object.keys(to.query).filter(key => key.startsWith('tgWebApp'))
  if (!to.hash.includes('tgWebApp') && telegramQuery.length === 0) return true
  const query = { ...to.query }
  for (const key of telegramQuery) delete query[key]
  return { path: to.path, query, hash: '', replace: true }
})
