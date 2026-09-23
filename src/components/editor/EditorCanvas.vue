<template>
  <div ref="viewportContainerRef"
    class="relative flex-1 h-full w-full bg-dark-950 overflow-hidden cursor-crosshair select-none canvas-touch-container"
    :class="{
      'cursor-grab!': toolStore.activeTool === 'pan' && !camera.isPanning.value,
      'cursor-grabbing!': camera.isPanning.value,
      'cursor-cell!': toolStore.activeTool === 'picker',
      'cursor-crosshair!': routeStore.isDrawingRoute || routeStore.isSettingRouteStart || routeStore.isSettingPlayerStartPoint,
      'cursor-pointer!': (!assetStore.selectedAssetId || toolStore.activeTool === 'select') && !routeStore.isDrawingRoute && !routeStore.isSettingRouteStart && !routeStore.isSettingPlayerStartPoint,
      'cursor-move!': toolStore.isMovingElement,
      'cursor-not-allowed!': mapStore.activeLayer?.locked
    }" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave" @touchstart="handleTouchStart" @touchmove="handleTouchMove"
    @touchend="handleTouchEnd" @touchcancel="handleTouchCancel" @wheel.prevent="handleWheel"
    @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleCanvasDrop"
    @contextmenu.prevent="handleContextMenu">
    <!-- Element Inspector (When an element is selected in Select mode) -->
    <ElementInspector />

    <!-- Placement Conflict Decision Modal -->
    <PlacementPromptModal />

    <!-- Multi-Asset Random Scatter Modal -->
    <MultiAssetScatterModal />

    <!-- Floating Vertical Tools Toolbar Palette (Left Side of Map) -->
    <div 
      class="absolute left-3 top-3 z-20 flex flex-col gap-1 p-1 bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl select-none pointer-events-auto"
      @mousedown.stop
      @touchstart.stop
      @wheel.stop
    >
      <!-- Draw / Select (S) -->
      <UiIconButton
        variant="tool"
        size="sm"
        :icon="Pointer"
        :active="['brush', 'select', 'line', 'box-fill', 'rect'].includes(toolStore.activeTool)"
        :title="`${$t('editor.drawSelect')} (S)`"
        @click="toolStore.setTool('brush')"
      />
      <!-- Delete / Eraser (R) -->
      <UiIconButton
        variant="tool"
        size="sm"
        :icon="Eraser"
        :active="toolStore.activeTool === 'eraser'"
        :title="`${$t('shortcuts.eraser')} (R)`"
        @click="toolStore.setTool('eraser')"
      />
      <!-- Bucket Fill (F) -->
      <UiIconButton
        variant="tool"
        size="sm"
        :icon="PaintBucket"
        :active="toolStore.activeTool === 'bucket'"
        :title="`${$t('shortcuts.bucketFill')} (F)`"
        @click="toolStore.setTool('bucket')"
      />
      <!-- Eyedropper (G) -->
      <UiIconButton
        variant="tool"
        size="sm"
        :icon="Pipette"
        :active="toolStore.activeTool === 'picker'"
        :title="`${$t('shortcuts.eyedropper')} (G)`"
        @click="toolStore.setTool('picker')"
      />
      <!-- Buildable Zones (Z) -->
      <UiIconButton
        variant="tool"
        size="sm"
        :icon="Castle"
        :active="toolStore.activeTool === 'buildable'"
        :title="`${$t('editor.buildableZones')} (Z)`"
        @click="toolStore.setTool(toolStore.activeTool === 'buildable' ? (toolStore.lastDrawingTool === 'buildable' ? 'brush' : toolStore.lastDrawingTool) : 'buildable')"
      />

      <!-- Water Tool (No hotkey) -->
      <UiIconButton
        variant="tool"
        size="sm"
        :icon="Waves"
        :active="toolStore.activeTool === 'water'"
        :title="$t('editor.waterTool')"
        @click="toolStore.setTool(toolStore.activeTool === 'water' ? (toolStore.lastDrawingTool === 'water' ? 'brush' : toolStore.lastDrawingTool) : 'water')"
      />

      <!-- Scatter / Random Multi-Asset Tool -->
      <UiIconButton
        variant="tool"
        size="sm"
        :icon="Dices"
        :active="toolStore.activeTool === 'scatter'"
        :title="$t('editor.scatterTool')"
        @click="handleToggleScatterTool"
      />

    </div>

    <!-- Floating HUD when Setting Route Start Point -->
    <div v-if="routeStore.isSettingRouteStart"
      class="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel px-4 py-2.5 rounded-2xl border border-amber-500/60 shadow-2xl flex items-center gap-3 text-xs bg-slate-900/95 text-amber-200 animate-in fade-in slide-in-from-top-2">
      <MapPin class="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
      <span class="flex items-center gap-1.5">
        <component :is="routeStore.routeStartPlacementMode === 'add' ? Plus : MapPin" class="w-3.5 h-3.5 text-amber-400" />
        <strong>{{ routeStore.routeStartPlacementMode === 'add' ? $t('editor.newSpawnPoint') : $t('editor.relocateSpawnPoint') }}:</strong>
        {{ $t('editor.clickAnyCell') }}
      </span>
      <UiButton
        variant="secondary"
        size="xs"
        :title="`${$t('common.cancel')} (Esc)`"
        @click="routeStore.isSettingRouteStart = false"
      >
        {{ $t('common.cancel') }}
      </UiButton>
    </div>

    <!-- Floating HUD when Setting Player Start / Base Point -->
    <div v-if="routeStore.isSettingPlayerStartPoint"
      class="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel px-4 py-2.5 rounded-2xl border border-sky-500/60 shadow-2xl flex items-center gap-3 text-xs bg-slate-900/95 text-sky-200 animate-in fade-in slide-in-from-top-2">
      <Castle class="w-4 h-4 text-sky-400 animate-bounce shrink-0" />
      <span class="flex items-center gap-1.5">
        <Crosshair class="w-3.5 h-3.5 text-sky-400" />
        <strong>{{ $t('editor.playerStartPoint') || 'O\'yinchi start nuqtasi' }} (P{{ (routeStore.selectedRouteIndex ?? 0) + 1 }}):</strong>
        {{ $t('editor.clickCellToSetPlayerStart') || 'Xaritadagi istalgan katakni bosib bino qurish bazasini belgilang' }}
      </span>
      <UiButton
        variant="secondary"
        size="xs"
        :title="`${$t('common.cancel')} (Esc)`"
        @click="routeStore.isSettingPlayerStartPoint = false"
      >
        {{ $t('common.cancel') }}
      </UiButton>
    </div>

    <!-- Minimalist Top Bar when in Buildable Zones Mode -->
    <div 
      v-if="toolStore.activeTool === 'buildable'"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-30 backdrop-blur-md bg-slate-950/80 border border-emerald-500/30 px-2 sm:px-3 py-1 rounded-full shadow-2xl flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-emerald-200 animate-in fade-in slide-in-from-top-2 select-none"
    >
      <div class="flex items-center gap-1.5 pl-1 pr-0.5">
        <Castle class="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
        <span class="font-semibold text-slate-200 hidden md:inline">{{ $t('editor.buildableZones') }}</span>
        <span class="font-mono text-[11px] text-emerald-300 font-bold px-1.5 py-0.2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          {{ mapStore.project.buildMode === 'all' || !mapStore.project.buildableCells?.length ? ($t('common.all') || 'All') : mapStore.project.buildableCells.length }}
        </span>
      </div>

      <div class="h-3.5 w-px bg-slate-800"></div>

      <!-- Sub-tool Selector: Point (Q) / Line (W) / Box (E) -->
      <UiTabs
        v-model="buildableSubTool"
        variant="segmented"
        size="xs"
        :items="[
          { id: 'brush', label: 'Point' },
          { id: 'line', label: 'Line' },
          { id: 'box', label: 'Box' },
        ]"
      />

      <!-- Action: Allow (+) vs Block (-) -->
      <UiTabs
        v-model="buildableAction"
        :variant="buildableAction === 'allow' ? 'emerald' : 'segmented'"
        size="xs"
        :items="[
          { id: 'allow', label: '+' },
          { id: 'block', label: '-' },
        ]"
      />

      <div class="h-3.5 w-px bg-slate-800"></div>

      <div class="flex items-center gap-1">
        <UiButton
          variant="ghost"
          size="xs"
          custom-class="text-slate-300 hover:text-white"
          :title="$t('common.all')"
          @click="mapStore.setAllCellsBuildable(true)"
        >
          {{ $t('common.all') || 'All' }}
        </UiButton>
        <UiButton
          variant="ghost"
          size="xs"
          custom-class="text-rose-400 hover:text-rose-300"
          :title="$t('common.clear')"
          @click="mapStore.setAllCellsBuildable(false)"
        >
          {{ $t('common.clear') || 'Clear' }}
        </UiButton>
        <UiButton
          variant="secondary"
          size="xs"
          :title="`${$t('common.cancel')} (Esc)`"
          @click="cancelBuildable"
        >
          {{ $t('common.cancel') || 'Cancel' }}
        </UiButton>
        <UiButton
          variant="game-green"
          size="xs"
          :title="`${$t('common.done')}`"
          @click="finishBuildable"
        >
          {{ $t('common.done') || 'Done' }}
        </UiButton>
      </div>
    </div>

    <!-- Minimalist Top Bar when in Water Mode -->
    <div 
      v-if="toolStore.activeTool === 'water'"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-30 backdrop-blur-md bg-slate-950/80 border border-sky-500/30 px-2 sm:px-3 py-1 rounded-full shadow-2xl flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-sky-200 animate-in fade-in slide-in-from-top-2 select-none"
    >
      <div class="flex items-center gap-1.5 pl-1 pr-0.5">
        <Waves class="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
        <span class="font-semibold text-slate-200 hidden md:inline">{{ $t('editor.waterLayer') || 'Suv' }}</span>
        <span class="font-mono text-[11px] text-sky-300 font-bold px-1.5 py-0.2 bg-sky-500/10 rounded-full border border-sky-500/20">
          {{ mapStore.project.waterCells?.length || 0 }}
        </span>
      </div>

      <div class="h-3.5 w-px bg-slate-800"></div>

      <!-- Sub-tool Selector: Point (Q) / Line (W) / Box (E) -->
      <UiTabs
        v-model="waterSubTool"
        variant="segmented"
        size="xs"
        :items="[
          { id: 'brush', label: 'Point' },
          { id: 'line', label: 'Line' },
          { id: 'box', label: 'Box' },
        ]"
      />

      <!-- Action: Water (+) vs Dry (-) -->
      <UiTabs
        v-model="waterAction"
        :variant="waterAction === 'water' ? 'emerald' : 'segmented'"
        size="xs"
        :items="[
          { id: 'water', label: '+' },
          { id: 'dry', label: '-' },
        ]"
      />

      <div class="h-3.5 w-px bg-slate-800"></div>

      <div class="flex items-center gap-1">
        <UiButton
          variant="ghost"
          size="xs"
          custom-class="text-slate-300 hover:text-white"
          :title="$t('common.all')"
          @click="mapStore.fillAllWaterCells(); engine.syncWater(mapStore.project, true)"
        >
          {{ $t('common.all') || 'All' }}
        </UiButton>
        <UiButton
          variant="ghost"
          size="xs"
          custom-class="text-rose-400 hover:text-rose-300"
          :title="$t('common.clear')"
          @click="mapStore.clearAllWaterCells(); engine.syncWater(mapStore.project, true)"
        >
          {{ $t('common.clear') || 'Clear' }}
        </UiButton>
        <UiButton
          variant="secondary"
          size="xs"
          :title="`${$t('common.cancel')} (Esc)`"
          @click="cancelWater"
        >
          {{ $t('common.cancel') || 'Cancel' }}
        </UiButton>
        <UiButton
          variant="primary"
          size="xs"
          :title="`${$t('common.done')}`"
          @click="finishWater"
        >
          {{ $t('common.done') || 'Done' }}
        </UiButton>
      </div>
    </div>

    <!-- Minimalist Top Bar when in Scatter / Random Multi-Asset Mode -->
    <div 
      v-if="toolStore.activeTool === 'scatter'"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-30 backdrop-blur-md bg-slate-950/80 border border-purple-500/30 px-2 sm:px-3 py-1 rounded-full shadow-2xl flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-purple-200 animate-in fade-in slide-in-from-top-2 select-none"
    >
      <div class="flex items-center gap-1.5 pl-1 pr-0.5">
        <Dices class="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
        <span class="font-semibold text-slate-200 hidden md:inline">{{ $t('editor.scatterTool') || 'Scatter' }}</span>
        <span class="font-mono text-[11px] text-purple-300 font-bold px-1.5 py-0.2 bg-purple-500/10 rounded-full border border-purple-500/20">
          {{ toolStore.scatterSelectedAssetIds.length }}
        </span>
      </div>

      <div class="h-3.5 w-px bg-slate-800"></div>

      <!-- Shape Toggle: Point (Q) / Line (W) / Box (E) -->
      <UiTabs
        v-model="toolStore.scatterShape"
        variant="brand"
        size="xs"
        :items="[
          { id: 'brush', label: 'Point' },
          { id: 'line', label: 'Line' },
          { id: 'box', label: 'Box' },
        ]"
      />

      <div class="h-3.5 w-px bg-slate-800"></div>

      <!-- Settings / Re-open Modal Button -->
      <UiButton
        variant="ghost"
        size="xs"
        :leading-icon="Settings2"
        @click="toolStore.openScatterModal"
      >
        <span>{{ $t('common.settings') || 'Settings' }}</span>
      </UiButton>

      <!-- Cancel / Done Buttons -->
      <div class="flex items-center gap-1">
        <UiButton
          variant="secondary"
          size="xs"
          :title="`${$t('common.cancel')} (Esc)`"
          @click="toolStore.setTool(toolStore.lastDrawingTool === 'scatter' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))"
        >
          {{ $t('common.cancel') || 'Cancel' }}
        </UiButton>
        <UiButton
          variant="game-green"
          size="xs"
          @click="toolStore.setTool(toolStore.lastDrawingTool === 'scatter' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))"
        >
          {{ $t('common.done') || 'Done' }}
        </UiButton>
      </div>
    </div>

    <!-- Minimalist Top Bar when in Draw / Select Mode -->
    <div 
      v-if="['brush', 'select', 'line', 'box-fill', 'rect'].includes(toolStore.activeTool)"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-30 backdrop-blur-md bg-slate-950/80 border px-2 sm:px-3 py-1 rounded-full shadow-2xl flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs animate-in fade-in slide-in-from-top-2 select-none"
      :class="assetStore.selectedAssetId ? 'border-brand-500/40 text-brand-200' : 'border-purple-500/40 text-purple-200'"
    >
      <!-- Mode Icon & Label -->
      <div class="flex items-center gap-1.5 pl-1 pr-0.5">
        <component 
          :is="Pointer" 
          class="w-3.5 h-3.5 shrink-0" 
          :class="assetStore.selectedAssetId ? 'text-brand-400' : 'text-purple-400'" 
        />
        <span class="font-semibold text-slate-200 hidden md:inline">
          {{ assetStore.selectedAssetId ? ($t('editor.draw') || 'Draw') : ($t('common.select') || 'Select') }}
        </span>
      </div>

      <div class="h-3.5 w-px bg-slate-800"></div>

      <!-- Sub-tool selector (Point (Q) / Line (W) / Box (E)) -->
      <UiTabs
        v-model="toolStore.drawSubTool"
        variant="segmented"
        size="xs"
        :items="[
          { id: 'brush', label: 'Point' },
          { id: 'line', label: 'Line' },
          { id: 'box', label: 'Box' },
        ]"
      />

      <div class="h-3.5 w-px bg-slate-800"></div>

      <!-- Active Asset Indicator (When Asset is selected) -->
      <template v-if="assetStore.selectedAssetId && selectedAssetItem">
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-950/60 border border-brand-500/30 text-brand-300 text-[11px] font-medium max-w-35 sm:max-w-45 truncate">
          <img 
            v-if="selectedAssetPreviewSrc" 
            :src="selectedAssetPreviewSrc" 
            class="w-3.5 h-3.5 object-contain shrink-0 rounded-xs" 
            alt="asset"
          />
          <span class="truncate">{{ selectedAssetItem.name }}</span>
        </div>

        <!-- Deselect button to quickly switch to Select mode -->
        <UiButton
          variant="ghost"
          size="xs"
          :leading-icon="X"
          custom-class="text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 px-2"
          :title="`${$t('editor.deselect')} (Esc)`"
          @click="assetStore.selectAsset(null)"
        >
          {{ $t('editor.deselect') || 'Deselect' }}
        </UiButton>
      </template>

      <!-- Selection Mode Info & Actions (When NO Asset is selected) -->
      <template v-else>
        <!-- If elements are selected -->
        <template v-if="toolStore.selectedElements.length > 0">
          <span class="font-mono text-purple-300 font-bold px-1.5 py-0.5 rounded-md bg-purple-950/50 border border-purple-500/30 text-[11px]">
            {{ toolStore.selectedElements.length }} {{ $t('editor.selectedCount') || 'selected' }}
          </span>

          <UiButton
            variant="ghost"
            size="xs"
            custom-class="text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 px-2"
            :title="`${$t('common.clear')} (Esc)`"
            @click="toolStore.clearSelection()"
          >
            {{ $t('common.clear') }}
          </UiButton>

          <UiButton
            variant="danger"
            size="xs"
            :leading-icon="Trash2"
            custom-class="px-2"
            :title="`${$t('common.delete')} (Del)`"
            @click="handleDeleteSelectedElements"
          >
            {{ $t('common.delete') }}
          </UiButton>
        </template>
        <template v-else>
          <span class="text-slate-400 text-[11px] hidden sm:inline px-1">
            {{ $t('editor.clickOrDragToSelect') || 'Click or drag to select' }}
          </span>
        </template>
      </template>
    </div>

    <!-- Minimalist Top Bar when in Eraser Mode -->
    <div 
      v-if="toolStore.activeTool === 'eraser'"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-30 backdrop-blur-md bg-slate-950/80 border border-rose-500/30 px-2 sm:px-3 py-1 rounded-full shadow-2xl flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-rose-200 animate-in fade-in slide-in-from-top-2 select-none"
    >
      <div class="flex items-center gap-1.5 pl-1 pr-0.5">
        <Eraser class="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
        <span class="font-semibold text-slate-200 hidden md:inline">{{ $t('common.delete') || 'Delete' }}</span>
      </div>

      <div class="h-3.5 w-px bg-slate-800"></div>

      <!-- Sub-tool selector: Point (Q) / Line (W) / Box (E) -->
      <UiTabs
        v-model="eraserSubTool"
        variant="segmented"
        size="xs"
        :items="[
          { id: 'simple', label: 'Point' },
          { id: 'line', label: 'Line' },
          { id: 'box', label: 'Box' },
        ]"
      />

      <!-- Prompt / Cell count info -->
      <template v-if="eraserSubTool === 'simple'">
        <span class="text-slate-400 text-[11px] hidden sm:inline px-1">
          {{ $t('editor.eraserHint') || 'Bosing yoki surib o\'chiring' }}
        </span>
      </template>
      <template v-else-if="editorController.eraserTool.startPoint">
        <div class="h-3.5 w-px bg-slate-800"></div>
        <span class="font-mono text-rose-300 text-[11px] font-bold">
          ({{ toolStore.previewCells.length }})
        </span>
      </template>

      <div class="h-3.5 w-px bg-slate-800"></div>

      <!-- Cancel / Done buttons -->
      <div class="flex items-center gap-1">
        <UiButton
          variant="secondary"
          size="xs"
          :title="`${$t('common.cancel')} (Esc)`"
          @click="toolStore.setTool(toolStore.lastDrawingTool === 'eraser' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))"
        >
          {{ $t('common.cancel') || 'Cancel' }}
        </UiButton>
        <UiButton
          variant="game-green"
          size="xs"
          @click="toolStore.setTool(toolStore.lastDrawingTool === 'eraser' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))"
        >
          {{ $t('common.done') || 'Done' }}
        </UiButton>
      </div>
    </div>

    <!-- Floating HUD when Drawing Custom Route -->
    <div v-if="routeStore.isDrawingRoute"
      class="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel px-3.5 py-2 rounded-2xl border border-brand-500/60 shadow-2xl flex items-center flex-wrap gap-2 text-xs bg-slate-900/95 text-brand-200 animate-in fade-in slide-in-from-top-2">
      
      <!-- Icon & Status text -->
      <div class="flex items-center gap-2 pr-1">
        <PenTool class="w-4 h-4 text-brand-400 animate-pulse shrink-0" />
        <template v-if="routeStore.selectedWaypointIndex !== null">
          <span class="font-medium text-amber-300">
            <strong>{{ $t('editor.pointSelected', { num: routeStore.selectedWaypointIndex + 1 }) }}</strong> {{ $t('editor.clickMapToMove') }}
          </span>
          <UiButton
            variant="ghost"
            size="xs"
            :title="`${$t('editor.deselectPoint')} (Esc)`"
            @click="routeStore.selectedWaypointIndex = null; engine.renderCharacter(characterStore, mapStore.project)"
          >
            {{ $t('editor.deselect') }}
          </UiButton>
          <UiIconButton
            variant="danger"
            size="xs"
            :icon="Trash2"
            :title="`${$t('editor.deleteWaypoint')} (Del)`"
            @click="routeStore.deleteSelectedWaypoint(); engine.renderCharacter(characterStore, mapStore.project)"
          />
        </template>
        <template v-else>
          <span>
            <strong>{{ $t('editor.waypoints') }}</strong> {{ routeStore.drawingWaypoints.length }} <span class="text-slate-400 font-mono">({{ $t('editor.tilesCount', { count: routeStore.drawingPath.length }) }})</span>
          </span>
        </template>
      </div>

      <div class="h-4 w-px bg-slate-700/80"></div>

      <!-- Undo / Redo / Reset for Route -->
      <div class="flex items-center gap-1">
        <UiIconButton
          variant="ghost"
          size="xs"
          :icon="Undo2"
          :disabled="!routeStore.canUndoRoute"
          :title="`${$t('editor.undoStep')} (Ctrl+Z)`"
          @click="routeStore.undoRoute(); engine.renderCharacter(characterStore, mapStore.project)"
        />
        <UiIconButton
          variant="ghost"
          size="xs"
          :icon="Redo2"
          :disabled="!routeStore.canRedoRoute"
          :title="`${$t('editor.redoStep')} (Ctrl+Y)`"
          @click="routeStore.redoRoute(); engine.renderCharacter(characterStore, mapStore.project)"
        />
        <UiIconButton
          variant="ghost"
          size="xs"
          :icon="RotateCcw"
          :title="$t('editor.resetStartPoint')"
          @click="routeStore.clearDrawnRoute(); engine.renderCharacter(characterStore, mapStore.project)"
        />
      </div>

      <div class="h-4 w-px bg-slate-700/80"></div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1.5">
        <UiButton
          variant="game-green"
          size="xs"
          :leading-icon="Check"
          :title="`${$t('editor.finish')} (P / Enter)`"
          @click="routeStore.finishDrawingRoute()"
        >
          {{ $t('editor.finish') }}
        </UiButton>
        <UiButton
          variant="secondary"
          size="xs"
          :title="`${$t('common.cancel')} (Esc)`"
          @click="routeStore.cancelDrawingRoute()"
        >
          {{ $t('common.cancel') }}
        </UiButton>
      </div>
    </div>

    <!-- Drag & Drop Overlay Indicator -->
    <div v-if="isDraggingOver"
      class="absolute inset-0 z-30 pointer-events-none bg-brand-600/10 border-2 border-dashed border-brand-400 flex items-center justify-center backdrop-blur-[2px]">
      <div
        class="glass-panel px-6 py-3 rounded-2xl border border-brand-400 text-brand-300 font-semibold text-sm shadow-2xl flex items-center gap-2">
        <PlusCircle class="w-5 h-5 animate-bounce" />
        <span>{{ $t('editor.dropSpriteHere') }}</span>
      </div>
    </div>

    <!-- Bottom-Left Map & Hover Cell Helper Badge -->
    <div
      class="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2 select-none animate-in fade-in duration-150">
      <div
        class="glass-panel px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2.5 border border-slate-800/90 shadow-xl text-slate-300 backdrop-blur-xl bg-slate-900/90">
        <!-- Hover Grid Coordinates -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 font-sans text-[11px]">{{ $t('inspector.gridPosition') }}:</span>
          <span v-if="toolStore.hoveredCell"
            class="text-brand-300 font-bold bg-brand-500/20 px-1.5 py-0.5 rounded border border-brand-500/30">
            ({{ toolStore.hoveredCell.col }}, {{ toolStore.hoveredCell.row }})
          </span>
          <span v-else class="text-slate-600">---</span>
        </div>

        <div class="h-3 w-px bg-slate-800"></div>

        <!-- Active Layer Name -->
        <div class="flex items-center gap-1">
          <span class="text-slate-500 font-sans text-[11px]">{{ $t('inspector.layer') }}</span>
          <span class="text-emerald-400 font-sans font-medium truncate max-w-27.5">
            {{ mapStore.activeLayer?.name || $t('inspector.layer') }}
          </span>
        </div>

        <template v-if="toolStore.hoveredCell && hoveredCellItemsCount > 0">
          <div class="h-3 w-px bg-slate-800 hidden sm:block"></div>
          <div class="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-300 font-sans">
            <Package class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ $t('editor.itemsCount', { count: hoveredCellItemsCount }) }}</span>
          </div>
        </template>

        <!-- Dynamic Modifier Placement Mode Indicator -->
        <template v-if="isCtrlPressed">
          <div class="h-3 w-px bg-slate-800"></div>
          <span class="bg-rose-500/25 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/40 text-[10px] uppercase font-sans">
            {{ $t('editor.ctrlReplace') }} (Ctrl)
          </span>
        </template>
        <template v-else-if="isShiftPressed">
          <div class="h-3 w-px bg-slate-800"></div>
          <span class="bg-cyan-500/25 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-500/40 text-[10px] uppercase font-sans">
            {{ $t('editor.shiftStack') }} (Shift)
          </span>
        </template>
      </div>
    </div>

    <!-- Floating Mobile Zoom & Map Navigation Widget -->
    <div class="absolute right-3 top-3 z-20 flex gap-2 items-center pointer-events-none select-none">
      <div
        class="py-1 px-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl text-center font-mono text-[10px] text-slate-300 font-semibold select-none leading-none shadow-lg">
        {{ Math.round(camera.localZoom.value * 100) }}%
      </div>
      <div class="pointer-events-auto flex items-center gap-1.5">
        <!-- Buildable Zones Overlay Toggle Button (Top of the map) -->
        <UiIconButton
          variant="tool"
          size="sm"
          :active="toolStore.showBuildableZones || toolStore.activeTool === 'buildable'"
          :icon="Castle"
          :title="toolStore.showBuildableZones ? $t('editor.hideBuildableZones') : $t('editor.showBuildableZones')"
          @click="toolStore.showBuildableZones = !toolStore.showBuildableZones"
        />

        <!-- Route Lines & Spawn Points Toggle Button (Top of the map) -->
        <UiIconButton
          variant="tool"
          size="sm"
          :active="characterStore.showPathTrail !== false"
          :icon="Footprints"
          :title="characterStore.showPathTrail !== false ? $t('editor.hideRouteLines') : $t('editor.showRouteLines')"
          @click="() => {
            const next = characterStore.showPathTrail === false
            characterStore.showPathTrail = next
            characterStore.showSpawnPoints = next
          }"
        />

        <!-- Reset View to Center -->
        <UiIconButton
          variant="default"
          size="sm"
          :icon="Crosshair"
          :title="`${$t('shortcuts.focusCenter')} (Home / Ctrl+0)`"
          @click="camera.focusOnCenter(viewportContainerRef)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, toRef } from 'vue'
