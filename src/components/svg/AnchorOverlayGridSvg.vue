<template>
  <svg 
    class="absolute inset-0 w-full h-full pointer-events-none z-20"
    :style="{
      transform: `scale(${zoom})`,
      transformOrigin: `${viewportCenter.x}px ${viewportCenter.y}px`
    }"
  >
    <g v-if="viewMode === 'isometric'">
      <!-- Target Tile Diamond Outline (Glowing Cyan on top of sprite) -->
      <polygon 
        :points="footprintPolygon"
        fill="none"
        stroke="#38bdf8"
        stroke-width="1.8"
        stroke-dasharray="4 2"
      />

      <!-- 4 Diamond Vertices (Cyan Dots) -->
      <circle 
        v-for="(vert, vIdx) in footprintVertices" 
        :key="vIdx"
        :cx="vert.x" 
        :cy="vert.y" 
        r="3" 
        fill="#38bdf8" 
        stroke="#0f172a" 
        stroke-width="1" 
      />

      <!-- Footprint Center Crosshairs (Rose/Red) -->
      <line 
        :x1="footprintCenter.x - 18" 
        :y1="footprintCenter.y" 
        :x2="footprintCenter.x + 18" 
        :y2="footprintCenter.y" 
        stroke="#f43f5e" 
        stroke-width="1.8" 
      />
      <line 
        :x1="footprintCenter.x" 
        :y1="footprintCenter.y - 12" 
        :x2="footprintCenter.x" 
        :y2="footprintCenter.y + 12" 
        stroke="#f43f5e" 
        stroke-width="1.8" 
      />
      <circle 
        :cx="footprintCenter.x" 
        :cy="footprintCenter.y" 
        r="4" 
        fill="#f43f5e" 
        stroke="#ffffff" 
        stroke-width="1.5" 
      />
    </g>

    <!-- 2D Sprite Mode Pivot Indicator -->
    <g v-else>
      <circle 
        :cx="spriteModePivot.x" 
        :cy="spriteModePivot.y" 
        r="4.5" 
        fill="#f43f5e" 
        stroke="#ffffff" 
        stroke-width="1.5" 
      />
      <line 
        :x1="spriteModePivot.x - 16" 
        :y1="spriteModePivot.y" 
        :x2="spriteModePivot.x + 16" 
        :y2="spriteModePivot.y" 
        stroke="#f43f5e" 
        stroke-width="1.5" 
      />
      <line 
        :x1="spriteModePivot.x" 
        :y1="spriteModePivot.y - 16" 
        :x2="spriteModePivot.x" 
        :y2="spriteModePivot.y + 16" 
        stroke="#f43f5e" 
        stroke-width="1.5" 
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  zoom: number
  viewportCenter: { x: number; y: number }
  viewMode: 'isometric' | 'sprite'
  footprintPolygon: string
  footprintVertices: Array<{ x: number; y: number }>
  footprintCenter: { x: number; y: number }
  spriteModePivot: { x: number; y: number }
}>()
</script>
