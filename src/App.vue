<template>
  <div class="h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// Root application container holding Vue Router view
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
</style>
