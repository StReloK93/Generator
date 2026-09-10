<template>
  <aside 
    v-if="toolStore.selectedElement"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="glass-panel border-r border-slate-800/90 flex flex-col z-30 transition-all duration-200 select-none w-92 h-full overflow-hidden shadow-2xl absolute left-0 top-0 bg-dark-900/95 backdrop-blur-xl"
  >
    <!-- Panel Header -->
    <div class="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-sm">
          <Sliders class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-100">
            {{ $t('inspector.title') }}
          </h2>
          <p class="text-[10px] font-mono text-brand-400">
            {{ $t('inspector.gridPosition') }}: X: {{ toolStore.selectedElement.col }}, Y: {{ toolStore.selectedElement.row }}
          </p>
        </div>
      </div>
      <UiIconButton
        :icon="X"
        size="sm"
        variant="ghost"
        :title="$t('common.close')"
        @click="toolStore.setSelectedElement(null)"
      />
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
      <!-- 1. List of Elements on / covering this cell -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-xs px-0.5">
          <span class="font-semibold text-slate-300">{{ $t('inspector.elementsOnCell') }}</span>
          <UiBadge variant="brand" size="xs">
            {{ $t('inspector.itemsCount', { count: coveringElements.length }) }}
          </UiBadge>
        </div>

        <div class="flex flex-col gap-1.5 max-h-32 overflow-y-auto p-1">
          <UiCard 
            v-for="entry in coveringElements" 
            :key="entry.item.id"
            :selected="toolStore.selectedElement.itemId === entry.item.id"
            variant="default"
            padding="sm"
            interactive
            custom-class="p-2! flex items-center gap-2.5"
            @click="selectElementEntry(entry)"
          >
            <!-- Thumbnail -->
            <div class="w-8 h-8 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1 shrink-0 overflow-hidden border border-slate-800">
              <img 
                :src="assetStore.getAssetPreview(entry.item.assetId)" 
                :alt="getAsset(entry.item.assetId)?.name"
                width="32"
                height="32"
                decoding="async"
                class="max-w-full max-h-full aspect-square object-contain filter drop-shadow"
                :style="{
                  transform: `scaleX(${entry.item.flipX ? -1 : 1}) rotate(${entry.item.rotation || 0}deg)`
                }"
              />
            </div>

            <!-- Meta -->
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-slate-200 truncate flex items-center justify-between">
                <span>{{ getAsset(entry.item.assetId)?.name || $t('common.element') }}</span>
                <UiBadge variant="brand" size="xs">
                  Z: {{ entry.cellZIndex }}
                </UiBadge>
              </div>
              <div class="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>{{ $t('inspector.cellsCount', { x: entry.item.spanX || 1, y: entry.item.spanY || 1 }) }}</span>
                <span v-if="entry.item.depthOffset" class="text-amber-400 text-[9px] font-bold">
                  ({{ $t('inspector.depthTag', { val: `${entry.item.depthOffset > 0 ? '+' : ''}${entry.item.depthOffset}` }) }})
                </span>
              </div>
            </div>
          </UiCard>
        </div>
      </div>

      <!-- Active Element Full Inspector -->
      <div v-if="activeItem" class="flex flex-col gap-3 border-t border-slate-800/80 pt-3">

        <!-- 2. RELATIVE DEPTH SHIFT -->
        <UiCard variant="brand" padding="sm" custom-class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-brand-300 flex items-center gap-1.5">
              <Layers class="w-4 h-4 text-brand-400" />
              {{ $t('inspector.relativeDepthOffset') }}
            </span>
            <UiBadge 
              :variant="(activeItem.depthOffset || 0) > 0 ? 'emerald' : (activeItem.depthOffset || 0) < 0 ? 'amber' : 'slate'"
              size="xs"
            >
              {{ depthOffsetStatusText }}
            </UiBadge>
          </div>

          <!-- Quick Big Push/Pull Buttons -->
          <div class="grid grid-cols-2 gap-2 mt-0.5">
            <!-- Shift forward on top of bottom neighbor -->
            <UiButton 
              variant="primary"
              size="sm"
              :leading-icon="ArrowDownToLine"
              :title="$t('inspector.aboveFrontDesc')"
              @click="shiftDepth(+1)"
            >
              {{ $t('inspector.aboveFront') }}
            </UiButton>

            <!-- Shift backward behind top neighbor -->
            <UiButton 
              variant="secondary"
              size="sm"
              :leading-icon="ArrowUpToLine"
              :title="$t('inspector.behindBackDesc')"
              @click="shiftDepth(-1)"
            >
              {{ $t('inspector.behindBack') }}
            </UiButton>
          </div>

          <!-- Stepper & Direct Offset Setting -->
          <div class="flex items-center justify-between gap-2 pt-1 border-t border-brand-500/20 text-xs">
            <span class="text-[11px] text-slate-400">{{ $t('inspector.shiftAmount') }}</span>
            <div class="flex items-center gap-1">
              <UiIconButton 
                size="sm"
                variant="default"
                custom-class="w-6! h-6!"
                @click="shiftDepth(-1)"
              >
                -
              </UiIconButton>
              <span class="w-10 text-center font-mono font-bold text-brand-300 text-xs">
                {{ (activeItem.depthOffset || 0) > 0 ? '+' : '' }}{{ activeItem.depthOffset || 0 }}
              </span>
              <UiIconButton 
                size="sm"
                variant="default"
                custom-class="w-6! h-6!"
                @click="shiftDepth(+1)"
              >
                +
              </UiIconButton>
              <UiButton 
                v-if="activeItem.depthOffset !== 0"
                variant="ghost"
                size="xs"
                :title="$t('inspector.resetDepthDesc')"
                @click="resetDepth"
              >
                {{ $t('inspector.reset') }}
              </UiButton>
            </div>
          </div>
          <p class="text-[10px] text-slate-400 leading-tight flex items-center gap-1.5">
            <Lightbulb class="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span v-html="$t('inspector.aboveFrontTip')"></span>
          </p>
        </UiCard>

        <!-- 3. Layer Selector -->
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold text-slate-300">{{ $t('inspector.layer') }}</span>
          <UiTabs
            :model-value="toolStore.selectedElement?.layerId || ''"
            :items="mapStore.project.layers.map(l => ({ id: l.id, label: l.name }))"
            size="xs"
            fill
            @update:model-value="(id) => handleSwitchLayer(String(id))"
          />
        </div>

        <!-- 4. In-Cell Z-Index -->
        <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-200 flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-slate-400" />
              {{ $t('inspector.inCellZIndex') }}
            </span>
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400">{{ $t('inspector.value') }}</span>
              <UiNumberInput
                :model-value="currentInspectedCellZ"
                variant="compact"
                size="xs"
                :min="0"
                :max="999"
                custom-class="w-16"
                @change="handleCurrentCellZChange"
              />
            </div>
          </div>

          <!-- Multi-cell Mini Matrix Grid if span > 1 -->
          <div v-if="(activeItem.spanX || 1) > 1 || (activeItem.spanY || 1) > 1" class="flex flex-col gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-slate-400 font-medium">{{ $t('inspector.perCellZIndex') }}</span>
              <UiButton 
                variant="ghost"
                size="xs"
                :title="$t('inspector.applyToAllDesc')"
                custom-class="text-brand-400! hover:text-brand-300! p-0!"
                @click="applyCurrentZToAllCells"
              >
                {{ $t('inspector.applyToAll') }}
              </UiButton>
            </div>

            <!-- Dynamic Grid Matrix -->
            <div 
              class="grid gap-1"
              :style="{
                gridTemplateColumns: `repeat(${activeItem.spanX || 1}, minmax(0, 1fr))`
              }"
            >
              <template v-for="r in (activeItem.spanY || 1)" :key="r">
                <template v-for="c in (activeItem.spanX || 1)" :key="c">
                  <div 
                    @click="activeCellInMatrix = { col: activeItem.x + c - 1, row: activeItem.y + r - 1 }"
                    :class="isSelectedMatrixCell(activeItem.x + c - 1, activeItem.y + r - 1) ? 'border-brand-500 bg-brand-950/50 ring-1 ring-brand-400' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'"
                    class="border rounded-lg p-1 flex flex-col items-center justify-center cursor-pointer transition-all"
                  >
                    <span class="text-[8px] font-mono text-slate-400">
                      ({{ activeItem.x + c - 1 }}, {{ activeItem.y + r - 1 }})
                    </span>
                    <div class="flex items-center gap-0.5 mt-0.5">
                      <UiIconButton 
                        size="xs"
                        variant="default"
                        custom-class="w-4! h-4! text-[9px]!"
                        @click.stop="adjustMatrixCellZ(activeItem.x + c - 1, activeItem.y + r - 1, -1)"
                      >
                        -
                      </UiIconButton>
                      <span class="font-mono text-[10px] font-bold text-brand-300 px-1">
                        {{ getMatrixCellZ(activeItem.x + c - 1, activeItem.y + r - 1) }}
                      </span>
                      <UiIconButton 
                        size="xs"
                        variant="default"
                        custom-class="w-4! h-4! text-[9px]!"
                        @click.stop="adjustMatrixCellZ(activeItem.x + c - 1, activeItem.y + r - 1, +1)"
                      >
                        +
                      </UiIconButton>
                    </div>
                  </div>
                </template>
              </template>
            </div>
          </div>

          <!-- Quick Z Actions for Current Cell -->
          <div class="grid grid-cols-4 gap-1.5 text-xs">
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowUpToLine"
              :title="$t('inspector.bringForwardDesc')"
              custom-class="flex-col! py-2! gap-0.5!"
              @click="handleBringForward"
            >
              <span class="text-[10px] font-semibold text-emerald-400">{{ $t('inspector.zStepUp') }}</span>
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowDownToLine"
              :title="$t('inspector.sendBackwardDesc')"
              custom-class="flex-col! py-2! gap-0.5!"
              @click="handleSendBackward"
            >
              <span class="text-[10px] font-semibold text-amber-400">{{ $t('inspector.zStepDown') }}</span>
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ChevronsUp"
              :title="$t('inspector.bringToTopDesc')"
              custom-class="flex-col! py-2! gap-0.5!"
              @click="handleBringToTop"
            >
              <span class="text-[10px] font-semibold text-brand-400">{{ $t('inspector.top') }}</span>
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ChevronsDown"
              :title="$t('inspector.sendToBottomDesc')"
              custom-class="flex-col! py-2! gap-0.5!"
              @click="handleSendToBottom"
            >
              <span class="text-[10px] font-semibold text-slate-400">{{ $t('inspector.bottom') }}</span>
            </UiButton>
          </div>
        </UiCard>

        <!-- 5. Anchor Base Height -->
        <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-slate-200 flex items-center gap-1.5">
              <Crosshair class="w-3.5 h-3.5 text-brand-400" />
              {{ $t('inspector.anchor') }}
            </span>
            <UiBadge variant="brand" size="xs">{{ Math.round(currentAnchorY * 100) }}%</UiBadge>
          </div>
          
          <UiTabs
            :model-value="Math.abs(currentAnchorY - 0.5) < 0.05 ? 0.5 : Math.abs(currentAnchorY - 0.88) < 0.05 ? 0.88 : Math.abs(currentAnchorY - 1.0) < 0.05 ? 1.0 : currentAnchorY"
            :items="[
              { id: 0.5, label: $t('inspector.tileAnchor') },
              { id: 0.88, label: $t('inspector.wallAnchor') },
              { id: 1.0, label: $t('inspector.baseAnchor') }
            ]"
            size="xs"
            fill
            @update:model-value="(val) => handleSetAnchor(currentAnchorX, Number(val))"
          />

          <UiSlider
            :model-value="currentAnchorY"
            :label="$t('inspector.fineY')"
            :min="0.2"
            :max="1.0"
            :step="0.02"
            :format-value="(val) => `${Math.round(val * 100)}%`"
            @update:model-value="(val) => handleSetAnchor(currentAnchorX, val)"
          />
        </UiCard>

        <!-- 6. Scaling -->
        <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2">
          <div class="flex justify-between items-center text-xs">
            <span class="font-semibold text-slate-300">{{ $t('inspector.scale') }}</span>
            <UiBadge variant="brand" size="xs">{{ Math.round((activeItem.scale || 1.0) * 100) }}%</UiBadge>
          </div>
          <div class="flex items-center gap-2">
            <UiSlider
              :model-value="activeItem.scale || 1.0"
              :min="0.2"
              :max="3.5"
              :step="0.05"
              custom-class="flex-1"
              :format-value="(val) => `${Math.round(val * 100)}%`"
              @update:model-value="handleScaleInput"
            />
            <UiButton 
              variant="secondary"
              size="xs"
              @click="handleScaleInput(1.0)"
            >
              1x
            </UiButton>
          </div>
        </UiCard>

        <!-- 7. Pixel Offset (Nudge) -->
        <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-1.5">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400 font-medium">{{ $t('inspector.pixelOffset') }}</span>
            <span class="font-mono text-slate-300 text-[11px]">
              X: {{ activeItem.offsetX || 0 }}px | Y: {{ activeItem.offsetY || 0 }}px
            </span>
          </div>

          <!-- Nudge 4-way arrow buttons -->
          <div class="flex items-center justify-center gap-1.5 py-1">
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowLeft"
              :title="$t('inspector.nudgeLeftDesc')"
              @click="nudge(-2, 0)"
            >
              2px
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowUp"
              :title="$t('inspector.nudgeUpDesc')"
              @click="nudge(0, -2)"
            >
              2px
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowDown"
              :title="$t('inspector.nudgeDownDesc')"
              @click="nudge(0, 2)"
            >
              2px
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowRight"
              :title="$t('inspector.nudgeRightDesc')"
              @click="nudge(2, 0)"
            >
              2px
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :title="$t('inspector.resetOffsetDesc')"
              @click="resetOffset"
            >
              0
            </UiButton>
          </div>
        </UiCard>

        <!-- 10. Move & Delete Action Buttons -->
        <div class="flex items-center gap-2 pt-2 border-t border-slate-800">
          <UiButton 
            :variant="toolStore.isMovingElement ? 'primary' : 'secondary'"
            size="md"
            :leading-icon="Move"
            block
            :custom-class="toolStore.isMovingElement ? 'animate-pulse' : ''"
            @click="handleMoveMode"
          >
            {{ toolStore.isMovingElement ? $t('inspector.moveTarget') : $t('inspector.move') }}
          </UiButton>

          <UiButton 
            variant="danger"
            size="md"
            block
            :leading-icon="Trash2"
            @click="handleDelete"
          >
            {{ $t('inspector.delete') }}
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Footer Help -->
    <div class="p-2.5 border-t border-slate-800 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
      <span v-html="$t('inspector.deselectHint')"></span>
      <span v-html="$t('inspector.deleteHint')"></span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Sliders, X, Layers, ArrowUpToLine, ArrowDownToLine, 
  ChevronsUp, ChevronsDown, Move, Trash2, Crosshair, Lightbulb,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown
} from 'lucide-vue-next'
import { 
  UiButton, 
  UiIconButton, 
  UiCard, 
  UiBadge,
  UiTabs,
  UiNumberInput,
  UiSlider
} from './ui'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useI18nStore } from '../stores/i18nStore'
import { TileItem } from '../types/map'
import { cellKey } from '../utils/isometric'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const i18nStore = useI18nStore()

