<template>
  <div 
    v-if="toolStore.isExportModalOpen"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150 pt-safe pb-safe"
  >
    <div 
      @mousedown.stop
      @mouseup.stop
      @click.stop
      @pointerdown.stop
      class="glass-panel border border-brand-500/40 w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 animate-in zoom-in-95 duration-200 bg-dark-900/95 custom-scrollbar"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
            <Download class="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 class="font-bold text-sm text-slate-100">
              Kartani Eksport Qilish
            </h2>
            <p class="text-[11px] text-slate-400">
              Loyihani faylga saqlash yoki PNG rasm qilib yuklab olish
            </p>
          </div>
        </div>
        <button 
          @click="closeModal"
          class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Export Options Tabs -->
      <div class="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 text-xs">
        <button 
          @click="exportType = 'json'"
          :class="exportType === 'json' ? 'bg-brand-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'"
          class="py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5"
        >
          <FileCode class="w-4 h-4 text-brand-300" />
          <span>JSON Loyiha</span>
        </button>

        <button 
          @click="exportType = 'png'"
          :class="exportType === 'png' ? 'bg-brand-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'"
          class="py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5"
        >
          <Image class="w-4 h-4 text-emerald-400" />
          <span>PNG Rasm</span>
        </button>
      </div>

      <!-- JSON Settings (Recommended) -->
      <div v-if="exportType === 'json'" class="flex flex-col gap-3 text-xs">
        <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
          <div class="flex justify-between">
            <span class="text-slate-400">Loyiha nomi:</span>
            <span class="font-mono text-brand-300 font-semibold truncate max-w-50">{{ mapStore.project.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Xarita o'lchami:</span>
            <span class="font-mono text-slate-200">{{ mapStore.project.cols }}×{{ mapStore.project.rows }} katak</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Qo'yilgan elementlar:</span>
            <span class="font-mono text-emerald-400 font-semibold">{{ mapStore.totalTilesCount }} ta</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Maxsus assetlar (Rasmlar):</span>
            <span class="font-mono text-indigo-400 font-semibold">{{ assetStore.assets.length }} ta</span>
          </div>
        </div>

        <div class="text-[11px] leading-relaxed bg-brand-950/20 p-3 rounded-xl border border-brand-500/20 text-brand-200/90">
          💡 <strong>To'liq Loyiha Saqlash:</strong> Bu fayl barcha qatlamlar, koordinatalar va siz yuklagan barcha rasmlarni o'zida to'liq saqlaydi. Istalgan vaqt "Yuklash" orqali ochib davom ettirishingiz mumkin!
        </div>
      </div>

      <!-- PNG Settings -->
      <div v-else class="flex flex-col gap-3 text-xs">
        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
          <label for="expGrid" class="text-slate-300 cursor-pointer">Setka chiziqlarini kiritish</label>
          <input 
            v-model="includeGrid"
            type="checkbox"
            id="expGrid"
            class="accent-brand-500 w-4 h-4 rounded cursor-pointer"
          />
        </div>

        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
          <label for="expTrans" class="text-slate-300 cursor-pointer">Shaffof fon (Transparent BG)</label>
          <input 
            v-model="transparentBg"
            type="checkbox"
            id="expTrans"
            class="accent-brand-500 w-4 h-4 rounded cursor-pointer"
          />
        </div>

        <div class="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
          PNG formati o'yin dvijoklarida (Unity, Godot, Web game) yoki dizaynda to'g'ridan-to'g'ri ishlatish uchun mos.
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        <button 
          @click="closeModal"
          class="px-4 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold transition-colors"
        >
          Bekor qilish
        </button>
        <button 
          @click="handleExport"
          :disabled="isExporting"
          class="px-5 py-2.5 rounded-xl bg-linear-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
        >
          <Download class="w-4 h-4" />
          <span>{{ isExporting ? 'Yuklanmoqda...' : 'Yuklab Olish' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Download, X, Image, FileCode } from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { exportProjectJson, downloadDataUrl } from '../utils/exportHelpers'

const props = defineProps<{
  viewportRef?: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()

const exportType = ref<'png' | 'json'>('json')
const includeGrid = ref<boolean>(false)
const transparentBg = ref<boolean>(true)
const isExporting = ref<boolean>(false)

function closeModal() {
  toolStore.isExportModalOpen = false
  emit('close')
}

async function handleExport() {
  if (isExporting.value) return
  isExporting.value = true

  try {
    if (exportType.value === 'json') {
      towerStore.syncToProject()
      characterStore.syncWavesToProject()
      characterStore.syncSpawnPointsToProject()

      exportProjectJson(
        mapStore.project, 
        assetStore.assets, 
        {
          customRoutes: characterStore.customRoutes,
          spawnPoints: characterStore.detectedDoors,
          characterConfig: {
            spawnCount: characterStore.spawnCount,
            spawnMode: characterStore.spawnMode,
            formation: characterStore.formation,
            pairDistance: characterStore.pairDistance,
            speed: characterStore.speed,
            selectedDoorIndex: characterStore.selectedDoorIndex,
            followCamera: characterStore.followCamera,
            showPathTrail: characterStore.showPathTrail,
            autoLoop: characterStore.autoLoop,
          },
        },
        {
          placedTowers: towerStore.placedTowers,
          towerBlueprints: towerStore.blueprints,
        },
        {
          waveConfigs: characterStore.waveConfigs,
          currentWaveIndex: characterStore.currentWaveIndex,
        }
      )
      closeModal()
    } else {
      // PNG Export
      if (props.viewportRef && props.viewportRef.exportPng) {
        const dataUrl = await props.viewportRef.exportPng({
          includeGrid: includeGrid.value,
          transparentBg: transparentBg.value,
        })
        if (dataUrl) {
          const cleanName = (mapStore.project.name || 'isocraft_map').toLowerCase().replace(/[^a-z0-9_-]+/gi, '_')
          downloadDataUrl(dataUrl, `${cleanName}.png`)
        }
      }
      closeModal()
    }
  } catch (err: any) {
    console.error('Export error:', err)
    alert('Eksport qilishda xatolik yuz berdi: ' + (err?.message || ''))
  } finally {
    isExporting.value = false
  }
}
</script>