import { 
  Plus, Minus, Crosshair, Sparkles, X, MapPin, PenTool, PlusCircle, Package, Undo2, Redo2, RotateCcw, 
  Trash2, Check, Footprints, PaintBucket, Scan, Eraser, MousePointer, Paintbrush, Pipette, Spline, Layers, Castle, Waves,
  Dices, Settings2, Square, Pointer
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiTabs } from '../ui'
import ElementInspector from '../ElementInspector.vue'
import PlacementPromptModal from '../PlacementPromptModal.vue'
import MultiAssetScatterModal from './MultiAssetScatterModal.vue'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'
import { useAssetStore } from '../../stores/assetStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useRouteStore } from '../../stores/routeStore'
import { useGameStore } from '../../stores/gameStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18n } from '../../stores/i18nStore'
import { IsoEngine } from '../../engine/IsoEngine'
import { EditorController } from '../../controllers/editor/EditorController'
import { usePixiCamera } from '../../composables/usePixiCamera'
import { GridCoord, AssetItem, SelectedElementRef } from '../../types/map'
import { cellKey, isInsideGrid, getBresenhamLine, getRectangleCells, floodFill } from '../../utils/isometric'
import { assetManager } from '../../services/assetManager'

const emit = defineEmits<{
  (e: 'ready'): void
  (e: 'progress', data: { percent: number; message: string }): void
}>()

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const routeStore = useRouteStore()
const gameStore = useGameStore()
const notify = useNotificationStore()
const { t } = useI18n()

