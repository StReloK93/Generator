<template>
  <div 
    ref="viewportRef"
    class="relative w-full h-full bg-slate-950 overflow-hidden select-none flex items-center justify-center cursor-crosshair touch-manipulation"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @contextmenu="handleContextMenu"
    @dragover.prevent="handleDragOver"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Drag & Drop Fullscreen Visual Target Overlay -->
    <div 
      v-if="isDraggingFiles"
      class="absolute inset-4 z-50 rounded-3xl border-2 border-dashed border-cyan-400 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-cyan-300 pointer-events-none animate-in fade-in zoom-in-95 duration-150 shadow-[0_0_50px_rgba(6,182,212,0.3)]"
    >
      <div class="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 animate-bounce shadow-lg">
        <UploadCloud class="w-8 h-8" />
      </div>
      <div class="text-center">
        <h4 class="text-base font-bold text-white tracking-wide">
          {{ $t('assetEditor.dropImageTitle') || 'Rasmni bu yerga tashlang' }}
        </h4>
        <p class="text-xs text-cyan-200/80 mt-1 max-w-sm">
          {{ $t('assetEditor.dropImageSubtitle') || 'PNG, WebP, JPG yoki SVG formatidagi rasmlar avtomatik kompozitsiyaga qo\'shiladi' }}
        </p>
      </div>
    </div>
    <!-- Background Grid / Work Area Canvas -->
    <div 
      class="relative transition-transform duration-75 shadow-2xl rounded-2xl border border-slate-800/80 overflow-hidden checker-pattern"
      :style="{
        width: `${store.canvasWidth}px`,
        height: `${store.canvasHeight}px`,
        transform: `translate(${store.panX}px, ${store.panY}px) scale(${store.zoom})`,
        transformOrigin: 'center center',
      }"
    >
      <!-- HTML5 Rendering Canvas for Export & Composing -->
      <canvas 
        ref="canvasRef"
        :width="store.canvasWidth"
        :height="store.canvasHeight"
        class="absolute inset-0 w-full h-full pointer-events-none"
      ></canvas>

      <!-- 2:1 Isometric Diamond Base Guide (Always at the very bottom of the 256x512 canvas) -->
      <AssetDiamondGuideSvg
        v-if="store.showGridGuide"
        :canvas-width="store.canvasWidth"
        :canvas-height="store.canvasHeight"
        :show-center-origin="store.showCenterOrigin"
      />

      <!-- Interactive Part Overlays (Selection Boxes, Scale Badges & Drag Handles) -->
      <div 
        v-for="part in store.sortedParts"
        :key="part.id"
        v-show="part.visible"
        class="absolute cursor-move transition-shadow"
        :style="{
          left: `${store.canvasWidth / 2 + part.x}px`,
          top: `${store.canvasHeight - 64 + part.y}px`,
          zIndex: part.zIndex,
          opacity: part.opacity,
          transform: `translate(-50%, -50%) scaleX(${part.scaleX}) scaleY(${part.scaleY}) rotate(${part.rotation}deg)`,
        }"
        @mousedown.stop="handlePartMouseDown($event, part.id)"
        @dblclick.stop="store.openCropModal(part.id)"
      >
        <img 
          :src="part.src || assetStore.getAssetPreview(part.assetId || part.assetName)" 
          :alt="part.assetName"
          class="max-w-none pointer-events-none select-none drop-shadow-md"
          draggable="false"
        />

        <!-- Active Selection Ring, Badges & 4 Corner Scale Handles -->
        <div 
          v-if="store.isSelected(part.id)"
          class="absolute inset-0 border-2 border-brand-400 rounded-lg pointer-events-none ring-4 ring-brand-500/25 shadow-[0_0_15px_rgba(99,102,241,0.6)]"
        >
          <!-- 1. Top Info Badge (Name & Z-Index & Scale & Quick Crop) -->
          <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-brand-600/95 text-white font-mono text-[9px] font-bold whitespace-nowrap shadow-lg flex items-center gap-1.5 pointer-events-auto border border-brand-400/30">
            <span>{{ part.assetName }}</span>
            <span class="bg-brand-950/80 px-1 rounded text-amber-300">Z: {{ part.zIndex }}</span>
            <span class="bg-emerald-950/80 text-emerald-300 px-1 rounded font-black">{{ Math.abs(part.scaleX).toFixed(2) }}x</span>
            <button 
              type="button"
              class="ml-0.5 px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-400/50 flex items-center gap-1 cursor-pointer transition-all font-bold"
              :title="$t('assetEditor.cropDesc') || 'Rasmni qirqish (Double-click)'"
              @mousedown.stop
              @click.stop="store.openCropModal(part.id)"
            >
              <Crop class="w-2.5 h-2.5" />
              <span>{{ $t('assetEditor.crop') || 'Crop' }}</span>
            </button>
          </div>

          <!-- 2. Bottom Permanent Scale Badge (Click to type scale or press S) -->
          <div 
            class="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-900/95 border border-emerald-500/80 text-emerald-300 font-mono text-[9px] font-bold whitespace-nowrap shadow-xl flex items-center gap-1.5 pointer-events-auto cursor-pointer hover:bg-emerald-950 hover:border-emerald-400 hover:scale-105 transition-all"
            :title="$t('assetEditor.scaleChange')"
            @mousedown.stop
            @click.stop="openQuickScaleModal"
          >
            <span class="text-slate-400 font-normal">{{ $t('common.scale') }}:</span>
            <span class="text-white font-black">{{ Math.abs(part.scaleX).toFixed(2) }}x</span>
            <span class="bg-emerald-500/20 text-emerald-300 px-1 rounded text-[8px] border border-emerald-500/30 font-bold">S</span>
          </div>

          <!-- 3. Live Scaling Feedback Float (during corner drag) -->
          <div 
            v-if="isScaling && activeScaleValue !== null"
            class="absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-slate-900/95 border-2 border-emerald-400 text-emerald-300 font-mono text-xs font-black shadow-2xl flex items-center gap-1.5 pointer-events-none z-50 whitespace-nowrap animate-pulse ring-4 ring-emerald-500/30"
          >
            <span>{{ $t('common.scale').toUpperCase() }}:</span>
            <span class="text-white text-sm font-black">{{ activeScaleValue.toFixed(2) }}x</span>
            <span class="text-[9px] text-emerald-400/80 font-normal">(0.05)</span>
          </div>

          <!-- 4. Corner & Side Scale Handles (Both Uniform and Single-Axis X/Y) -->
          <!-- Top-Left Corner Handle -->
          <div 
            class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md hover:scale-125 transition-transform cursor-nwse-resize pointer-events-auto hover:bg-amber-300"
            :title="$t('assetEditor.scaleStepTip') || 'Masshtab (burchak bo\'yicha)'"
            @mousedown.stop="handleScaleStart($event, part, 'tl')"
          ></div>

          <!-- Top-Right Corner Handle -->
          <div 
            class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md hover:scale-125 transition-transform cursor-nesw-resize pointer-events-auto hover:bg-amber-300"
            :title="$t('assetEditor.scaleStepTip') || 'Masshtab (burchak bo\'yicha)'"
            @mousedown.stop="handleScaleStart($event, part, 'tr')"
          ></div>

          <!-- Bottom-Right Corner Handle -->
          <div 
            class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md hover:scale-125 transition-transform cursor-nwse-resize pointer-events-auto hover:bg-amber-300"
            :title="$t('assetEditor.scaleStepTip') || 'Masshtab (burchak bo\'yicha)'"
            @mousedown.stop="handleScaleStart($event, part, 'br')"
          ></div>

          <!-- Bottom-Left Corner Handle -->
          <div 
            class="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md hover:scale-125 transition-transform cursor-nesw-resize pointer-events-auto hover:bg-amber-300"
            :title="$t('assetEditor.scaleStepTip') || 'Masshtab (burchak bo\'yicha)'"
            @mousedown.stop="handleScaleStart($event, part, 'bl')"
          ></div>

          <!-- Single-Axis Middle-Left Handle (Scale X - Width) -->
          <div 
            class="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-emerald-400 border-2 border-emerald-700 rounded-sm shadow-md hover:scale-125 transition-transform cursor-ew-resize pointer-events-auto hover:bg-emerald-200"
            :title="$t('assetEditor.scaleXTip') || 'Gorizontal masshtab (Scale X)'"
            @mousedown.stop="handleScaleStart($event, part, 'ml')"
          ></div>

          <!-- Single-Axis Middle-Right Handle (Scale X - Width) -->
          <div 
            class="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-emerald-400 border-2 border-emerald-700 rounded-sm shadow-md hover:scale-125 transition-transform cursor-ew-resize pointer-events-auto hover:bg-emerald-200"
            :title="$t('assetEditor.scaleXTip') || 'Gorizontal masshtab (Scale X)'"
            @mousedown.stop="handleScaleStart($event, part, 'mr')"
          ></div>

          <!-- Single-Axis Middle-Top Handle (Scale Y - Height) -->
          <div 
            class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-cyan-400 border-2 border-cyan-700 rounded-sm shadow-md hover:scale-125 transition-transform cursor-ns-resize pointer-events-auto hover:bg-cyan-200"
            :title="$t('assetEditor.scaleYTip') || 'Vertikal masshtab (Scale Y)'"
            @mousedown.stop="handleScaleStart($event, part, 'mt')"
          ></div>

          <!-- Single-Axis Middle-Bottom Handle (Scale Y - Height) -->
          <div 
            class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-cyan-400 border-2 border-cyan-700 rounded-sm shadow-md hover:scale-125 transition-transform cursor-ns-resize pointer-events-auto hover:bg-cyan-200"
            :title="$t('assetEditor.scaleYTip') || 'Vertikal masshtab (Scale Y)'"
            @mousedown.stop="handleScaleStart($event, part, 'mb')"
          ></div>
        </div>
      </div>
    </div>

    <!-- ================= INTERACTIVE MODAL TRANSFORM HUD / OVERLAYS (S / G modes) ================= -->
    <!-- Guideline SVG line connecting Element Center to Mouse Position during Modal Scale / Grab -->
    <AssetTransformGuideSvg
      v-if="modalMode !== 'none' && activeModalCenterScreen"
      :active-modal-center-screen="activeModalCenterScreen"
      :current-mouse-screen="currentMouseScreen"
      :modal-mode="modalMode"
      :axis-constraint="axisConstraint"
    />

    <!-- Interactive Mode Floating Top HUD Banner -->
    <div 
      v-if="modalMode !== 'none'"
      class="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-top-4 duration-150 pointer-events-none"
    >
      <div 
        class="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/95 border-2 shadow-2xl backdrop-blur-md font-mono"
        :class="modalMode === 'scale' ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-cyan-500 ring-4 ring-cyan-500/20'"
      >
        <!-- Mode Badge -->
        <span 
          class="px-2 py-0.5 rounded-lg text-xs font-black uppercase text-slate-950"
          :class="modalMode === 'scale' ? 'bg-emerald-400' : 'bg-cyan-400'"
        >
          {{ modalMode === 'scale' ? 'SCALE (S)' : 'GRAB / MOVE (G)' }}
        </span>

        <!-- Scale / Move Value readout -->
        <div class="flex items-center gap-1.5 text-xs text-white font-bold">
          <template v-if="modalMode === 'scale'">
            <span class="text-slate-400 font-normal">Scale:</span>
            <span class="text-emerald-300 font-black text-sm">
              X: {{ modalLiveScaleX.toFixed(3) }}x / Y: {{ modalLiveScaleY.toFixed(3) }}x
            </span>
          </template>
          <template v-else>
            <span class="text-slate-400 font-normal">Offset:</span>
            <span class="text-cyan-300 font-black text-sm">
              ΔX: {{ modalLiveDeltaX }}px / ΔY: {{ modalLiveDeltaY }}px
            </span>
          </template>
        </div>

        <div class="w-px h-4 bg-slate-700 mx-0.5"></div>

        <!-- Axis Lock Status -->
        <div class="flex items-center gap-1 text-[11px]">
          <span class="text-slate-400 font-normal">O'q:</span>
          <span 
            class="px-1.5 py-0.5 rounded font-black uppercase"
            :class="{
              'bg-red-500/20 text-red-400 border border-red-500/40': axisConstraint === 'x',
              'bg-green-500/20 text-green-400 border border-green-500/40': axisConstraint === 'y',
              'bg-slate-800 text-slate-300': axisConstraint === 'none',
            }"
          >
            {{ axisConstraint === 'none' ? 'XY (Universal)' : axisConstraint.toUpperCase() + '-O\'Q' }}
          </span>
        </div>

        <!-- Shift Precision Indicator -->
        <div 
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
          :class="isShiftSlow ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-slate-800 text-slate-500'"
        >
          <span>Shift:</span>
          <span>{{ isShiftSlow ? 'SEKIN (SLOW)' : 'Oddiy' }}</span>
        </div>
      </div>

      <!-- Helper Keyboard Controls Sub-Banner -->
      <div class="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-[10px] text-slate-300 font-mono shadow-lg">
        <span class="text-emerald-400 font-bold">[Left-Click / Enter]</span>
        <span>Saqlash</span>
        <span class="text-slate-700">|</span>
        <span class="text-rose-400 font-bold">[Right-Click / Esc]</span>
        <span>Bekor qilish</span>
        <span class="text-slate-700">|</span>
        <span class="text-amber-400 font-bold">[X] / [Y]</span>
        <span>O'qni qulflash</span>
        <span class="text-slate-700">|</span>
        <span class="text-cyan-400 font-bold">[Shift]</span>
        <span>Juda sekin / aniq</span>
      </div>
    </div>

    <!-- Quick Tooltip / Hotkey Indicator Banner -->
    <div 
      v-if="modalMode === 'none'"
      class="absolute top-4 left-4 z-30 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md text-[10px] text-slate-300 font-mono"
    >
      <span class="text-emerald-400 font-bold">"S":</span>
      <span>Scale (Markazga yaqin/uzoq)</span>
      <span class="text-slate-600">|</span>
      <span class="text-cyan-400 font-bold">"G":</span>
      <span>Grab / Move (Sichqonchaga yopishish)</span>
      <span class="text-slate-600">|</span>
      <span class="text-amber-400 font-bold">"X" / "Y":</span>
      <span>Bir o'q bo'yicha</span>
      <span class="text-slate-600">|</span>
      <span class="text-amber-400 font-bold">Shift:</span>
      <span>Sekin o'zgartirish</span>
    </div>

    <!-- Selected Part Live Scale Indicator in Viewport HUD -->
    <div 
      v-if="store.selectedParts.length > 0 && modalMode === 'none'" 
      class="absolute top-4 right-4 z-30 flex items-center gap-2 bg-slate-900/95 border border-emerald-500/50 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md font-mono text-xs"
    >
      <span class="text-slate-400 text-[10px]">{{ $t('common.scale') }}:</span>
      <span class="text-emerald-300 font-black text-sm">
        {{ Math.abs(store.selectedPart?.scaleX || 1.0).toFixed(2) }}x
      </span>
      <UiButton 
        variant="ghost"
        size="xs"
        custom-class="px-1.5! py-0.5! rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px]! font-bold"
        title="Matnli kiritish (Manual Input)"
        @click="openQuickScaleModal"
      >
        {{ $t('common.edit') }}
      </UiButton>
    </div>

    <!-- Viewport Floating HUD Controls (Zoom, Pan Reset, Grid Toggle) -->
    <div class="absolute bottom-4 left-4 z-30 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
      <UiIconButton 
        :icon="ZoomOut" 
        size="sm" 
        variant="ghost" 
        :title="$t('anchor.zoomOut') + ' (-)'" 
        @click="zoomOut" 
      />
      <span class="text-[11px] font-mono font-bold text-amber-300 w-12 text-center">
        {{ Math.round(store.zoom * 100) }}%
      </span>
      <UiIconButton 
        :icon="ZoomIn" 
        size="sm" 
        variant="ghost" 
        :title="$t('anchor.zoomIn') + ' (+)'" 
        @click="zoomIn" 
      />
      
      <div class="w-px h-4 bg-slate-700 mx-1"></div>

      <UiIconButton 
        :icon="RotateCcw" 
        size="sm" 
        variant="ghost" 
        :title="$t('assetEditor.resetView')" 
        @click="store.resetView()" 
      />
      
      <UiIconButton 
        :icon="Grid" 
        size="sm" 
        :variant="store.showGridGuide ? 'tool' : 'ghost'"
        :active="store.showGridGuide"
        :title="$t('assetEditor.toggleGrid')" 
        @click="store.showGridGuide = !store.showGridGuide" 
      />
    </div>

    <!-- ================= QUICK SCALE INPUT MODAL (Triggered by 'S' or click) ================= -->
    <div 
      v-if="isQuickScaleOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
      @click.self="closeQuickScale"
    >
      <div 
        class="bg-slate-900 border border-brand-500/80 rounded-2xl p-5 shadow-2xl w-80 sm:w-96 flex flex-col gap-3.5 ring-4 ring-brand-500/20 animate-in zoom-in-95 duration-150"
        @keydown.stop
      >
        <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Scaling class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">{{ $t('assetEditor.enterExactScale') }}</span>
              <span class="text-[10px] text-slate-400 block font-mono">{{ $t('assetEditor.confirmEnter') }}</span>
            </div>
          </div>
          <UiIconButton 
            :icon="X"
            size="xs"
            variant="ghost"
            @click="closeQuickScale"
          />
        </div>

        <!-- Numeric Input Boxes for Scale X and Scale Y -->
        <div class="grid grid-cols-2 gap-3 items-center">
          <!-- Scale X Input -->
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-mono font-bold text-emerald-300">
              Scale X (Kenglik):
            </label>
            <div class="relative">
              <input 
                ref="quickScaleInputRef"
                v-model="quickScaleInputX"
                type="number"
                step="0.01"
                min="0.01"
                max="10.0"
                class="w-full bg-slate-950 border-2 border-emerald-500/80 rounded-xl px-2.5 py-1.5 text-emerald-300 font-mono text-base font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="1.00"
                @input="onQuickScaleXInput"
                @keydown.enter.prevent="applyQuickScale"
                @keydown.esc.prevent="closeQuickScale"
              />
              <span class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs font-bold">x</span>
            </div>
          </div>

          <!-- Scale Y Input -->
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-mono font-bold text-cyan-300">
              Scale Y (Balandlik):
            </label>
            <div class="relative">
              <input 
                v-model="quickScaleInputY"
                type="number"
                step="0.01"
                min="0.01"
                max="10.0"
                class="w-full bg-slate-950 border-2 border-cyan-500/80 rounded-xl px-2.5 py-1.5 text-cyan-300 font-mono text-base font-bold text-center focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                placeholder="1.00"
                @input="onQuickScaleYInput"
                @keydown.enter.prevent="applyQuickScale"
                @keydown.esc.prevent="closeQuickScale"
              />
              <span class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs font-bold">x</span>
            </div>
          </div>
        </div>

        <!-- Lock Aspect Ratio Toggle -->
        <div class="flex items-center justify-between px-1">
          <button
            type="button"
            class="text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
            :class="quickScaleLockAspect ? 'text-emerald-400 font-bold' : 'text-slate-400'"
            @click="quickScaleLockAspect = !quickScaleLockAspect"
          >
            <component :is="quickScaleLockAspect ? Link2 : Unlink2" class="w-3.5 h-3.5" />
            <span>{{ quickScaleLockAspect ? ($t('assetEditor.aspectRatioLocked') || 'Proporsiya bog\'langan') : ($t('assetEditor.aspectRatioUnlocked') || 'O\'qlar mustaqil') }}</span>
          </button>
        </div>

        <!-- Preset Fast Buttons -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] text-slate-400 font-mono">{{ $t('assetEditor.quickPresets') || 'Andozalar' }}</span>
          <div class="grid grid-cols-6 gap-1">
            <UiButton 
              v-for="p in [0.25, 0.5, 0.75, 1.0, 1.25, 1.5]"
              :key="p"
              variant="secondary"
              size="xs"
              custom-class="font-mono text-[10px]! p-1! justify-center"
              @click="setQuickScalePreset(p)"
            >
              {{ p }}x
            </UiButton>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <UiButton variant="ghost" size="sm" @click="closeQuickScale">
            {{ $t('common.cancel') }} (Esc)
          </UiButton>
          <UiButton variant="game-green" size="sm" @click="applyQuickScale">
            {{ $t('common.apply') }} (Enter)
          </UiButton>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { ZoomIn, ZoomOut, RotateCcw, Grid, Scaling, X, UploadCloud, Crop, Link2, Unlink2 } from 'lucide-vue-next'
