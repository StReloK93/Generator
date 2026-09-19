<template>
  <svg 
    class="absolute inset-0 w-full h-full pointer-events-none"
    :style="{
      transform: `scale(${zoom})`,
      transformOrigin: `${viewportCenter.x}px ${viewportCenter.y}px`
    }"
  >
    <g v-if="viewMode === 'isometric'">
      <!-- Ambient 5x5 Isometric Diamond Grid (Bright & Clearly Visible) -->
      <g opacity="0.65">
        <polygon 
          v-for="cell in ambientGridCells" 
          :key="cell.key"
          :points="cell.points"
          fill="rgba(15, 23, 42, 0.6)"
          stroke="rgba(100, 116, 139, 0.75)"
          stroke-width="1.2"
        />
      </g>

      <!-- Optional Ground Slab Underneath for Preview -->
      <polygon 
        v-if="showGroundGuide"
        :points="primaryCellPolygon"
        fill="rgba(34, 197, 94, 0.25)"
        stroke="rgba(34, 197, 94, 0.8)"
        stroke-width="1.8"
      />

      <!-- Highlight Active Target Footprint Diamond Base -->
      <polygon 
        :points="footprintPolygon"
        fill="rgba(99, 102, 241, 0.2)"
        stroke="rgba(129, 140, 248, 0.9)"
        stroke-width="2"
      />
    </g>

    <!-- 2D Sprite Mode: Center Guides -->
    <g v-else opacity="0.5">
      <line 
        :x1="viewportCenter.x - 120" 
        :y1="viewportCenter.y" 
        :x2="viewportCenter.x + 120" 
        :y2="viewportCenter.y" 
        stroke="#64748b" 
        stroke-width="1" 
        stroke-dasharray="3 3" 
      />
      <line 
        :x1="viewportCenter.x" 
        :y1="viewportCenter.y - 120" 
        :x2="viewportCenter.x" 
        :y2="viewportCenter.y + 120" 
        stroke="#64748b" 
        stroke-width="1" 
        stroke-dasharray="3 3" 
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  zoom: number
  viewportCenter: { x: number; y: number }
  viewMode: 'isometric' | 'sprite'
  ambientGridCells: Array<{ key: string; points: string }>
  showGroundGuide: boolean
  primaryCellPolygon: string
  footprintPolygon: string
}>()
</script>
