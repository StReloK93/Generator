<template>
  <!-- Guideline SVG line connecting Element Center to Mouse Position during Modal Scale / Grab -->
  <svg class="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible">
    <!-- Origin Center Anchor Dot -->
    <circle 
      :cx="activeModalCenterScreen.x" 
      :cy="activeModalCenterScreen.y" 
      r="5" 
      fill="#f59e0b" 
      stroke="#ffffff" 
      stroke-width="2" 
      class="animate-pulse"
    />
    <!-- Dashed Guideline to Mouse -->
    <line 
      :x1="activeModalCenterScreen.x" 
      :y1="activeModalCenterScreen.y" 
      :x2="currentMouseScreen.x" 
      :y2="currentMouseScreen.y" 
      :stroke="modalMode === 'scale' ? '#10b981' : '#38bdf8'" 
      stroke-width="2" 
      stroke-dasharray="6 4"
    />
    <!-- Active Axis Constraint Visual Line -->
    <line 
      v-if="axisConstraint === 'x'"
      x1="0" 
      :y1="activeModalCenterScreen.y" 
      x2="10000" 
      :y2="activeModalCenterScreen.y" 
      stroke="#ef4444" 
      stroke-width="1.5" 
      stroke-dasharray="4 4"
      opacity="0.75"
    />
    <line 
      v-if="axisConstraint === 'y'"
      :x1="activeModalCenterScreen.x" 
      y1="0" 
      :x2="activeModalCenterScreen.x" 
      y2="10000" 
      stroke="#22c55e" 
      stroke-width="1.5" 
      stroke-dasharray="4 4"
      opacity="0.75"
    />
    <!-- Mouse Tip Pointer Dot -->
    <circle 
      :cx="currentMouseScreen.x" 
      :cy="currentMouseScreen.y" 
      r="4" 
      :fill="modalMode === 'scale' ? '#10b981' : '#38bdf8'" 
      stroke="#ffffff" 
      stroke-width="1.5" 
    />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  activeModalCenterScreen: { x: number; y: number }
  currentMouseScreen: { x: number; y: number }
  modalMode: 'none' | 'grab' | 'scale' | 'rotate'
  axisConstraint: 'none' | 'x' | 'y'
}>()
</script>