import { UiIconButton, UiButton } from '../ui'
import { AssetDiamondGuideSvg, AssetTransformGuideSvg } from '../svg'
import { useAssetEditorStore, type CompositePart } from '../../stores/assetEditorStore'
import { useAssetStore } from '../../stores/assetStore'

const store = useAssetEditorStore()
const assetStore = useAssetStore()

const viewportRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Drag & Drop File state
const isDraggingFiles = ref(false)
let dragCounter = 0

function handleDragEnter(e: DragEvent) {
  dragCounter++
  if (e.dataTransfer && (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/json'))) {
    isDraggingFiles.value = true
  }
}

function handleDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
  isDraggingFiles.value = true
}

function handleDragLeave(_e: DragEvent) {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDraggingFiles.value = false
  }
}

async function handleDrop(e: DragEvent) {
  dragCounter = 0
  isDraggingFiles.value = false

  const rect = viewportRef.value?.getBoundingClientRect()
  let dropX = 0
  let dropY = 0

  if (rect) {
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const viewCenterX = rect.width / 2 + store.panX
    const viewCenterY = rect.height / 2 + store.panY
    dropX = Math.round((mouseX - viewCenterX) / store.zoom)
    dropY = Math.round((mouseY - viewCenterY) / store.zoom)
  }

  // 1. Dropped internal sprite from Sidebar JSON
  const jsonData = e.dataTransfer?.getData('application/json')
  if (jsonData) {
    try {
      const parsed = JSON.parse(jsonData)
      if (parsed && (parsed.assetId || parsed.id)) {
        store.addPartFromAsset({
          id: parsed.assetId || parsed.id,
          name: parsed.name || 'Sprite',
          src: parsed.src || '',
          previewSrc: parsed.previewSrc || parsed.src || '',
        }, dropX, dropY)
        return
      }
    } catch {
      // Fallback
    }
  }

  // 2. Dropped external image files from OS Desktop / Explorer
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    await processAndAddFiles(files, dropX, dropY)
  }
}

