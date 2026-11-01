<template>
  <div class="relative w-full h-full">
    <!-- Dedicated Editor Test Game Stage -->
    <GameStage :is-editor-mode="true">
      <template #editor-tools>
        <!-- Editor playtest marker: thin top edge line + compact label -->
        <div class="fixed top-0 inset-x-0 h-0.5 bg-amber-500/40 z-40 pointer-events-none"></div>
        <div class="fixed top-1.5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none flex items-center gap-1.5">
          <span class="text-[10px] font-bold uppercase tracking-widest text-amber-300/70">TEST</span>
          <UiButton
            variant="ghost"
            size="xs"
            class="h-5 px-1.5! text-[10px]! text-slate-300!"
            :leading-icon="Layers"
            :title="$t('sandbox.editorModeOnly')"
            @click="handleReturnToEditor"
          >
            {{ $t('game.returnEditor') }}
          </UiButton>
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