// Eraser Sub-tool ('simple' | 'line' | 'box')
const eraserSubTool = ref<'simple' | 'line' | 'box'>('simple')
const hasDrawnInDrag = ref(false)

// Buildable Zones Sub-tool ('brush' | 'line' | 'box') & Action Mode ('allow' | 'block')
const buildableSubTool = ref<'brush' | 'line' | 'box'>('brush')
const buildableAction = ref<'allow' | 'block'>('allow')
const buildableBoxStartPoint = ref<GridCoord | null>(null)

// Water Layer Sub-tool ('brush' | 'line' | 'box') & Action Mode ('water' | 'dry')
const waterSubTool = ref<'brush' | 'line' | 'box'>('brush')
const waterAction = ref<'water' | 'dry'>('water')

// Session Snapshots for Buildable and Water modes to support reliable Cancel (Esc / Cancel button)
const buildableSnapshot = ref<{ buildMode: 'all' | 'custom' | undefined; buildableCells: string[] } | null>(null)
const waterSnapshot = ref<string[] | null>(null)

function captureBuildableSnapshot() {
  buildableSnapshot.value = {
    buildMode: mapStore.project.buildMode,
    buildableCells: [...(mapStore.project.buildableCells || [])],
  }
}

function captureWaterSnapshot() {
  waterSnapshot.value = [...(mapStore.project.waterCells || [])]
}