async function processAndAddFiles(files: FileList | File[], initialX = 0, initialY = 0) {
  const addedAssets = await assetStore.uploadFiles(files)
  if (addedAssets && addedAssets.length > 0) {
    for (let i = 0; i < addedAssets.length; i++) {
      const a = addedAssets[i]
      const offsetX = initialX + i * 24
      const offsetY = initialY + i * 24
      store.addPartFromAsset({
        id: a.id,
        name: a.name,
        src: a.src,
        previewSrc: a.previewSrc,
      }, offsetX, offsetY)
    }
  }
}

// Dragging, Scaling & Panning state
const isDraggingPart = ref(false)
const isScaling = ref(false)
const scaleHandle = ref<'tl' | 'tr' | 'br' | 'bl' | 'ml' | 'mr' | 'mt' | 'mb' | null>(null)
const scaleStartMouseX = ref(0)
const scaleStartMouseY = ref(0)
const activeScaleValue = ref<number | null>(null)

const isPanning = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const panStartX = ref(0)
const panStartY = ref(0)

// Quick Scale Modal State (Independent X/Y and Aspect Ratio Lock)
const isQuickScaleOpen = ref(false)
const quickScaleInputX = ref('1.00')
const quickScaleInputY = ref('1.00')
const quickScaleLockAspect = ref(true)
const quickScaleInputRef = ref<HTMLInputElement | null>(null)

