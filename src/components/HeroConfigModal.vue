<template>
  <UiModal
    :is-open="toolStore.isHeroConfigModalOpen"
    title="Hero Settings"
    subtitle="Qahramon modeli, harakat parametrlari va boshlang'ich koordinatalar"
    :icon="Swords"
    icon-color="brand"
    size="3xl"
    @close="toolStore.closeHeroConfig()"
  >
    <div class="flex flex-col gap-5">
      <!-- 1. Hero Model Selection Grid -->
      <div class="flex flex-col gap-2">
        <label class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <User class="w-4 h-4 text-emerald-400" />
          <span>Qahramon Modeli (Hero Model)</span>
        </label>
        
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <UiCard
            v-for="model in HERO_MODELS"
            :key="model.id"
            :selected="heroStore.hero.model === model.id"
            interactive
            padding="sm"
            custom-class="flex items-center gap-2.5 cursor-pointer border-slate-800 hover:border-emerald-500/50"
            @click="heroStore.setHeroModel(model.id)"
          >
            <div 
              class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              :class="heroStore.hero.model === model.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'"
            >
              <User class="w-5 h-5" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold truncate text-slate-100">{{ model.label }}</span>
              <span class="text-[10px] text-slate-400 capitalize">{{ model.id }}</span>
            </div>
          </UiCard>
        </div>
      </div>

      <!-- 2. Hero Attributes (Speed, Scale, Spawn Position) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Hero Speed Slider -->
        <UiCard variant="subtle" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Footprints class="w-4 h-4 text-amber-400" />
              <span>Harakat Tezligi (Speed)</span>
            </span>
            <UiBadge variant="amber" size="xs">{{ heroStore.hero.speed.toFixed(1) }}x</UiBadge>
          </div>
          <UiSlider
            v-model="heroStore.hero.speed"
            :min="1.0"
            :max="10.0"
            :step="0.5"
            unit="x"
            show-min-max
            @update:model-value="heroStore.setHeroSpeed"
          />
        </UiCard>

        <!-- Hero Scale Slider -->
        <UiCard variant="subtle" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles class="w-4 h-4 text-brand-400" />
              <span>Masshtab (Scale)</span>
            </span>
            <UiBadge variant="brand" size="xs">{{ (heroStore.hero.scale || 1.15).toFixed(2) }}x</UiBadge>
          </div>
          <UiSlider
            v-model="heroStore.hero.scale"
            :min="0.5"
            :max="2.0"
            :step="0.05"
            unit="x"
            show-min-max
            @update:model-value="heroStore.setHeroScale"
          />
        </UiCard>
      </div>

      <!-- 3. Spawn Position & Quick Controls -->
      <UiCard variant="default" padding="md" custom-class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex flex-col gap-1 w-full sm:w-auto">
          <span class="text-xs font-bold text-slate-200">Boshlang'ich Nuqta (Spawn Position)</span>
          <p class="text-[11px] text-slate-400 font-mono">
            Katak: Col {{ Math.round(heroStore.hero.currentCol) }}, Row {{ Math.round(heroStore.hero.currentRow) }}
          </p>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <UiButton
            variant="game-green"
            size="sm"
            :leading-icon="Check"
            @click="toolStore.closeHeroConfig()"
          >
            Saqlash
          </UiButton>
        </div>
      </UiCard>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { Swords, User, Footprints, Sparkles, Check } from 'lucide-vue-next'
import { UiModal, UiCard, UiBadge, UiSlider, UiButton } from './ui'
import { useHeroStore, HERO_MODELS } from '../stores/heroStore'
import { useToolStore } from '../stores/toolStore'

const heroStore = useHeroStore()
const toolStore = useToolStore()
</script>
