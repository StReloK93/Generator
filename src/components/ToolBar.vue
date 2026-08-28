<template>
  <div class="absolute left-4 top-20 z-20 flex flex-col gap-1.5 p-1.5 rounded-xl glass-panel shadow-2xl border border-slate-800/80 select-none">
    <!-- Select & Move Tool -->
    <button 
      @click="toolStore.setTool('select')"
      :class="toolStore.activeTool === 'select' ? 'btn-tool-active !text-purple-400 !border-purple-500/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'"
      class="p-2.5 rounded-lg transition-all relative group flex items-center justify-center"
      title="Tanlash va Siljitish / Select & Move (V)"
    >
      <MousePointerClick class="w-5 h-5" />
      <span class="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
        Tanlash / Siljitish (V)
      </span>
    </button>

    <div class="h-px w-full bg-slate-800/80 my-0.5"></div>

    <!-- Brush Tool -->
    <button 
      @click="toolStore.setTool('brush')"
      :class="toolStore.activeTool === 'brush' ? 'btn-tool-active' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'"
      class="p-2.5 rounded-lg transition-all relative group flex items-center justify-center"
      title="Qalam / Brush (B)"
    >
      <Paintbrush class="w-5 h-5" />
      <span class="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
        Qalam (B)
      </span>
    </button>

    <!-- Bucket Fill Tool -->
    <button 
      @click="toolStore.setTool('bucket')"
      :class="toolStore.activeTool === 'bucket' ? 'btn-tool-active' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'"
      class="p-2.5 rounded-lg transition-all relative group flex items-center justify-center"
      title="Bo'yash / Bucket Fill (G)"
    >
      <PaintBucket class="w-5 h-5" />
      <span class="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
        To'ldirish (G)
      </span>
    </button>

    <!-- Line Tool -->
    <button 
      @click="toolStore.setTool('line')"
      :class="toolStore.activeTool === 'line' ? 'btn-tool-active' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'"
      class="p-2.5 rounded-lg transition-all relative group flex items-center justify-center"
      title="Chiziq / Line (L)"
    >
      <Minus class="w-5 h-5 rotate-45" />
      <span class="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
        Chiziq (L)
      </span>
    </button>

    <!-- Rectangle Tool -->
    <button 
      @click="toolStore.setTool('rect')"
      :class="toolStore.activeTool === 'rect' ? 'btn-tool-active' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'"
      class="p-2.5 rounded-lg transition-all relative group flex items-center justify-center"
      title="To'rtburchak maydon (U)"
    >
      <Square class="w-5 h-5" />
      <span class="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
        Maydon / To'rtburchak (U)
      </span>
    </button>

    <div class="h-px w-full bg-slate-800/80 my-1"></div>

    <!-- Eraser Tool -->
    <button 
      @click="toolStore.setTool('eraser')"
      :class="toolStore.activeTool === 'eraser' ? 'btn-tool-active !text-red-400 !border-red-500/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'"
      class="p-2.5 rounded-lg transition-all relative group flex items-center justify-center"
      title="O'chirg'ich / Eraser (E)"
    >
      <Eraser class="w-5 h-5" />
      <span class="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
        O'chirg'ich (E)
      </span>
    </button>

    <!-- Eyedropper / Color Picker -->
    <button 
      @click="toolStore.setTool('picker')"
      :class="toolStore.activeTool === 'picker' ? 'btn-tool-active !text-amber-400 !border-amber-500/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'"
      class="p-2.5 rounded-lg transition-all relative group flex items-center justify-center"
      title="Pipetka / Eyedropper (I)"
    >
      <Pipette class="w-5 h-5" />
      <span class="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
        Pipetka (I)
      </span>
    </button>

    <!-- Pan / Move Viewport -->
    <button 
      @click="toolStore.setTool('pan')"
      :class="toolStore.activeTool === 'pan' ? 'btn-tool-active' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'"
      class="p-2.5 rounded-lg transition-all relative group flex items-center justify-center"
      title="Pan / Siljitish (H yoki Space)"
    >
      <Hand class="w-5 h-5" />
      <span class="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
        Siljitish (H / Space)
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { 
  MousePointerClick, Paintbrush, PaintBucket, Minus, Square, 
  Eraser, Pipette, Hand 
} from 'lucide-vue-next'
import { useToolStore } from '../stores/toolStore'

const toolStore = useToolStore()
</script>