const activeCellInMatrix = ref<{ col: number; row: number } | null>(null)

const coveringElements = computed(() => {
  if (!toolStore.selectedElement) return []
  return mapStore.getElementsAtOrCoveringCell(
    toolStore.selectedElement.col, 
    toolStore.selectedElement.row, 
    toolStore.selectedElement.layerId
  )
})

const activeItem = computed<TileItem | null>(() => {
  if (!toolStore.selectedElement) return null
  const entry = coveringElements.value.find(e => e.item.id === toolStore.selectedElement?.itemId)
  return entry ? entry.item : (coveringElements.value[0]?.item || null)
})

function getAsset(assetId: string) {
  if (!assetId) return null
  const cleanId = assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
  return assetStore.assets.find(a => {
    if (a.id === assetId) return true
    const aClean = a.id.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
    return aClean === cleanId || (a.fileRelativePath && a.fileRelativePath.toLowerCase().includes(cleanId))
  }) || null
}

const currentAsset = computed(() => {
  if (!activeItem.value) return null
  return getAsset(activeItem.value.assetId)
})

const currentLayerName = computed(() => {
  const layer = mapStore.project.layers.find(l => l.id === toolStore.selectedElement?.layerId)
  return layer ? layer.name : 'Layer'
})

const inspectedCell = computed(() => {
  if (activeCellInMatrix.value) return activeCellInMatrix.value
  if (toolStore.selectedElement) return { col: toolStore.selectedElement.col, row: toolStore.selectedElement.row }
  return { col: 0, row: 0 }
})

