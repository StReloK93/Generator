<template>
  <!-- 2:1 Isometric Diamond Base Guide (Always at the very bottom of the 256x512 canvas) -->
  <svg 
    class="absolute inset-0 w-full h-full pointer-events-none opacity-60"
    :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
  >
    <!-- Diamond base 256x128 at the bottom (center at 128, 448; bottom tip at 128, 512) -->
    <polygon 
      :points="`
        ${canvasWidth / 2}, ${canvasHeight - 128} 
        ${canvasWidth}, ${canvasHeight - 64} 
        ${canvasWidth / 2}, ${canvasHeight} 
        0, ${canvasHeight - 64}
      `"
      fill="rgba(56, 189, 248, 0.08)"
      stroke="#38bdf8"
      stroke-width="1.5"
      stroke-dasharray="4 4"
    />

    <!-- Secondary grid lines -->
    <line 
      x1="0" 
      :y1="canvasHeight - 64" 
      :x2="canvasWidth" 
      :y2="canvasHeight - 64" 
      stroke="rgba(56, 189, 248, 0.4)" 
      stroke-width="1" 
    />
    <line 
      :x1="canvasWidth / 2" 
      :y1="canvasHeight - 128" 
      :x2="canvasWidth / 2" 
      :y2="canvasHeight" 
      stroke="rgba(56, 189, 248, 0.4)" 
      stroke-width="1" 
    />

    <!-- Vertical axis line -->
    <line 
      v-if="showCenterOrigin"
      :x1="canvasWidth / 2" 
      y1="10" 
      :x2="canvasWidth / 2" 
      :y2="canvasHeight - 10" 
      stroke="rgba(245, 158, 11, 0.5)" 
      stroke-width="1" 
      stroke-dasharray="3 3"
    />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  canvasWidth: number
  canvasHeight: number
  showCenterOrigin?: boolean
}>()
</script>
