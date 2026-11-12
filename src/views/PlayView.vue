<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full citadel-backdrop text-slate-100 flex flex-col overflow-hidden select-none font-sans pb-safe">
    <!-- A bar across the top, like the multiplayer page -->
    <header class="pt-safe shrink-0 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md page-rise">
      <div class="w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 short:py-1 flex items-center gap-2">
        <UiIconButton :icon="ArrowLeft" size="md" variant="ghost" :title="$t('common.back')" custom-class="icon-gold" @click="back" />
        <h1 class="font-display text-base sm:text-lg font-bold uppercase tracking-[0.14em] text-brand-100 truncate">
          {{ $t('home.singleplayer') }}
        </h1>
      </div>
    </header>

    <!-- Wide screens: the folders left, the picked map right. An upright phone shows one at a time: the folders, then
         (after a tap on a map) the map with a way back. -->
    <main class="flex-1 min-h-0 w-full max-w-6xl mx-auto flex page-rise [animation-delay:60ms]">
      <MapBrowser
        :maps="maps"
        :model-value="selectedMap?.id || ''"
        importable
        :class="['w-56 sm:w-72 short:w-52 shrink-0 border-r border-slate-800/80 portrait:w-full portrait:border-r-0', showDetails ? 'portrait:hidden' : '']"
        @update:model-value="pickMap"
        @pick="start"
        @imported="imported.unshift($event)"
      />

      <section :class="['flex-1 min-w-0 flex flex-col min-h-0', showDetails ? '' : 'portrait:hidden']">
        <div class="hidden portrait:flex shrink-0 px-2 pt-2">
          <UiButton variant="ghost" size="sm" :leading-icon="ChevronLeft" @click="showDetails = false">{{ $t('common.back') }}</UiButton>
        </div>
        <Transition name="detail-swap" mode="out-in">
          <MapDetails v-if="selectedMap" :key="selectedMap.id" :map="selectedMap" class="flex-1 min-h-0" />
        </Transition>
        <div class="shrink-0 p-2.5 sm:p-4 short:py-2 border-t border-slate-800/80 mt-auto">
          <UiButton
            variant="regal"
            size="hero"
            block
            :loading="isStarting"
            :disabled="!selectedMap || isStarting"
            @click="selectedMap && start(selectedMap)"
          >
            {{ isStarting ? $t('home.loadingMap') : $t('home.playGame') }}
          </UiButton>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft } from 'lucide-vue-next'
import { UiButton, UiIconButton } from '../components/ui'
import MapBrowser from '../components/home/MapBrowser.vue'
import MapDetails from '../components/home/MapDetails.vue'
import { getBuiltinMaps, sanitizeMapId, applyMapPayloadToStores, type MapSummary } from '../services/mapManager'
import { assetManager } from '../services/assetManager'
import { setBackButton } from '../services/telegram'
import { gamePath } from '../router/paths'
import { useGameStore } from '../stores/gameStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'

/** Playing alone: pick one of the game's maps (or open a map file) and start it */
const router = useRouter()
const gameStore = useGameStore()
const notify = useNotificationStore()
const { t } = useI18n()

/** Map files opened on this page (they live for the tab: mapManager keeps them) */
const imported = ref<MapSummary[]>([])
const maps = computed(() => [...imported.value, ...getBuiltinMaps()])
const selectedId = ref('')
const selectedMap = computed(() => maps.value.find(m => m.id === selectedId.value) || maps.value[0] || null)
/** Upright phone: the picked map's page is open (the folders are behind it) */
const showDetails = ref(false)
const isStarting = ref(false)

function pickMap(id: string) {
  selectedId.value = id
  showDetails.value = true
}

function back() {
  router.push('/')
}

async function start(map: MapSummary) {
  if (isStarting.value) return
  isStarting.value = true
  try {
    gameStore.entrySource = 'home'
    gameStore.startLoadingScreen(map.name || t('game.battlefield'))
    if (map.raw) applyMapPayloadToStores(map.raw)
    // The game's textures load while the button spins
    await assetManager.loadGame()
    await router.push(gamePath(sanitizeMapId(map.id || map.name)))
  } catch (err) {
    console.error('Error starting map:', err)
    notify.error(t('common.error'))
  } finally {
    isStarting.value = false
  }
}

onMounted(() => setBackButton(back))
onUnmounted(() => setBackButton(null))
</script>
