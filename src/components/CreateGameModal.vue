<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 pt-safe pb-safe"
    @click.self="close"
  >
    <div class="glass-panel w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]">
      <!-- Header -->
      <div class="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 shrink-0">
        <div class="flex items-center gap-2.5 sm:gap-3">
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
            <Gamepad2 class="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-white tracking-wide">Yangi Xona Ochish</h2>
            <p class="text-[11px] sm:text-xs text-slate-400 line-clamp-1">Karta tanlang va do'stlaringiz bilan o'ynang</p>
          </div>
        </div>
        <button 
          @click="close"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-target"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 custom-scrollbar flex-1">
        <!-- Player Nickname & Color Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div class="space-y-1 sm:space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">O'yinchi Nomi (Nickname):</label>
            <input 
              v-model="playerName"
              type="text"
              maxlength="16"
              placeholder="Ismingizni kiriting"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          <div class="space-y-1 sm:space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">O'yinchi Rangi:</label>
            <div class="flex items-center gap-2 pt-0.5">
              <button 
                v-for="color in PLAYER_COLORS"
                :key="color"
                @click="selectedColor = color"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm touch-target"
                :style="{ backgroundColor: color }"
                :class="selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'"
              >
                <Check v-if="selectedColor === color" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 font-bold" />
              </button>
            </div>
          </div>
        </div>

        <!-- Room Name Input -->
        <div class="space-y-1 sm:space-y-1.5">
          <label class="text-xs font-semibold text-slate-300">Xona Nomi:</label>
          <input 
            v-model="customRoomName"
            type="text"
            maxlength="32"
            placeholder="Masalan: Burbenog TD Co-op"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        <!-- Map Selection Cards -->
        <div class="space-y-2 sm:space-y-2.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Mavjud Kartalar ({{ availableMapPresets.length }} ta):
            </label>
            <span class="text-[10px] sm:text-[11px] text-amber-400 font-medium">Eshiklar = O'rinlar</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <!-- Dynamic Maps from src/maps/ -->
            <div 
              v-for="(mapPreset, index) in availableMapPresets"
              :key="mapPreset.id"
              @click="selectedMapIndex = index"
              class="p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 sm:gap-3 relative overflow-hidden group touch-target"
              :class="selectedMapIndex === index ? 'bg-amber-500/10 border-amber-500/80 ring-1 ring-amber-500/40 shadow-lg' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'"
            >
              <div class="flex items-start justify-between">
                <div class="min-w-0 pr-2">
                  <div class="flex items-center gap-1.5 sm:gap-2">
                    <h3 class="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                      {{ mapPreset.name }}
                    </h3>
                    <span 
                      v-if="index === 0"
                      class="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] sm:text-[10px] font-bold border border-amber-500/30 shrink-0"
                    >
                      Asosiy
                    </span>
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
              <div class="flex items-center flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-300 font-mono pt-2 border-t border-slate-800/80">
                <span class="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Users class="w-3.5 h-3.5" /> {{ mapPreset.doorsCount }} O'rin
                </span>
                <span>•</span>
                <span class="text-slate-400">{{ mapPreset.cols }}x{{ mapPreset.rows }}</span>
                <span>•</span>
                <span class="text-amber-300">{{ mapPreset.waveCount }} To'lqin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sticky Footer Buttons -->
      <div class="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0 gap-2">
        <button 
          @click="close"
          class="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer touch-target"
        >
          Bekor qilish
        </button>

        <button 
          @click="handleCreateGame"
          :disabled="isCreating"
          class="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 touch-target"
        >
          <Sparkles class="w-4 h-4" />
          <span>{{ isCreating ? 'Yaratilmoqda...' : '🚀 Xona Yaratish' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { X, Check, Users, Sparkles, Gamepad2 } from 'lucide-vue-next'
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
      description: `${doorsCount} ta chiqish eshigi, ${waveCount} ta to'lqin, ${cols}x${rows} izometrik setka`,
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
  customRoomName.value = `${playerName.value}'ning ${mapTitle} O'yini`
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
      customRoomName.value || `${playerName.value}'ning TD O'yini`,
      mapStore.project,
      router
    )
    isOpen.value = false
  } catch (err) {
    console.error('Failed to create room:', err)
    alert('Xona yaratishda xatolik yuz berdi')
  } finally {
    isCreating.value = false
  }
}

defineExpose({
  open,
  close,
})
</script>
