import { createRouter, createWebHistory } from 'vue-router'

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
    path: '/editor',
    name: 'editor',
    component: () => import('../views/EditorView.vue'),
  },
  {
    path: '/lobby/:roomId',
    name: 'lobby',
    component: () => import('../views/LobbyView.vue'),
  },
  {
    path: '/game/:roomId?',
    name: 'game',
    component: () => import('../views/GameView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory('/Generator/'),
  routes,
})
