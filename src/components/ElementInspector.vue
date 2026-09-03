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
        <div class="w-7 h-7 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-400">
          <Sliders class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-100">
            Element Driveri
          </h2>
          <p class="text-[10px] font-mono text-brand-400">
            Katak: X: {{ toolStore.selectedElement.col }}, Y: {{ toolStore.selectedElement.row }}
          </p>
        </div>
      </div>
      <button 
        @click="toolStore.setSelectedElement(null)"
        class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Yopish (O'ng tugma yoki Esc)"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3.5 custom-scrollbar">
      <!-- 1. List of Elements on / covering this cell -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-slate-300">Shu katakdagi elementlar:</span>
          <span class="px-2 py-0.5 rounded-full bg-slate-800 text-brand-400 font-mono text-[10px] font-bold">
            {{ coveringElements.length }} ta
          </span>
        </div>

        <div class="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-0.5">
          <div 
            v-for="entry in coveringElements" 
            :key="entry.item.id"
            @click="selectElementEntry(entry)"
            :class="toolStore.selectedElement.itemId === entry.item.id ? 'border-brand-500 bg-brand-950/40 ring-1 ring-brand-500/50' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'"
            class="border rounded-xl p-2 flex items-center gap-2.5 cursor-pointer transition-all"
          >
            <!-- Thumbnail -->
            <div class="w-8 h-8 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1 shrink-0 overflow-hidden">
              <img 
                :src="getAsset(entry.item.assetId)?.previewSrc || getAsset(entry.item.assetId)?.src" 
                :alt="getAsset(entry.item.assetId)?.name"
                class="max-w-full max-h-full object-contain filter drop-shadow"
                :style="{
                  transform: `scaleX(${entry.item.flipX ? -1 : 1}) rotate(${entry.item.rotation || 0}deg)`
                }"
              />
            </div>

            <!-- Meta -->
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-slate-200 truncate flex items-center justify-between">
                <span>{{ getAsset(entry.item.assetId)?.name || 'Element' }}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-brand-300">
                  Z: {{ entry.cellZIndex }}
                </span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>{{ entry.item.spanX || 1 }}×{{ entry.item.spanY || 1 }} katak</span>
                <span v-if="entry.item.depthOffset" class="text-amber-400 text-[9px] font-bold">
                  (Atrof: {{ entry.item.depthOffset > 0 ? '+' : '' }}{{ entry.item.depthOffset }})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Element Full Inspector -->
      <div v-if="activeItem" class="flex flex-col gap-3.5 border-t border-slate-800 pt-3">
        <!-- Asset Title & Info Badge -->
        <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div class="w-11 h-11 rounded-xl bg-slate-950 checker-pattern flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner">
            <img 
              :src="currentAsset?.previewSrc || currentAsset?.src" 
              :alt="currentAsset?.name" 
              class="max-w-full max-h-full object-contain filter drop-shadow"
              :style="{
                transform: `scaleX(${activeItem.flipX ? -1 : 1}) rotate(${activeItem.rotation || 0}deg)`
              }"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-slate-100 truncate">
              {{ currentAsset?.name || 'Element' }}
            </div>
            <div class="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-col gap-0.5">
              <span>Asos koordinatasi: ({{ activeItem.x }}, {{ activeItem.y }})</span>
              <span class="text-brand-300 font-semibold">Qatlam: {{ currentLayerName }}</span>
            </div>
          </div>
        </div>

        <!-- 2. ATROFDAGI QO'SHNI KATAKLARGA NISBATAN Z-INDEX (RELATIVE DEPTH SHIFT) -->
        <div class="flex flex-col gap-2 p-3 rounded-2xl bg-brand-950/30 border border-brand-500/40 shadow-inner">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-brand-300 flex items-center gap-1.5">
              <Layers class="w-4 h-4 text-brand-400" />
              Atrofdagilarga nisbatan Z-Index:
            </span>
            <span 
              class="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold"
              :class="(activeItem.depthOffset || 0) > 0 ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/40' : (activeItem.depthOffset || 0) < 0 ? 'bg-amber-900/80 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'"
            >
              {{ depthOffsetStatusText }}
            </span>
          </div>

          <!-- Quick Big Push/Pull Buttons -->
          <div class="grid grid-cols-2 gap-2 mt-0.5">
            <!-- Shift forward on top of bottom neighbor -->
            <button 
              @click="shiftDepth(+1)"
              class="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 group"
              title="Oldindagi / pastdagi katakdagi element ustiga chiqarish (+1 qavat)"
            >
              <ArrowDownToLine class="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform" />
              <span>Pastdagi ustiga (+1)</span>
            </button>

            <!-- Shift backward behind top neighbor -->
            <button 
              @click="shiftDepth(-1)"
              class="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold shadow-sm transition-all active:scale-95 group"
              title="Orqadagi / tepadagi katakdagi element tagiga tushirish (-1 qavat)"
            >
              <ArrowUpToLine class="w-4 h-4 text-amber-400 group-hover:-translate-y-0.5 transition-transform" />
              <span>Tepadagi tagiga (-1)</span>
            </button>
          </div>

          <!-- Stepper & Direct Offset Setting -->
          <div class="flex items-center justify-between gap-2 pt-1 border-t border-brand-500/20 text-xs">
            <span class="text-[11px] text-slate-400">Siljish darajasi:</span>
            <div class="flex items-center gap-1">
              <button 
                @click="shiftDepth(-1)"
                class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                -
              </button>
              <span class="w-10 text-center font-mono font-bold text-brand-300 text-xs">
                {{ (activeItem.depthOffset || 0) > 0 ? '+' : '' }}{{ activeItem.depthOffset || 0 }}
              </span>
              <button 
                @click="shiftDepth(+1)"
                class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                +
              </button>
              <button 
                v-if="activeItem.depthOffset !== 0"
                @click="resetDepth"
                class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] ml-1"
                title="Standart holatga qaytarish"
              >
                Nollash
              </button>
            </div>
          </div>
          <p class="text-[10px] text-slate-400 leading-tight">
            💡 <strong>Pastdagi ustiga</strong> tugmasini bossangiz, bu element o'zidan pastdagi/oldidagi devor va toshlarning ustiga chiqadi.
          </p>
        </div>

        <!-- 3. Qatlamni o'zgartirish (Layer Selector) -->
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold text-slate-300">Qatlam (Layer):</span>
          <div class="grid grid-cols-3 gap-1">
            <button 
              v-for="layer in mapStore.project.layers"
              :key="layer.id"
              @click="handleSwitchLayer(layer.id)"
              :class="toolStore.selectedElement?.layerId === layer.id ? 'bg-brand-600 text-white font-bold shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'"
              class="py-1.5 px-1 rounded-lg text-[10px] text-center border border-slate-700/80 truncate transition-colors"
            >
              {{ layer.name }}
            </button>
          </div>
        </div>

        <!-- 4. Katak ichidagi Z-Index (Lokal qavat tartibi) -->
        <div class="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-200 flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-slate-400" />
              Katak ichidagi Z-Index
            </span>
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400">Qiymat:</span>
              <input 
                type="number"
                min="0"
                max="999"
                :value="currentInspectedCellZ"
                @change="(e) => handleCurrentCellZChange((e.target as HTMLInputElement).valueAsNumber)"
                class="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-center font-mono font-bold text-brand-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <!-- Multi-cell Mini Matrix Grid if span > 1 -->
          <div v-if="(activeItem.spanX || 1) > 1 || (activeItem.spanY || 1) > 1" class="flex flex-col gap-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-slate-400 font-medium">Har bir katak uchun alohida Z:</span>
              <button 
                @click="applyCurrentZToAllCells"
                class="text-brand-400 hover:text-brand-300 underline font-medium"
                title="Hamma kataklarga joriy Z-Index qiymatini o'rnatish"
              >
                Hammaga qo'llash
              </button>
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
                    class="border rounded-md p-1 flex flex-col items-center justify-center cursor-pointer transition-all"
                  >
                    <span class="text-[8px] font-mono text-slate-400">
                      ({{ activeItem.x + c - 1 }}, {{ activeItem.y + r - 1 }})
                    </span>
                    <div class="flex items-center gap-0.5 mt-0.5">
                      <button 
                        @click.stop="adjustMatrixCellZ(activeItem.x + c - 1, activeItem.y + r - 1, -1)"
                        class="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold"
                      >
                        -
                      </button>
                      <span class="font-mono text-[10px] font-bold text-brand-300 px-1">
                        {{ getMatrixCellZ(activeItem.x + c - 1, activeItem.y + r - 1) }}
                      </span>
                      <button 
                        @click.stop="adjustMatrixCellZ(activeItem.x + c - 1, activeItem.y + r - 1, +1)"
                        class="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </template>
              </template>
            </div>
          </div>

          <!-- Quick Z Actions for Current Cell -->
          <div class="grid grid-cols-4 gap-1.5 text-xs">
            <button 
              @click="handleBringForward"
              class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex flex-col items-center gap-0.5"
              title="Katak ichida 1 qavat yuqoriga chiqarish (+1)"
            >
              <ArrowUpToLine class="w-4 h-4 text-emerald-400" />
              <span class="text-[10px] font-semibold">Z+ (+1)</span>
            </button>
            <button 
              @click="handleSendBackward"
              class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex flex-col items-center gap-0.5"
              title="Katak ichida 1 qavat pastga tushirish (-1)"
            >
              <ArrowDownToLine class="w-4 h-4 text-amber-400" />
              <span class="text-[10px] font-semibold">Z- (-1)</span>
            </button>
            <button 
              @click="handleBringToTop"
              class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex flex-col items-center gap-0.5"
              title="Eng yuqoriga chiqarish"
            >
              <ChevronsUp class="w-4 h-4 text-brand-400" />
              <span class="text-[10px] font-semibold">Tepaga</span>
            </button>
            <button 
              @click="handleSendToBottom"
              class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex flex-col items-center gap-0.5"
              title="Eng pastga tushirish"
            >
              <ChevronsDown class="w-4 h-4 text-slate-400" />
              <span class="text-[10px] font-semibold">Pastga</span>
            </button>
          </div>
        </div>

        <!-- 5. Anchor / Asos Balandligi (Devorlar va Obyektlar uchun) -->
        <div class="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-slate-200 flex items-center gap-1.5">
              <Crosshair class="w-3.5 h-3.5 text-brand-400" />
              Anchor (Asos / Tag nuqtasi):
            </span>
            <span class="font-mono text-brand-300 font-bold text-xs">{{ Math.round(currentAnchorY * 100) }}%</span>
          </div>
          
          <div class="grid grid-cols-3 gap-1">
            <button 
              @click="handleSetAnchor(0.5, 0.5)"
              :class="Math.abs(currentAnchorY - 0.5) < 0.05 ? 'bg-brand-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
              class="py-1 rounded-lg text-[10px] text-center border border-slate-700"
            >
              Plitka (50%)
            </button>
            <button 
              @click="handleSetAnchor(0.5, 0.88)"
              :class="Math.abs(currentAnchorY - 0.88) < 0.05 ? 'bg-brand-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
              class="py-1 rounded-lg text-[10px] text-center border border-slate-700"
            >
              Devor (88%)
            </button>
            <button 
              @click="handleSetAnchor(0.5, 1.0)"
              :class="Math.abs(currentAnchorY - 1.0) < 0.05 ? 'bg-brand-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
              class="py-1 rounded-lg text-[10px] text-center border border-slate-700"
            >
              Asos (100%)
            </button>
          </div>

          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] text-slate-500 w-12">Nozik Y:</span>
            <input 
              type="range"
              min="0.2"
              max="1.0"
              step="0.02"
              :value="currentAnchorY"
              @input="(e) => handleSetAnchor(currentAnchorX, parseFloat((e.target as HTMLInputElement).value))"
              class="flex-1 accent-brand-500 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>
        </div>

        <!-- 6. Katak o'lchami (Footprint Span: 1x1, 2x2, 3x3, 4x4) -->
        <div class="flex flex-col gap-1.5">
          <div class="flex justify-between items-center text-xs">
            <span class="font-semibold text-slate-300">Katak o'lchami (Footprint Span):</span>
            <span class="font-mono text-brand-400 font-bold">{{ activeItem.spanX || 1 }}×{{ activeItem.spanY || 1 }} katak</span>
          </div>
          <div class="grid grid-cols-6 gap-1">
            <button 
              v-for="span in spans"
              :key="span.label"
              @click="handleSetSpan(span.x, span.y)"
              :class="(activeItem.spanX || 1) === span.x && (activeItem.spanY || 1) === span.y ? 'bg-brand-600 text-white font-bold shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'"
              class="py-1.5 rounded-lg text-[11px] text-center border border-slate-700/80 transition-colors"
            >
              {{ span.label }}
            </button>
          </div>
        </div>

        <!-- 7. Masshtab / Scaling -->
        <div class="flex flex-col gap-1.5">
          <div class="flex justify-between items-center text-xs">
            <span class="font-semibold text-slate-300">Masshtab (Scale):</span>
            <span class="font-mono text-brand-400 font-bold">{{ Math.round((activeItem.scale || 1.0) * 100) }}%</span>
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="adjustScale(-0.1)"
              class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold w-8 text-center"
            >
              -
            </button>
            <input 
              type="range"
              min="0.2"
              max="3.5"
              step="0.05"
              :value="activeItem.scale || 1.0"
              @input="(e) => handleScaleInput(parseFloat((e.target as HTMLInputElement).value))"
              class="flex-1 accent-brand-500 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
            <button 
              @click="adjustScale(+0.1)"
              class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold w-8 text-center"
            >
              +
            </button>
            <button 
              @click="handleScaleInput(1.0)"
              class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
            >
              1x
            </button>
          </div>
        </div>

        <!-- 8. Transform / Flip & Rotate -->
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold text-slate-300">Burish va Akslantirish:</span>
          <div class="grid grid-cols-2 gap-2">
            <button 
              @click="handleFlip"
              class="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            >
              <FlipHorizontal class="w-4 h-4 text-sky-400" />
              <span>Gorizontal Flip</span>
            </button>
            <button 
              @click="handleRotate"
              class="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            >
              <RotateCw class="w-4 h-4 text-emerald-400" />
              <span>90° Aylantirish</span>
            </button>
          </div>
        </div>

        <!-- 9. Piksel nozik siljish (Nudge / Offset X, Y) -->
        <div class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400 font-medium">Piksel siljish (Offset):</span>
            <span class="font-mono text-slate-300 text-[11px]">
              X: {{ activeItem.offsetX || 0 }}px | Y: {{ activeItem.offsetY || 0 }}px
            </span>
          </div>

          <!-- Nudge 4-way arrow buttons -->
          <div class="flex items-center justify-center gap-1.5 py-1">
            <button 
              @click="nudge(-2, 0)"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              title="Chapga 2px siljitish"
            >
              ← 2px
            </button>
            <button 
              @click="nudge(0, -2)"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              title="Tepaga 2px siljitish"
            >
              ↑ 2px
            </button>
            <button 
              @click="nudge(0, 2)"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              title="Pastga 2px siljitish"
            >
              ↓ 2px
            </button>
            <button 
              @click="nudge(2, 0)"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              title="O'ngga 2px siljitish"
            >
              → 2px
            </button>
            <button 
              @click="resetOffset"
              class="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
              title="Nollash"
            >
              0
            </button>
          </div>
        </div>

        <!-- 10. Move & Delete Action Buttons -->
        <div class="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button 
            @click="handleMoveMode"
            :class="toolStore.isMovingElement ? 'bg-brand-600 text-white shadow-glow-brand animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-xs font-bold transition-all flex-1"
          >
            <Move class="w-4 h-4" />
            <span>{{ toolStore.isMovingElement ? 'Katakni bosing' : 'Ko‘chirish' }}</span>
          </button>

          <button 
            @click="handleDelete"
            class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-bold transition-all"
          >
            <Trash2 class="w-4 h-4" />
            <span>O‘chirish</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Help -->
    <div class="p-2.5 border-t border-slate-800 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
      <span>Bekor qilish: <strong class="text-slate-300">O'ng tugma</strong></span>
      <span>O'chirish: <strong class="text-slate-300">Delete</strong></span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Sliders, X, Layers, ArrowUpToLine, ArrowDownToLine, 
  ChevronsUp, ChevronsDown, FlipHorizontal, RotateCw, Move, Trash2, Crosshair 
} from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { TileItem } from '../types/map'
import { cellKey } from '../utils/isometric'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()

const activeCellInMatrix = ref<{ col: number; row: number } | null>(null)

const spans = [
  { label: '1×1', x: 1, y: 1 },
  { label: '2×2', x: 2, y: 2 },
  { label: '3×3', x: 3, y: 3 },
  { label: '4×4', x: 4, y: 4 },
  { label: '2×1', x: 2, y: 1 },
  { label: '1×2', x: 1, y: 2 },
]

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
  if (off === 0) return 'O‘z katagida (0)'
  if (off > 0) return `Pastdagi +${off} katak ustida`
  return `Tepadagi ${off} katak tagida`
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

function handleSetSpan(spanX: number, spanY: number) {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.updateItemSpan(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    spanX,
    spanY,
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

function handleFlip() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.flipTileItem(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    toolStore.selectedElement.layerId
  )
}

function handleRotate() {
  if (!activeItem.value || !toolStore.selectedElement) return
  mapStore.rotateTileItem(
    activeItem.value.x,
    activeItem.value.y,
    activeItem.value.id,
    toolStore.selectedElement.layerId
  )
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