function openQuickScaleModal() {
  if (store.selectedParts.length === 0) return
  const primary = store.selectedPart || store.selectedParts[0]
  const currentScaleX = Math.abs(primary.scaleX) || 1.0
  const currentScaleY = Math.abs(primary.scaleY) || 1.0
  quickScaleInputX.value = currentScaleX.toFixed(2)
  quickScaleInputY.value = currentScaleY.toFixed(2)
  isQuickScaleOpen.value = true

  nextTick(() => {
    quickScaleInputRef.value?.focus()
    quickScaleInputRef.value?.select()
  })
}

function closeQuickScale() {
  isQuickScaleOpen.value = false
}

function onQuickScaleXInput() {
  if (quickScaleLockAspect.value) {
    quickScaleInputY.value = quickScaleInputX.value
  }
}

function onQuickScaleYInput() {
  if (quickScaleLockAspect.value) {
    quickScaleInputX.value = quickScaleInputY.value
  }
}

function setQuickScalePreset(p: number) {
  quickScaleInputX.value = p.toString()
  quickScaleInputY.value = p.toString()
  applyQuickScale()
}

function applyQuickScale() {
  const valX = parseFloat(quickScaleInputX.value)
  const valY = parseFloat(quickScaleInputY.value)

  if (!isNaN(valX) && valX > 0 && !isNaN(valY) && valY > 0) {
    const clampedX = Number(Math.max(0.01, Math.min(10.0, valX)).toFixed(3))
    const clampedY = Number(Math.max(0.01, Math.min(10.0, valY)).toFixed(3))
    
    for (const part of store.selectedParts) {
      const signX = Math.sign(part.scaleX) || 1
      const signY = Math.sign(part.scaleY) || 1
      part.scaleX = signX * clampedX
      part.scaleY = signY * clampedY
    }
    store.recordHistory()
  }
  closeQuickScale()
}

