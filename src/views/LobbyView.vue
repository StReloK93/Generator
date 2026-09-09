<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans relative pt-safe">
    <!-- Background glow -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-1/3 left-1/3 w-100 sm:w-150 h-75 sm:h-100 bg-brand-600/10 rounded-full blur-[140px]"></div>
      <div class="absolute bottom-1/4 right-1/4 w-87.5 sm:w-125 h-62.5 sm:h-87.5 bg-amber-500/10 rounded-full blur-[140px]"></div>
    </div>

    <!-- Header Bar -->
    <header class="relative z-40 w-full px-3 sm:px-6 py-2 sm:py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
      <div class="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <!-- Back to Home Button -->
        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="ArrowLeft"
          :title="$t('lobby.leave')"
          @click="handleLeave"
        >
          <span class="hidden sm:inline">{{ $t('lobby.leave') }}</span>
        </UiButton>

        <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

        <div class="min-w-0">
          <h1 class="text-xs sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
            <span class="truncate">{{ multiplayerStore.roomName || $t('lobby.title') }}</span>
            <UiBadge variant="emerald" size="xs">
              {{ $t('lobby.title') }}
            </UiBadge>
          </h1>
          <p class="text-[10px] sm:text-[11px] text-slate-400 truncate">{{ $t('common.name') }}: <strong class="text-slate-200">{{ multiplayerStore.mapName }}</strong></p>
        </div>
      </div>

      <!-- Right Header Actions: Language Switcher + Room PIN -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <UiLanguageSwitcher />

        <div class="glass-panel px-2.5 sm:px-3.5 py-1 rounded-xl sm:rounded-2xl border border-amber-500/40 bg-slate-900/90 flex items-center gap-1.5 sm:gap-2">
          <span class="text-[10px] sm:text-xs text-slate-400 font-medium hidden xs:inline">{{ $t('lobby.roomPin') }}:</span>
          <span class="font-mono text-xs sm:text-sm font-black text-amber-300 tracking-wider">
            {{ multiplayerStore.roomId || route.params.roomId }}
          </span>
          <button 
            type="button"
            class="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors cursor-pointer touch-target flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8"
            :title="isCopied ? $t('common.copied') : $t('common.copy')"
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

    <!-- Main Lobby Content (Zero page scroll) -->
    <main class="relative z-10 flex-1 max-w-6xl mx-auto w-full p-2.5 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4 items-stretch min-h-0 overflow-hidden">
      
      <!-- Left 2 Cols: Player Slots Grid -->
      <div 
        class="lg:col-span-2 flex flex-col justify-between gap-2 min-h-0 overflow-y-auto custom-scrollbar"
        :class="{ 'hidden lg:flex': mobileActiveTab !== 'slots' }"
      >
        <div class="flex items-center justify-between px-1 shrink-0">
          <div class="flex items-center gap-2">
            <Users class="w-3.5 h-3.5 text-brand-400" />
            <h2 class="text-xs font-bold text-white uppercase tracking-wider">
              {{ $t('lobby.players', { current: filledSlotsCount, max: multiplayerStore.slots.length }) }}
            </h2>
          </div>
        </div>

        <!-- Player Slots List / Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0">
          <LobbyPlayerSlot 
            v-for="slot in multiplayerStore.slots"
            :key="slot.slotIndex"
            :slot="slot"
          />
        </div>

        <!-- Map Info Banner (Compact) -->
        <UiCard variant="subtle" padding="xs" custom-class="flex items-center justify-between text-xs text-slate-400 shrink-0 py-1.5 px-2.5">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center text-sm shrink-0">
              <Map class="w-3.5 h-3.5" />
            </div>
            <div>
              <strong class="text-white text-xs block truncate max-w-40">{{ mapStore.project.name || 'Burbenog TD' }}</strong>
              <span class="text-[10px] text-slate-400 font-mono">{{ mapStore.project.cols }}×{{ mapStore.project.rows }}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="text-amber-400 font-semibold block text-[11px]">{{ characterStore.waveConfigs.length || 10 }} {{ $t('game.wave') }}</span>
            <span class="text-[9px] text-slate-500">{{ $t('common.ready') }}</span>
          </div>
        </UiCard>
      </div>

      <!-- Right Col: Lobby Chat & Controls -->
      <div 
        class="h-full min-h-0 flex flex-col"
        :class="{ 'hidden lg:flex': mobileActiveTab !== 'chat' }"
      >
        <LobbyChat class="flex-1 min-h-0" />
      </div>
    </main>

    <!-- Bottom Action Bar (Fixed at bottom with safe area) -->
    <footer class="relative z-20 w-full px-3 sm:px-6 py-2.5 sm:py-3.5 border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0 pb-safe shadow-2xl">
      <div class="flex items-center gap-2 text-xs text-slate-400 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="multiplayerStore.connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
        <span class="truncate text-[11px] sm:text-xs flex items-center gap-1.5">
          <component :is="multiplayerStore.isHost ? Crown : Radio" class="w-3.5 h-3.5 text-amber-400" />
          <span>{{ multiplayerStore.isHost ? $t('lobby.youAreHost') : $t('lobby.connected') }}</span>
        </span>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <!-- Ready Toggle (For Clients) with pulsating attention gesture -->
        <UiButton
          v-if="!multiplayerStore.isHost"
          :variant="multiplayerStore.myPlayer?.isReady ? 'game-green' : 'game-amber'"
          size="md"
          :leading-icon="multiplayerStore.myPlayer?.isReady ? Check : Clock"
          :custom-class="multiplayerStore.isReadyButtonGlowing && !multiplayerStore.myPlayer?.isReady ? 'ring-4 ring-amber-400 animate-bounce' : ''"
          @click="multiplayerStore.toggleReady()"
        >
          <span>{{ multiplayerStore.myPlayer?.isReady ? $t('common.ready') : $t('lobby.readyUp') }}</span>
        </UiButton>

        <!-- Start Game / Nudge Button (For Host) -->
        <template v-if="multiplayerStore.isHost">
          <!-- When players are not ready: Nudge button -->
          <UiButton
            v-if="!multiplayerStore.isAllReady"
            variant="game-amber"
            size="md"
            :leading-icon="BellRing"
            :title="$t('lobby.nudge', { count: multiplayerStore.unreadyCount })"
            @click="multiplayerStore.sendReadyCheck()"
          >
            <span>{{ $t('lobby.nudge', { count: multiplayerStore.unreadyCount }) }}</span>
          </UiButton>

          <!-- When everyone is ready (or solo): Start Game Button -->
          <UiButton
            v-else
            variant="game-green"
            size="md"
            :leading-icon="Play"
            @click="handleStartGame"
          >
            <span>{{ $t('lobby.startGame') }}</span>
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
          <BellRing class="w-6 h-6 sm:w-7 sm:h-7" />
        </div>

        <div class="space-y-1">
          <h3 class="text-base font-bold text-white tracking-wide">
            {{ $t('lobby.nudgeAlertTitle') }}
          </h3>
          <p class="text-xs text-slate-300 leading-relaxed flex items-center justify-center gap-1">
            <Crown class="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{{ $t('lobby.nudgeAlertDesc', { name: multiplayerStore.nudgeHostName || 'Host' }) }}</span>
          </p>
        </div>

        <UiButton
          variant="game-green"
          size="lg"
          block
          :leading-icon="Check"
          @click="multiplayerStore.toggleReady()"
        >
          {{ $t('lobby.imReady') }}
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Users, Copy, Check, Play, BellRing, Map, Crown, Radio, Clock } from 'lucide-vue-next'
import { UiButton, UiBadge, UiCard, UiTabs, UiLanguageSwitcher, TabItem } from '../components/ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import LobbyPlayerSlot from '../components/LobbyPlayerSlot.vue'
import LobbyChat from '../components/LobbyChat.vue'

const route = useRoute()
const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const notify = useNotificationStore()
const { t } = useI18n()

const isCopied = ref(false)
const mobileActiveTab = ref<string | number>('slots')

const mobileTabs = computed<TabItem[]>(() => [
  { id: 'slots', label: t('lobby.players', { current: filledSlotsCount.value, max: multiplayerStore.slots.length }), icon: Users },
  { id: 'chat', label: t('lobby.chatTitle') },
])

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
      characterStore.entrySource = 'lobby'
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
    notify.info(`${t('lobby.roomCode', { code })} - ${t('common.copied')}`)
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
    title: t('lobby.confirmLeaveTitle'),
    message: t('lobby.confirmLeaveDesc'),
    confirmText: t('lobby.leave'),
    cancelText: t('common.cancel'),
    variant: 'danger'
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
