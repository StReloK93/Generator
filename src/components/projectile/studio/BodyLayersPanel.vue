<template>
  <div class="flex flex-col gap-3">
    <!-- Layers, top of the list = drawn on top -->
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-bold uppercase tracking-wide text-slate-400">{{ $t('pe.layers') }} ({{ layers.length }})</span>
      <UiButton variant="game-green" size="xs" :leading-icon="Plus" :disabled="layers.length >= 12" @click="addLayer">
        {{ $t('common.add') }}
      </UiButton>
    </div>
    <div class="flex flex-col gap-1">
      <div
        v-for="idx in order"
        :key="idx"
        class="flex items-center gap-2 p-1.5 rounded-xl border cursor-pointer transition-colors"
        :class="selected === idx ? 'bg-brand-500/10 border-brand-400/70' : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'"
        @click="selected = idx"
      >
        <span class="size-5 rounded-md border border-slate-600 shrink-0" :style="{ backgroundColor: layers[idx].color, opacity: Math.max(0.25, layers[idx].alpha) }" />
        <span class="text-xs font-semibold text-slate-200 flex-1 truncate">{{ $t(`pe.shape.${layers[idx].shape}`) }}</span>
        <span class="text-[10px] font-mono text-slate-500">{{ layers[idx].size }}px</span>
        <UiIconButton :icon="ChevronUp" size="xs" variant="ghost" :disabled="idx === layers.length - 1" :title="$t('pe.moveUp')" @click.stop="move(idx, 1)" />
        <UiIconButton :icon="ChevronDown" size="xs" variant="ghost" :disabled="idx === 0" :title="$t('pe.moveDown')" @click.stop="move(idx, -1)" />
        <UiIconButton :icon="Copy" size="xs" variant="ghost" :disabled="layers.length >= 12" :title="$t('pe.duplicate')" @click.stop="duplicate(idx)" />
        <UiIconButton :icon="Trash2" size="xs" variant="danger" :disabled="layers.length <= 1" :title="$t('common.delete')" @click.stop="remove(idx)" />
      </div>
    </div>

    <template v-if="layer">
      <div class="h-px bg-slate-800" />
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] font-semibold text-slate-300">{{ $t('pe.shapeLabel') }}</span>
        <div class="grid grid-cols-6 gap-1">
          <UiButton
            v-for="shape in BODY_SHAPES"
            :key="shape"
            variant="tool"
            size="xs"
            :active="layer.shape === shape"
            custom-class="px-1! text-[10px]!"
            @click="setShape(shape)"
          >
            {{ $t(`pe.shape.${shape}`) }}
          </UiButton>
        </div>
      </div>

      <div v-if="layer.shape === 'sprite'" class="flex items-center gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800">
        <img v-if="layer.assetId" :src="assetStore.getAssetPreview(layer.assetId)" alt="" class="size-10 object-contain" />
        <span class="text-xs text-slate-300 flex-1 truncate">{{ layer.assetId ? assetStore.getAsset(layer.assetId)?.name ?? layer.assetId : $t('pe.noAsset') }}</span>
        <UiButton variant="secondary" size="xs" :leading-icon="ImageIcon" @click="emit('pick-sprite', selected)">{{ $t('pe.chooseAsset') }}</UiButton>
      </div>

      <UiColorPicker v-model="layer.color" :label="$t('pe.color')" size="sm" :colors="palette" />
      <div class="grid grid-cols-2 gap-x-3 gap-y-2">
        <UiSlider v-model="layer.size" :label="$t('pe.size')" :min="1" :max="60" :step="0.5" unit="px" />
        <UiSlider v-model="layer.alpha" :label="$t('pe.alpha')" :min="0.05" :max="1" :step="0.05" />
        <UiSlider v-model="layer.stretch" :label="$t('pe.stretch')" :min="0.2" :max="10" :step="0.1" unit="×" />
        <UiSlider v-model="layer.offset" :label="$t('pe.offset')" :min="-40" :max="40" :step="1" unit="px" />
        <UiSlider v-model="layer.glow" :label="$t('pe.glow')" :min="0" :max="1" :step="0.05" />
        <UiSlider v-model="layer.rotation" :label="$t('pe.rotation')" :min="-180" :max="180" :step="5" unit="°" />
        <UiSlider v-model="layer.spin" :label="$t('pe.spin')" :min="-1800" :max="1800" :step="30" unit="°/s" />
        <UiSlider v-model="layer.pulse" :label="$t('pe.pulse')" :min="0" :max="0.8" :step="0.02" />
        <UiSlider v-if="layer.pulse > 0" v-model="layer.pulseSpeed" :label="$t('pe.pulseSpeed')" :min="0.5" :max="20" :step="0.5" unit="Hz" />
        <UiSlider v-if="usesSides" v-model="layer.sides" :label="$t('pe.sides')" :min="2" :max="16" :step="1" />
        <UiSlider v-if="usesInner" v-model="layer.inner" :label="$t('pe.inner')" :min="0.05" :max="0.95" :step="0.05" />
      </div>

      <UiSwitch v-model="layer.faceFlight" :label="$t('pe.faceFlight')" :description="$t('pe.faceFlightHint')" />

      <div class="grid grid-cols-2 gap-x-3 gap-y-2 p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
        <UiSlider v-model="layer.orbit" :label="$t('pe.orbit')" :min="0" :max="40" :step="1" unit="px" />
        <UiSlider v-model="layer.copies" :label="$t('pe.copies')" :min="1" :max="8" :step="1" />
        <UiSlider v-if="layer.orbit > 0" v-model="layer.orbitSpeed" :label="$t('pe.orbitSpeed')" :min="-6" :max="6" :step="0.25" />
      </div>

      <div class="grid grid-cols-2 gap-3 items-end">
        <UiColorPicker v-model="layer.outlineColor" :label="$t('pe.outline')" size="sm" :colors="palette" />
        <UiSlider v-model="layer.outlineWidth" :label="$t('pe.outlineWidth')" :min="0" :max="5" :step="0.2" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, ChevronUp, ChevronDown, Copy, Trash2, Image as ImageIcon } from 'lucide-vue-next'