// ================= BLENDER-STYLE MODAL TRANSFORM (S / G / X / Y / Shift) =================
const modalMode = ref<'none' | 'scale' | 'grab'>('none')
const axisConstraint = ref<'none' | 'x' | 'y'>('none')
const isShiftSlow = ref(false)

const currentMouseScreen = ref({ x: 0, y: 0 })
const activeModalCenterScreen = ref<{ x: number; y: number } | null>(null)
const modalStartDist = ref(1)
const modalStartMouseCanvas = ref({ x: 0, y: 0 })
const modalLiveScaleX = ref(1.0)
const modalLiveScaleY = ref(1.0)
const modalLiveDeltaX = ref(0)
const modalLiveDeltaY = ref(0)

// Start positions for all multi-selected parts during group drag or modal grab
const startPositionsMap = new Map<string, { x: number; y: number }>()
// Start scales for all multi-selected parts during scale
const initialScalesMap = new Map<string, { scaleX: number; scaleY: number }>()

function getCanvasOffsets(clientX: number, clientY: number) {
  const rect = viewportRef.value?.getBoundingClientRect()
  if (!rect) return { canvasX: 0, canvasY: 0, screenX: clientX, screenY: clientY }
  const mouseViewportX = clientX - rect.left
  const mouseViewportY = clientY - rect.top
  const viewCenterX = rect.width / 2 + store.panX
  const viewCenterY = rect.height / 2 + store.panY
  const canvasX = (mouseViewportX - viewCenterX) / store.zoom
  const canvasY = (mouseViewportY - viewCenterY) / store.zoom
  return { canvasX, canvasY, screenX: clientX, screenY: clientY }
}

function getSelectedGroupCenter() {
  const primary = store.selectedPart || store.selectedParts[0]
  if (!primary) return null
  const centerCanvasX = primary.x
  const centerCanvasY = primary.y + (store.canvasHeight / 2 - 64)

  const rect = viewportRef.value?.getBoundingClientRect()
  if (!rect) return { canvas: { x: centerCanvasX, y: centerCanvasY }, screen: { x: 0, y: 0 } }

  const viewCenterX = rect.width / 2 + store.panX
  const viewCenterY = rect.height / 2 + store.panY
  const screenX = rect.left + viewCenterX + centerCanvasX * store.zoom
  const screenY = rect.top + viewCenterY + centerCanvasY * store.zoom

  return {
    canvas: { x: centerCanvasX, y: centerCanvasY },
    screen: { x: screenX, y: screenY },
  }
}

function startModalScale(clientX?: number, clientY?: number) {
  if (store.selectedParts.length === 0) return

  initialScalesMap.clear()
  for (const p of store.selectedParts) {
    initialScalesMap.set(p.id, { scaleX: p.scaleX, scaleY: p.scaleY })
  }

  const centerInfo = getSelectedGroupCenter()
  if (!centerInfo) return

  activeModalCenterScreen.value = centerInfo.screen
  modalMode.value = 'scale'
  axisConstraint.value = 'none'

  const primary = store.selectedPart || store.selectedParts[0]
  modalLiveScaleX.value = Math.abs(primary.scaleX)
  modalLiveScaleY.value = Math.abs(primary.scaleY)

  const mouseX = clientX !== undefined ? clientX : (currentMouseScreen.value.x || centerInfo.screen.x + 80)
  const mouseY = clientY !== undefined ? clientY : (currentMouseScreen.value.y || centerInfo.screen.y + 80)
  currentMouseScreen.value = { x: mouseX, y: mouseY }

  const mouseOffsets = getCanvasOffsets(mouseX, mouseY)
  modalStartMouseCanvas.value = { x: mouseOffsets.canvasX, y: mouseOffsets.canvasY }
  
  const dist = Math.hypot(
    mouseOffsets.canvasX - centerInfo.canvas.x,
    mouseOffsets.canvasY - centerInfo.canvas.y
  )
  modalStartDist.value = Math.max(15, dist)
}

function startModalGrab(clientX?: number, clientY?: number) {
  if (store.selectedParts.length === 0) return

  startPositionsMap.clear()
  for (const p of store.selectedParts) {
    startPositionsMap.set(p.id, { x: p.x, y: p.y })
  }

  const centerInfo = getSelectedGroupCenter()
  if (!centerInfo) return

  activeModalCenterScreen.value = centerInfo.screen
  modalMode.value = 'grab'
  axisConstraint.value = 'none'
  modalLiveDeltaX.value = 0
  modalLiveDeltaY.value = 0

  const mouseX = clientX !== undefined ? clientX : (currentMouseScreen.value.x || centerInfo.screen.x)
  const mouseY = clientY !== undefined ? clientY : (currentMouseScreen.value.y || centerInfo.screen.y)
  currentMouseScreen.value = { x: mouseX, y: mouseY }

  const mouseOffsets = getCanvasOffsets(mouseX, mouseY)
  modalStartMouseCanvas.value = { x: mouseOffsets.canvasX, y: mouseOffsets.canvasY }
}

