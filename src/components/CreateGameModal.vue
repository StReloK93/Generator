<template>
  <UiModal
    :is-open="isOpen"
    title="Host New Game Room"
    subtitle="Select a map preset and launch a cooperative defense lobby"
    :icon="Gamepad2"
    icon-color="amber"
    size="2xl"
    @close="close"
  >
    <!-- Player Nickname & Color Row -->
    <UiCard variant="subtle" padding="md">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <UiInput
          v-model="playerName"
          label="Player Nickname:"
          placeholder="Enter your commander name"
          :maxlength="16"
        />

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300">Player Color:</label>
          <div class="flex items-center gap-2 pt-0.5">
            <button 
              v-for="color in PLAYER_COLORS"
              :key="color"
              type="button"
              class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm touch-target"
              :style="{ backgroundColor: color }"
              :class="selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'"
              @click="selectedColor = color"
            >
              <Check v-if="selectedColor === color" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 font-bold" />
            </button>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Room Name Input -->
    <UiInput
      v-model="customRoomName"
      label="Room Name:"
      placeholder="e.g. Burbenog TD Co-op"
      :maxlength="32"
    />

    <!-- Map Selection Cards -->
    <div class="space-y-2 sm:space-y-2.5">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Available Maps ({{ availableMapPresets.length }}):
        </label>
        <span class="text-[10px] sm:text-[11px] text-amber-400 font-medium">Doors = Player Slots</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        <!-- Dynamic Maps from src/maps/ -->
        <UiCard
          v-for="(mapPreset, index) in availableMapPresets"
          :key="mapPreset.id"
          :variant="selectedMapIndex === index ? 'amber' : 'subtle'"
          :selected="selectedMapIndex === index"
          interactive
          padding="sm"
          @click="selectedMapIndex = index"
        >
          <div class="flex items-start justify-between">
            <div class="min-w-0 pr-2">
              <div class="flex items-center gap-1.5 sm:gap-2">
                <h3 class="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                  {{ mapPreset.name }}
                </h3>
                <UiBadge v-if="index === 0" variant="amber" size="xs">
                  Primary
                </UiBadge>
              </div>
              <p class="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                {{ mapPreset.description }}
              </p>
            </div>

            <div 
              class="w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center shrink-0 transition-all" 
              :class="selectedMapIndex === index ? 'bg-amber-500 border-amber-400 text-slate-950 scale-110' : 'border-slate-700'"
            >
              <Check v-if="selectedMapIndex === index" class="w-3 h-3 sm:w-3.5 sm:h-3.5 font-bold" />
            </div>
          </div>

          <!-- Map Metadata & Properties -->
          <div class="flex items-center flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-300 font-mono pt-2 mt-2 border-t border-slate-800/80">
            <span class="flex items-center gap-1 text-emerald-400 font-semibold">
              <Users class="w-3.5 h-3.5" /> {{ mapPreset.doorsCount }} Slots
            </span>
            <span>•</span>
            <span class="text-slate-400">{{ mapPreset.cols }}x{{ mapPreset.rows }}</span>
            <span>•</span>
            <span class="text-amber-300">{{ mapPreset.waveCount }} Waves</span>
          </div>
        </UiCard>
      </div>
    </div>

    <!-- Sticky Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UiButton
          variant="secondary"
          size="sm"
          @click="close"
        >
          Cancel
        </UiButton>

        <UiButton
          variant="game-amber"
          size="md"
          :loading="isCreating"
          :leading-icon="Sparkles"
          @click="handleCreateGame"
        >
          {{ isCreating ? 'Creating Room...' : '🚀 Host Game' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Users, Sparkles, Gamepad2 } from 'lucide-vue-next'
import { UiModal, UiInput, UiCard, UiButton, UiBadge } from './ui'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { PLAYER_COLORS } from '../types/multiplayer'

interface DiscoveredMapPreset {
  id: string
  name: string
  description: string
  cols: number
  rows: number
  layersCount: number
  doorsCount: number
  waveCount: number
  rawProject: any
  waveConfigs?: any[]
  towerBlueprints?: any[]
}

const router = useRouter()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()

const isOpen = ref(false)
const playerName = ref(multiplayerStore.myPlayerName)
const selectedColor = ref(multiplayerStore.myPlayerColor)
const customRoomName = ref('')
const selectedMapIndex = ref(0)
const isCreating = ref(false)

// Auto-discover all maps inside src/maps/*.json
const mapModules = import.meta.glob('../maps/*.json', { eager: true })

const availableMapPresets = computed<DiscoveredMapPreset[]>(() => {
  const list: DiscoveredMapPreset[] = []

  // 1. Load all maps from src/maps/*.json
  for (const [filePath, module] of Object.entries(mapModules)) {
    const raw = (module as any).default || module
    const proj = raw.project || raw
    if (!proj) continue

    const fileName = filePath.split('/').pop()?.replace('.json', '') || 'Map'
    const name = proj.name || raw.name || fileName
    const cols = proj.cols || 60
    const rows = proj.rows || 60
    const layersCount = proj.layers ? proj.layers.length : 0

    // Count spawn points / doors
    let doorsCount = 4
    if (raw.spawnPoints && raw.spawnPoints.length > 0) {
      doorsCount = raw.spawnPoints.length
    } else if (proj.spawnPoints && proj.spawnPoints.length > 0) {
      doorsCount = proj.spawnPoints.length
    } else if (raw.detectedDoors && raw.detectedDoors.length > 0) {
      doorsCount = raw.detectedDoors.length
    } else if (raw.customRoutes && raw.customRoutes.length > 0) {
      doorsCount = raw.customRoutes.length
    }

    const waveCount = raw.waveConfigs?.length || proj.waveConfigs?.length || 10

    list.push({
      id: filePath,
      name,
      description: `${doorsCount} spawn doors, ${waveCount} waves, ${cols}x${rows} isometric grid`,
      cols,
      rows,
      layersCount,
      doorsCount,
      waveCount,
      rawProject: proj,
      waveConfigs: raw.waveConfigs || proj.waveConfigs || [],
      towerBlueprints: raw.towerBlueprints || proj.towerBlueprints || [],
    })
  }

  return list
})

function open() {
  playerName.value = multiplayerStore.myPlayerName
  selectedColor.value = multiplayerStore.myPlayerColor
  const chosenMap = availableMapPresets.value[selectedMapIndex.value] || availableMapPresets.value[0]
  const mapTitle = chosenMap ? chosenMap.name : 'Burbenog TD'
  customRoomName.value = `${playerName.value}'s ${mapTitle} Match`
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

async function handleCreateGame() {
  if (isCreating.value) return
  isCreating.value = true

  try {
    multiplayerStore.setPlayerProfile(playerName.value, selectedColor.value)

    const chosenPreset = availableMapPresets.value[selectedMapIndex.value] || availableMapPresets.value[0]
    
    if (chosenPreset) {
      mapStore.project = JSON.parse(JSON.stringify(chosenPreset.rawProject))
      if (chosenPreset.waveConfigs && chosenPreset.waveConfigs.length > 0) {
        characterStore.waveConfigs = chosenPreset.waveConfigs.map((w: any) => ({ ...w }))
      }
      if (chosenPreset.towerBlueprints && chosenPreset.towerBlueprints.length > 0) {
        towerStore.blueprints = chosenPreset.towerBlueprints.map((b: any) => ({ ...b }))
      }
      characterStore.detectDoors()
    }

    await multiplayerStore.hostNewGame(
      customRoomName.value || `${playerName.value}'s TD Game`,
      mapStore.project,
      router
    )
    isOpen.value = false
  } catch (err) {
    console.error('Failed to create room:', err)
    alert('Failed to create room. Please try again.')
  } finally {
    isCreating.value = false
  }
}

defineExpose({
  open,
  close,
})
</script>