import { UiButton, UiIconButton, UiColorPicker, UiSlider, UiSwitch } from '../../ui'
import { useAssetStore } from '../../../stores/assetStore'
import { BODY_SHAPES, createLayer } from '../../../domain/projectile'
import type { BodyLayer, BodyShape } from '../../../types/projectile'

const layers = defineModel<BodyLayer[]>({ required: true })
defineProps<{ palette: string[] }>()
const emit = defineEmits<{ (e: 'pick-sprite', layerIndex: number): void }>()

const assetStore = useAssetStore()
const selected = ref(layers.value.length - 1)

/** Shown top first: the last layer is drawn on top */
const order = computed(() => layers.value.map((_, i) => i).reverse())
const layer = computed(() => layers.value[selected.value])
const usesSides = computed(() => ['polygon', 'star', 'spikes', 'shuriken'].includes(layer.value?.shape ?? ''))
const usesInner = computed(() => ['star', 'spikes', 'shuriken', 'ring', 'crescent', 'cross'].includes(layer.value?.shape ?? ''))

watch(() => layers.value.length, len => {
  if (selected.value >= len) selected.value = len - 1
})

function addLayer(): void {
  const base = layer.value
  layers.value.push(createLayer({ color: base?.color ?? '#ffffff', size: Math.max(2, (base?.size ?? 8) * 0.5) }))
  selected.value = layers.value.length - 1
}

function duplicate(idx: number): void {
  layers.value.splice(idx + 1, 0, createLayer({ ...layers.value[idx] }))
  selected.value = idx + 1
}

function remove(idx: number): void {
  layers.value.splice(idx, 1)
  selected.value = Math.min(selected.value, layers.value.length - 1)
}

function move(idx: number, dir: 1 | -1): void {
  const to = idx + dir
  if (to < 0 || to >= layers.value.length) return
  const [item] = layers.value.splice(idx, 1)
  layers.value.splice(to, 0, item)
  selected.value = to
}

function setShape(shape: BodyShape): void {
  if (!layer.value) return
  layer.value.shape = shape
  if (shape === 'sprite' && !layer.value.assetId) emit('pick-sprite', selected.value)
}
</script>
