<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans relative pt-safe">
    <!-- Background glow -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-1/3 left-1/3 w-100 sm:w-150 h-75 sm:h-100 bg-brand-600/10 rounded-full blur-[140px]"></div>
      <div class="absolute bottom-1/4 right-1/4 w-87.5 sm:w-125 h-62.5 sm:h-87.5 bg-amber-500/10 rounded-full blur-[140px]"></div>
    </div>

    <!-- Header Bar -->
    <header class="relative z-10 w-full px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
      <div class="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <!-- Back to Home Button -->
        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="ArrowLeft"
          title="Return to Home"
          @click="handleLeave"
        >
          <span class="hidden sm:inline">Leave</span>
        </UiButton>

        <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

        <div class="min-w-0">
          <h1 class="text-xs sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
            <span class="truncate">{{ multiplayerStore.roomName || 'Game Room' }}</span>
            <UiBadge variant="emerald" size="xs">
              LOBBY
            </UiBadge>
          </h1>
          <p class="text-[10px] sm:text-[11px] text-slate-400 truncate">Map: <strong class="text-slate-200">{{ multiplayerStore.mapName }}</strong></p>
        </div>
      </div>

      <!-- Room Code Copy Badge -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <div class="glass-panel px-2.5 sm:px-3.5 py-1 rounded-xl sm:rounded-2xl border border-amber-500/40 bg-slate-900/90 flex items-center gap-1.5 sm:gap-2">
          <span class="text-[10px] sm:text-xs text-slate-400 font-medium hidden xs:inline">PIN:</span>
          <span class="font-mono text-xs sm:text-sm font-black text-amber-300 tracking-wider">
            {{ multiplayerStore.roomId || route.params.roomId }}
          </span>
          <button 
            type="button"
            class="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors cursor-pointer touch-target flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8"
            :title="isCopied ? 'Copied!' : 'Copy room code'"
            @click="copyRoomCode"
          >
            <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Tab Switcher (Visible only on mobile screens < lg) -->
    <div class="lg:hidden relative z-10 px-3 pt-2 shrink-0">
      <UiTabs
        v-model="mobileActiveTab"
        :items="mobileTabs"
        variant="segmented"
        size="sm"
        fill
      />
    </div>

    <!-- Main Lobby Content (Scrollable & Responsive) -->
    <main class="relative z-10 flex-1 max-w-7xl mx-auto w-full p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5 items-start overflow-y-auto custom-scrollbar">
      
      <!-- Left 2 Cols: Player Slots Grid -->
      <div 
        class="lg:col-span-2 space-y-3 sm:space-y-4"
        :class="{ 'hidden lg:block': mobileActiveTab !== 'slots' }"
      >
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4 text-brand-400" />
            <h2 class="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Player Slots ({{ filledSlotsCount }} / {{ multiplayerStore.slots.length }})
            </h2>
          </div>
          <span class="text-[11px] text-slate-400 hidden sm:inline">
            Each player is assigned to a defensive quadrant
          </span>
        </div>

        <!-- Player Slots List / Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
          <LobbyPlayerSlot 
            v-for="slot in multiplayerStore.slots"
            :key="slot.slotIndex"
            :slot="slot"
          />
        </div>

        <!-- Map Info Banner -->
        <UiCard variant="subtle" padding="sm" custom-class="flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-base shrink-0">
              🗺️
            </div>
            <div>
              <strong class="text-white text-xs block">{{ mapStore.project.name || 'Burbenog TD' }}</strong>
              <span class="text-[11px]">{{ mapStore.project.cols }}x{{ mapStore.project.rows }} | {{ mapStore.project.layers.length }} Layers</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="text-amber-400 font-semibold block text-[11px] sm:text-xs">{{ characterStore.waveConfigs.length || 10 }} Waves</span>
            <span class="text-[10px] text-slate-500">Auto synced</span>
          </div>
        </UiCard>
      </div>

      <!-- Right Col: Lobby Chat & Controls -->
      <div 
        class="h-90 sm:h-115 lg:h-125 flex flex-col"
        :class="{ 'hidden lg:flex': mobileActiveTab !== 'chat' }"
      >
        <LobbyChat class="flex-1" />
      </div>
    </main>

    <!-- Bottom Action Bar (Fixed at bottom with safe area) -->
    <footer class="relative z-20 w-full px-3 sm:px-6 py-2.5 sm:py-3.5 border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0 pb-safe shadow-2xl">
      <div class="flex items-center gap-2 text-xs text-slate-400 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="multiplayerStore.connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
        <span class="truncate text-[11px] sm:text-xs">{{ multiplayerStore.isHost ? '👑 You are Host' : '🌐 Connected' }}</span>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <!-- Ready Toggle (For Clients) with pulsating attention gesture -->
        <UiButton
          v-if="!multiplayerStore.isHost"
          :variant="multiplayerStore.myPlayer?.isReady ? 'game-green' : 'game-amber'"
          size="md"
          :custom-class="multiplayerStore.isReadyButtonGlowing && !multiplayerStore.myPlayer?.isReady ? 'ring-4 ring-amber-400 animate-bounce' : ''"
          @click="multiplayerStore.toggleReady()"
        >
          {{ multiplayerStore.myPlayer?.isReady ? '✅ Ready' : '⏳ Ready Up!' }}
        </UiButton>

        <!-- Start Game / Nudge Button (For Host) -->
        <template v-if="multiplayerStore.isHost">
          <!-- When players are not ready: Nudge button -->
          <UiButton
            v-if="!multiplayerStore.isAllReady"
            variant="game-amber"
            size="md"
            :leading-icon="BellRing"
            title="Request all players to ready up"
            @click="multiplayerStore.sendReadyCheck()"
          >
            🔔 Nudge ({{ multiplayerStore.unreadyCount }} waiting)
          </UiButton>

          <!-- When everyone is ready (or solo): Start Game Button -->
          <UiButton
            v-else
            variant="game-green"
            size="md"
            :leading-icon="Play"
            @click="handleStartGame"
          >
            🚀 Start Game
          </UiButton>
        </template>
      </div>
    </footer>

    <!-- Eye-catching Ready Check Alert Modal (For Clients when Host nudges) -->
    <div 
      v-if="multiplayerStore.isNudgeModalOpen && !multiplayerStore.isHost"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div class="glass-panel w-full max-w-sm rounded-3xl border-2 border-amber-500/80 bg-slate-900/95 shadow-2xl p-5 sm:p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mx-auto flex items-center justify-center text-2xl sm:text-3xl shadow-lg animate-bounce">
          🔔
        </div>

        <div class="space-y-1">
          <h3 class="text-base font-bold text-white tracking-wide">
            Game Is Starting!
          </h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            👑 Room Host (<strong class="text-amber-300">{{ multiplayerStore.nudgeHostName || 'Host' }}</strong>) is ready to start the game. Please confirm readiness!
          </p>
        </div>

        <UiButton
          variant="game-green"
          size="lg"
          block
          :leading-icon="Check"
          @click="multiplayerStore.toggleReady()"
        >
          ✅ YES, I AM READY!
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Users, Copy, Check, Play, BellRing } from 'lucide-vue-next'
import { UiButton, UiBadge, UiCard, UiTabs, TabItem } from '../components/ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useNotificationStore } from '../stores/notificationStore'
import LobbyPlayerSlot from '../components/LobbyPlayerSlot.vue'
import LobbyChat from '../components/LobbyChat.vue'