function cancelBuildable() {
  if (buildableSnapshot.value) {
    mapStore.project.buildMode = buildableSnapshot.value.buildMode
    mapStore.project.buildableCells = [...buildableSnapshot.value.buildableCells]
    mapStore.project.updatedAt = Date.now()
    engine.renderBuildableOverlay(mapStore.project, toolStore.showBuildableZones, 'brush', true)
  }
  editorController.buildableTool.onCancel(editorController.ctx)
  toolStore.previewCells = []
  toolStore.setTool(toolStore.lastDrawingTool === 'buildable' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))
}

function finishBuildable() {
  editorController.buildableTool.onCancel(editorController.ctx)
  toolStore.setTool(toolStore.lastDrawingTool === 'buildable' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))
}

function cancelWater() {
  if (waterSnapshot.value) {
    mapStore.project.waterCells = [...waterSnapshot.value]
    mapStore.project.updatedAt = Date.now()
    engine.syncWater(mapStore.project, true)
  }
  editorController.waterTool.onCancel(editorController.ctx)
  toolStore.previewCells = []
  toolStore.setTool(toolStore.lastDrawingTool === 'water' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))
}

function finishWater() {
  editorController.waterTool.onCancel(editorController.ctx)
  toolStore.setTool(toolStore.lastDrawingTool === 'water' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))
}