const currentInspectedCellZ = computed(() => {
  if (!activeItem.value) return 0
  const key = cellKey(inspectedCell.value.col, inspectedCell.value.row)
  return activeItem.value.cellZIndex?.[key] ?? activeItem.value.zIndex ?? 0
})

const currentAnchorX = computed(() => {
  if (!activeItem.value) return 0.5
  return activeItem.value.anchorX !== undefined ? activeItem.value.anchorX : (currentAsset.value?.anchorX ?? 0.5)
})

const currentAnchorY = computed(() => {
  if (!activeItem.value) return 0.5
  return activeItem.value.anchorY !== undefined ? activeItem.value.anchorY : (currentAsset.value?.anchorY ?? 0.5)
})

const depthOffsetStatusText = computed(() => {
  if (!activeItem.value) return '0'
  const off = activeItem.value.depthOffset || 0
  if (off === 0) return i18nStore.t('inspector.depthStatusDefault')
  if (off > 0) return i18nStore.t('inspector.depthStatusAbove', { val: off })
  return i18nStore.t('inspector.depthStatusBehind', { val: off })
})

function selectElementEntry(entry: { item: TileItem; originCol: number; originRow: number }) {
  if (toolStore.selectedElement) {
    toolStore.selectedElement.itemId = entry.item.id
    toolStore.selectedElement.col = entry.originCol
    toolStore.selectedElement.row = entry.originRow
    activeCellInMatrix.value = null
  }
}