const route = useRoute()
const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const notify = useNotificationStore()

const isCopied = ref(false)
const mobileActiveTab = ref<string | number>('slots')

const mobileTabs: TabItem[] = [
  { id: 'slots', label: 'Slots', icon: Users },
  { id: 'chat', label: 'Room Chat' },
]

const filledSlotsCount = computed(() => {
  return multiplayerStore.slots.filter(s => s.player !== null).length
})

onMounted(() => {
  multiplayerStore.setRouter(router)
  const code = (route.params.roomId as string) || ''
  if (code && !multiplayerStore.roomId) {
    multiplayerStore.joinGame(code, router)
  }
})

// Auto-navigate to game whenever room game state becomes 'in_game'
watch(
  () => multiplayerStore.roomGameState,
  (state) => {
    if (state === 'in_game') {
      const code = multiplayerStore.roomId || (route.params.roomId as string)
      router.push(`/game/${code}`)
    }
  },
  { immediate: true }
)

function copyRoomCode() {
  const code = multiplayerStore.roomId || (route.params.roomId as string)
  if (code) {
    navigator.clipboard.writeText(code)
    isCopied.value = true
    notify.info(`Xona kodi nusxalandi: ${code}`)
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }
}

function handleStartGame() {
  multiplayerStore.startGame(router)
}

async function handleLeave() {
  const confirmed = await notify.confirm({
    title: "Xonadan chiqish",
    message: "Haqiqatan ham ushbu xonadan chiqmoqchimisiz?",
    confirmText: "Chiqish",
    cancelText: "Bekor qilish",
    variant: "danger"
  })
  if (confirmed) {
    multiplayerStore.leaveRoom(router)
  }
}

function handleBeforeUnload() {
  if (multiplayerStore.roomId) {
    multiplayerStore.leaveRoom()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>
