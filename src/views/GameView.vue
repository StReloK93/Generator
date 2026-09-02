<template>
  <div class="relative h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none flex flex-col">
    <!-- Top Multiplayer Game Status Bar -->
    <header class="relative z-30 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/90 backdrop-blur-xl flex items-center justify-between shadow-2xl">
      <!-- Left: Room & Wave status -->
      <div class="flex items-center gap-3">
        <button 
          @click="handleExitGame"
          class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          title="Chiqish"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Chiqish</span>
        </button>

        <div class="h-4 w-px bg-slate-800"></div>

        <!-- Wave / Countdown Pill -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-white">
            To'lqin {{ characterStore.currentWaveIndex + 1 }} / {{ characterStore.waveConfigs.length || 10 }}
          </span>

          <span 
            v-if="characterStore.gameState === 'build_prep'"
            class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/40 animate-pulse flex items-center gap-1"
          >
            <Clock class="w-3 h-3" />
            <span>Kutish: {{ Math.ceil(characterStore.prepCountdown) }}s</span>
          </span>

          <span 
            v-else-if="characterStore.gameState === 'wave_running'"
            class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/40 animate-pulse"
          >
            ⚔️ Jang Ketyapti
          </span>
        </div>
      </div>

      <!-- Center: Connected Players Leaderboard with Kills -->
      <div class="hidden md:flex items-center gap-2">
        <div 
          v-for="p in multiplayerStore.players"
          :key="p.id"
          class="px-2.5 py-1 rounded-xl bg-slate-950/80 border flex items-center gap-2 text-xs transition-all"
          :class="p.id === multiplayerStore.myPlayerId ? 'border-brand-500/80 ring-1 ring-brand-500/40 bg-brand-950/20' : 'border-slate-800'"
        >
          <div 
            class="w-3 h-3 rounded-full border border-white/50 shrink-0"
            :style="{ backgroundColor: p.color }"
          ></div>
          <span class="font-bold text-slate-200 truncate max-w-[90px]">{{ p.name }}</span>
          <div class="flex items-center gap-1.5 text-[10px] font-mono">
            <span class="text-rose-400 font-bold" :title="`${p.name} o'ldirgan dushmanlar soni`">☠️ {{ p.killsCount || 0 }}</span>
            <span class="text-amber-300 font-bold" :title="`Oltin`">🪙 {{ p.gold || characterStore.gold }}</span>
          </div>
        </div>
      </div>

      <!-- Right: Lives, Kills, Gold, FPS & Chat Toggle -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Player Lives -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold font-mono">
          <Heart class="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>{{ characterStore.playerLives }} / {{ characterStore.maxLives }}</span>
        </div>

        <!-- Total Kills -->
        <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono" title="Jami o'ldirilgan dushmanlar">
          <Skull class="w-3.5 h-3.5 text-rose-400" />
          <span>{{ characterStore.totalKills }}</span>
        </div>

        <!-- Gold -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
          <Coins class="w-3.5 h-3.5 text-amber-400" />
          <span>{{ characterStore.gold }}</span>
        </div>

        <!-- Live FPS Counter -->
        <div 
          class="px-2 py-1 rounded-xl text-[11px] font-mono font-bold border flex items-center gap-1 shrink-0 select-none"
          :class="characterStore.fps >= 50 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : characterStore.fps >= 30 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'"
          title="Kadrlar chastotasi (FPS)"
        >
          <span>⚡ {{ characterStore.fps }} FPS</span>
        </div>

        <!-- Chat Toggle Button -->
        <button 
          @click="isChatOpen = !isChatOpen"
          class="p-2 rounded-xl transition-all cursor-pointer relative"
          :class="isChatOpen ? 'bg-brand-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'"
          title="Xona Chati"
        >
          <MessageSquare class="w-4 h-4" />
          <span 
            v-if="unreadCount > 0 && !isChatOpen"
            class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center"
          >
            {{ unreadCount }}
          </span>
        </button>
      </div>
    </header>

    <!-- Main Game Viewport -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Loading Overlay when map is transferring -->
      <div 
        v-if="!isMapLoaded" 
        class="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6"
      >
        <div class="w-16 h-16 rounded-3xl bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center justify-center text-3xl shadow-xl shadow-brand-500/10 animate-bounce">
          🗺️
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-white">Karta Yuklanmoqda...</h3>
          <p class="text-xs text-slate-400">Barcha qatlamlar va chiqish yo'llari sinxronlashtirilmoqda</p>
        </div>
        <div class="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div class="h-full bg-gradient-to-r from-brand-500 to-indigo-500 animate-pulse w-3/4 rounded-full"></div>
        </div>
      </div>

      <CanvasViewport v-if="isMapLoaded" ref="viewportRef" />

      <!-- Floating In-Game Chat Sidebar -->
      <div 
        v-if="isChatOpen"
        class="absolute right-4 bottom-24 z-40 w-80 h-96 animate-in fade-in slide-in-from-right-4 duration-200"
      >
        <LobbyChat />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Clock, Heart, Coins, MessageSquare, Skull } from 'lucide-vue-next'
import CanvasViewport from '../components/CanvasViewport.vue'
import LobbyChat from '../components/LobbyChat.vue'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useAssetStore } from '../stores/assetStore'

const router = useRouter()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()

const viewportRef = ref<any>(null)
const isChatOpen = ref(false)
const unreadCount = ref(0)

const isMapLoaded = computed(() => {
  return mapStore.project.layers && mapStore.project.layers.length > 0 && mapStore.project.cols > 0
})

onMounted(async () => {
  multiplayerStore.setRouter(router)
  await assetStore.loadBuiltinSprites()
  if (isMapLoaded.value) {
    characterStore.detectDoors()
    if (!multiplayerStore.roomId || multiplayerStore.isHost) {
      characterStore.startPlayMode()
    } else {
      characterStore.isGameMode = true
      characterStore.isEnabled = true
      towerStore.clearCombatEffects()
    }
  }
})

watch(isMapLoaded, async (loaded) => {
  if (loaded) {
    await assetStore.loadBuiltinSprites()
    characterStore.detectDoors()
    if (!multiplayerStore.roomId || multiplayerStore.isHost) {
      characterStore.startPlayMode()
    } else {
      characterStore.isGameMode = true
      characterStore.isEnabled = true
      towerStore.clearCombatEffects()
    }
  }
})

function handleExitGame() {
  if (confirm("O'yindan chiqmoqchimisiz?")) {
    characterStore.exitPlayMode()
    multiplayerStore.leaveRoom(router)
  }
}

watch(
  () => multiplayerStore.chatMessages.length,
  () => {
    if (!isChatOpen.value) {
      unreadCount.value++
    }
  }
)

watch(isChatOpen, (open) => {
  if (open) {
    unreadCount.value = 0
  }
})
</script>
