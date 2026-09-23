<template>
  <aside 
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="border-r border-slate-800/90 flex flex-col z-20 transition-all duration-300 select-none w-80 md:w-88 lg:w-120 h-full bg-dark-900/95 backdrop-blur-xl shadow-2xl overflow-hidden max-w-[95vw] md:relative absolute inset-y-0 left-0"
    :class="{ 'w-10 sm:w-12 min-w-10! sm:min-w-12! relative!': isCollapsed }"
  >
    <!-- Collapsed Toggle Strip -->
    <div v-if="isCollapsed" class="h-full flex flex-col items-center py-4 justify-between">
      <UiIconButton 
        :icon="ChevronRight"
        size="sm"
        :title="$t('sidebar.expandPanel')"
        @click="isCollapsed = false"
      />

      <div class="writing-mode-vertical text-xs font-bold text-slate-400 tracking-wider flex items-center gap-2">
        <Boxes class="w-3.5 h-3.5 text-brand-400" />
        <span>{{ $t('sidebar.objectsAndAssets') }} ({{ mapStore.totalTilesCount }} / {{ assetStore.assets.length }})</span>
      </div>

      <UiIconButton 
        :icon="FolderOpen"
        size="sm"
        :title="$t('common.open')"
        @click="isCollapsed = false"
      />
    </div>

    <!-- Expanded Left Sidebar with 40% / 60% Split -->
    <div v-else class="flex flex-col h-full overflow-hidden">
      
      <!-- ========================================================================= -->
      <!-- TOP SECTION: 40% OBJECTS & LAYERS DRIVER                                  -->
      <!-- ========================================================================= -->
      <div class="h-[40%] min-h-40 flex flex-col border-b border-slate-800/90 bg-slate-900/40 overflow-hidden shrink-0">
        
        <!-- Top Driver Header & Tab Switcher -->
        <div class="p-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-2 shrink-0">
          <div class="flex-1 min-w-0">
            <UiTabs
              v-model="activeTopTab"
              :items="topTabItems"
              size="sm"
              fill
            />
          </div>

          <!-- Collapse Panel Button -->
          <UiIconButton
            :icon="ChevronLeft"
            size="sm"
            variant="ghost"
            :title="$t('sidebar.collapsePanel')"
            @click="isCollapsed = true"
          />
        </div>

        <!-- TAB 1: PLACED OBJECTS OUTLINER -->
        <div v-if="activeTopTab === 'elements'" class="flex-1 flex flex-col overflow-hidden p-2 gap-1.5">
          <!-- Multi-Select Active Banner -->
          <div 
            v-if="toolStore.selectedElements.length > 1"
            class="p-1.5 px-2.5 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-between gap-2 shrink-0 animate-fadeIn"
          >
            <div class="flex items-center gap-1.5 text-xs text-purple-300 font-bold">
              <Layers class="w-3.5 h-3.5 text-purple-400" />
              <span>{{ $t('inspector.multiSelectedCount', { count: toolStore.selectedElements.length }) }}</span>
            </div>
            <UiButton
              variant="ghost"
              size="xs"
              custom-class="text-[10px]! p-0! text-purple-400 hover:text-white"
              @click="toolStore.clearSelection()"
            >
              {{ $t('common.deselectAll') }}
            </UiButton>
          </div>

          <!-- Search filter -->
          <UiInput 
            v-model="elementSearchQuery"
            size="sm"
            :placeholder="$t('sidebar.searchObjects')"
            :leading-icon="Search"
            clearable
          />

          <!-- Placed Elements List -->
          <div 
            v-if="filteredPlacedElements.length > 0"
            class="flex-1 overflow-y-auto flex flex-col gap-1.5 p-1 custom-scrollbar"
          >
            <UiCard 
              v-for="entry in displayedPlacedElements" 
              :key="entry.item.id"
              :selected="toolStore.isElementSelected(entry.item.id, entry.layerId)"
              variant="default"
              padding="sm"
              interactive
              custom-class="p-1.5! flex items-center gap-2 shrink-0 group hover:border-slate-700"
              @click="(e) => handleSelectAndFocus(entry, e)"
            >
              <!-- Thumbnail -->
              <div class="w-8 h-8 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner border border-slate-800/80">
                <img 
                  :src="assetStore.getAssetPreview(entry.item.assetId)" 
                  :alt="getAsset(entry.item.assetId)?.name"
                  width="32"
                  height="32"
                  decoding="async"
                  class="max-w-full max-h-full aspect-square object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>

              <!-- Meta details -->
              <div class="flex-1 min-w-0">
                <div class="text-[11px] font-semibold text-slate-200 truncate flex items-center justify-between">
                  <span class="truncate">{{ getAsset(entry.item.assetId)?.name || 'Element' }}</span>
                  <UiBadge variant="brand" size="xs">
                    Z:{{ entry.item.zIndex || 0 }}
                  </UiBadge>
                </div>
                <div class="text-[9px] text-slate-400 font-mono flex items-center justify-between mt-0.5">
                  <span class="text-emerald-400 font-semibold">X:{{ entry.col }}, Y:{{ entry.row }}</span>
                  <span class="text-[9px] text-slate-500 truncate max-w-22.5">{{ entry.layerName }}</span>
                </div>
              </div>

              <!-- Select All of this asset / Focus / Delete buttons on hover -->
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <UiIconButton 
                  :icon="CopyCheck"
                  size="sm"
                  variant="ghost"
                  :title="$t('inspector.selectAllOnMap', { count: mapStore.getAssetItemCount(entry.item.assetId) })"
                  custom-class="p-0.5! w-6! h-6! text-brand-400 hover:text-brand-300"
                  @click.stop="handleSelectAllOfAsset(entry)"
                />
                <UiIconButton 
                  :icon="Crosshair"
                  size="sm"
                  variant="ghost"
                  :title="$t('sidebar.focusOnMap')"
                  custom-class="p-0.5! w-6! h-6!"
                  @click.stop="handleFocusOnly(entry)"
                />
                <UiIconButton 
                  :icon="Trash2"
                  size="sm"
                  variant="danger"
                  :title="`${$t('common.delete')} (Del)`"
                  custom-class="p-0.5! w-6! h-6!"
                  @click.stop="handleDeleteItem(entry)"
                />
              </div>
            </UiCard>

            <!-- Load More / Count Bar -->
            <div 
              v-if="filteredPlacedElements.length > displayLimit" 
              class="p-2 flex items-center justify-between bg-slate-900/90 rounded-xl border border-slate-800/80 mt-1 shrink-0 shadow-xs"
            >
              <span class="text-[10px] text-slate-400 font-medium">
                {{ displayedPlacedElements.length }} / {{ filteredPlacedElements.length }}
              </span>
              <div class="flex items-center gap-1">
                <UiButton 
                  variant="secondary" 
                  size="xs" 
                  @click="displayLimit += 50"
                >
                  +50
                </UiButton>
                <UiButton 
                  variant="ghost" 
                  size="xs" 
                  @click="displayLimit = filteredPlacedElements.length"
                >
                  {{ $t('common.all') || 'All' }}
                </UiButton>
              </div>
            </div>
          </div>

          <!-- Empty state when map has 0 elements -->
          <div 
            v-else 
            class="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-2xl bg-slate-950/40 p-3 text-center"
          >
            <Boxes class="w-6 h-6 text-slate-600 mb-1" />
            <p class="text-[11px] font-bold text-slate-300">{{ $t('sidebar.noObjectsPlaced') }}</p>
            <p class="text-[10px] text-slate-500 mt-0.5">{{ $t('sidebar.selectSpritePrompt') }}</p>
          </div>
        </div>

        <!-- TAB 2: LAYERS LIST -->
        <div v-else-if="activeTopTab === 'layers'" class="flex-1 overflow-hidden flex flex-col p-2 gap-1.5 custom-scrollbar">
          <!-- Add Layer Action Row -->
          <div class="flex items-center justify-between px-1 shrink-0">
            <span class="text-[11px] font-semibold text-slate-300">{{ $t('sidebar.layersList') }}</span>
            <UiButton 
              variant="primary"
              size="xs"
              :leading-icon="Plus"
              @click="mapStore.addLayer()"
            >
              {{ $t('sidebar.newLayer') }}
            </UiButton>
          </div>

          <!-- Scrollable Layer Items -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar p-1">
            <UiCard 
              v-for="layer in reversedLayers" 
              :key="layer.id"
              :selected="mapStore.activeLayerId === layer.id"
              variant="default"
              padding="sm"
              custom-class="p-1.5! flex flex-col gap-1 cursor-pointer shrink-0 hover:border-slate-700"
              @click="mapStore.activeLayerId = layer.id"
            >
              <div class="flex items-center justify-between gap-1.5">
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <UiIconButton 
                    :icon="layer.visible ? Eye : EyeOff"
                    size="sm"
                    variant="ghost"
                    :title="layer.visible ? $t('sidebar.hideLayer') : $t('sidebar.showLayer')"
                    :custom-class="layer.visible ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600'"
                    @click.stop="mapStore.toggleLayerVisibility(layer.id)"
                  />

                  <input 
                    :value="layer.name"
                    @change="(e) => mapStore.renameLayer(layer.id, (e.target as HTMLInputElement).value)"
                    @click.stop
                    class="bg-transparent text-[11px] font-semibold text-slate-200 focus:outline-none focus:bg-slate-800/80 px-1 py-0.5 rounded truncate flex-1"
                  />
                </div>

                <div class="flex items-center gap-0.5 shrink-0">
                  <UiIconButton 
                    :icon="layer.locked ? Lock : Unlock"
                    size="sm"
                    variant="ghost"
                    :title="layer.locked ? $t('sidebar.unlockLayer') : $t('sidebar.lockLayer')"
                    :custom-class="layer.locked ? 'text-amber-400' : 'text-slate-500'"
                    @click.stop="mapStore.toggleLayerLock(layer.id)"
                  />
                  <UiIconButton 
                    :icon="ArrowUp"
                    size="sm"
                    variant="ghost"
                    :title="$t('common.moveUp')"
                    @click.stop="mapStore.moveLayer(layer.id, 'up')"
                  />
                  <UiIconButton 
                    :icon="ArrowDown"
                    size="sm"
                    variant="ghost"
                    :title="$t('common.moveDown')"
                    @click.stop="mapStore.moveLayer(layer.id, 'down')"
                  />
                  <UiIconButton 
                    v-if="mapStore.project.layers.length > 1"
                    :icon="Trash2"
                    size="sm"
                    variant="danger"
                    :title="$t('common.delete')"
                    @click.stop="mapStore.removeLayer(layer.id)"
                  />
                </div>
              </div>

              <!-- Layer Opacity -->
              <div class="flex items-center justify-between gap-2 text-[9px] text-slate-400 pt-1 border-t border-slate-800/50" @click.stop>
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <span class="text-[9px] shrink-0">{{ $t('common.opacity') }}:</span>
                  <UiSlider 
                    :model-value="layer.opacity"
                    :min="0"
                    :max="1"
                    :step="0.05"
                    class="flex-1"
                    @update:model-value="(val) => mapStore.setLayerOpacity(layer.id, val)"
                  />
                  <span class="font-mono w-7 text-right shrink-0 text-slate-300 font-bold">{{ Math.round(layer.opacity * 100) }}%</span>
                </div>
                <span class="font-mono text-slate-500 shrink-0">{{ $t('common.itemsCount', { count: Object.keys(layer.tiles).length }) }}</span>
              </div>
            </UiCard>
          </div>
        </div>

        <!-- TAB 3: ROUTES LIST & MANAGER -->
        <div v-else-if="activeTopTab === 'routes'" class="flex-1 overflow-hidden flex flex-col p-2 gap-1.5 custom-scrollbar">
          <!-- Top Action Row: Spawn Routes Header & Add Route -->
          <div class="flex items-center justify-between px-1.5 shrink-0 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-300 pl-1">
              <Footprints class="w-3.5 h-3.5 text-emerald-400" />
              <span>{{ $t('sidebar.spawnRoutes') }} ({{ characterStore.routes.length }})</span>
            </div>

            <!-- New Route Button -->
            <UiButton 
              variant="game-green"
              size="xs"
              :leading-icon="Plus"
              @click="handleAddNewRoute"
            >
              {{ $t('sidebar.newRoute') }}
            </UiButton>
          </div>

          <!-- Active Route Drawing Banner if drawing -->
          <div 
            v-if="characterStore.isDrawingRoute"
            class="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 shrink-0 animate-pulse"
          >
            <div class="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
              <PenTool class="w-4 h-4 text-amber-400" />
              <span>{{ $t('sidebar.drawingRoute', { number: (characterStore.selectedRouteIndex ?? 0) + 1 }) }}</span>
            </div>
            <UiButton
              variant="secondary"
              size="xs"
              :title="`${$t('common.done')} (P / Enter)`"
              @click="characterStore.finishDrawingRoute()"
            >
              {{ $t('common.done') }}
            </UiButton>
          </div>

          <!-- Scrollable Routes List (Route 1, Route 2, Route 3...) -->
          <div 
            v-if="characterStore.routes.length > 0"
            class="flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar p-0.5"
          >
            <UiCard 
              v-for="(route, idx) in characterStore.routes" 
              :key="route.id || idx"
              :selected="characterStore.selectedRouteIndex === idx"
              variant="default"
              padding="sm"
              custom-class="p-2! flex flex-col gap-1.5 cursor-pointer shrink-0 transition-all hover:border-slate-700"
              :class="{ 'border-emerald-500/80! bg-emerald-950/20! shadow-[0_0_15px_rgba(16,185,129,0.15)]': characterStore.selectedRouteIndex === idx }"
              @click="handleSelectRoute(idx)"
            >
              <!-- Route Top Row: Index Badge, Name, and Draw / Action Buttons -->
              <div class="flex items-center justify-between gap-1.5">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <!-- Numbered Badge (1, 2, 3...) -->
                  <div 
                    class="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 border font-mono"
                    :class="characterStore.selectedRouteIndex === idx 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm' 
                      : 'bg-slate-800 text-slate-300 border-slate-700'"
                  >
                    {{ idx + 1 }}
                  </div>

                  <!-- Route Name (Clean without duplicated coords) -->
                  <span 
                    class="text-xs font-bold truncate"
                    :class="characterStore.selectedRouteIndex === idx ? 'text-emerald-300 font-semibold' : 'text-slate-200'"
                  >
                    {{ (route.name || `Route ${idx + 1}`).replace(/\s*\(\d+,\s*\d+\)/g, '').trim() || `Route ${idx + 1}` }}
                  </span>
                </div>

                <!-- Draw / Edit / Focus / Delete Buttons -->
                <div class="flex items-center gap-1 shrink-0">
                  <!-- Draw Button with Pen Icon -->
                  <UiButton
                    :variant="characterStore.isDrawingRoute && characterStore.selectedRouteIndex === idx ? 'game-amber' : 'primary'"
                    size="xs"
                    :leading-icon="PenTool"
                    custom-class="px-2! py-0.5! text-[10px]!"
                    :title="$t('sidebar.drawEditRoute', { number: idx + 1 })"
                    @click.stop="handleStartDrawing(idx)"
                  >
                    {{ $t('sidebar.draw') }}
                  </UiButton>

                  <!-- Focus on Start -->
                  <UiIconButton 
                    :icon="Crosshair"
                    size="sm"
                    variant="ghost"
                    :title="$t('sidebar.focusOnStart')"
                    custom-class="p-0.5! w-6! h-6!"
                    @click.stop="handleFocusRoute(route)"
                  />

                  <!-- Relocate Start Point -->
                  <UiIconButton 
                    :icon="MapPin"
                    size="sm"
                    variant="ghost"
                    :title="$t('sidebar.relocateStart')"
                    custom-class="p-0.5! w-6! h-6! text-amber-400 hover:text-amber-300"
                    @click.stop="handleRelocateStart(idx)"
                  />

                  <!-- Set / Relocate Player Base Point -->
                  <UiIconButton 
                    :icon="Castle"
                    size="sm"
                    variant="ghost"
                    :title="$t('sidebar.setPlayerStart')"
                    custom-class="p-0.5! w-6! h-6! text-sky-400 hover:text-sky-300"
                    @click.stop="handleSetPlayerStart(idx)"
                  />

                  <!-- Delete Route -->
                  <UiIconButton 
                    v-if="characterStore.routes.length > 1"
                    :icon="Trash2"
                    size="sm"
                    variant="danger"
                    :title="$t('common.delete')"
                    custom-class="p-0.5! w-6! h-6!"
                    @click.stop="handleDeleteRoute(idx)"
                  />
                </div>
              </div>

              <!-- Route Bottom Row: Coordinates & Waypoint Stats -->
              <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pl-7 flex-wrap gap-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-amber-400/90 font-medium">
                    {{ $t('sidebar.startCoord') }}: ({{ route.routePoints?.[0]?.col ?? 2 }}, {{ route.routePoints?.[0]?.row ?? 2 }})
                  </span>
                  <span v-if="route.playerCameraPoint" class="text-sky-400 font-medium bg-sky-950/50 px-1 rounded border border-sky-500/20">
                    {{ $t('sidebar.playerStartCoord') || 'Base' }}: ({{ route.playerCameraPoint.col }}, {{ route.playerCameraPoint.row }})
                  </span>
                </div>
                <span class="text-slate-500">
                  {{ getRouteStats(route, idx) }}
                </span>
              </div>
            </UiCard>
          </div>

          <!-- Empty State if no routes detected -->
          <div 
            v-else 
            class="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-2xl bg-slate-950/40 p-4 text-center"
          >
            <Footprints class="w-7 h-7 text-slate-600 mb-1.5 animate-pulse" />
            <p class="text-xs font-bold text-slate-300">{{ $t('sidebar.noRoutesFound') }}</p>
            <p class="text-[11px] text-slate-500 mt-1 max-w-48">
              {{ $t('sidebar.noRoutesPrompt') }}
            </p>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- BOTTOM SECTION: 60% ASSET GALLERY                                         -->
      <!-- ========================================================================= -->
      <div class="h-[60%] flex flex-col bg-dark-950/70 overflow-hidden flex-1">
        
        <!-- Gallery Header & Actions -->
        <div class="p-2.5 border-b border-slate-800/90 bg-slate-900/90 flex flex-col gap-2 shrink-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <FolderOpen class="w-4 h-4 text-brand-400" />
              <span class="text-xs font-bold text-slate-200">
                {{ $t('sidebar.assetLibrary') }}
              </span>
              <UiBadge variant="brand" size="xs">
                {{ assetStore.assets.length }}
              </UiBadge>
            </div>
          </div>

          <!-- Search Filter -->
          <UiInput 
            v-model="assetStore.searchQuery"
            size="sm"
            :placeholder="$t('sidebar.searchAssets')"
            :leading-icon="Search"
            clearable
          />

          <!-- Category Filter Chips -->
          <div class="overflow-x-auto pb-0.5 custom-scrollbar shrink-0">
            <UiTabs
              v-model="assetStore.selectedCategory"
              :items="assetCategoryItems"
              variant="pills"
              size="xs"
            />
          </div>
        </div>

        <!-- Scrollable Asset Grid (3 Columns, Square Aspect Ratio, Crisp Large Previews) -->
        <div class="flex-1 p-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div 
            v-if="assetStore.filteredAssets.length > 0"
            class="grid grid-cols-4 gap-2"
          >
            <div 
              v-for="asset in assetStore.filteredAssets" 
              :key="asset.id"
              @click="handleAssetClick(asset.id)"
              draggable="true"
              @dragstart="(e) => handleAssetDragStart(e, asset)"
              :class="assetStore.selectedAssetId === asset.id ? 'border-brand-500 bg-brand-950/80 ring-2 ring-brand-500/80 scale-[1.03]' : 'border-slate-800/90 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-850'"
              class="group relative flex items-center justify-center p-2 rounded-2xl border aspect-square cursor-pointer transition-all shadow-sm overflow-hidden"
              :title="asset.name"
            >
              <!-- Favorite Star Button (Top-left) -->
              <button
                type="button"
                class="absolute top-1 left-1 p-1 rounded-md transition-all z-10"
                :class="assetStore.isFavorite(asset.id) 
                  ? 'text-amber-400 bg-slate-950/80 shadow-xs' 
                  : 'text-slate-500 hover:text-amber-300 opacity-0 group-hover:opacity-100 bg-slate-950/60'"
                :title="assetStore.isFavorite(asset.id) ? $t('sidebar.removeFromFavorites') : $t('sidebar.addToFavorites')"
                @click.stop="assetStore.toggleFavorite(asset.id)"
              >
                <Star class="w-3.5 h-3.5" :class="{ 'fill-amber-400': assetStore.isFavorite(asset.id) }" />
              </button>

              <!-- Thumbnail Image (Large, fills box, perfectly centered) -->
              <img 
                :src="assetStore.getAssetPreview(asset)" 
                :alt="asset.name"
                width="64"
                height="64"
                decoding="async"
                class="max-w-full max-h-full aspect-square object-contain filter drop-shadow group-hover:scale-115 transition-transform duration-200 pointer-events-none"
                loading="lazy"
              />

              <!-- Hover Subtitle Name Bar -->
              <div class="absolute inset-x-0 bottom-0 py-0.5 px-1 bg-slate-950/90 backdrop-blur-xs text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-t border-slate-800/60">
                <span class="text-[9px] font-semibold text-slate-200 truncate block">
                  {{ asset.name.replace(/\.png|\.jpg|\.webp/gi, '') }}
                </span>
              </div>

              <!-- Quick Hover Actions (Anchor Calibration) -->
              <div class="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 rounded-md p-0.5 border border-slate-800/80 shadow-md backdrop-blur-xs z-10">
                <UiButton 
                  :leading-icon="Crosshair"
                  size="xs"
                  variant="ghost"
                  :title="$t('sidebar.adjustAnchor')"
                  @click.stop="openAnchorModal(asset)"
                />
              </div>
            </div>
          </div>

          <!-- Empty State when no assets match category or search -->
          <div 
            v-else 
            class="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-3xl bg-slate-950/40 p-4 text-center"
          >
            <FolderOpen class="w-8 h-8 text-slate-600 mb-2" />
            <p class="text-xs font-bold text-slate-300">{{ $t('sidebar.noAssets') }}</p>
          </div>
        </div>

      </div>

    </div>

    <!-- Anchor Adjust Modal Component -->
    <AnchorAdjustModal 
      v-if="selectedAssetForAnchor" 
      :asset="selectedAssetForAnchor" 
      @close="selectedAssetForAnchor = null"
      @save="handleAnchorSave"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  Boxes, Layers, ChevronLeft, ChevronRight, ChevronDown, Search, 
  Crosshair, Trash2, FolderOpen, 
  Plus, Eye, EyeOff, Lock, Unlock, 
  ArrowUp, ArrowDown, X, Footprints, PenTool, MapPin,
  CopyCheck, Maximize2, Star, Castle
} from 'lucide-vue-next'
import { 
  UiButton, 
  UiIconButton, 
  UiInput, 
  UiCard, 
  UiTabs, 
  UiBadge, 
  UiSlider,
  TabItem 
} from './ui'
import { useMapStore, PlacedElementEntry } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useNotificationStore } from '../stores/notificationStore'
import { AssetItem, ToolType } from '../types/map'
import AnchorAdjustModal from './AnchorAdjustModal.vue'
import { useI18n } from '../stores/i18nStore'

