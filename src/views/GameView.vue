<template>
  <div class="relative w-full h-full">
    <GameStage :is-editor-mode="false" />
  </div>
</template>

<script setup lang="ts">
import GameStage from '../components/game/GameStage.vue'
</script>
