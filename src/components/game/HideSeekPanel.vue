<template>
  <!-- Top indicator strip: role, chests, breath, footsteps -->
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
      </div>

      <div class="flex items-center gap-1 h-8 rounded-full border border-amber-500/30 px-2.5 bg-slate-950/80 backdrop-blur-md" :title="$t('hideseek.chests')">
        <Gem class="size-3.5 text-amber-300" />
        <span class="text-xs font-black tabular-nums text-amber-300">{{ hideSeekStore.chestsLooted }}/{{ hideSeekStore.chestsToWin }}</span>
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
import { Search, EyeOff, Ear, Gem, Wind } from 'lucide-vue-next'
import { useHideSeekStore } from '../../stores/hideSeekStore'

const hideSeekStore = useHideSeekStore()

const isSeeker = computed(() => hideSeekStore.myRole === 'seeker')
</script>
