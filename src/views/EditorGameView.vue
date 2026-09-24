<template>
  <div class="relative w-full h-full">
    <!-- Dedicated Editor Test Game Stage -->
    <GameStage :is-editor-mode="true">
      <template #editor-tools>
        <!-- Top Center Editor Playtest Indicator Badge -->
        <div class="fixed top-2.5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none flex items-center gap-2">
          <div class="px-3 py-1 rounded-full bg-slate-950/90 border border-amber-500/60 shadow-lg shadow-amber-500/15 backdrop-blur-md flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span class="text-[11px] font-black uppercase tracking-wider text-amber-300">
              {{ $t('sandbox.editorModeOnly') || 'XARITA TEST REJIMI' }}
            </span>
            <span class="text-slate-600">•</span>
            <UiButton
              variant="game-amber"
              size="xs"
              class="h-5 px-2! text-[10px]! font-black"
              :leading-icon="Layers"
              @click="handleReturnToEditor"
            >
              {{ $t('game.returnEditor') || 'Tahrirlash' }}
            </UiButton>
          </div>
        </div>
      </template>
    </GameStage>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { Layers } from 'lucide-vue-next'
import { UiButton } from '../components/ui'
import GameStage from '../components/game/GameStage.vue'
import { useMapStore } from '../stores/mapStore'
import { useGameStore } from '../stores/gameStore'
import { sanitizeMapId } from '../services/mapManager'

const router = useRouter()
const route = useRoute()
const mapStore = useMapStore()
const gameStore = useGameStore()

function handleReturnToEditor() {
  gameStore.exitPlayMode()
  const cleanId = sanitizeMapId(mapStore.project.id || mapStore.project.name || (route.params.mapId as string) || 'julion')
  router.push(`/editor/${cleanId}`)
}
</script>
