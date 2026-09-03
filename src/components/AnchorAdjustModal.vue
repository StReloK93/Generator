<template>
  <div 
    @mousedown.stop
    @click.stop
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none pt-safe pb-safe"
  >
    <div class="glass-panel border border-slate-700 w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 sm:gap-4 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2">
          <Settings2 class="w-5 h-5 text-brand-400" />
          <h3 class="font-bold text-sm text-slate-100">
            Asset Parametrlari (Anchor & O'lcham)
          </h3>
        </div>
        <button 
          @click="$emit('close')"
          class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Interactive Canvas / Image Box -->
      <div 
        ref="boxRef"
        @click="handleBoxClick"
        class="w-full h-48 rounded-2xl bg-slate-950 checker-pattern relative overflow-hidden flex items-center justify-center cursor-crosshair border border-slate-800 shadow-inner group"
      >
        <img 
          ref="imgRef"
          :src="asset.src" 
          :alt="asset.name"
          class="max-w-[80%] max-h-[80%] object-contain pointer-events-none filter drop-shadow-lg"
        />

        <!-- Pivot Crosshair Indicator -->
        <div 
          class="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 flex items-center justify-center"
          :style="{
            left: `${currentX * 100}%`,
            top: `${currentY * 100}%`
          }"
        >
          <div class="w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-brand-500/40 shadow-glow-brand"></div>
          <div class="absolute w-full h-px bg-brand-400/80"></div>
          <div class="absolute h-full w-px bg-brand-400/80"></div>
        </div>

        <div class="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-300">
          Anchor X: {{ Math.round(currentX * 100) }}% | Y: {{ Math.round(currentY * 100) }}%
        </div>
      </div>

      <!-- Footprint / Katak o'lchami (Span) -->
      <div class="flex flex-col gap-1.5 text-xs">
        <div class="flex justify-between items-center">
          <span class="text-slate-300 font-medium">Egallaydigan kataklar soni (Footprint):</span>
          <span class="font-mono text-brand-300 font-bold">{{ currentSpanX }}×{{ currentSpanY }} katak</span>
        </div>
        <div class="grid grid-cols-5 gap-1.5">
          <button 
            v-for="s in spans" 
            :key="s.label"
            @click="setSpan(s.x, s.y)"
            :class="currentSpanX === s.x && currentSpanY === s.y ? 'bg-brand-600 text-white font-bold shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'"
            class="py-1.5 rounded-xl text-xs text-center border border-slate-700/80 transition-colors"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- Scale Slider -->
      <div class="flex items-center gap-3 text-xs">
        <span class="text-slate-400 w-28">Boshlang'ich masshtab:</span>
        <input 
          v-model.number="currentScale" 
          type="range" 
          min="0.3" 
          max="3.0" 
          step="0.05"
          class="flex-1 accent-brand-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
        <span class="font-mono text-slate-200 w-12 text-right">{{ Math.round(currentScale * 100) }}%</span>
      </div>

      <!-- Anchor Sliders -->
      <div class="flex flex-col gap-2 pt-1 border-t border-slate-800">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400 text-[11px]">Anchor tezkor shablonlar:</span>
          <div class="flex items-center gap-1.5">
            <button 
              @click="setPreset(0.5, 0.5)"
              class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
            >
              Tekis (50%)
            </button>
            <button 
              @click="setPreset(0.5, 0.88)"
              class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
            >
              Baland (88%)
            </button>
            <button 
              @click="setPreset(0.5, 1.0)"
              class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
            >
              Pastki (100%)
            </button>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <button 
          @click="$emit('close')"
          class="px-3.5 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-medium transition-colors"
        >
          Bekor qilish
        </button>
        <button 
          @click="save"
          class="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
        >
          Saqlash
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Settings2, X } from 'lucide-vue-next'
import { AssetItem } from '../types/map'
import { useAssetStore } from '../stores/assetStore'

const props = defineProps<{
  asset: AssetItem
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', updates: { anchorX: number; anchorY: number; spanX: number; spanY: number; scale: number }): void
}>()

const assetStore = useAssetStore()

const currentX = ref<number>(props.asset.anchorX ?? 0.5)
const currentY = ref<number>(props.asset.anchorY ?? 0.5)
const currentSpanX = ref<number>(props.asset.spanX ?? 1)
const currentSpanY = ref<number>(props.asset.spanY ?? 1)
const currentScale = ref<number>(props.asset.scale ?? 1.0)
const boxRef = ref<HTMLDivElement | null>(null)

const spans = [
  { label: '1×1', x: 1, y: 1 },
  { label: '2×2', x: 2, y: 2 },
  { label: '3×3', x: 3, y: 3 },
  { label: '2×1', x: 2, y: 1 },
  { label: '1×2', x: 1, y: 2 },
]

function handleBoxClick(event: MouseEvent) {
  if (!boxRef.value) return
  const rect = boxRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  currentX.value = Number(Math.max(0, Math.min(1, x)).toFixed(2))
  currentY.value = Number(Math.max(0, Math.min(1, y)).toFixed(2))
}

function setPreset(x: number, y: number) {
  currentX.value = x
  currentY.value = y
}

function setSpan(x: number, y: number) {
  currentSpanX.value = x
  currentSpanY.value = y
}

function save() {
  assetStore.updateAssetProperties(props.asset.id, {
    anchorX: currentX.value,
    anchorY: currentY.value,
    spanX: currentSpanX.value,
    spanY: currentSpanY.value,
    scale: currentScale.value,
  })
  emit('close')
}
</script>
