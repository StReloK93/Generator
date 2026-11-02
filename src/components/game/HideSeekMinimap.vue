<template>
  <div class="relative w-full aspect-2/1 rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden">
    <canvas ref="canvasRef" class="absolute inset-0 size-full" />
    <span class="absolute top-1 left-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
      <MapIcon class="size-3" /> {{ $t('hideseek.map') }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Map as MapIcon } from 'lucide-vue-next'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { HideSeekMinimapRenderer } from '../../rendering/canvas/HideSeekMinimapRenderer'

/** Redraws a few times per second: the explored area changes slowly */
const REDRAW_MS = 250

const hideSeekStore = useHideSeekStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: HideSeekMinimapRenderer | null = null
let timer: ReturnType<typeof setInterval> | null = null

function redraw() {
  const canvas = canvasRef.value
  const view = hideSeekStore.getMinimapView()
  if (!canvas || !renderer || !view) return
  const dpr = window.devicePixelRatio || 1
  const width = Math.round(canvas.clientWidth * dpr)
  const height = Math.round(canvas.clientHeight * dpr)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  renderer.draw(view)
}

onMounted(() => {
  if (canvasRef.value) renderer = new HideSeekMinimapRenderer(canvasRef.value)
  timer = setInterval(redraw, REDRAW_MS)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