// Relative Depth Shift (+1: on top of bottom cell, -1: behind top cell)
function shiftDepth(delta: number) {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.shiftItemDepthOffset(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    delta,
    toolStore.selectedElement.layerId
  )
}

function resetDepth() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.setItemDepthOffset(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    0,
    toolStore.selectedElement.layerId
  )
}

function handleSwitchLayer(targetLayerId: string) {
  if (!activeItem.value || !toolStore.selectedElement) return
  if (toolStore.selectedElement.layerId === targetLayerId) return

  mapStore.moveItemToLayer(
    activeItem.value.id,
    toolStore.selectedElement.layerId,
    targetLayerId,
    activeItem.value.x,
    activeItem.value.y
  )
  toolStore.selectedElement.layerId = targetLayerId
}

function handleSetAnchor(anchorX: number, anchorY: number) {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.updateItemAnchor(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    anchorX,
    anchorY,
    toolStore.selectedElement.layerId
  )
}

function isSelectedMatrixCell(col: number, row: number): boolean {
  return inspectedCell.value.col === col && inspectedCell.value.row === row
}

function getMatrixCellZ(col: number, row: number): number {
  if (!activeItem.value) return 0
  const key = cellKey(col, row)
  return activeItem.value.cellZIndex?.[key] ?? activeItem.value.zIndex ?? 0
}

