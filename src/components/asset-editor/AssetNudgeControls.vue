<template>
  <div class="flex flex-col gap-3 h-full select-none">
    
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
      <div class="flex items-center gap-2">
        <Move class="w-4 h-4 text-brand-400" />
        <span class="font-bold text-xs text-white">Pixel Nudge & Transform</span>
      </div>
      <UiBadge v-if="store.selectedParts.length > 0" variant="brand" size="xs">
        {{ store.selectedParts.length > 1 ? `${store.selectedParts.length} selected` : 'Selected' }}
      </UiBadge>
    </div>

    <!-- No Selection State -->
    <div 
      v-if="store.selectedParts.length === 0" 
      class="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 gap-2 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40"
    >
      <MousePointerClick class="w-8 h-8 text-slate-600" />
      <span class="text-xs font-semibold text-slate-400">No element selected</span>
      <p class="text-[10px] text-slate-500">Click an element on canvas or layers list to move and transform (Hold Shift for multi-selection)</p>
    </div>

    <!-- Selected Element Transform Inspector -->
    <div v-else class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
      
      <!-- 1. Directional Nudge Keypad (Arrows) -->
      <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Compass class="w-3.5 h-3.5 text-brand-400" />
            <span>Directional Nudge</span>
          </span>
          <!-- Step Multiplier Selector -->
          <UiTabs
            v-model="store.nudgeStep"
            :items="[
              { id: 1, label: '1px' },
              { id: 5, label: '5px' },
              { id: 10, label: '10px' },
              { id: 32, label: '32px' }
            ]"
            variant="brand"
            size="xs"
          />
        </div>

        <!-- Arrow Keypad Grid -->
        <div class="grid grid-cols-3 gap-1.5 w-36 mx-auto my-1">
          <div></div>
          <UiButton 
            variant="secondary" 
            size="sm" 
            title="Nudge Up" 
            @click="store.nudgeSelected(0, -1)"
          >
            <ArrowUp class="w-4 h-4" />
          </UiButton>
          <div></div>

          <UiButton 
            variant="secondary" 
            size="sm" 
            title="Nudge Left" 
            @click="store.nudgeSelected(-1, 0)"
          >
            <ArrowLeft class="w-4 h-4" />
          </UiButton>
          <div class="flex items-center justify-center font-mono text-[10px] text-brand-400 font-bold">
            {{ store.nudgeStep }}px
          </div>
          <UiButton 
            variant="secondary" 
            size="sm" 
            title="Nudge Right" 
            @click="store.nudgeSelected(1, 0)"
          >
            <ArrowRight class="w-4 h-4" />
          </UiButton>

          <div></div>
          <UiButton 
            variant="secondary" 
            size="sm" 
            title="Nudge Down" 
            @click="store.nudgeSelected(0, 1)"
          >
            <ArrowDown class="w-4 h-4" />
          </UiButton>
          <div></div>
        </div>

        <!-- Position X/Y Numbers for Primary Selection -->
        <div v-if="store.selectedPart" class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
          <UiNumberInput 
            :model-value="store.selectedPart.x" 
            label="X Coord" 
            unit="px"
            @update:model-value="(val) => store.setPartPosition(store.selectedPart!.id, val, store.selectedPart!.y)"
          />
          <UiNumberInput 
            :model-value="store.selectedPart.y" 
            label="Y Coord" 
            unit="px"
            @update:model-value="(val) => store.setPartPosition(store.selectedPart!.id, store.selectedPart!.x, val)"
          />
        </div>
      </UiCard>

      <!-- 2. Copy & Paste Quick Action Bar -->
      <div class="grid grid-cols-2 gap-2">
        <UiButton 
          variant="secondary" 
          size="sm" 
          :leading-icon="Copy"
          title="Copy selection (Ctrl+C)"
          @click="store.copySelection()"
        >
          Copy
        </UiButton>

        <UiButton 
          variant="secondary" 
          size="sm" 
          :leading-icon="ClipboardPaste"
          :disabled="store.clipboard.length === 0"
          title="Paste from clipboard (Ctrl+V)"
          @click="store.pasteSelection()"
        >
          Paste
        </UiButton>
      </div>

      <!-- 3. Flip & Rotation Controls -->
      <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2.5">
        <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <RotateCw class="w-3.5 h-3.5 text-amber-400" />
          <span>Flip & Rotate</span>
        </span>

        <!-- Flip Buttons -->
        <div class="grid grid-cols-2 gap-2">
          <UiButton 
            variant="secondary" 
            size="xs" 
            :leading-icon="FlipHorizontal"
            @click="toggleFlipX"
          >
            Flip Horizontal
          </UiButton>

          <UiButton 
            variant="secondary" 
            size="xs" 
            :leading-icon="FlipVertical"
            @click="toggleFlipY"
          >
            Flip Vertical
          </UiButton>
        </div>

        <!-- Rotation Angle Slider -->
        <UiSlider 
          v-if="store.selectedPart"
          :model-value="store.selectedPart.rotation"
          label="Rotation"
          :min="0"
          :max="360"
          :step="15"
          unit="°"
          @update:model-value="(val) => store.updateAllSelectedProperties({ rotation: val })"
        />

        <!-- Quick 90° rotation buttons -->
        <UiTabs
          :model-value="store.selectedPart?.rotation || 0"
          :items="[
            { id: 0, label: '0°' },
            { id: 90, label: '90°' },
            { id: 180, label: '180°' },
            { id: 270, label: '270°' }
          ]"
          variant="amber"
          size="xs"
          fill
          @update:model-value="(deg) => store.updateAllSelectedProperties({ rotation: Number(deg) })"
        />
      </UiCard>

      <!-- 4. Scale & Opacity Sliders -->
      <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2.5">
        <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <Scaling class="w-3.5 h-3.5 text-emerald-400" />
          <span>Scale & Opacity</span>
        </span>

        <!-- Scale Slider -->
        <UiSlider 
          v-if="store.selectedPart"
          :model-value="Number(Math.abs(store.selectedPart.scaleX).toFixed(2))"
          label="Scale Multiplier"
          :min="0.1"
          :max="4.0"
          :step="0.05"
          unit="x"
          @update:model-value="handleScaleChange"
        />

        <!-- Quick Scale Presets -->
        <div v-if="store.selectedPart">
          <UiTabs
            :model-value="Number(Math.abs(store.selectedPart.scaleX).toFixed(2))"
            :items="[
              { id: 0.5, label: '0.5x' },
              { id: 0.75, label: '0.75x' },
              { id: 1.0, label: '1x' },
              { id: 1.25, label: '1.25x' },
              { id: 1.5, label: '1.5x' },
              { id: 2.0, label: '2x' }
            ]"
            variant="emerald"
            size="xs"
            fill
            @update:model-value="(sc) => handleScaleChange(Number(sc))"
          />
        </div>

        <!-- Opacity Slider -->
        <UiSlider 
          v-if="store.selectedPart"
          :model-value="Math.round(store.selectedPart.opacity * 100)"
          label="Opacity"
          :min="10"
          :max="100"
          :step="5"
          unit="%"
          @update:model-value="(val) => store.updateAllSelectedProperties({ opacity: val / 100 })"
        />
      </UiCard>

    </div>

  </div>
