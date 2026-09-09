<template>
  <div class="h-dvh w-screen min-h-dvh max-h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans select-none flex flex-col">
    <router-view v-slot="{ Component, route }">
      <Transition
        name="game-page"
        mode="out-in"
      >
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>
    <UiToastContainer />
    <UiConfirmModal />
  </div>
</template>

<script setup lang="ts">
import { UiToastContainer, UiConfirmModal } from './components/ui'
</script>

<style>
/* Global styles */
body {
  margin: 0;
  padding: 0;
  background-color: #090d16;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
  user-select: none;
}

/* Smooth Game Route Page Transitions */
.game-page-enter-active,
.game-page-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.game-page-enter-from {
  opacity: 0;
  transform: scale(0.992) translateY(2px);
}

.game-page-leave-to {
  opacity: 0;
  transform: scale(1.008) translateY(-2px);
}
</style>