function commitModalTransform() {
  if (modalMode.value === 'none') return
  modalMode.value = 'none'
  axisConstraint.value = 'none'
  activeModalCenterScreen.value = null
  startPositionsMap.clear()
  initialScalesMap.clear()
  store.recordHistory()
}

function cancelModalTransform() {
  if (modalMode.value === 'none') return

  if (modalMode.value === 'scale') {
    for (const part of store.selectedParts) {
      const orig = initialScalesMap.get(part.id)
      if (orig) {
        part.scaleX = orig.scaleX
        part.scaleY = orig.scaleY
      }
    }
  } else if (modalMode.value === 'grab') {
    for (const part of store.selectedParts) {
      const orig = startPositionsMap.get(part.id)
      if (orig) {
        part.x = orig.x
        part.y = orig.y
      }
    }
  }

  modalMode.value = 'none'
  axisConstraint.value = 'none'
  activeModalCenterScreen.value = null
  startPositionsMap.clear()
  initialScalesMap.clear()
}

function handleWheel(e: WheelEvent) {
  // Feature: Ctrl + MouseWheel to change Z-Index of selected element(s)!
  if (e.ctrlKey || e.metaKey) {
    if (store.selectedParts.length > 0) {
      if (e.deltaY < 0) {
        // Scroll Up -> Increase Z-Index (Bring Forward)
        store.moveUp()
      } else {
        // Scroll Down -> Decrease Z-Index (Send Backward)
        store.moveDown()
      }
      return
    }
  }

  // Normal Wheel -> Zoom Canvas
  const delta = e.deltaY < 0 ? 0.1 : -0.1
  const newZoom = Math.max(0.25, Math.min(4.0, store.zoom + delta))
  store.zoom = Number(newZoom.toFixed(2))
}

function zoomIn() {
  store.zoom = Number(Math.min(4.0, store.zoom + 0.25).toFixed(2))
}

function zoomOut() {
  store.zoom = Number(Math.max(0.25, store.zoom - 0.25).toFixed(2))
}

function handleContextMenu(e: MouseEvent) {
  if (modalMode.value !== 'none') {
    e.preventDefault()
    cancelModalTransform()
  }
}

function handleMouseDown(e: MouseEvent) {
  // If in Modal Scale / Grab mode: Left click commits, Right click cancels
  if (modalMode.value !== 'none') {
    if (e.button === 0) {
      commitModalTransform()
    } else if (e.button === 2) {
      cancelModalTransform()
    }
    e.preventDefault()
    e.stopPropagation()
    return
  }

  // If clicking on empty canvas space
  if (e.target === viewportRef.value || (e.target as HTMLElement).tagName === 'CANVAS') {
    if (!e.shiftKey) {
      store.selectPart(null)
    }
  }

  // Pan with middle click or Left click on blank space
  if (e.button === 1 || e.button === 0) {
    isPanning.value = true
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    panStartX.value = store.panX
    panStartY.value = store.panY
  }
}

function handlePartMouseDown(e: MouseEvent, partId: string) {
  if (modalMode.value !== 'none') {
    if (e.button === 0) commitModalTransform()
    else if (e.button === 2) cancelModalTransform()
    return
  }

  if (e.button !== 0) return

  const isMulti = e.shiftKey || e.ctrlKey || e.metaKey
  store.selectPart(partId, isMulti)

  isDraggingPart.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY

  startPositionsMap.clear()
  const selectedParts = store.selectedParts
  for (const p of selectedParts) {
    startPositionsMap.set(p.id, { x: p.x, y: p.y })
  }
}

function handleScaleStart(e: MouseEvent, part: CompositePart, handle: 'tl' | 'tr' | 'br' | 'bl' | 'ml' | 'mr' | 'mt' | 'mb') {
  e.stopPropagation()
  e.preventDefault()

  if (!store.isSelected(part.id)) {
    store.selectPart(part.id, false)
  }

  isScaling.value = true
  scaleHandle.value = handle
  scaleStartMouseX.value = e.clientX
  scaleStartMouseY.value = e.clientY

  initialScalesMap.clear()
  for (const p of store.selectedParts) {
    initialScalesMap.set(p.id, { scaleX: p.scaleX, scaleY: p.scaleY })
  }

  const primary = store.selectedPart || part
  activeScaleValue.value = Math.abs(primary.scaleX)
}