</template>

<script setup lang="ts">
import { 
  Move, 
  MousePointerClick, 
  Compass, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Scaling,
  Copy,
  ClipboardPaste
} from 'lucide-vue-next'
import { UiCard, UiBadge, UiButton, UiNumberInput, UiSlider, UiTabs } from '../ui'
import { useAssetEditorStore } from '../../stores/assetEditorStore'

const store = useAssetEditorStore()

function toggleFlipX() {
  for (const part of store.selectedParts) {
    const currentSign = Math.sign(part.scaleX) || 1
    const mag = Math.abs(part.scaleX)
    store.updatePartProperties(part.id, { scaleX: -currentSign * mag })
  }
}

function toggleFlipY() {
  for (const part of store.selectedParts) {
    const currentSign = Math.sign(part.scaleY) || 1
    const mag = Math.abs(part.scaleY)
    store.updatePartProperties(part.id, { scaleY: -currentSign * mag })
  }
}

function handleScaleChange(newMag: number) {
  for (const part of store.selectedParts) {
    const signX = Math.sign(part.scaleX) || 1
    const signY = Math.sign(part.scaleY) || 1
    store.updatePartProperties(part.id, {
      scaleX: signX * newMag,
      scaleY: signY * newMag,
    })
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.4);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}
</style>
