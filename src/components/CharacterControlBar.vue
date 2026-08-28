<template>
  <aside 
    v-if="characterStore.isEnabled"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="glass-panel border-l border-slate-800/90 flex flex-col z-30 transition-all duration-200 select-none w-92 h-full overflow-hidden shadow-2xl absolute right-0 top-0 bg-dark-900/95 backdrop-blur-xl pointer-events-auto"
  >
    <!-- Fixed Header Row -->
    <div class="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
      <div class="flex items-center gap-2.5">
        <!-- Animated Avatar / Status Indicator -->
        <div class="relative">
          <div class="w-8 h-8 rounded-xl bg-linear-to-tr from-amber-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20 border border-amber-400/40">
            <Users class="w-4 h-4 text-amber-100" />
          </div>
          <span 
            class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900"
            :class="characterStore.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'"
          ></span>
        </div>

        <div>
          <div class="font-bold text-slate-100 text-xs flex items-center gap-1.5">
            <span>Chiqish & Harakat Driveri</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              {{ characterStore.units.length }}x
            </span>
          </div>
          <p 
            class="text-[10px] truncate max-w-40 font-medium" 
            :class="characterStore.completedUnitsCount === characterStore.units.length && characterStore.units.length > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'"
            :title="characterStore.statusMessage"
          >
            {{ characterStore.statusMessage }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- Wave / Lap Counter Badge -->
        <div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700 font-mono text-[10px] text-brand-300">
          <RotateCw class="w-3 h-3 text-brand-400" :class="{ 'animate-spin': characterStore.isPlaying }" />
          <span>{{ characterStore.lapCount }}-to'lqin</span>
        </div>

        <!-- Close / Hide Button -->
        <button 
          @click="characterStore.isEnabled = false"
          class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Yopish (Chiqish driverini yashirish)"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Scrollable Body with custom-scrollbar (Y-axis only) -->
    <div class="flex-1 p-3.5 overflow-y-auto overflow-x-hidden flex flex-col gap-3 custom-scrollbar text-xs text-slate-200">

      <!-- SPAWN MODE TOGGLE: All Spawn Points vs Single Spawn Point -->
      <div class="grid grid-cols-2 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px]">
        <button 
          @click="setSpawnMode('all_doors')"
          :class="characterStore.spawnMode === 'all_doors' ? 'bg-amber-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'"
          class="py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
        >
          <Sparkles class="w-3 h-3 text-amber-300" />
          <span>Barcha Nuqtalar (Bir vaqtda)</span>
        </button>

        <button 
          @click="setSpawnMode('single_door')"
          :class="characterStore.spawnMode === 'single_door' ? 'bg-brand-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'"
          class="py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
        >
          <MapPin class="w-3 h-3" />
          <span>Yagona Nuqta</span>
        </button>
      </div>

      <!-- Spawn Point Selector & Placement Tools -->
      <div class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800">
        <div class="flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1">
            <MapPin class="w-3.5 h-3.5 text-amber-400" />
            <span class="font-semibold text-slate-200">Chiqish Nuqtasi (Spawn Point):</span>
          </span>
          <span class="font-mono text-amber-400 font-semibold">
            {{ characterStore.detectedDoors.length }} ta nuqta
          </span>
        </div>

        <!-- Spawn Point Dropdown -->
        <div v-if="characterStore.detectedDoors.length > 0" class="flex items-center gap-1.5">
          <select 
            v-model.number="characterStore.selectedDoorIndex"
            @change="handleDoorChange"
            :disabled="characterStore.isDrawingRoute || characterStore.isSettingSpawnPoint"
            class="flex-1 bg-slate-900 border border-slate-700 hover:border-brand-500/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer transition-colors disabled:opacity-50"
          >
            <option 
              v-for="(door, idx) in characterStore.detectedDoors" 
              :key="door.id" 
              :value="idx"
            >
              🚩 {{ door.name }} (Kat: {{ door.col }}, {{ door.row }})
            </option>
          </select>

          <!-- Delete Spawn Point Button -->
          <button 
            v-if="characterStore.detectedDoors.length > 1"
            @click="characterStore.removeSpawnPoint(characterStore.selectedDoorIndex)"
            class="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
            title="Ushbu chiqish nuqtasini o'chirish"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Spawn Point Placement Action Buttons -->
        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <!-- Add New Spawn Point Button -->
          <button 
            @click="triggerAddSpawnPoint"
            :class="characterStore.isSettingSpawnPoint && characterStore.spawnPointPlacementMode === 'add' ? 'bg-amber-500 text-white font-bold ring-2 ring-amber-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'"
            class="py-1 px-2 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Xaritada xohlagan katakni bosib yangi chiqish nuqtasi qo'shish"
          >
            <Plus class="w-3 h-3 text-amber-400" />
            <span>{{ characterStore.isSettingSpawnPoint && characterStore.spawnPointPlacementMode === 'add' ? 'Xaritani bosing...' : '+ Yangi Nuqta' }}</span>
          </button>

          <!-- Relocate Spawn Point Button -->
          <button 
            @click="triggerRelocateSpawnPoint"
            :class="characterStore.isSettingSpawnPoint && characterStore.spawnPointPlacementMode === 'relocate' ? 'bg-sky-500 text-white font-bold ring-2 ring-sky-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'"
            class="py-1 px-2 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Hozirgi chiqish nuqtasini boshqa katakka ko'chirish"
          >
            <MapPin class="w-3 h-3 text-sky-400" />
            <span>{{ characterStore.isSettingSpawnPoint && characterStore.spawnPointPlacementMode === 'relocate' ? 'Xaritani bosing...' : '📍 Ko\'chirish' }}</span>
          </button>
        </div>
      </div>

      <!-- ROUTE DRAWING MODE PANEL -->
      <div 
        v-if="characterStore.isDrawingRoute" 
        class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col gap-2 animate-in fade-in"
      >
        <div class="flex items-center justify-between text-[11px]">
          <span class="flex items-center gap-1 text-emerald-300 font-bold">
            <Pencil class="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Yo'l Chizish Faol</span>
          </span>
          <span class="font-mono text-emerald-400 text-[10px] font-semibold">
            {{ characterStore.drawingPath.length }} ta qadam
          </span>
        </div>
        <p class="text-[10px] text-slate-300 leading-tight">
          Xaritadagi kataklarni ketma-ket bosing. Yo'lni xohlagan joyingizda (istalgan katakda) tugatishingiz mumkin!
        </p>

        <!-- Route Drawing Action Buttons -->
        <div class="grid grid-cols-4 gap-1 pt-1">
          <button 
            @click="characterStore.undoLastPathTile()"
            class="py-1 px-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] flex items-center justify-center gap-0.5 cursor-pointer"
            title="Oxirgi qadamni bekor qilish"
          >
            <Undo2 class="w-3 h-3" />
            <span>Bekor</span>
          </button>
          <button 
            @click="characterStore.clearDrawnRoute()"
            class="py-1 px-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-[10px] flex items-center justify-center gap-0.5 cursor-pointer"
            title="Barchasini tozalash"
          >
            <Trash2 class="w-3 h-3" />
            <span>Tozalash</span>
          </button>
          <button 
            @click="characterStore.cancelDrawingRoute()"
            class="py-1 px-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[10px] flex items-center justify-center cursor-pointer"
          >
            <span>Yopish</span>
          </button>
          <button 
            @click="characterStore.finishDrawingRoute()"
            class="py-1 px-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-md cursor-pointer active:scale-95"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Saqlash</span>
          </button>
        </div>
      </div>

      <!-- DRAW ROUTE TOGGLE (When not in drawing mode) -->
      <div v-else class="flex items-center gap-1.5">
        <button 
          @click="characterStore.startDrawingCustomRoute()"
          class="flex-1 py-2 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/50 text-purple-200 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
        >
          <Pencil class="w-3.5 h-3.5 text-purple-400" />
          <span>{{ characterStore.currentActiveRoute.length > 1 ? "✏️ Yo'nalishni Qayta Chizish" : "✏️ Chiqish Nuqtasiga Yo'l Chizish" }}</span>
        </button>

        <button 
          v-if="characterStore.currentActiveRoute.length > 1"
          @click="characterStore.deleteCurrentRoute()"
          class="py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
          title="Ushbu chiqish nuqtasining yo'nalishini o'chirish"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- FORMATION & DENSITY SETTINGS -->
      <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2.5">
        
        <!-- 1. Formation: Juft-juft (Yonma-yon) vs Bittalab -->
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-400 flex items-center gap-1">
            <span>Harakat tarkibi:</span>
          </span>
          <div class="flex items-center gap-1">
            <button 
              @click="setFormation('pairs')"
              :class="characterStore.formation === 'pairs' ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700'"
              class="py-0.5 px-2 rounded text-[10px] border transition-colors cursor-pointer"
              title="Katakda 2 ta odam yonma-yon juftlikda yuguradi"
            >
              👥 Yonma-yon (2 kishi)
            </button>
            <button 
              @click="setFormation('single')"
              :class="characterStore.formation === 'single' ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700'"
              class="py-0.5 px-2 rounded text-[10px] border transition-colors cursor-pointer"
            >
              🚶 Bittalab
            </button>
          </div>
        </div>

        <!-- Density / Spacing Selector -->
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-400">Oraliq masofa:</span>
          <div class="flex items-center gap-1">
            <button 
              @click="characterStore.pairDistance = 0.25"
              :class="characterStore.pairDistance === 0.25 ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/60 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700'"
              class="py-0.5 px-1.5 rounded text-[10px] border transition-colors cursor-pointer"
              title="O'ta yaqin / Zich"
            >
              ⚡ O'ta zich (0.25)
            </button>
            <button 
              @click="characterStore.pairDistance = 0.35"
              :class="characterStore.pairDistance === 0.35 ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/60 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700'"
              class="py-0.5 px-1.5 rounded text-[10px] border transition-colors cursor-pointer"
              title="Standart zich"
            >
              Zich (0.35)
            </button>
            <button 
              @click="characterStore.pairDistance = 0.6"
              :class="characterStore.pairDistance === 0.6 ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/60 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700'"
              class="py-0.5 px-1.5 rounded text-[10px] border transition-colors cursor-pointer"
            >
              Kengroq (0.6)
            </button>
          </div>
        </div>
      </div>

      <!-- Playback Progress Bar -->
      <div v-if="characterStore.currentActiveRoute.length > 1" class="flex flex-col gap-1">
        <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Yo'l uzunligi: {{ characterStore.currentActiveRoute.length }} ta katak</span>
          <span>{{ characterStore.progressPercent }}% bosib o'tildi</span>
        </div>
        <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
          <div 
            class="h-full bg-linear-to-r from-brand-500 via-indigo-400 to-emerald-400 transition-all duration-150"
            :style="{ width: `${characterStore.progressPercent}%` }"
          ></div>
        </div>
      </div>
      </div>

      <!-- Fixed Footer: Camera Follow & Path Trail Controls -->
      <div class="p-3 border-t border-slate-800/80 bg-slate-900/90 shrink-0 flex items-center justify-between gap-2">
        <span class="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
          <span>Kamera & Yo'l vizualizatsiyasi:</span>
        </span>

        <div class="flex items-center gap-1.5">
          <!-- Follow Camera Toggle -->
          <button 
            @click="characterStore.followCamera = !characterStore.followCamera"
            :class="characterStore.followCamera ? 'bg-brand-500/20 text-brand-300 border-brand-500/50 ring-1 ring-brand-400/40 font-bold' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'"
            class="p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            title="Kamerani personajlarga ergashtirish"
          >
            <Eye class="w-3.5 h-3.5" />
            <span class="text-[10px]">Kamera</span>
          </button>

          <!-- Path Trail Toggle -->
          <button 
            @click="characterStore.showPathTrail = !characterStore.showPathTrail"
            :class="characterStore.showPathTrail ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 ring-1 ring-purple-400/40 font-bold' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'"
            class="p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            title="Yo'l chizig'ini ko'rsatish"
          >
            <Footprints class="w-3.5 h-3.5" />
            <span class="text-[10px]">Yo'l</span>
          </button>
        </div>
      </div>
  </aside>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { 
  Users, Play, Pause, RotateCcw, RotateCw, DoorClosed, 
  Sparkles, Zap, Eye, Footprints, Pencil, Check, Trash2, Undo2, MapPin, Plus, X 
} from 'lucide-vue-next'
import { useCharacterStore } from '../stores/characterStore'

const characterStore = useCharacterStore()

onMounted(() => {
  characterStore.detectDoors()
  if (characterStore.detectedDoors.length > 0) {
    characterStore.spawnAtDoor(0)
  }
})

function triggerAddSpawnPoint() {
  if (characterStore.isSettingSpawnPoint && characterStore.spawnPointPlacementMode === 'add') {
    characterStore.isSettingSpawnPoint = false
  } else {
    characterStore.isSettingSpawnPoint = true
    characterStore.spawnPointPlacementMode = 'add'
  }
}

function triggerRelocateSpawnPoint() {
  if (characterStore.isSettingSpawnPoint && characterStore.spawnPointPlacementMode === 'relocate') {
    characterStore.isSettingSpawnPoint = false
  } else {
    characterStore.isSettingSpawnPoint = true
    characterStore.spawnPointPlacementMode = 'relocate'
  }
}

function handleDoorChange() {
  characterStore.spawnAtDoor(characterStore.selectedDoorIndex)
}

function setSpawnMode(mode: 'all_doors' | 'single_door') {
  characterStore.spawnMode = mode
  characterStore.resetTour()
}

function setFormation(form: 'pairs' | 'single') {
  characterStore.formation = form
  characterStore.resetTour()
}
</script>