const emit = defineEmits<{
  (e: 'focus-cell', pos: { col: number; row: number }): void
}>()

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const notify = useNotificationStore()
const { t } = useI18n()

const isCollapsed = ref(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)
const activeTopTab = ref<'elements' | 'layers' | 'routes'>('elements')
const elementSearchQuery = ref('')
const displayLimit = ref(40)

watch([elementSearchQuery, activeTopTab], () => {
  displayLimit.value = 40
})

watch([() => assetStore.selectedCategory, () => mapStore.totalTilesCount], ([cat]) => {
  if (cat === 'UsedInMap') {
    assetStore.updateUsedInMap(mapStore.project.layers)
  }
}, { immediate: true })

const topTabItems = computed<TabItem[]>(() => [
  { id: 'elements', label: t('sidebar.objectsTab') || 'Objects', icon: Boxes, count: mapStore.totalTilesCount },
  { id: 'layers', label: t('common.layers') || 'Layers', icon: Layers, count: mapStore.project.layers.length },
  { id: 'routes', label: t('sidebar.routesTab') || 'Routes', icon: Footprints, count: characterStore.routes.length }
])

const assetCategoryItems = computed<TabItem[]>(() => {
  const items: TabItem[] = [
    { id: 'All', label: t('common.all') || 'All' },
    { id: 'Favorites', label: t('sidebar.favorites') || 'Favorites' },
    { id: 'UsedInMap', label: t('sidebar.usedInMap') || 'In Map' },
  ]

  for (const cat of assetStore.categories) {
    if (cat === 'All' || cat === 'Favorites' || cat === 'UsedInMap') continue
    const catLabel = t(`assets.cat${cat}`) !== `assets.cat${cat}` ? t(`assets.cat${cat}`) : cat
    items.push({
      id: cat,
      label: catLabel,
    })
  }
  return items
})

