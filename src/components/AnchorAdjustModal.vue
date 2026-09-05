<template>
  <UiModal
    :is-open="true"
    title="Asset Properties (Anchor & Size)"
    subtitle="Image base anchor point, scale multiplier and grid footprint"
    :icon="Settings2"
    icon-color="brand"
    size="lg"
    @close="$emit('close')"
  >
    <!-- Interactive Canvas / Image Box -->
    <div 
      ref="boxRef"
      class="w-full h-48 rounded-2xl bg-slate-950 checker-pattern relative overflow-hidden flex items-center justify-center cursor-crosshair border border-slate-800 shadow-inner group"
      @click="handleBoxClick"
    >
      <img 
        ref="imgRef"
        :src="assetStore.getAssetPreview(asset) || asset.src || asset.previewSrc" 
        :alt="asset.name"
        class="max-w-[80%] max-h-[80%] object-contain pointer-events-none filter drop-shadow-lg select-none"
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

    <!-- Footprint / Cell Span -->
    <div class="flex flex-col gap-1.5 text-xs">
      <div class="flex justify-between items-center">
        <span class="text-slate-300 font-medium">Grid Footprint Span:</span>
        <span class="font-mono text-brand-300 font-bold">{{ currentSpanX }}×{{ currentSpanY }} cells</span>
      </div>
      <div class="grid grid-cols-5 gap-1.5">
        <button 
          v-for="s in spans" 
          :key="s.label"
          type="button"
          :class="currentSpanX === s.x && currentSpanY === s.y ? 'bg-brand-600 text-white font-bold shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'"
          class="py-1.5 rounded-xl text-xs text-center border border-slate-700/80 transition-colors cursor-pointer touch-target"
          @click="setSpan(s.x, s.y)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <!-- Scale Slider -->
    <UiSlider
      v-model="currentScale"
      label="Base Scale Multiplier:"
      :min="0.3"
      :max="3.0"
      :step="0.05"
      :format-value="(val) => `${Math.round(val * 100)}%`"
    />

    <!-- Anchor Preset Buttons -->
    <div class="flex flex-col gap-2 pt-1 border-t border-slate-800">
      <div class="flex items-center justify-between text-xs">
        <span class="text-slate-400 text-[11px]">Anchor Presets:</span>
        <div class="flex items-center gap-1.5">
          <button 
            type="button"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer touch-target"
            @click="setPreset(0.5, 0.5)"
          >
            Flat (50%)
          </button>
          <button 
            type="button"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer touch-target"
            @click="setPreset(0.5, 0.88)"
          >
            Tall (88%)
          </button>
          <button 
            type="button"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer touch-target"
            @click="setPreset(0.5, 1.0)"
          >
            Bottom (100%)
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <UiButton
        variant="ghost"
        size="sm"
        @click="$emit('close')"
      >
        Cancel
      </UiButton>
      <UiButton
        variant="primary"
        size="sm"
        @click="save"
      >
        Save
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Settings2 } from 'lucide-vue-next'
import { UiModal, UiSlider, UiButton } from './ui'
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
