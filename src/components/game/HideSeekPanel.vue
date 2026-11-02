<template>
  <div class="flex flex-col gap-2">
    <!-- Role, round and clock -->
    <div class="flex items-center gap-2 min-w-0">
      <div
        class="size-9 rounded-xl flex items-center justify-center shrink-0 border"
        :class="isSeeker ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'"
      >
        <component :is="isSeeker ? Search : EyeOff" class="size-4.5" />
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {{ $t('hideseek.round', { n: hideSeekStore.round, total: hideSeekStore.rounds }) }}
        </span>
        <span class="font-extrabold text-sm text-slate-50 truncate">
          {{ isSeeker ? $t('hideseek.roleSeeker') : $t('hideseek.roleHider') }}
        </span>
      </div>
      <UiBadge :variant="hideSeekStore.phase === 'hiding' ? 'amber' : 'cyan'" size="md" :icon="Timer" class="shrink-0 tabular-nums">
        {{ formattedTime }}
      </UiBadge>
    </div>

    <!-- Chests and breath -->
    <div class="grid grid-cols-2 gap-1.5">
      <div class="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 px-2 py-1.5">
        <Gem class="size-3.5 shrink-0 text-amber-300" />
        <span class="text-[11px] font-semibold text-amber-100 flex-1 truncate">{{ $t('hideseek.chests') }}</span>
        <span class="text-xs font-black tabular-nums text-amber-300">{{ hideSeekStore.chestsLooted }}/{{ hideSeekStore.chestsToWin }}</span>
      </div>
      <div class="flex flex-col justify-center gap-1 rounded-xl bg-slate-900/70 border border-slate-800 px-2 py-1.5" :title="$t('hideseek.stamina')">
        <span class="flex items-center gap-1 text-[10px] font-semibold" :class="hideSeekStore.isExhausted ? 'text-rose-300' : 'text-slate-400'">
          <Wind class="size-3" /> {{ hideSeekStore.isExhausted ? $t('hideseek.tired') : $t('hideseek.stamina') }}
        </span>
        <div class="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            class="h-full rounded-full transition-[width] duration-150"
            :class="hideSeekStore.isExhausted ? 'bg-rose-400' : 'bg-emerald-400'"
            :style="{ width: `${hideSeekStore.staminaLevel * 100}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Gadgets (keys on desktop, the same buttons on touch screens) -->
    <div class="grid grid-cols-3 gap-1.5">
      <UiButton
        v-for="gadget in gadgetButtons"
        :key="gadget.key"
        variant="secondary"
        size="sm"
        :leading-icon="gadget.icon"
        :active="gadget.active"
        :disabled="!hideSeekStore.canMove || gadget.count === 0"
        custom-class="h-9 px-1.5 text-[11px] justify-center"
        :title="`${$t(gadget.label)} (${gadget.key})`"
        @click="gadget.run"
      >
        {{ gadget.count === null ? gadget.key : `${gadget.count}` }}
      </UiButton>
    </div>

    <!-- Footsteps meter: how loud the others' steps are -->
    <div class="flex items-center gap-2 rounded-xl bg-slate-900/70 border border-slate-800 px-2.5 py-1.5">
      <Ear class="size-3.5 shrink-0" :class="hideSeekStore.heardLevel > 0 ? 'text-amber-300 animate-pulse' : 'text-slate-500'" />
      <span class="text-[11px] font-semibold shrink-0" :class="hideSeekStore.heardLevel > 0 ? 'text-amber-200' : 'text-slate-400'">
        {{ hideSeekStore.heardLevel > 0 ? $t('hideseek.footsteps') : $t('hideseek.silent') }}
      </span>
      <div class="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div class="h-full rounded-full bg-amber-400 transition-all duration-150" :style="{ width: `${hideSeekStore.heardLevel * 100}%` }" />
      </div>
    </div>

    <HideSeekMinimap />

    <!-- Scores over all rounds -->
    <ul class="flex flex-col gap-0.5">
      <li
        v-for="row in hideSeekStore.scores"
        :key="row.id"
        class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]"
        :class="row.isMe ? 'bg-brand-500/10 ring-1 ring-brand-400/30' : 'bg-slate-950/40'"
      >
        <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: row.color }" />
        <component :is="row.role === 'seeker' ? Search : EyeOff" class="size-3 shrink-0" :class="row.role === 'seeker' ? 'text-rose-300' : 'text-emerald-300'" />
        <span class="flex-1 min-w-0 truncate font-semibold" :class="row.isMe ? 'text-brand-100' : 'text-slate-300'">{{ row.name }}</span>
        <Lock v-if="row.jailed" class="size-3 shrink-0 text-slate-400" />
        <span class="font-black tabular-nums text-amber-300">{{ row.score }}</span>
      </li>
    </ul>

    <!-- Controls hints (desktop) -->
    <div class="flex flex-col gap-0.5 text-[10px] text-slate-500 pointer-coarse:hidden">
      <span class="flex items-center gap-1.5"><MousePointerClick class="size-3" />{{ $t('hideseek.clickHint') }}</span>
      <span class="flex items-center gap-1.5"><Move class="size-3" />{{ $t('hideseek.moveHint') }}</span>
      <span class="flex items-center gap-1.5" :class="hideSeekStore.isSneaking ? 'text-emerald-300' : ''">
        <Footprints class="size-3" />{{ $t('hideseek.sneakHint') }}
      </span>
      <span class="flex items-start gap-1.5 text-amber-200/70">
        <Gem class="size-3 shrink-0 mt-px" />{{ isSeeker ? $t('hideseek.chestHintSeeker') : $t('hideseek.chestHintHider') }}
      </span>
      <span class="flex items-start gap-1.5">
        <DoorOpen class="size-3 shrink-0 mt-px" />{{ isSeeker ? $t('hideseek.propHintSeeker') : $t('hideseek.propHintHider') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Search, EyeOff, Timer, Ear, Move, Footprints, MousePointerClick, Gem, Wind, Lock, Flame, Bell, Hand, Package, CircleDot, DoorOpen } from 'lucide-vue-next'
import { UiBadge, UiButton } from '../ui'
import HideSeekMinimap from './HideSeekMinimap.vue'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { hideSeekAudio } from '../../services/hideSeekAudio'

const hideSeekStore = useHideSeekStore()

const isSeeker = computed(() => hideSeekStore.myRole === 'seeker')

const formattedTime = computed(() => {
  const total = Math.max(0, hideSeekStore.secondsLeft)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
})

function run(action: () => void) {
  return () => {
    hideSeekAudio.unlock()
    action()
  }
}

/** Seeker: flare, bell trap, open; hider: stone, hide in a barrel. count null = unlimited */
const gadgetButtons = computed(() =>
  isSeeker.value
    ? [
        { key: 'F', label: 'hideseek.flare', icon: Flame, count: hideSeekStore.gadgets.flares, active: hideSeekStore.isFlareLit, run: run(hideSeekStore.lightFlare) },
        { key: 'T', label: 'hideseek.trap', icon: Bell, count: hideSeekStore.gadgets.traps, active: false, run: run(hideSeekStore.dropTrap) },
        { key: 'E', label: 'hideseek.open', icon: Hand, count: null, active: false, run: run(hideSeekStore.useNearest) },
      ]
    : [
        { key: 'Q', label: 'hideseek.stone', icon: CircleDot, count: hideSeekStore.gadgets.stones, active: hideSeekStore.isAimingStone, run: run(hideSeekStore.toggleStoneAim) },
        { key: 'E', label: 'hideseek.hide', icon: Package, count: null, active: hideSeekStore.isHidden, run: run(hideSeekStore.useNearest) },
        { key: 'Shift', label: 'hideseek.sneak', icon: Footprints, count: null, active: hideSeekStore.isSneaking, run: run(hideSeekStore.toggleSneak) },
      ]
)
</script>