const selectedAssetItem = computed(() => {
  if (!assetStore.selectedAssetId) return null
  return assetStore.assets.find(a => a.id === assetStore.selectedAssetId) || null
})

const selectedAssetPreviewSrc = computed(() => {
  if (!selectedAssetItem.value) return ''
  return assetStore.getAssetPreview(selectedAssetItem.value)
})

function handleDeleteSelectedElements() {
  const elements = toolStore.selectedElements.length > 0
    ? [...toolStore.selectedElements]
    : (toolStore.selectedElement ? [toolStore.selectedElement] : [])
  if (elements.length === 0) return

  mapStore.batchRemoveTileItems(elements)
  toolStore.clearSelection()
}

const viewportContainerRef = ref<HTMLElement | null>(null)
const engine = new IsoEngine()
const camera = usePixiCamera(engine, toRef(mapStore, 'project'))
const editorController = new EditorController({
  mapStore,
  toolStore,
  assetStore,
  characterStore,
  notify,
  t,
  engine,
})

watch(eraserSubTool, (val) => {
  editorController.eraserTool.subTool = val
  editorController.eraserTool.onCancel(editorController.ctx)
})

watch(buildableSubTool, (val) => {
  editorController.buildableTool.subTool = val
})
watch(buildableAction, (val) => {
  editorController.buildableTool.action = val
})

watch(waterSubTool, (val) => {
  editorController.waterTool.subTool = val
})
watch(waterAction, (val) => {
  editorController.waterTool.action = val
})

const showGuide = ref(true)
const isDraggingOver = ref(false)
let resizeObserver: ResizeObserver | null = null

const hoveredCellItemsCount = computed(() => {
  if (!toolStore.hoveredCell) return 0
  const items = mapStore.getCellItems(toolStore.hoveredCell.col, toolStore.hoveredCell.row)
  return items.length
})

function getAssetMap(): Map<string, AssetItem> {
  const map = new Map<string, AssetItem>()
  for (const a of assetStore.assets) {
    map.set(a.id, a)
  }
  return map
}

function updateEngineState() {
  if (!engine.isInitialized) return
  engine.syncLayers(mapStore.project, getAssetMap())
  engine.syncWater(mapStore.project)
  engine.renderGrid(
    mapStore.project,
    toolStore.showGrid,
    toolStore.gridOpacity,
    toolStore.showCoordinates,
    toolStore.showCenterMarker,
    toolStore.showSymmetryAxes
  )
  engine.renderCharacter(characterStore, mapStore.project)
  engine.renderBuildableOverlay(mapStore.project, toolStore.showBuildableZones, toolStore.activeTool)
}

onMounted(async () => {
  if (!viewportContainerRef.value) return
  camera.updateViewportRect(viewportContainerRef.value)
  const rect = camera.getViewportRect(viewportContainerRef.value)

  emit('progress', { percent: 15, message: t('loader.initShaders') })
  await engine.init(viewportContainerRef.value, rect.width, rect.height)
  await new Promise(resolve => setTimeout(resolve, 60))

  // Load editor assets & structures bundle via central AssetManager
  emit('progress', { percent: 45, message: t('loader.loadTexturesModels') })
  await assetManager.loadEditor()
  await new Promise(resolve => setTimeout(resolve, 60))

  // Texture load listener for custom dynamic uploads
  let syncTimer: any = null
  engine.onTextureLoaded = () => {
    if (syncTimer) return
    syncTimer = requestAnimationFrame(() => {
      syncTimer = null
      if (engine.isInitialized) engine.syncLayers(mapStore.project, getAssetMap())
    })
  }

  camera.focusOnCenter(viewportContainerRef.value)

  emit('progress', { percent: 75, message: t('loader.syncLayersGrid') })
  updateEngineState()
  await new Promise(resolve => setTimeout(resolve, 60))

  // Render initial frame to eliminate initial WebGL pipeline compile hiccups
  if (engine.app?.renderer) {
    try {
      engine.app.renderer.render(engine.app.stage)
    } catch (e) {
      console.warn('Initial editor render frame:', e)
    }
  }

  emit('progress', { percent: 100, message: t('editor.editorReady') })
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  await new Promise(resolve => setTimeout(resolve, 150))
  emit('ready')

  if (typeof ResizeObserver !== 'undefined' && viewportContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          camera.updateViewportRect(viewportContainerRef.value)
          engine.resize(entry.contentRect.width, entry.contentRect.height)
        }
      }
    })
    resizeObserver.observe(viewportContainerRef.value)
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  try {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    editorController.destroy()
    engine.destroy()
  } catch (err) {
    console.warn('[EditorCanvas] onUnmounted caught error:', err)
  }
})