function adjustMatrixCellZ(col: number, row: number, delta: number) {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.adjustCellZIndex(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    col,
    row,
    delta,
    toolStore.selectedElement.layerId
  )
}

function handleCurrentCellZChange(val: number) {
  if (!activeItem.value || !toolStore.selectedElement || isNaN(val)) return
  mapStore.setCellSpecificZIndex(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    inspectedCell.value.col,
    inspectedCell.value.row,
    val,
    toolStore.selectedElement.layerId
  )
}

function applyCurrentZToAllCells() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.setAllCellsZIndex(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    currentInspectedCellZ.value,
    toolStore.selectedElement.layerId
  )
}

function handleBringForward() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.adjustCellZIndex(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    inspectedCell.value.col,
    inspectedCell.value.row,
    +1,
    toolStore.selectedElement.layerId
  )
}

function handleSendBackward() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.adjustCellZIndex(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    inspectedCell.value.col,
    inspectedCell.value.row,
    -1,
    toolStore.selectedElement.layerId
  )
}

function handleBringToTop() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.bringItemToTop(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    toolStore.selectedElement.layerId
  )
}

function handleSendToBottom() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.sendItemToBottom(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    toolStore.selectedElement.layerId
  )
}

function handleScaleInput(scale: number) {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.updateItemScale(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    scale,
    toolStore.selectedElement.layerId
  )
}

function adjustScale(delta: number) {
  if (!activeItem.value) return
  const current = activeItem.value.scale || 1.0
  handleScaleInput(current + delta)
}

function nudge(dx: number, dy: number) {
  if (!activeItem.value || !toolStore.selectedElement) return
  const currentX = activeItem.value.offsetX || 0
  const currentY = activeItem.value.offsetY || 0
  mapStore.updateTileOffset(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    currentX + dx,
    currentY + dy,
    toolStore.selectedElement.layerId
  )
}

function resetOffset() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.updateTileOffset(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    0,
    0,
    toolStore.selectedElement.layerId
  )
}

function handleMoveMode() {
  toolStore.isMovingElement = !toolStore.isMovingElement
}

function handleDelete() {
  if (!activeItem.value || !toolStore.selectedElement) return
  const originX = activeItem.value.x
  const originY = activeItem.value.y
  const itemId = activeItem.value.id
  const layerId = toolStore.selectedElement.layerId

  mapStore.removeTileItem(originX, originY, itemId, layerId)

  const remaining = mapStore.getElementsAtOrCoveringCell(toolStore.selectedElement.col, toolStore.selectedElement.row, layerId)
  if (remaining.length > 0) {
    toolStore.selectedElement.itemId = remaining[0].item.id
  } else {
    toolStore.setSelectedElement(null)
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.25);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(56, 189, 248, 0.45);
}
</style>