function handleMouseMove(e: MouseEvent) {
  currentMouseScreen.value = { x: e.clientX, y: e.clientY }
  isShiftSlow.value = e.shiftKey

  // A. Handling Blender-Style Modal Scale Mode ('S')
  if (modalMode.value === 'scale' && store.selectedParts.length > 0) {
    const centerInfo = getSelectedGroupCenter()
    if (!centerInfo) return
    activeModalCenterScreen.value = centerInfo.screen

    const mouseOffsets = getCanvasOffsets(e.clientX, e.clientY)
    const isShift = e.shiftKey || isShiftSlow.value
    // Sensitivity: 150 for normal, 8000 for ultra-fine precision (0.001 per 8px)
    const sensitivity = isShift ? 8000 : 150
    const step = isShift ? 0.001 : 0.01

    if (axisConstraint.value === 'x') {
      const startDx = Math.abs(modalStartMouseCanvas.value.x - centerInfo.canvas.x)
      const currDx = Math.abs(mouseOffsets.canvasX - centerInfo.canvas.x)
      const deltaScaleX = (currDx - startDx) / sensitivity

      for (const part of store.selectedParts) {
        const init = initialScalesMap.get(part.id)
        if (!init) continue
        const signX = Math.sign(init.scaleX) || 1
        const baseMagX = Math.abs(init.scaleX)
        const rawTargetX = baseMagX + deltaScaleX
        const snappedX = Math.round(rawTargetX / step) * step
        part.scaleX = Number((signX * Math.max(0.001, Math.min(10.0, snappedX))).toFixed(3))
        part.scaleY = init.scaleY
      }
    } else if (axisConstraint.value === 'y') {
      const startDy = Math.abs(modalStartMouseCanvas.value.y - centerInfo.canvas.y)
      const currDy = Math.abs(mouseOffsets.canvasY - centerInfo.canvas.y)
      const deltaScaleY = (currDy - startDy) / sensitivity

      for (const part of store.selectedParts) {
        const init = initialScalesMap.get(part.id)
        if (!init) continue
        const signY = Math.sign(init.scaleY) || 1
        const baseMagY = Math.abs(init.scaleY)
        const rawTargetY = baseMagY + deltaScaleY
        const snappedY = Math.round(rawTargetY / step) * step
        part.scaleX = init.scaleX
        part.scaleY = Number((signY * Math.max(0.001, Math.min(10.0, snappedY))).toFixed(3))
      }
    } else {
      const currentDist = Math.hypot(
        mouseOffsets.canvasX - centerInfo.canvas.x,
        mouseOffsets.canvasY - centerInfo.canvas.y
      )
      const deltaScale = (currentDist - modalStartDist.value) / sensitivity

      for (const part of store.selectedParts) {
        const init = initialScalesMap.get(part.id)
        if (!init) continue
        const signX = Math.sign(init.scaleX) || 1
        const signY = Math.sign(init.scaleY) || 1
        const baseMagX = Math.abs(init.scaleX)
        const baseMagY = Math.abs(init.scaleY)
        const rawTargetX = baseMagX + deltaScale
        const rawTargetY = baseMagY + deltaScale
        const snappedX = Math.round(rawTargetX / step) * step
        const snappedY = Math.round(rawTargetY / step) * step
        part.scaleX = Number((signX * Math.max(0.001, Math.min(10.0, snappedX))).toFixed(3))
        part.scaleY = Number((signY * Math.max(0.001, Math.min(10.0, snappedY))).toFixed(3))
      }
    }

    const primary = store.selectedPart || store.selectedParts[0]
    if (primary) {
      modalLiveScaleX.value = Math.abs(primary.scaleX)
      modalLiveScaleY.value = Math.abs(primary.scaleY)
    }
    return
  }

  // B. Handling Blender-Style Modal Grab / Move Mode ('G')
  if (modalMode.value === 'grab' && store.selectedParts.length > 0) {
    const centerInfo = getSelectedGroupCenter()
    if (centerInfo) activeModalCenterScreen.value = centerInfo.screen

    const mouseOffsets = getCanvasOffsets(e.clientX, e.clientY)
    let deltaX = mouseOffsets.canvasX - modalStartMouseCanvas.value.x
    let deltaY = mouseOffsets.canvasY - modalStartMouseCanvas.value.y

    if (axisConstraint.value === 'x') {
      deltaY = 0
    } else if (axisConstraint.value === 'y') {
      deltaX = 0
    }

    if (e.shiftKey || isShiftSlow.value) {
      deltaX = deltaX * 0.1
      deltaY = deltaY * 0.1
    }

    modalLiveDeltaX.value = Math.round(deltaX)
    modalLiveDeltaY.value = Math.round(deltaY)

    for (const part of store.selectedParts) {
      const orig = startPositionsMap.get(part.id)
      if (orig) {
        part.x = Math.round(orig.x + deltaX)
        part.y = Math.round(orig.y + deltaY)
      }
    }
    return
  }

  // C. Handling Drag Scaling Handles (Both Corner Proportional & Single-Axis X/Y)
  if (isScaling.value && scaleHandle.value && store.selectedParts.length > 0) {
    const dx = (e.clientX - scaleStartMouseX.value) / store.zoom
    const dy = (e.clientY - scaleStartMouseY.value) / store.zoom
    const isShift = e.shiftKey || isShiftSlow.value
    const handleDivisor = isShift ? 5000 : 120
    const step = isShift ? 0.001 : 0.01

    const primary = store.selectedPart
    const initialPrimary = primary ? initialScalesMap.get(primary.id) : null
    const baseScaleX = initialPrimary ? Math.abs(initialPrimary.scaleX) : 1.0
    const baseScaleY = initialPrimary ? Math.abs(initialPrimary.scaleY) : 1.0

    // Single Axis: Width (Scale X - Middle Left / Right)
    if (scaleHandle.value === 'ml' || scaleHandle.value === 'mr') {
      const signX = scaleHandle.value === 'ml' ? -1 : 1
      const dScaleX = (signX * dx) / handleDivisor
      const rawTargetScaleX = Math.max(0.001, Math.min(10.0, baseScaleX + dScaleX))
      const snappedScaleX = Math.round(rawTargetScaleX / step) * step
      const ratioX = snappedScaleX / (baseScaleX || 1.0)
      store.setAxisScaleForSelectedParts(ratioX, 1.0, initialScalesMap, step)
      if (primary) activeScaleValue.value = Math.abs(primary.scaleX)
      return
    }

    // Single Axis: Height (Scale Y - Middle Top / Bottom)
    if (scaleHandle.value === 'mt' || scaleHandle.value === 'mb') {
      const signY = scaleHandle.value === 'mt' ? -1 : 1
      const dScaleY = (signY * dy) / handleDivisor
      const rawTargetScaleY = Math.max(0.001, Math.min(10.0, baseScaleY + dScaleY))
      const snappedScaleY = Math.round(rawTargetScaleY / step) * step
      const ratioY = snappedScaleY / (baseScaleY || 1.0)
      store.setAxisScaleForSelectedParts(1.0, ratioY, initialScalesMap, step)
      if (primary) activeScaleValue.value = Math.abs(primary.scaleY)
      return
    }

    // Corner Handles: Dual Axis Proportional
    let signX = 1
    let signY = 1
    if (scaleHandle.value === 'tl') {
      signX = -1
      signY = -1
    } else if (scaleHandle.value === 'tr') {
      signX = 1
      signY = -1
    } else if (scaleHandle.value === 'bl') {
      signX = -1
      signY = 1
    } else if (scaleHandle.value === 'br') {
      signX = 1
      signY = 1
    }

    const dScale = (signX * dx + signY * dy) / (handleDivisor * 1.2)
    const rawTargetScale = Math.max(0.001, Math.min(10.0, baseScaleX + dScale))
    const snappedTargetScale = Math.round(rawTargetScale / step) * step
    const ratio = snappedTargetScale / (baseScaleX || 1.0)

    store.setScaleForSelectedParts(ratio, initialScalesMap, step)
    if (primary) {
      activeScaleValue.value = Math.abs(primary.scaleX)
    }
    return
  }

  // D. Handling Group Dragging
  if (isDraggingPart.value && store.selectedParts.length > 0) {
    const dx = (e.clientX - dragStartX.value) / store.zoom
    const dy = (e.clientY - dragStartY.value) / store.zoom
    store.moveSelectedPartsBy(dx, dy, startPositionsMap)
    return
  }

  // E. Handling Canvas Panning
  if (isPanning.value) {
    const dx = e.clientX - dragStartX.value
    const dy = e.clientY - dragStartY.value
    store.panX = panStartX.value + dx
    store.panY = panStartY.value + dy
  }
}

