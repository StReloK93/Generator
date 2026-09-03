<template>
  <div 
    v-if="toolStore.isShortcutsModalOpen"
    class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none pt-safe pb-safe"
  >
    <div class="glass-panel border border-slate-700/80 w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <Keyboard class="w-5 h-5 text-brand-400" />
          <h2 class="font-bold text-sm text-slate-100">
            Klaviatura Tugmalari va Qisqa Yo'llar
          </h2>
        </div>
        <button 
          @click="toolStore.isShortcutsModalOpen = false"
          class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Shortcuts Grid -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div 
          v-for="item in shortcuts" 
          :key="item.action"
          class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80"
        >
          <span class="text-slate-300">{{ item.action }}</span>
          <kbd class="px-2 py-0.5 rounded bg-slate-800 text-brand-300 border border-slate-700 font-mono text-[11px] font-semibold">
            {{ item.key }}
          </kbd>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end pt-2 border-t border-slate-800">
        <button 
          @click="toolStore.isShortcutsModalOpen = false"
          class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all"
        >
          Tushunarli
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Keyboard, X } from 'lucide-vue-next'
import { useToolStore } from '../stores/toolStore'

const toolStore = useToolStore()

const shortcuts = [
  { action: 'Tanlash / Siljitish (Select)', key: 'V' },
  { action: 'Qalam (Brush)', key: 'B' },
  { action: 'To‘ldirish (Bucket)', key: 'G' },
  { action: 'O‘chirg‘ich (Eraser)', key: 'E' },
  { action: 'Pipetka (Eyedropper)', key: 'I' },
  { action: 'Chiziq (Line)', key: 'L' },
  { action: 'To‘rtburchak (Rect)', key: 'U' },
  { action: 'Xaritani siljitish', key: 'Space + Drag' },
  { action: 'Masshtab (Zoom)', key: 'Sichqoncha g‘ildiragi' },
  { action: 'Personaj sayri (Play/Pause)', key: 'P' },
  { action: 'Ketma-ket chizish / qo‘yish', key: 'Shift + Click' },
  { action: 'Bekor qilish (Undo)', key: 'Ctrl + Z' },
  { action: 'Qaytarish (Redo)', key: 'Ctrl + Y' },
]
</script>
