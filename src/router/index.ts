import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EditorView from '../views/EditorView.vue'
import LobbyView from '../views/LobbyView.vue'
import GameView from '../views/GameView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/editor',
    name: 'editor',
    component: EditorView,
  },
  {
    path: '/lobby/:roomId',
    name: 'lobby',
    component: LobbyView,
  },
  {
    path: '/game/:roomId',
    name: 'game',
    component: GameView,
  },
]

export const router = createRouter({
  history: createWebHistory('/Generator/'),
  routes,
})
