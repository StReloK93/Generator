<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex items-center gap-2 min-w-0">
      <div
        class="size-9 rounded-xl flex items-center justify-center shrink-0 border"
        :class="isSeeker ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'"
      >
        <component :is="isSeeker ? Search : EyeOff" class="size-4.5" />
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('game.modeHideSeek') }}</span>
        <span class="font-extrabold text-sm text-slate-50 truncate">
          {{ isSeeker ? $t('hideseek.roleSeeker') : $t('hideseek.roleHider') }}
        </span>
      </div>
      <UiBadge :variant="hideSeekStore.phase === 'hiding' ? 'amber' : 'cyan'" size="md" :icon="Timer" class="shrink-0 tabular-nums">
        {{ formattedTime }}
      </UiBadge>
    </div>

    <!-- Hider's objective: open every treasure chest -->
    <div class="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-2.5 py-2">
      <Gem class="size-4 shrink-0 text-amber-300" />
      <span class="text-[11px] font-semibold text-amber-100 flex-1">{{ $t('hideseek.chests') }}</span>
      <span class="text-sm font-black tabular-nums text-amber-300">{{ hideSeekStore.chestsOpened }}/{{ hideSeekStore.chestsTotal }}</span>
    </div>

    <!-- Footsteps meter: how loud the opponent's steps are -->
    <div class="flex items-center gap-2 rounded-xl bg-slate-900/70 border border-slate-800 px-2.5 py-2">
      <Ear class="size-4 shrink-0" :class="hideSeekStore.heardLevel > 0 ? 'text-amber-300 animate-pulse' : 'text-slate-500'" />
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <span class="text-[11px] font-semibold" :class="hideSeekStore.heardLevel > 0 ? 'text-amber-200' : 'text-slate-400'">
          {{ hideSeekStore.heardLevel > 0 ? $t('hideseek.footsteps') : $t('hideseek.silent') }}
        </span>
        <div class="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full rounded-full bg-amber-400 transition-all duration-150" :style="{ width: `${hideSeekStore.heardLevel * 100}%` }" />
        </div>
      </div>
    </div>

    <!-- Controls hints (touch devices also get the on-screen joystick) -->
    <div class="flex flex-col gap-1 text-[11px] text-slate-400">
      <span class="flex items-center gap-1.5"><MousePointerClick class="size-3.5 text-slate-500" />{{ $t('hideseek.clickHint') }}</span>
    </div>
    <div class="flex flex-col gap-1 text-[11px] text-slate-400 pointer-coarse:hidden">
      <span class="flex items-center gap-1.5"><Move class="size-3.5 text-slate-500" />{{ $t('hideseek.moveHint') }}</span>
      <span class="flex items-center gap-1.5" :class="hideSeekStore.isSneaking ? 'text-emerald-300' : ''">
        <Footprints class="size-3.5" :class="hideSeekStore.isSneaking ? 'text-emerald-400' : 'text-slate-500'" />{{ $t('hideseek.sneakHint') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Search, EyeOff, Timer, Ear, Move, Footprints, MousePointerClick, Gem } from 'lucide-vue-next'
import { UiBadge } from '../ui'
import { useHideSeekStore } from '../../stores/hideSeekStore'

const hideSeekStore = useHideSeekStore()

const isSeeker = computed(() => hideSeekStore.myRole === 'seeker')

const formattedTime = computed(() => {
  const total = Math.max(0, hideSeekStore.secondsLeft)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
})
</script>