function handleAddNewRoute() {
  characterStore.isSettingRouteStart = true
  characterStore.routeStartPlacementMode = 'add'
  characterStore.statusMessage = t('sidebar.clickPlaceRouteStart', { number: characterStore.routes.length + 1 })
}

function handleSelectRoute(idx: number) {
  if (characterStore.selectedRouteIndex === idx) {
    characterStore.selectedRouteIndex = null
  } else {
    characterStore.selectedRouteIndex = idx
    characterStore.spawnAtRoute(idx)
  }
}

function handleStartDrawing(idx: number) {
  characterStore.selectedRouteIndex = idx
  characterStore.startDrawingCustomRoute(idx)
}

function handleFocusRoute(route: any) {
  const start = route.routePoints?.[0] || { col: 2, row: 2 }
  emit('focus-cell', { col: start.col, row: start.row })
}

function handleDeleteRoute(idx: number) {
  characterStore.removeRoute(idx)
}

function handleRelocateStart(idx: number) {
  characterStore.selectedRouteIndex = idx
  characterStore.routeStartPlacementMode = 'relocate'
  characterStore.isSettingRouteStart = true
  characterStore.statusMessage = t('sidebar.clickRelocateStart', { number: idx + 1 })
}

function handleSetPlayerStart(idx: number) {
  characterStore.selectedRouteIndex = idx
  characterStore.isSettingPlayerStartPoint = true
  characterStore.statusMessage = t('sidebar.clickSetPlayerStart', { number: idx + 1 })
}