// Batch syncLayers via requestAnimationFrame to avoid CPU spikes during fast mouse drags
let syncLayersRafId: number | null = null
function requestSyncLayers() {
  if (syncLayersRafId !== null) return
  syncLayersRafId = requestAnimationFrame(() => {
    syncLayersRafId = null
    if (engine.isInitialized) {
      engine.syncLayers(mapStore.project, getAssetMap())
    }
  })
}

// Watchers for editor rendering
watch(() => mapStore.historyRevision, () => {
  if (engine.isInitialized) {
    engine.syncWater(mapStore.project, true)
    engine.renderBuildableOverlay(mapStore.project, toolStore.showBuildableZones, toolStore.activeTool, true)
    engine.syncLayers(mapStore.project, getAssetMap())
  }
})

watch(() => mapStore.project.updatedAt, () => {
  requestSyncLayers()
})

watch(() => mapStore.project.layers.map(l => `${l.id}:${l.visible}:${l.opacity}`).join('|'), () => {
  requestSyncLayers()
})

watch(() => [
  mapStore.project.cols, mapStore.project.rows, mapStore.project.tileWidth, mapStore.project.tileHeight,
  toolStore.showGrid, toolStore.showCoordinates, toolStore.showCenterMarker, toolStore.showSymmetryAxes, toolStore.gridOpacity
], () => {
  if (engine.isInitialized) {
    engine.renderGrid(
      mapStore.project,
      toolStore.showGrid,
      toolStore.gridOpacity,
      toolStore.showCoordinates,
      toolStore.showCenterMarker,
      toolStore.showSymmetryAxes
    )
  }
})

watch(() => [toolStore.hoveredCell, toolStore.previewCells, toolStore.activeTool, assetStore.selectedAssetId, buildableAction.value], () => {
  if (!engine.isInitialized) return
  const effectiveTool = (toolStore.activeTool === 'buildable' && buildableAction.value === 'block') 
    ? 'buildable-block' 
    : toolStore.activeTool

  if (toolStore.previewCells.length > 0) {
    engine.renderPreviewCells(toolStore.previewCells, mapStore.project, assetStore.selectedAsset, effectiveTool)
  } else {
    engine.renderHoverCell(toolStore.hoveredCell, mapStore.project, assetStore.selectedAsset, effectiveTool)
  }
})

watch(() => [toolStore.selectedElement, toolStore.selectedElements.length], () => {
  if (!engine.isInitialized) return
  if (toolStore.selectedElements.length > 1) {
    engine.renderSelection(toolStore.selectedElements, mapStore.project)
  } else if (toolStore.selectedElement) {
    const sel = toolStore.selectedElement
    let spanX = 1
    let spanY = 1
    const items = mapStore.getCellItems(sel.col, sel.row, sel.layerId)
    const item = items.find(i => i.id === sel.itemId) || items[items.length - 1]
    if (item) {
      spanX = item.spanX || 1
      spanY = item.spanY || 1
    }
    engine.renderSelection(sel, mapStore.project, spanX, spanY)
  } else {
    engine.renderSelection(null, mapStore.project)
  }
}, { deep: true })

watch(() => [
  characterStore.isEnabled,
  characterStore.showSpawnPoints,
  characterStore.showPathTrail,
  routeStore.isDrawingRoute,
  routeStore.drawingPath.length,
  routeStore.selectedWaypointIndex,
  routeStore.selectedRouteIndex,
  gameStore.spawnMode,
  routeStore.isSettingRouteStart,
  routeStore.isSettingPlayerStartPoint,
  routeStore.routes,
], () => {
  if (engine.isInitialized) engine.renderCharacter(characterStore, mapStore.project)
}, { deep: true })

watch(() => [
  toolStore.showBuildableZones,
  toolStore.activeTool,
  mapStore.project.buildMode,
  mapStore.project.buildableCells,
  mapStore.project.buildableCells?.length,
  mapStore.project.cols,
  mapStore.project.rows,
  mapStore.project.tileWidth,
  mapStore.project.tileHeight,
], () => {
  if (engine.isInitialized) {
    engine.renderBuildableOverlay(
      mapStore.project,
      toolStore.showBuildableZones,
      toolStore.activeTool
    )
  }
}, { deep: true })

watch(() => [
  mapStore.project.waterCells,
  mapStore.project.waterCells?.length,
  mapStore.project.cols,
  mapStore.project.rows,
  mapStore.project.tileWidth,
  mapStore.project.tileHeight,
], () => {
  if (engine.isInitialized) {
    engine.syncWater(mapStore.project)
  }
}, { deep: true })

// Sync Box, Eraser, Water, and Buildable states if active tool changes
watch(() => toolStore.activeTool, (newTool, oldTool) => {
  if (newTool === 'buildable') {
    captureBuildableSnapshot()
  } else if (oldTool === 'buildable') {
    buildableSnapshot.value = null
  }

  if (newTool === 'water') {
    captureWaterSnapshot()
  } else if (oldTool === 'water') {
    waterSnapshot.value = null
  }

  if (newTool !== 'box-fill' && editorController.boxTool.boxStartPoint) {
    editorController.boxTool.onCancel(editorController.ctx)
  }
  if (newTool !== 'eraser' && editorController.eraserTool.startPoint) {
    editorController.eraserTool.onCancel(editorController.ctx)
  }
  if (newTool !== 'buildable' && editorController.buildableTool.boxStartPoint) {
    editorController.buildableTool.onCancel(editorController.ctx)
  }
  if (newTool !== 'water' && editorController.waterTool.boxStartPoint) {
    editorController.waterTool.onCancel(editorController.ctx)
  }
}, { immediate: true })

// Track modifier keys for strict replace (Ctrl) vs stack (Shift) placement
const isCtrlPressed = ref(false)
const isShiftPressed = ref(false)

// --- Mouse & Tool Handling via EditorController ---
function handleMouseDown(e: MouseEvent) {
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
  editorController.isCtrlPressed = isCtrlPressed.value
  editorController.isShiftPressed = isShiftPressed.value

  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return
  if (e.button === 2) {
    editorController.handleContextMenu()
    return
  }
  if (!viewportContainerRef.value || !engine.renderer?.isInitialized) return
  if (e.button === 1 || camera.isSpacePressed.value || toolStore.activeTool === 'pan') {
    camera.startPan(e.clientX, e.clientY)
    return
  }
  if (mapStore.activeLayer?.locked) return
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  editorController.handlePointerDown(gridCoord, e)
}

function handleMouseMove(e: MouseEvent) {
  if (!viewportContainerRef.value || !engine.renderer?.isInitialized) return
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
  editorController.isCtrlPressed = isCtrlPressed.value
  editorController.isShiftPressed = isShiftPressed.value

  if (camera.isPanning.value) {
    camera.updatePan(e.clientX, e.clientY)
    return
  }
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  editorController.handlePointerMove(gridCoord, e)
}

function handleMouseUp(e?: MouseEvent) {
  if (e && e.button === 2) {
    return
  }
  if (e) {
    isCtrlPressed.value = e.ctrlKey || e.metaKey
    isShiftPressed.value = e.shiftKey
    editorController.isCtrlPressed = isCtrlPressed.value
    editorController.isShiftPressed = isShiftPressed.value
  }
  if (camera.isPanning.value) camera.endPan()
  if (!viewportContainerRef.value || !engine.renderer?.isInitialized) return
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const clientX = e ? e.clientX : 0
  const clientY = e ? e.clientY : 0
  const { gridCoord } = engine.screenPointToGrid(clientX, clientY, rect, mapStore.project)
  editorController.handlePointerUp(gridCoord, e || new MouseEvent('mouseup'))
}

