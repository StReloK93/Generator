<template>
  <div class="relative z-30 flex items-center gap-2">
    <!-- Hero Compact Quick Card -->
    <div 
      class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 select-none shadow-lg"
      :class="[
        heroStore.isSelected && heroStore.isEnabled
          ? 'bg-slate-900/90 border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
          : 'bg-slate-900/80 border-slate-800 shadow-black/40 opacity-85 hover:opacity-100'
      ]"
    >
      <!-- Hero Model Selection Trigger & Avatar -->
      <div 
        class="relative flex items-center justify-center w-8.5 h-8.5 rounded-lg bg-slate-800/90 border cursor-pointer group transition-all"
        :class="heroStore.isSelected ? 'border-emerald-400/60 shadow-inner' : 'border-slate-700'"
        :title="$t('hero.selectModel') || 'Hero Model'"
        @click="isModelMenuOpen = !isModelMenuOpen"
      >
        <Crown class="w-4.5 h-4.5 text-amber-400 drop-shadow" />
        <span class="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
          <span 
            v-if="heroStore.isMoving" 
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
          ></span>
          <span 
            class="relative inline-flex rounded-full h-2.5 w-2.5"
            :class="heroStore.isEnabled ? (heroStore.isMoving ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-slate-600'"
          ></span>
        </span>
      </div>

      <!-- Hero Info & Controls -->
      <div class="flex flex-col min-w-18 cursor-pointer" @click="toggleSelectHero">
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-bold capitalize text-slate-100 leading-tight">
            {{ heroStore.hero.model }}
          </span>
          <span 
            v-if="heroStore.isMoving"
            class="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider animate-pulse"
          >
            RUN
          </span>
        </div>
        <span class="text-[10px] text-slate-400 font-mono">
          ({{ Math.round(heroStore.hero.currentCol) }}, {{ Math.round(heroStore.hero.currentRow) }})
        </span>
      </div>

      <!-- Select / Focus Button -->
      <UiIconButton
        :icon="Navigation"
        size="xs"
        :variant="heroStore.isSelected ? 'success' : 'ghost'"
        :title="$t('hero.clickToMove') || 'Hero Active / Move On Click'"
        @click="toggleSelectHero"
      />

      <!-- Enable / Disable Toggle -->
      <UiIconButton
        :icon="heroStore.isEnabled ? Footprints : EyeOff"
        size="xs"
        :variant="heroStore.isEnabled ? 'amber' : 'ghost'"
        :title="heroStore.isEnabled ? 'Hero Enabled' : 'Hero Disabled'"
        @click="heroStore.toggleHero()"
      />
    </div>

    <!-- Dropdown Model Selector Popover -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 -translate-y-1"
    >
      <div 
        v-if="isModelMenuOpen" 
        class="absolute top-12 left-0 w-52 p-2 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl flex flex-col gap-1.5 z-50"
      >
        <div class="flex items-center justify-between px-1.5 py-0.5 border-b border-slate-800 pb-1">
          <span class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Hero Model
          </span>
          <span class="text-[10px] text-emerald-400 font-mono">
            {{ HERO_MODELS.length }} models
          </span>
        </div>

        <div class="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto pr-0.5">
          <button
            v-for="m in HERO_MODELS"
            :key="m.id"
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-all"
            :class="[
              heroStore.hero.model === m.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
            ]"
            @click="selectModel(m.id)"
          >
            <User class="w-3.5 h-3.5 opacity-70" />
            <span class="truncate">{{ m.label }}</span>
          </button>
        </div>

        <!-- Speed quick preset slider -->
        <div class="flex items-center justify-between px-1.5 pt-1 border-t border-slate-800">
          <span class="text-[10px] text-slate-400 font-medium">Tezlik:</span>
          <div class="flex items-center gap-1">
            <button 
              v-for="s in [2.5, 4.0, 6.0, 8.0]" 
              :key="s"
              class="px-1.5 py-0.5 text-[10px] rounded font-mono font-bold transition-all"
              :class="heroStore.hero.speed === s ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-slate-200'"
              @click="heroStore.setHeroSpeed(s)"
            >
              {{ s }}x
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Crown, Navigation, Footprints, EyeOff, User } from 'lucide-vue-next'
import { useHeroStore, HERO_MODELS } from '../../stores/heroStore'
import { UiIconButton } from '../ui'

const heroStore = useHeroStore()
const isModelMenuOpen = ref(false)

function toggleSelectHero() {
  heroStore.selectHero(!heroStore.isSelected)
}

function selectModel(modelId: string) {
  heroStore.setHeroModel(modelId)
  isModelMenuOpen.value = false
}
</script>