function getRouteStats(route: any, idx: number): string {
  const points = route.routePoints || []
  const path = characterStore.getRouteForIndex(idx) || []
  if (points.length > 0) return t('sidebar.routeStatsPoints', { points: points.length, tiles: path.length })
  if (path.length > 1) return t('sidebar.routeStatsTiles', { tiles: path.length })
  return t('sidebar.routeStatsDefault')
}

const selectedAssetForAnchor = ref<AssetItem | null>(null)

const reversedLayers = computed(() => {
  return [...mapStore.project.layers].reverse()
})

// Fast O(1) asset lookup via assetStore
function getAsset(assetId: string): AssetItem | null {
  return assetStore.getAsset(assetId)
}

const filteredPlacedElements = computed(() => {
  if (activeTopTab.value !== 'elements') return []
  const query = elementSearchQuery.value.trim().toLowerCase()
  return mapStore.allPlacedElements.filter(entry => {
    if (!query) return true
    const asset = getAsset(entry.item.assetId)
    const nameMatch = asset ? asset.name.toLowerCase().includes(query) : false
    const layerMatch = entry.layerName.toLowerCase().includes(query)
    const coordMatch = `${entry.col},${entry.row}`.includes(query)
    return nameMatch || layerMatch || coordMatch
  })
})

