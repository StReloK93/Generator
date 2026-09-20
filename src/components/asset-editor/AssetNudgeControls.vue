<template>
  <div class="flex flex-col gap-3 h-full select-none">
    
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
      <div class="flex items-center gap-2">
        <Move class="w-4 h-4 text-brand-400" />
        <span class="font-bold text-xs text-white">{{ $t('assetEditor.nudgeTransform') }}</span>
      </div>
      <UiBadge v-if="store.selectedParts.length > 0" variant="brand" size="xs">
        {{ store.selectedParts.length > 1 ? $t('assetEditor.selectedCount', { count: store.selectedParts.length }) : $t('common.selected') }}
      </UiBadge>
    </div>

    <!-- No Selection State -->
    <div 
      v-if="store.selectedParts.length === 0" 
      class="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 gap-2 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40"
    >
      <MousePointerClick class="w-8 h-8 text-slate-600" />
      <span class="text-xs font-semibold text-slate-400">{{ $t('assetEditor.noElementSelected') }}</span>
      <p class="text-[10px] text-slate-500">{{ $t('assetEditor.noElementSelectedDesc') }}</p>
    </div>

    <!-- Selected Element Transform Inspector -->
    <div v-else class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
      
      <!-- 1. Directional Nudge Keypad (Arrows) -->
      <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Compass class="w-3.5 h-3.5 text-brand-400" />
            <span>{{ $t('assetEditor.directionalNudge') }}</span>
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
            :title="$t('common.nudgeUp')" 
            @click="store.nudgeSelected(0, -1)"
          >
            <ArrowUp class="w-4 h-4" />
          </UiButton>
          <div></div>

          <UiButton 
            variant="secondary" 
            size="sm" 
            :title="$t('common.nudgeLeft')" 
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
            :title="$t('common.nudgeRight')" 
            @click="store.nudgeSelected(1, 0)"
          >
            <ArrowRight class="w-4 h-4" />
          </UiButton>

          <div></div>
          <UiButton 
            variant="secondary" 
            size="sm" 
            :title="$t('common.nudgeDown')" 
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
            :label="$t('assetEditor.xCoord')" 
            unit="px"
            @update:model-value="(val) => store.setPartPosition(store.selectedPart!.id, val, store.selectedPart!.y)"
          />
          <UiNumberInput 
            :model-value="store.selectedPart.y" 
            :label="$t('assetEditor.yCoord')" 
            unit="px"
            @update:model-value="(val) => store.setPartPosition(store.selectedPart!.id, store.selectedPart!.x, val)"
          />
        </div>
      </UiCard>

      <!-- 2. Crop & Auto-Trim Image Tools (Single Selection) -->
      <UiCard v-if="store.selectedPart" variant="subtle" padding="sm" custom-class="flex flex-col gap-2">
        <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <Crop class="w-3.5 h-3.5 text-cyan-400" />
          <span>{{ $t('assetEditor.cropSection') }}</span>
        </span>

        <div class="grid grid-cols-2 gap-2">
          <UiButton 
            variant="secondary" 
            size="xs" 
            :leading-icon="Crop"
            :title="$t('assetEditor.cropDesc')"
            @click="store.openCropModal(store.selectedPart!.id)"
          >
            {{ $t('assetEditor.crop') }}
          </UiButton>

          <UiButton 
            variant="game-amber" 
            size="xs" 
            :leading-icon="Sparkles"
            :title="$t('assetEditor.autoTrimDesc')"
            @click="store.autoTrimPart(store.selectedPart!.id)"
          >
            {{ $t('assetEditor.autoTrim') }}
          </UiButton>
        </div>
      </UiCard>

      <!-- 3. Copy & Paste Quick Action Bar -->
      <div class="grid grid-cols-2 gap-2">
        <UiButton 
          variant="secondary" 
          size="sm" 
          :leading-icon="Copy"
          :title="$t('common.copy') + ' (Ctrl+C)'"
          @click="store.copySelection()"
        >
          {{ $t('common.copy') }}
        </UiButton>

        <UiButton 
          variant="secondary" 
          size="sm" 
          :leading-icon="ClipboardPaste"
          :disabled="store.clipboard.length === 0"
          :title="$t('assetEditor.pasteTitle')"
          @click="store.pasteSelection()"
        >
          {{ $t('assetEditor.paste') }}
        </UiButton>
      </div>

      <!-- 4. Flip & Rotation Controls -->
      <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2.5">
        <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <RotateCw class="w-3.5 h-3.5 text-amber-400" />
          <span>{{ $t('assetEditor.flipRotate') }}</span>
        </span>

        <!-- Flip Buttons -->
        <div class="grid grid-cols-2 gap-2">
          <UiButton 
            variant="secondary" 
            size="xs" 
            :leading-icon="FlipHorizontal"
            @click="toggleFlipX"
          >
            {{ $t('common.flipHorizontal') }}
          </UiButton>

          <UiButton 
            variant="secondary" 
            size="xs" 
            :leading-icon="FlipVertical"
            @click="toggleFlipY"
          >
            {{ $t('common.flipVertical') }}
          </UiButton>
        </div>

        <!-- Rotation Angle Slider -->
        <UiSlider 
          v-if="store.selectedPart"
          :model-value="store.selectedPart.rotation"
          :label="$t('common.rotation')"
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

      <!-- 4. Scale & Proportions (Independent Axis X / Y and Fine Step Scaling) -->
      <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Scaling class="w-3.5 h-3.5 text-emerald-400" />
            <span>{{ $t('assetEditor.scaleDimensions') }}</span>
          </span>

          <!-- Aspect Ratio Lock / Unlock Toggle -->
          <UiButton
            variant="ghost"
            size="xs"
            :leading-icon="isAspectLocked ? Link2 : Unlink2"
            :title="isAspectLocked ? $t('assetEditor.aspectRatioLocked') : $t('assetEditor.aspectRatioUnlocked')"
            :custom-class="isAspectLocked ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2!' : 'text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2!'"
            @click="isAspectLocked = !isAspectLocked"
          >
            {{ isAspectLocked ? $t('assetEditor.locked') : $t('assetEditor.unlocked') }}
          </UiButton>
        </div>

        <!-- Fine Step Multiplier Selector (Slow / Precise vs Normal) -->
        <div class="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
          <span>{{ $t('assetEditor.stepPrecision') }}:</span>
          <UiTabs
            v-model="fineStep"
            :items="[
              { id: 0.01, label: '0.01' },
              { id: 0.05, label: '0.05' },
              { id: 0.1, label: '0.1' },
            ]"
            variant="emerald"
            size="xs"
          />
        </div>

        <!-- Scale X (Width / Gorizontal o'q) -->
        <div v-if="store.selectedPart" class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-300 flex items-center gap-1">
              <MoveHorizontal class="w-3.5 h-3.5 text-emerald-400" />
              <span>{{ $t('assetEditor.scaleX') }}:</span>
            </span>
            <div class="flex items-center gap-1">
              <!-- Slow Minus Stepper Button -->
              <UiButton
                variant="secondary"
                size="xs"
                custom-class="w-6 h-6 p-0! justify-center font-mono text-[11px]! font-bold text-emerald-300"
                :title="`Scale X -${fineStep}`"
                @click="stepScaleX(-fineStep)"
              >
                -
              </UiButton>
              <span class="font-mono text-xs font-black text-white w-12 text-center">
                {{ currentScaleX.toFixed(2) }}x
              </span>
              <!-- Slow Plus Stepper Button -->
              <UiButton
                variant="secondary"
                size="xs"
                custom-class="w-6 h-6 p-0! justify-center font-mono text-[11px]! font-bold text-emerald-300"
                :title="`Scale X +${fineStep}`"
                @click="stepScaleX(fineStep)"
              >
                +
              </UiButton>
            </div>
          </div>

          <UiSlider
            :model-value="currentScaleX"
            :min="0.05"
            :max="4.0"
            :step="fineStep"
            unit="x"
            @update:model-value="onScaleXSliderChange"
          />
        </div>

        <!-- Scale Y (Height / Vertikal o'q) -->
        <div v-if="store.selectedPart" class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-cyan-300 flex items-center gap-1">
              <MoveVertical class="w-3.5 h-3.5 text-cyan-400" />
              <span>{{ $t('assetEditor.scaleY') }}:</span>
            </span>
            <div class="flex items-center gap-1">
              <!-- Slow Minus Stepper Button -->
              <UiButton
                variant="secondary"
                size="xs"
                custom-class="w-6 h-6 p-0! justify-center font-mono text-[11px]! font-bold text-cyan-300"
                :title="`Scale Y -${fineStep}`"
                @click="stepScaleY(-fineStep)"
              >
                -
              </UiButton>
              <span class="font-mono text-xs font-black text-white w-12 text-center">
                {{ currentScaleY.toFixed(2) }}x
              </span>
              <!-- Slow Plus Stepper Button -->
              <UiButton
                variant="secondary"
                size="xs"
                custom-class="w-6 h-6 p-0! justify-center font-mono text-[11px]! font-bold text-cyan-300"
                :title="`Scale Y +${fineStep}`"
                @click="stepScaleY(fineStep)"
              >
                +
              </UiButton>
            </div>
          </div>

          <UiSlider
            :model-value="currentScaleY"
            :min="0.05"
            :max="4.0"
            :step="fineStep"
            unit="x"
            @update:model-value="onScaleYSliderChange"
          />
        </div>

        <!-- Quick Scale Presets & Reset Row -->
        <div v-if="store.selectedPart" class="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80 flex-wrap">
          <span class="text-[10px] text-slate-400 font-mono">{{ $t('assetEditor.quickPresets') }}:</span>
          <div class="flex items-center gap-1 flex-wrap">
            <UiButton
              v-for="p in [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]"
              :key="p"
              variant="secondary"
              size="xs"
              custom-class="px-1.5! py-0.5! text-[10px]! font-mono"
              @click="applyUniformScale(p)"
            >
              {{ p }}x
            </UiButton>
            <UiButton
              variant="ghost"
              size="xs"
              custom-class="px-1.5! py-0.5! text-[10px]! text-amber-400 hover:text-white"
              @click="resetBothScales"
            >
              1.0x Reset
            </UiButton>
          </div>
        </div>

        <!-- Opacity Slider -->
        <UiSlider 
          v-if="store.selectedPart"
          :model-value="Math.round(store.selectedPart.opacity * 100)"
          :label="$t('common.opacity')"
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
import { ref, computed } from 'vue'
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
  ClipboardPaste,
  Crop,
  Sparkles,
  Link2,
  Unlink2,
  MoveHorizontal,
  MoveVertical
} from 'lucide-vue-next'
import { UiCard, UiBadge, UiButton, UiNumberInput, UiSlider, UiTabs } from '../ui'
import { useAssetEditorStore } from '../../stores/assetEditorStore'

const store = useAssetEditorStore()

// State for Aspect Ratio Locking & Fine Stepper precision
const isAspectLocked = ref(true)
const fineStep = ref(0.01)

const currentScaleX = computed(() => {
  return Math.abs(store.selectedPart?.scaleX ?? 1.0)
})

const currentScaleY = computed(() => {
  return Math.abs(store.selectedPart?.scaleY ?? 1.0)
})

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

function onScaleXSliderChange(newMagX: number) {
  const clampedX = Math.max(0.05, Math.min(4.0, Number(newMagX.toFixed(3))))
  for (const part of store.selectedParts) {
    const signX = Math.sign(part.scaleX) || 1
    const signY = Math.sign(part.scaleY) || 1
    if (isAspectLocked.value) {
      const oldMagX = Math.abs(part.scaleX) || 1.0
      const ratio = clampedX / oldMagX
      const newMagY = Math.max(0.05, Math.min(4.0, Math.abs(part.scaleY) * ratio))
      store.updatePartProperties(part.id, {
        scaleX: signX * clampedX,
        scaleY: signY * newMagY,
      })
    } else {
      store.updatePartProperties(part.id, {
        scaleX: signX * clampedX,
      })
    }
  }
}

function onScaleYSliderChange(newMagY: number) {
  const clampedY = Math.max(0.05, Math.min(4.0, Number(newMagY.toFixed(3))))
  for (const part of store.selectedParts) {
    const signX = Math.sign(part.scaleX) || 1
    const signY = Math.sign(part.scaleY) || 1
    if (isAspectLocked.value) {
      const oldMagY = Math.abs(part.scaleY) || 1.0
      const ratio = clampedY / oldMagY
      const newMagX = Math.max(0.05, Math.min(4.0, Math.abs(part.scaleX) * ratio))
      store.updatePartProperties(part.id, {
        scaleX: signX * newMagX,
        scaleY: signY * clampedY,
      })
    } else {
      store.updatePartProperties(part.id, {
        scaleY: signY * clampedY,
      })
    }
  }
}

function stepScaleX(delta: number) {
  const target = Math.max(0.05, Math.min(4.0, currentScaleX.value + delta))
  onScaleXSliderChange(target)
}

function stepScaleY(delta: number) {
  const target = Math.max(0.05, Math.min(4.0, currentScaleY.value + delta))
  onScaleYSliderChange(target)
}

function applyUniformScale(val: number) {
  for (const part of store.selectedParts) {
    const signX = Math.sign(part.scaleX) || 1
    const signY = Math.sign(part.scaleY) || 1
    store.updatePartProperties(part.id, {
      scaleX: signX * val,
      scaleY: signY * val,
    })
  }
}

function resetBothScales() {
  applyUniformScale(1.0)
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
