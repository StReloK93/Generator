<template>
  <!-- Top indicator strip: role and rounds won, treasure, trait, breath, footsteps -->
  <div class="flex items-start justify-between gap-2 min-w-0">
    <div class="flex items-center gap-1.5 flex-wrap min-w-0">
      <div
        class="flex items-center gap-1.5 h-8 rounded-full border pl-1 pr-2.5 bg-slate-950/80 backdrop-blur-md"
        :class="isSeeker ? 'border-rose-500/40' : 'border-emerald-500/40'"
      >
        <span
          class="size-6 rounded-full flex items-center justify-center"
          :class="isSeeker ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'"
        >
          <component :is="isSeeker ? Search : EyeOff" class="size-3.5" />
        </span>
        <span class="text-[11px] font-extrabold text-slate-50 hidden sm:inline">
          {{ isSeeker ? $t('hideseek.roleSeeker') : $t('hideseek.roleHider') }}
        </span>
        <span class="text-[10px] font-bold text-slate-400 tabular-nums">{{ hideSeekStore.round }}/{{ hideSeekStore.rounds }}</span>
        <!-- Rounds won: seekers : hiders -->
        <span class="text-[10px] font-black tabular-nums" :title="$t('hideseek.roundWins')">
          <span class="text-rose-300">{{ hideSeekStore.roundWins.seeker }}</span><span class="text-slate-500">:</span><span class="text-emerald-300">{{ hideSeekStore.roundWins.hider }}</span>
        </span>
      </div>

      <!-- Treasure: a hider their own share brought home (a blue gem while carrying one), a seeker how many hiders are done -->
      <div
        class="flex items-center gap-1 h-8 rounded-full border px-2.5 bg-slate-950/80 backdrop-blur-md"
        :class="hideSeekStore.isCarrying ? 'border-sky-400/70 animate-pulse' : 'border-amber-500/30'"
        :title="isSeeker ? $t('hideseek.hidersReady') : $t('hideseek.chestsHint', { n: hideSeekStore.chestQuota })"
      >
        <Gem class="size-3.5" :class="hideSeekStore.isCarrying ? 'text-sky-300' : 'text-amber-300'" />
        <span class="text-xs font-black tabular-nums text-amber-300">
          {{ isSeeker ? `${hideSeekStore.hidersReady}/${hideSeekStore.hidersTotal}` : `${hideSeekStore.myChests}/${hideSeekStore.chestQuota}` }}
        </span>
        <span v-if="!isSeeker" class="text-[10px] font-bold tabular-nums text-amber-200/60" :title="$t('hideseek.teamReady', { done: hideSeekStore.hidersReady, total: hideSeekStore.hidersTotal })">
          <Users class="inline size-3 -mt-0.5" /> {{ hideSeekStore.hidersReady }}/{{ hideSeekStore.hidersTotal }}
        </span>
      </div>

      <!-- Own character trait, and a seeker's momentum from this round's catches -->
      <div
        v-if="trait"
        class="flex items-center gap-1 h-8 rounded-full border border-amber-500/30 px-2.5 bg-slate-950/80 backdrop-blur-md"
        :title="$t(trait.desc)"
      >
        <component :is="trait.icon" class="size-3.5 text-amber-300" />
        <span class="text-[11px] font-bold text-amber-200 hidden sm:inline">{{ $t(trait.label) }}</span>
      </div>
      <div
        v-if="momentum > 0"
        class="flex items-center gap-1 h-8 rounded-full border border-rose-500/50 px-2.5 bg-slate-950/80 backdrop-blur-md"
        :title="$t('hideseek.momentumDesc')"
      >
        <Zap class="size-3.5 text-rose-300" />
        <span class="text-xs font-black tabular-nums text-rose-200">+{{ momentum }}%</span>
      </div>

      <div
        class="flex items-center gap-1.5 h-8 rounded-full border px-2.5 bg-slate-950/80 backdrop-blur-md"
        :class="hideSeekStore.isExhausted ? 'border-rose-500/50' : 'border-slate-700/80'"
        :title="hideSeekStore.isExhausted ? $t('hideseek.tired') : $t('hideseek.stamina')"
      >
        <Wind class="size-3.5" :class="hideSeekStore.isExhausted ? 'text-rose-300 animate-pulse' : 'text-slate-300'" />
        <div class="w-10 sm:w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            class="h-full rounded-full transition-[width] duration-150"
            :class="hideSeekStore.isExhausted ? 'bg-rose-400' : 'bg-emerald-400'"
            :style="{ width: `${hideSeekStore.staminaLevel * 100}%` }"
          />
        </div>
      </div>

      <!-- Footsteps meter: how loud the others' steps are -->
      <div
        class="flex items-center gap-1.5 h-8 rounded-full border px-2.5 bg-slate-950/80 backdrop-blur-md"
        :class="hideSeekStore.heardLevel > 0 ? 'border-amber-500/50' : 'border-slate-700/80'"
        :title="hideSeekStore.heardLevel > 0 ? $t('hideseek.footsteps') : $t('hideseek.silent')"
      >
        <Ear class="size-3.5" :class="hideSeekStore.heardLevel > 0 ? 'text-amber-300 animate-pulse' : 'text-slate-500'" />
        <div class="w-8 sm:w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full rounded-full bg-amber-400 transition-all duration-150" :style="{ width: `${hideSeekStore.heardLevel * 100}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Search, EyeOff, Ear, Gem, Wind, Users, Zap } from 'lucide-vue-next'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { useMapStore } from '../../stores/mapStore'
import { normalizeHideSeekSettings } from '../../domain/hideseek'
import { TRAIT_INFO } from './hideSeekTraitInfo'

const hideSeekStore = useHideSeekStore()
const mapStore = useMapStore()

const isSeeker = computed(() => hideSeekStore.myRole === 'seeker')
const trait = computed(() => (hideSeekStore.myTrait ? TRAIT_INFO[hideSeekStore.myTrait] : null))
/** Seeker: % faster from this round's catches */
const momentum = computed(() => {
  if (!isSeeker.value || hideSeekStore.seekerCatches === 0) return 0
  const { catchSpeedBonus } = normalizeHideSeekSettings(mapStore.project.hideSeekSettings)
  return Math.round(catchSpeedBonus * hideSeekStore.seekerCatches * 100)
})
</script>