const displayedPlacedElements = computed(() => {
  return filteredPlacedElements.value.slice(0, displayLimit.value)
})

function getAssetThumbnailStyle(asset: AssetItem) {
  if (asset.contentBounds && asset.height && asset.width) {
    const b = asset.contentBounds
    const contentCenterY = (b.minY + b.maxY) / 2
    const contentCenterX = (b.minX + b.maxX) / 2
    
    // Shift content to exact center of the box
    const offsetYPercent = ((asset.height / 2 - contentCenterY) / asset.height) * 100
    const offsetXPercent = ((asset.width / 2 - contentCenterX) / asset.width) * 100
    
    const contentW = Math.max(1, b.maxX - b.minX)
    const contentH = Math.max(1, b.maxY - b.minY)
    
    // Calculate scale to fill ~90% of the square thumbnail container
    const scaleX = asset.width / contentW
    const scaleY = asset.height / contentH
    const fillScale = Math.min(1.85, Math.max(1.0, Math.min(scaleX, scaleY) * 0.90))
    
    return {
      transform: `translate(${offsetXPercent.toFixed(1)}%, ${offsetYPercent.toFixed(1)}%) scale(${fillScale.toFixed(2)})`,
      transformOrigin: 'center center',
    }
  }

  // Fallback for square or standard assets
  return {
    transform: 'scale(1.05)',
    transformOrigin: 'center center',
  }
}