function handleMouseLeave() {
  if (camera.isPanning.value) camera.endPan()
  toolStore.setHoveredCell(null)
  editorController.getActiveTool().onCancel?.(editorController.ctx)
}

function handleWheel(e: WheelEvent) {
  camera.handleWheel(e, viewportContainerRef.value)
}

function handleContextMenu() {
  editorController.handleContextMenu()
}

// --- Touch Handling ---
function handleTouchStart(e: TouchEvent) {
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return
  camera.handleTouchStart(e, viewportContainerRef.value)
}

function handleTouchMove(e: TouchEvent) {
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return
  camera.handleTouchMove(e, viewportContainerRef.value)
}

function handleTouchEnd(e: TouchEvent) {
  camera.handleTouchEnd(e, (clientX, clientY) => {
    const rect = camera.getViewportRect(viewportContainerRef.value)
    const { gridCoord } = engine.screenPointToGrid(clientX, clientY, rect, mapStore.project)
    editorController.handlePointerDown(gridCoord, e)
    editorController.handlePointerUp(gridCoord, e)
  })
}

function handleTouchCancel() {
  camera.touchState.value.isTouch = false
  camera.touchState.value.mode = 'none'
}

// --- Drag & Drop ---
function handleDragOver(e: DragEvent) { 
  isDraggingOver.value = true
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
}
function handleDragLeave() { isDraggingOver.value = false }
function handleCanvasDrop(e: DragEvent) {
  isDraggingOver.value = false
  const assetId = e.dataTransfer?.getData('text/plain')
  if (!assetId) return
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    const isCtrl = e.ctrlKey || e.metaKey || isCtrlPressed.value
    const isShift = e.shiftKey || isShiftPressed.value
    const existingDirect = mapStore.getCellItems(gridCoord.col, gridCoord.row)

    if (isCtrl) {
      mapStore.setTile(gridCoord.col, gridCoord.row, assetId, 'replace')
    } else if (isShift) {
      mapStore.setTile(gridCoord.col, gridCoord.row, assetId, 'stack')
    } else if (existingDirect.length > 0 && toolStore.placementMode === 'ask') {
      toolStore.placementConflict = {
        col: gridCoord.col,
        row: gridCoord.row,
        assetId,
      }
    } else {
      mapStore.setTile(gridCoord.col, gridCoord.row, assetId, toolStore.placementMode === 'replace' ? 'replace' : 'stack')
    }
  }
}

