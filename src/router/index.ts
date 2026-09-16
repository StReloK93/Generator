import { createRouter, createWebHashHistory } from 'vue-router'

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
    path: '/projectile-editor',
    name: 'projectile-editor',
    component: () => import('../views/ProjectileEditorView.vue'),
  },
  {
    path: '/lobby/:roomId',
    name: 'lobby',
    component: () => import('../views/LobbyView.vue'),
  },
  {
    path: '/game/:mapId?',
    name: 'game',
    component: () => import('../views/GameView.vue'),
  },
  // Fallback for Telegram Mini App #tgWebAppData launch params or invalid routes
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard to seamlessly handle Telegram WebApp hash parameters
router.beforeEach((to, _from, next) => {
  if (to.fullPath.includes('tgWebApp') || to.path.includes('tgWebApp')) {
    return next('/')
  }
  next()
})