function handleMouseUp() {
  if (isScaling.value) {
    isScaling.value = false
    scaleHandle.value = null
    activeScaleValue.value = null
    initialScalesMap.clear()
    store.recordHistory()
  }

  if (isDraggingPart.value) {
    isDraggingPart.value = false
    startPositionsMap.clear()
    store.recordHistory()
  }
  isPanning.value = false
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === 'Shift') {
    isShiftSlow.value = false
  }
}

// Global keyboard listeners for hotkeys
function handleKeyDown(e: KeyboardEvent) {
  // If quick scale modal is active, let input handle keys
  if (isQuickScaleOpen.value) {
    if (e.key === 'Escape') {
      closeQuickScale()
    }
    return
  }

  // Track shift key for precision
  if (e.key === 'Shift') {
    isShiftSlow.value = true
  }

  // Don't intercept if typing in an input
  const activeTag = (document.activeElement?.tagName || '').toLowerCase()
  if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return

  const isCtrl = e.ctrlKey || e.metaKey

  // ================= MODAL TRANSFORM KEYBOARD HANDLING =================
  if (modalMode.value !== 'none') {
    if (e.key === 'x' || e.key === 'X') {
      e.preventDefault()
      axisConstraint.value = axisConstraint.value === 'x' ? 'none' : 'x'
      return
    }
    if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault()
      axisConstraint.value = axisConstraint.value === 'y' ? 'none' : 'y'
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      commitModalTransform()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelModalTransform()
      return
    }
    return
  }

  // ================= MODAL MODE TRIGGERS =================
  // Feature: Press 'S' to enter Interactive Blender-style Scale Mode
  if ((e.key === 's' || e.key === 'S') && !isCtrl && !e.altKey) {
    if (store.selectedParts.length > 0) {
      e.preventDefault()
      startModalScale()
      return
    }
  }

  // Feature: Press 'G' to enter Interactive Blender-style Grab / Move Mode
  if ((e.key === 'g' || e.key === 'G') && !isCtrl && !e.altKey) {
    if (store.selectedParts.length > 0) {
      e.preventDefault()
      startModalGrab()
      return
    }
  }

  const mult = e.shiftKey ? 10 : 1

  // Arrow Keypad Nudging
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    store.nudgeSelected(0, -mult)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    store.nudgeSelected(0, mult)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    store.nudgeSelected(-mult, 0)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    store.nudgeSelected(mult, 0)
  } 
  // Delete / Backspace
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedPartIds.length > 0) {
      e.preventDefault()
      store.deleteSelected()
    }
  } 
  // Ctrl + C (Copy)
  else if (isCtrl && e.key.toLowerCase() === 'c') {
    e.preventDefault()
    store.copySelection()
  } 
  // Ctrl + V (Paste)
  else if (isCtrl && e.key.toLowerCase() === 'v') {
    e.preventDefault()
    store.pasteSelection()
  }
  // Ctrl + D (Duplicate)
  else if (isCtrl && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    store.duplicateSelected()
  }
  // Ctrl + A (Select All)
  else if (isCtrl && e.key.toLowerCase() === 'a') {
    e.preventDefault()
    store.selectAll()
  }
  // Undo / Redo
  else if (isCtrl && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) {
      store.redo()
    } else {
      store.undo()
    }
  }
}

// Export canvas image to transparent PNG Data URL (fixed standard 256x512 with diamond base at the bottom)
async function exportToTransparentBlob(): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; anchorX: number; anchorY: number }> {
  // 1. Pre-load all images
  const loadedImages: { img: HTMLImageElement; part: typeof store.parts[0] }[] = []
  
  for (const part of store.sortedParts) {
    if (!part.visible) continue
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = part.src || assetStore.getAssetPreview(part.assetId || part.assetName)
    })
    loadedImages.push({ img, part })
  }

  if (loadedImages.length === 0) {
    throw new Error('No visible layers found to export')
  }

  // 2. Fixed standard 256x512 canvas with diamond base at bottom center (128, 448)
  const exportWidth = 256
  const exportHeight = 512
  const diamondCenterX = 128
  const diamondCenterY = 448

  const offscreen = document.createElement('canvas')
  offscreen.width = exportWidth
  offscreen.height = exportHeight
  const ctx = offscreen.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.clearRect(0, 0, exportWidth, exportHeight)

  // 3. Draw each part sorted by z-index relative to diamond center
  for (const { img, part } of loadedImages) {
    if (!img.width || !img.height) continue
    ctx.save()
    ctx.globalAlpha = part.opacity

    const drawX = diamondCenterX + part.x
    const drawY = diamondCenterY + part.y

    ctx.translate(drawX, drawY)
    ctx.rotate((part.rotation * Math.PI) / 180)
    ctx.scale(part.scaleX, part.scaleY)

    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    ctx.restore()
  }

  // Anchor is strictly (0.5, 0.88) corresponding to diamond center (128, 448) on 256x512 canvas
  const anchorX = 0.5
  const anchorY = 0.88

  return new Promise((resolve) => {
    offscreen.toBlob((blob) => {
      resolve({
        blob: blob!,
        dataUrl: offscreen.toDataURL('image/png'),
        width: exportWidth,
        height: exportHeight,
        anchorX,
        anchorY,
      })
    }, 'image/png')
  })
}

defineExpose({
  exportToTransparentBlob,
  openQuickScaleModal,
  processAndAddFiles,
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.checker-pattern {
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), 
    linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), 
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
</style>