function handleSelectAndFocus(entry: PlacedElementEntry, event?: MouseEvent) {
  const ref = {
    col: entry.col,
    row: entry.row,
    layerId: entry.layerId,
    itemId: entry.item.id,
  }
  if (event && (event.ctrlKey || event.metaKey || event.shiftKey)) {
    toolStore.toggleSelectedElement(ref)
  } else {
    toolStore.setSelectedElement(ref)
  }
  toolStore.setTool('select')
  mapStore.activeLayerId = entry.layerId
  emit('focus-cell', { col: entry.col, row: entry.row })
}

function handleSelectAllOfAsset(entry: PlacedElementEntry) {
  const allInstances = mapStore.getAllItemsByAssetId(entry.item.assetId)
  if (allInstances.length > 0) {
    toolStore.setSelectedElements(allInstances.map(e => ({
      col: e.col,
      row: e.row,
      layerId: e.layerId,
      itemId: e.item.id
    })))
    toolStore.setTool('select')
    emit('focus-cell', { col: entry.col, row: entry.row })
  }
}

function handleFocusOnly(entry: PlacedElementEntry) {
  emit('focus-cell', { col: entry.col, row: entry.row })
}

function handleDeleteItem(entry: PlacedElementEntry) {
  mapStore.removeTileItem(entry.col, entry.row, entry.item.id, entry.layerId)
  if (toolStore.selectedElement?.itemId === entry.item.id) {
    toolStore.setSelectedElement(null)
  }
}