// --- Hotkeys ---
function handleKeyDown(e: KeyboardEvent) {
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable) return
  if (e.code === 'Space') camera.isSpacePressed.value = true

  const code = e.code
  const key = e.key ? e.key.toLowerCase() : ''

  // 1. Escape: close modals / cancel active sub-modes / deselect
  if (code === 'Escape' || key === 'escape') {
    if (toolStore.isShortcutsModalOpen) {
      toolStore.isShortcutsModalOpen = false
      return
    }
    if (toolStore.isGameConfigModalOpen) {
      toolStore.isGameConfigModalOpen = false
      return
    }
    if (toolStore.isBoxClearModalOpen) {
      toolStore.isBoxClearModalOpen = false
      return
    }
    if (toolStore.isExportModalOpen) {
      toolStore.isExportModalOpen = false
      return
    }
    if (editorController.lineTool.lineStartPoint) {
      editorController.lineTool.onCancel(editorController.ctx)
      return
    }
    if (editorController.boxTool.boxStartPoint) {
      editorController.boxTool.onCancel(editorController.ctx)
      return
    }
    if (toolStore.activeTool === 'eraser' && editorController.eraserTool.startPoint) {
      editorController.eraserTool.onCancel(editorController.ctx)
      return
    }
    if (routeStore.isDrawingRoute && routeStore.selectedWaypointIndex !== null) {
      routeStore.selectedWaypointIndex = null
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }
    if (routeStore.isSettingRouteStart) {
      routeStore.isSettingRouteStart = false
      return
    }
    if (routeStore.isSettingPlayerStartPoint) {
      routeStore.isSettingPlayerStartPoint = false
      return
    }
    if (toolStore.activeTool === 'buildable') {
      if (editorController.buildableTool.boxStartPoint) {
        editorController.buildableTool.onCancel(editorController.ctx)
        return
      }
      cancelBuildable()
      return
    }
    if (toolStore.activeTool === 'water') {
      if (editorController.waterTool.boxStartPoint) {
        editorController.waterTool.onCancel(editorController.ctx)
        return
      }
      cancelWater()
      return
    }
    if (toolStore.activeTool === 'scatter') {
      toolStore.setTool(toolStore.lastDrawingTool === 'scatter' ? 'brush' : (toolStore.lastDrawingTool || 'brush'))
      return
    }
    if (toolStore.selectedElements.length > 0 || toolStore.selectedElement) {
      toolStore.clearSelection()
      return
    }
    if (assetStore.selectedAssetId) {
      assetStore.selectAsset(null)
      return
    }
  }

  // 2. Shortcuts Help Toggle: '?' or 'F1' or Shift + '/'
  const isHelpKey = code === 'F1' || key === '?' || (e.shiftKey && (code === 'Slash' || key === '/'))
  if (isHelpKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault()
    toolStore.isShortcutsModalOpen = !toolStore.isShortcutsModalOpen
    return
  }

  // 3. Enter key: Finish route if drawing
  if ((code === 'Enter' || code === 'NumpadEnter') && routeStore.isDrawingRoute) {
    e.preventDefault()
    routeStore.finishDrawingRoute()
    return
  }

  // 4. Undo / Redo: Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y
  if (e.ctrlKey || e.metaKey) {
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if (code === 'KeyY' || key === 'y' || (e.shiftKey && (code === 'KeyZ' || key === 'z'))) {
      e.preventDefault()
      if (routeStore.isDrawingRoute) {
        routeStore.redoRoute()
        engine.renderCharacter(characterStore, mapStore.project)
      } else {
        mapStore.redo()
        engine.syncWater(mapStore.project, true)
        engine.renderBuildableOverlay(mapStore.project, toolStore.showBuildableZones, toolStore.activeTool, true)
        engine.syncLayers(mapStore.project, getAssetMap())
      }
      return
    }

    // Undo: Ctrl+Z
    if (!e.shiftKey && (code === 'KeyZ' || key === 'z')) {
      e.preventDefault()
      if (routeStore.isDrawingRoute) {
        routeStore.undoRoute()
        engine.renderCharacter(characterStore, mapStore.project)
      } else {
        mapStore.undo()
        engine.syncWater(mapStore.project, true)
        engine.renderBuildableOverlay(mapStore.project, toolStore.showBuildableZones, toolStore.activeTool, true)
        engine.syncLayers(mapStore.project, getAssetMap())
      }
      return
    }

    // Center origin: Ctrl+0
    if (!e.shiftKey && !e.altKey && (code === 'Digit0' || code === 'Numpad0' || key === '0')) {
      e.preventDefault()
      camera.focusOnCenter(viewportContainerRef.value)
      return
    }
  }

  // 5. Delete / Backspace: delete selected item(s) / waypoint
  if (code === 'Delete' || code === 'Backspace' || key === 'delete' || key === 'backspace') {
    if (routeStore.isDrawingRoute && routeStore.selectedWaypointIndex !== null) {
      e.preventDefault()
      routeStore.deleteSelectedWaypoint()
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }
    if (toolStore.selectedElements.length > 0 || toolStore.selectedElement) {
      e.preventDefault()
      handleDeleteSelectedElements()
      return
    }
  }

  // 6. If any modal is open, prevent single-key tool switches
  if (
    toolStore.isGameConfigModalOpen ||
    toolStore.isBoxClearModalOpen ||
    toolStore.isExportModalOpen ||
    toolStore.isShortcutsModalOpen
  ) {
    return
  }

  // 8. Single key shortcuts (without Ctrl / Alt / Meta / Shift)
  if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    // Focus Center: Home
    if (code === 'Home' || key === 'home') {
      e.preventDefault()
      camera.focusOnCenter(viewportContainerRef.value)
      return
    }

    // Toggle TD Settings Modal: T
    if (code === 'KeyT' || key === 't') {
      e.preventDefault()
      toolStore.isGameConfigModalOpen = !toolStore.isGameConfigModalOpen
      return
    }

    // Toggle Grid: H
    if (code === 'KeyH' || key === 'h') {
      e.preventDefault()
      toolStore.showGrid = !toolStore.showGrid
      return
    }

    // Toggle Coordinates: K
    if (code === 'KeyK' || key === 'k') {
      e.preventDefault()
      toolStore.showCoordinates = !toolStore.showCoordinates
      return
    }

    // Route / Creeps simulation: P
    if (code === 'KeyP' || key === 'p') {
      e.preventDefault()
      if (routeStore.isDrawingRoute) {
        routeStore.finishDrawingRoute()
      } else {
        characterStore.isEnabled = !characterStore.isEnabled
      }
      return
    }

    // --- Unified Sub-Mode Hotkeys: Q (Point), W (Line), E (Box) ---
    // Works across Select/Draw, Delete/Eraser, Water, Buildable Zones, Scatter
    if (code === 'KeyQ' || key === 'q') {
      e.preventDefault()
      if (toolStore.activeTool === 'buildable') {
        buildableSubTool.value = 'brush'
        return
      }
      if (toolStore.activeTool === 'water') {
        waterSubTool.value = 'brush'
        return
      }
      if (toolStore.activeTool === 'eraser') {
        eraserSubTool.value = 'simple'
        return
      }
      if (toolStore.activeTool === 'scatter') {
        toolStore.scatterShape = 'brush'
        return
      }
      toolStore.setTool('brush')
      toolStore.drawSubTool = 'brush'
      return
    }

    if (code === 'KeyW' || key === 'w') {
      e.preventDefault()
      if (toolStore.activeTool === 'buildable') {
        buildableSubTool.value = 'line'
        return
      }
      if (toolStore.activeTool === 'water') {
        waterSubTool.value = 'line'
        return
      }
      if (toolStore.activeTool === 'eraser') {
        eraserSubTool.value = 'line'
        return
      }
      if (toolStore.activeTool === 'scatter') {
        toolStore.scatterShape = 'line'
        return
      }
      toolStore.setTool('brush')
      toolStore.drawSubTool = 'line'
      return
    }

    if (code === 'KeyE' || key === 'e') {
      e.preventDefault()
      if (toolStore.activeTool === 'buildable') {
        buildableSubTool.value = 'box'
        return
      }
      if (toolStore.activeTool === 'water') {
        waterSubTool.value = 'box'
        return
      }
      if (toolStore.activeTool === 'eraser') {
        eraserSubTool.value = 'box'
        return
      }
      if (toolStore.activeTool === 'scatter') {
        toolStore.scatterShape = 'box'
        return
      }
      toolStore.setTool('brush')
      toolStore.drawSubTool = 'box'
      return
    }

    // --- Main Tool Selection Hotkeys ---
    // Select / Draw: S (aliases: B, V)
    if (code === 'KeyS' || key === 's' || code === 'KeyB' || key === 'b' || code === 'KeyV' || key === 'v') {
      e.preventDefault()
      toolStore.setTool('brush')
      return
    }

    // Delete / Eraser: R
    if (code === 'KeyR' || key === 'r') {
      e.preventDefault()
      toolStore.setTool('eraser')
      return
    }

    // Bucket Fill: F
    if (code === 'KeyF' || key === 'f') {
      e.preventDefault()
      toolStore.setTool('bucket')
      return
    }

    // Eyedropper / Pipette: G (alias: I)
    if (code === 'KeyG' || key === 'g' || code === 'KeyI' || key === 'i') {
      e.preventDefault()
      toolStore.setTool('picker')
      return
    }

    // Buildable Zones: Z
    if (code === 'KeyZ' || key === 'z') {
      e.preventDefault()
      toolStore.setTool(toolStore.activeTool === 'buildable' ? (toolStore.lastDrawingTool === 'buildable' ? 'brush' : toolStore.lastDrawingTool) : 'buildable')
      return
    }

    // Direct Line Tool alias: L
    if (code === 'KeyL' || key === 'l') {
      e.preventDefault()
      if (toolStore.activeTool === 'buildable') {
        buildableSubTool.value = 'line'
        return
      }
      if (toolStore.activeTool === 'water') {
        waterSubTool.value = 'line'
        return
      }
      if (toolStore.activeTool === 'eraser') {
        eraserSubTool.value = 'line'
        return
      }
      toolStore.setTool('brush')
      toolStore.drawSubTool = 'line'
      return
    }

    // Direct Box Tool alias: U / C
    if (code === 'KeyU' || key === 'u' || code === 'KeyC' || key === 'c') {
      e.preventDefault()
      if (code === 'KeyC' || key === 'c') {
        toolStore.setTool('eraser')
        eraserSubTool.value = 'box'
        return
      }
      if (toolStore.activeTool === 'buildable') {
        buildableSubTool.value = 'box'
        return
      }
      if (toolStore.activeTool === 'water') {
        waterSubTool.value = 'box'
        return
      }
      if (toolStore.activeTool === 'eraser') {
        eraserSubTool.value = 'box'
        return
      }
      toolStore.setTool('brush')
      toolStore.drawSubTool = 'box'
      return
    }

    // History Log Modal: H
    if (code === 'KeyH' || key === 'h') {
      e.preventDefault()
      toolStore.isHistoryModalOpen = !toolStore.isHistoryModalOpen
      return
    }
  }
}

function handleKeyUp(e: KeyboardEvent) {
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
  editorController.isCtrlPressed = isCtrlPressed.value
  editorController.isShiftPressed = isShiftPressed.value
  if (e.code === 'Space') camera.isSpacePressed.value = false
}

function handleToggleScatterTool() {
  if (toolStore.activeTool === 'scatter') {
    toolStore.openScatterModal()
  } else {
    toolStore.setTool('scatter')
    if (toolStore.scatterSelectedAssetIds.length === 0) {
      toolStore.openScatterModal()
    }
  }
}

defineExpose({
  focusOnCell: (col: number, row: number) => camera.focusOnCell(col, row, viewportContainerRef.value),
  focusOnCenter: () => camera.focusOnCenter(viewportContainerRef.value),
  exportPng: (options: { includeGrid?: boolean; transparentBg?: boolean }) => engine.exportImage({
    includeGrid: options?.includeGrid,
    transparentBg: options?.transparentBg,
    project: mapStore.project,
    assetMap: getAssetMap()
  }),
  exportImage: (options: { includeGrid?: boolean; transparentBg?: boolean }) => engine.exportImage({
    includeGrid: options?.includeGrid,
    transparentBg: options?.transparentBg,
    project: mapStore.project,
    assetMap: getAssetMap()
  })
})
</script>
