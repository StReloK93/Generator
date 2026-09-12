<template>
  <aside 
    v-if="toolStore.selectedElement || toolStore.selectedElements.length > 0"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="glass-panel border-l border-slate-800/90 flex flex-col z-30 transition-all duration-200 select-none w-92 h-full overflow-hidden shadow-2xl absolute right-0 top-0 bg-dark-900/95 backdrop-blur-xl"
  >
    <!-- ========================================================================= -->
    <!-- 1. MULTI-ELEMENT BATCH INSPECTOR MODE                                     -->
    <!-- ========================================================================= -->
    <!-- ========================================================================= -->
    <!-- 1. MULTI-ELEMENT BATCH INSPECTOR MODE                                     -->
    <!-- ========================================================================= -->
    <template v-if="isMultiSelectMode">
      <!-- Multi-Select Header -->
      <div class="p-3.5 border-b border-purple-900/50 flex items-center justify-between bg-linear-to-r from-purple-950/50 to-slate-900/80">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-sm shrink-0">
            <Layers class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-xs font-bold uppercase tracking-wider text-purple-200">
              {{ $t('inspector.multiSelectTitle') }}
            </h2>
            <div class="flex items-center gap-1.5 mt-0.5">
              <UiBadge variant="purple" size="xs">
                {{ $t('inspector.multiSelectedCount', { count: selectedElementsCount }) }}
              </UiBadge>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <UiButton 
            variant="ghost" 
            size="xs" 
            custom-class="text-[10px]! px-2! py-1! text-purple-300 hover:text-white"
            @click="toolStore.clearSelection()"
          >
            {{ $t('inspector.deselectAll') }}
          </UiButton>
          <UiIconButton
            :icon="X"
            size="sm"
            variant="ghost"
            :title="$t('common.close')"
            @click="toolStore.clearSelection()"
          />
        </div>
      </div>

      <!-- Scrollable Multi-Select Content -->
      <div class="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 custom-scrollbar pb-10">

        <!-- 1. BATCH LAYER SWITCHER -->
        <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2">
          <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-brand-400" />
            {{ $t('inspector.batchMoveToLayer') }}
          </span>
          <UiTabs
            :model-value="commonLayerId"
            :items="mapStore.project.layers.map(l => ({ id: l.id, label: l.name }))"
            size="xs"
            fill
            @update:model-value="(id) => handleBatchSwitchLayer(String(id))"
          />
        </UiCard>

        <!-- 2. BATCH ANCHOR ADJUSTMENT -->
        <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2.5">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-slate-200 flex items-center gap-1.5">
              <Crosshair class="w-3.5 h-3.5 text-brand-400" />
              {{ $t('inspector.batchAnchorSet') }}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-1.5">
            <UiButton 
              variant="secondary" 
              size="xs" 
              custom-class="text-[10px]! py-1.5!"
              @click="handleBatchSetAnchor(0.5, 0.5)"
            >
              {{ $t('inspector.tileAnchor') }}
            </UiButton>
            <UiButton 
              variant="secondary" 
              size="xs" 
              custom-class="text-[10px]! py-1.5!"
              @click="handleBatchSetAnchor(0.5, 0.88)"
            >
              {{ $t('inspector.wallAnchor') }}
            </UiButton>
            <UiButton 
              variant="secondary" 
              size="xs" 
              custom-class="text-[10px]! py-1.5!"
              @click="handleBatchSetAnchor(0.5, 1.0)"
            >
              {{ $t('inspector.baseAnchor') }}
            </UiButton>
          </div>

          <UiSlider
            :model-value="batchAnchorY"
            :label="$t('inspector.fineY')"
            :min="0.2"
            :max="1.0"
            :step="0.02"
            :format-value="(val) => `${Math.round(val * 100)}%`"
            @update:model-value="(val) => handleBatchSetAnchor(0.5, val)"
          />

          <!-- Option to also update library asset default -->
          <label class="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-800/80 text-[11px] text-slate-300">
            <input 
              type="checkbox" 
              v-model="alsoUpdateAssetDefaultAnchor" 
              class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-500/40" 
            />
            <span>{{ $t('inspector.updateAssetDefaultAnchor') }}</span>
          </label>
        </UiCard>

        <!-- 3. BATCH RELATIVE DEPTH SHIFT -->
        <UiCard variant="brand" padding="sm" custom-class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-brand-300 flex items-center gap-1.5">
              <Layers class="w-4 h-4 text-brand-400" />
              {{ $t('inspector.batchDepth') }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-0.5">
            <UiButton 
              variant="primary"
              size="sm"
              :leading-icon="ArrowDownToLine"
              @click="handleBatchShiftDepth(+1)"
            >
              {{ $t('inspector.aboveFront') }}
            </UiButton>

            <UiButton 
              variant="secondary"
              size="sm"
              :leading-icon="ArrowUpToLine"
              @click="handleBatchShiftDepth(-1)"
            >
              {{ $t('inspector.behindBack') }}
            </UiButton>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1 border-t border-brand-500/20 text-xs">
            <span class="text-[11px] text-slate-400">{{ $t('inspector.reset') }}</span>
            <UiButton 
              variant="ghost"
              size="xs"
              @click="handleBatchResetDepth"
            >
              {{ $t('inspector.reset') }} (0)
            </UiButton>
          </div>
        </UiCard>

        <!-- 4. BATCH SCALE & Z-INDEX COMBINED -->
        <div class="grid grid-cols-1 gap-2.5">
          <!-- Scale Card -->
          <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2">
            <span class="text-xs font-semibold text-slate-300">{{ $t('inspector.batchScale') }}</span>
            <div class="grid grid-cols-4 gap-1">
              <UiButton 
                variant="secondary" 
                size="xs" 
                @click="handleBatchAdjustScale(-0.1)"
              >
                -0.1x
              </UiButton>
              <UiButton 
                variant="secondary" 
                size="xs" 
                @click="handleBatchAdjustScale(+0.1)"
              >
                +0.1x
              </UiButton>
              <UiButton 
                variant="secondary" 
                size="xs" 
                @click="handleBatchScaleInput(1.0)"
              >
                1.0x
              </UiButton>
              <UiButton 
                variant="secondary" 
                size="xs" 
                @click="handleBatchScaleInput(1.5)"
              >
                1.5x
              </UiButton>
            </div>
          </UiCard>

          <!-- In-Cell Z-Index Card -->
          <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-slate-400" />
              {{ $t('inspector.batchZIndex') }}
            </span>
            <div class="grid grid-cols-2 gap-1.5 text-xs">
              <UiButton 
                variant="secondary"
                size="xs"
                :leading-icon="ArrowUpToLine"
                @click="handleBatchAdjustZIndex(+1)"
              >
                {{ $t('inspector.zStepUp') }}
              </UiButton>
              <UiButton 
                variant="secondary"
                size="xs"
                :leading-icon="ArrowDownToLine"
                @click="handleBatchAdjustZIndex(-1)"
              >
                {{ $t('inspector.zStepDown') }}
              </UiButton>
            </div>
          </UiCard>
        </div>

        <!-- 5. BATCH PIXEL OFFSET (NUDGE) -->
        <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-slate-300">{{ $t('inspector.batchOffset') }}</span>
          
          <div class="grid grid-cols-5 gap-1">
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowLeft"
              @click="handleBatchNudge(-2, 0)"
            >
              2px
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowUp"
              @click="handleBatchNudge(0, -2)"
            >
              2px
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowDown"
              @click="handleBatchNudge(0, 2)"
            >
              2px
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="ArrowRight"
              @click="handleBatchNudge(2, 0)"
            >
              2px
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              @click="handleBatchResetOffset"
            >
              0
            </UiButton>
          </div>
        </UiCard>

        <!-- 6. BATCH TRANSFORMS (Flip & Rotate) -->
        <div class="grid grid-cols-2 gap-2">
          <UiButton 
            variant="secondary"
            size="sm"
            :leading-icon="FlipHorizontal"
            @click="handleBatchFlipX"
          >
            {{ $t('inspector.flipHorizontal') }}
          </UiButton>
          <UiButton 
            variant="secondary"
            size="sm"
            :leading-icon="RotateCw"
            @click="handleBatchRotate"
          >
            {{ $t('inspector.rotate90') }}
          </UiButton>
        </div>

        <!-- 7. BATCH DELETE -->
        <div class="pt-2 border-t border-slate-800">
          <UiButton 
            variant="danger"
            size="md"
            block
            :leading-icon="Trash2"
            @click="handleBatchDelete"
          >
            {{ $t('inspector.batchDelete', { count: selectedElementsCount }) }}
          </UiButton>
        </div>
      </div>
    </template>


    <!-- ========================================================================= -->
    <!-- 2. SINGLE ELEMENT INSPECTOR MODE                                          -->
    <!-- ========================================================================= -->
    <template v-else-if="toolStore.selectedElement">
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
                <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between gap-1 mt-0.5">
                  <span class="text-slate-400 font-medium truncate max-w-28">{{ entry.layerName }}</span>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span>{{ $t('inspector.cellsCount', { x: entry.item.spanX || 1, y: entry.item.spanY || 1 }) }}</span>
                    <span v-if="entry.item.depthOffset" class="text-amber-400 text-[9px] font-bold">
                      ({{ $t('inspector.depthTag', { val: `${entry.item.depthOffset > 0 ? '+' : ''}${entry.item.depthOffset}` }) }})
                    </span>
                  </div>
                </div>
              </div>
            </UiCard>
          </div>
        </div>

        <!-- Active Element Full Inspector -->
        <div v-if="activeItem" class="flex flex-col gap-3 border-t border-slate-800/80 pt-3">

          <!-- Quick Identical Assets Multi-Select Card -->
          <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2 bg-slate-950/70 border-brand-500/30">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-200 flex items-center gap-1.5">
                <CopyCheck class="w-3.5 h-3.5 text-brand-400" />
                <span class="truncate max-w-44">{{ currentAsset?.name || $t('common.element') }}</span>
              </span>
              <UiBadge variant="brand" size="xs">
                {{ identicalMapCount }} {{ $t('common.pts') }}
              </UiBadge>
            </div>

            <div class="grid grid-cols-2 gap-1.5">
              <UiButton
                variant="secondary"
                size="xs"
                :leading-icon="Layers"
                custom-class="text-[10px]! py-1.5!"
                :title="$t('inspector.selectAllOnMap', { count: identicalMapCount })"
                @click="handleSelectAllIdenticalOnMap"
              >
                {{ $t('inspector.selectAllOnMap', { count: identicalMapCount }) }}
              </UiButton>

              <UiButton
                variant="secondary"
                size="xs"
                :leading-icon="CheckSquare"
                custom-class="text-[10px]! py-1.5!"
                :title="$t('inspector.selectAllOnLayer', { count: identicalLayerCount })"
                @click="handleSelectAllIdenticalOnLayer"
              >
                {{ $t('inspector.selectAllOnLayer', { count: identicalLayerCount }) }}
              </UiButton>
            </div>
          </UiCard>

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
              <div class="flex items-center gap-1">
                <UiIconButton 
                  size="xs"
                  variant="default"
                  custom-class="w-5! h-5!"
                  @click="adjustScale(-0.1)"
                >
                  -
                </UiIconButton>
                <span class="font-mono text-xs font-bold text-slate-200 w-10 text-center">
                  {{ (activeItem.scale || 1.0).toFixed(1) }}x
                </span>
                <UiIconButton 
                  size="xs"
                  variant="default"
                  custom-class="w-5! h-5!"
                  @click="adjustScale(+0.1)"
                >
                  +
                </UiIconButton>
              </div>
            </div>
            <UiSlider
              :model-value="activeItem.scale || 1.0"
              :min="0.2"
              :max="3.0"
              :step="0.05"
              :format-value="(val) => `${val.toFixed(2)}x`"
              @update:model-value="handleScaleInput"
            />
          </UiCard>

          <!-- 7. Fine Pixel Offset (Nudge) -->
          <UiCard variant="default" padding="sm" custom-class="flex flex-col gap-2">
            <div class="flex justify-between items-center text-xs">
              <span class="text-xs font-semibold text-slate-300">{{ $t('inspector.finePixelOffset') }}</span>
              <span class="text-[10px] font-mono text-slate-400">
                X: {{ activeItem.offsetX || 0 }}px, Y: {{ activeItem.offsetY || 0 }}px
              </span>
            </div>
            
            <div class="grid grid-cols-5 gap-1">
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

          <!-- 8. Move & Delete Action Buttons -->
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
    </template>

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
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, CopyCheck, CheckSquare,
  FlipHorizontal, RotateCw
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
import { TileItem, SelectedElementRef } from '../types/map'
import { cellKey } from '../utils/isometric'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const i18nStore = useI18nStore()

const activeCellInMatrix = ref<{ col: number; row: number } | null>(null)
const batchAnchorY = ref<number>(0.5)
const alsoUpdateAssetDefaultAnchor = ref<boolean>(false)

// Multi-select computed
const isMultiSelectMode = computed(() => toolStore.selectedElements.length > 1)
const selectedElementsCount = computed(() => toolStore.selectedElements.length)

const commonLayerId = computed(() => {
  if (toolStore.selectedElements.length === 0) return mapStore.activeLayerId || ''
  const first = toolStore.selectedElements[0].layerId
  const allSame = toolStore.selectedElements.every(e => e.layerId === first)
  return allSame ? first : ''
})

const coveringElements = computed(() => {
  if (!toolStore.selectedElement) return []
  return mapStore.getAllElementsAtOrCoveringCell(
    toolStore.selectedElement.col, 
    toolStore.selectedElement.row
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

const identicalMapCount = computed(() => {
  if (!activeItem.value) return 0
  return mapStore.getAllItemsByAssetId(activeItem.value.assetId).length
})

const identicalLayerCount = computed(() => {
  if (!activeItem.value || !toolStore.selectedElement) return 0
  return mapStore.getAllItemsByAssetId(activeItem.value.assetId, toolStore.selectedElement.layerId).length
})

function handleSelectAllIdenticalOnMap() {
  if (!activeItem.value) return
  const allInstances = mapStore.getAllItemsByAssetId(activeItem.value.assetId)
  if (allInstances.length > 0) {
    toolStore.setSelectedElements(allInstances.map(e => ({
      col: e.col,
      row: e.row,
      layerId: e.layerId,
      itemId: e.item.id
    })))
  }
}

function handleSelectAllIdenticalOnLayer() {
  if (!activeItem.value || !toolStore.selectedElement) return
  const layerInstances = mapStore.getAllItemsByAssetId(activeItem.value.assetId, toolStore.selectedElement.layerId)
  if (layerInstances.length > 0) {
    toolStore.setSelectedElements(layerInstances.map(e => ({
      col: e.col,
      row: e.row,
      layerId: e.layerId,
      itemId: e.item.id
    })))
  }
}

// --- Batch Multi-Select Actions ---

function handleBatchSwitchLayer(targetLayerId: string) {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchMoveItemsToLayer(toolStore.selectedElements, targetLayerId)
}

function handleBatchSetAnchor(anchorX: number, anchorY: number) {
  if (toolStore.selectedElements.length === 0) return
  batchAnchorY.value = anchorY
  mapStore.batchUpdateItemsAnchor(toolStore.selectedElements, anchorX, anchorY)

  if (alsoUpdateAssetDefaultAnchor.value) {
    const assetIds = new Set<string>()
    for (const sel of toolStore.selectedElements) {
      const items = mapStore.getCellItems(sel.col, sel.row, sel.layerId)
      const found = items.find(i => i.id === sel.itemId)
      if (found?.assetId) {
        assetIds.add(found.assetId)
      }
    }
    for (const aId of assetIds) {
      assetStore.updateAssetAnchor(aId, anchorX, anchorY)
    }
  }
}

function handleBatchShiftDepth(delta: number) {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchShiftItemsDepthOffset(toolStore.selectedElements, delta)
}

function handleBatchResetDepth() {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchSetItemsDepthOffset(toolStore.selectedElements, 0)
}

function handleBatchScaleInput(scale: number) {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchUpdateItemsScale(toolStore.selectedElements, scale)
}

function handleBatchAdjustScale(delta: number) {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchAdjustItemsScale(toolStore.selectedElements, delta)
}

function handleBatchAdjustZIndex(delta: number) {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchAdjustItemsZIndex(toolStore.selectedElements, delta)
}

function handleBatchNudge(dx: number, dy: number) {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchNudgeItemsOffset(toolStore.selectedElements, dx, dy)
}

function handleBatchResetOffset() {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchResetItemsOffset(toolStore.selectedElements)
}

function handleBatchFlipX() {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchFlipItemsX(toolStore.selectedElements)
}

function handleBatchRotate() {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchRotateItems(toolStore.selectedElements, 90)
}

function handleBatchDelete() {
  if (toolStore.selectedElements.length === 0) return
  mapStore.batchRemoveTileItems(toolStore.selectedElements)
  toolStore.clearSelection()
}

// --- Single Element Actions ---

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

function selectElementEntry(entry: { item: TileItem; originCol: number; originRow: number; layerId?: string }) {
  if (toolStore.selectedElement) {
    toolStore.selectedElement.itemId = entry.item.id
    if (entry.layerId) {
      toolStore.selectedElement.layerId = entry.layerId
      mapStore.activeLayerId = entry.layerId
    }
    activeCellInMatrix.value = null
  }
}

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

  const remaining = mapStore.getAllElementsAtOrCoveringCell(toolStore.selectedElement.col, toolStore.selectedElement.row)
  if (remaining.length > 0) {
    toolStore.selectedElement.itemId = remaining[0].item.id
    toolStore.selectedElement.layerId = remaining[0].layerId
    mapStore.activeLayerId = remaining[0].layerId
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
  background: rgba(168, 85, 247, 0.35);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.65);
}
</style>