function handleAssetClick(assetId: string) {
  if (assetStore.selectedAssetId === assetId) {
    const drawingTools: ToolType[] = ['brush', 'bucket', 'line', 'box-fill']
    if (!drawingTools.includes(toolStore.activeTool)) {
      toolStore.setTool(toolStore.lastDrawingTool || 'brush')
    } else {
      assetStore.selectAsset(null)
    }
  } else {
    assetStore.selectAsset(assetId)
  }
}

function handleAssetDragStart(event: DragEvent, asset: AssetItem) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('text/plain', asset.id)
  event.dataTransfer.effectAllowed = 'copy'
  assetStore.selectAsset(asset.id)
}

function openAnchorModal(asset: AssetItem) {
  selectedAssetForAnchor.value = asset
}

function handleAnchorSave(updates: { anchorX: number; anchorY: number; spanX: number; spanY: number; scale: number }) {
  if (selectedAssetForAnchor.value) {
    const asset = selectedAssetForAnchor.value
    // 1. Update Asset Store and Central AssetManager
    assetStore.updateAssetProperties(asset.id, updates)

    // 2. Update all already placed instances on the map
    mapStore.updateAllItemsOfAsset(asset.id, updates)

    // 3. Update any Tower Blueprints using this asset
    for (const bp of towerStore.blueprints) {
      if (bp.assetId === asset.id || bp.assetName === asset.name || bp.assetName === asset.id) {
        towerStore.syncBlueprintChanges(bp.id)
      }
    }

    mapStore.pushHistory(`Updated anchor for ${asset.name}`)
    notify.success(t('anchor.savedSuccess') || 'Anchor updated and applied to map')
    selectedAssetForAnchor.value = null
  }
}


</script>

<style scoped>
.writing-mode-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
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
