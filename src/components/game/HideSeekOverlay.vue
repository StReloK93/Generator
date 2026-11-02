<template>
  <!-- Heartbeat: the screen edges redden as the seeker closes in -->
  <div
    class="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(190,18,60,0.6)_100%)] transition-opacity duration-300"
    :class="hideSeekStore.dangerLevel >= 0.6 ? 'animate-pulse' : ''"
    :style="{ opacity: hideSeekStore.dangerLevel * 0.85 }"
  />

  <!-- Phase banner and status (left of the right HUD panel) -->
  <div class="absolute top-3 left-3 right-64 sm:right-68 z-30 flex flex-col items-center gap-1.5 pointer-events-none">
    <div
      v-if="isPlaying"
      class="flex items-center gap-2 rounded-2xl border px-3 py-1.5 bg-slate-950/85 backdrop-blur-md shadow-xl"
      :class="hideSeekStore.exitsOpen ? 'border-emerald-400/70 animate-pulse' : hideSeekStore.isHunting ? 'border-rose-500/70 animate-pulse' : hideSeekStore.phase === 'hiding' ? 'border-amber-500/40' : 'border-slate-700/80'"
    >
      <component :is="bannerIcon" class="size-4 shrink-0" :class="hideSeekStore.phase === 'hiding' ? 'text-amber-300' : 'text-rose-300'" />
      <span class="text-xs sm:text-sm font-extrabold text-slate-50">{{ bannerText }}</span>
      <span class="text-xs sm:text-sm font-black tabular-nums text-amber-300">{{ hideSeekStore.secondsLeft }}s</span>
    </div>
    <div
      v-if="statusText"
      class="flex items-center gap-1.5 rounded-xl border px-2.5 py-1 bg-slate-950/80 backdrop-blur-md text-[11px] sm:text-xs font-bold"
      :class="statusClass"
    >
      <component :is="statusIcon" class="size-3.5 shrink-0" />{{ statusText }}
    </div>
  </div>

  <!-- Touch controls: joystick, sneak and action buttons -->
  <div class="hidden pointer-coarse:flex absolute bottom-4 left-4 right-64 sm:right-68 z-30 items-end justify-between pointer-events-none pb-safe">
    <div
      ref="joystickRef"
      class="relative size-28 rounded-full bg-slate-900/60 border-2 border-slate-600/60 backdrop-blur-sm pointer-events-auto touch-none"
      @pointerdown="onJoystickDown"
      @pointermove="onJoystickMove"
      @pointerup="onJoystickUp"
      @pointercancel="onJoystickUp"
    >
      <div
        class="absolute top-1/2 left-1/2 size-12 -ml-6 -mt-6 rounded-full bg-brand-400/70 border-2 border-brand-200/70 shadow-lg"
        :style="{ transform: `translate(${knob.x}px, ${knob.y}px)` }"
      />
    </div>

    <UiButton
      :variant="hideSeekStore.isSneaking ? 'game-green' : 'secondary'"
      size="lg"
      :leading-icon="Footprints"
      :active="hideSeekStore.isSneaking"
      custom-class="pointer-events-auto"
      @click="toggleSneak"
    >
      {{ $t('hideseek.sneak') }}
    </UiButton>
  </div>

  <!-- Solo: pick a role for round 1 (a bot plays the other one, round 2 swaps) -->
  <UiModal
    :is-open="hideSeekStore.isActive && hideSeekStore.needsSoloRole"
    :title="$t('hideseek.soloTitle')"
    :subtitle="$t('hideseek.soloSubtitle')"
    :icon="Gem"
    icon-color="amber"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
  >
    <div class="flex flex-col gap-2">
      <UiCard
        v-for="option in SOLO_ROLES"
        :key="option.role"
        interactive
        padding="sm"
        :custom-class="['flex items-center gap-3 cursor-pointer', option.cardClass]"
        @click="startSolo(option.role)"
      >
        <div class="size-10 rounded-xl flex items-center justify-center shrink-0 border" :class="option.iconClass">
          <component :is="option.icon" class="size-5" />
        </div>
        <div class="flex flex-col min-w-0">
          <span class="font-extrabold text-sm text-slate-50">{{ $t(option.label) }}</span>
          <span class="text-[11px] text-slate-400">{{ $t(option.desc) }}</span>
        </div>
      </UiCard>
      <UiButton variant="ghost" size="md" block :leading-icon="LogOut" @click="exitGame">
        {{ $t('hideseek.exit') }}
      </UiButton>
    </div>
  </UiModal>

  <!-- Round over (break before the next round) and the final standings -->
  <UiModal
    :is-open="hideSeekStore.isActive && !hideSeekStore.needsSoloRole && (isRoundOver || isMatchOver)"
    :title="resultTitle"
    :subtitle="resultSubtitle"
    :icon="resultIcon"
    :icon-color="resultColor"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
  >
    <div class="flex flex-col gap-2">
      <span class="text-[11px] font-semibold" :class="hideSeekStore.didIWin ? 'text-emerald-300' : 'text-rose-300'">
        {{ roundLine }}
      </span>
      <ul class="flex flex-col gap-1">
        <li
          v-for="(row, index) in hideSeekStore.scores"
          :key="row.id"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs"
          :class="row.isMe ? 'bg-brand-500/10 ring-1 ring-brand-400/30' : 'bg-slate-900/70'"
        >
          <span class="w-4 text-slate-500 font-bold tabular-nums">{{ index + 1 }}</span>
          <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: row.color }" />
          <span class="flex-1 min-w-0 truncate font-semibold text-slate-100">{{ row.name }}</span>
          <Crown v-if="isMatchOver && row.id === hideSeekStore.champion" class="size-3.5 text-amber-300" />
          <span class="font-black tabular-nums text-amber-300">{{ row.score }}</span>
        </li>
      </ul>
      <span v-if="isRoundOver" class="text-center text-[11px] text-slate-400 tabular-nums">
        {{ $t('hideseek.nextRound', { s: hideSeekStore.secondsLeft }) }}
      </span>
      <template v-else>
        <UiButton v-if="multiplayerStore.roomId" variant="game-green" size="lg" block :leading-icon="Undo2" @click="multiplayerStore.returnToLobby(router)">
          {{ $t('hideseek.backToLobby') }}
        </UiButton>
        <template v-else>
          <UiButton variant="game-green" size="lg" block :leading-icon="RotateCcw" @click="hideSeekStore.chooseSoloRole()">
            {{ $t('hideseek.playAgain') }}
          </UiButton>
          <UiButton variant="ghost" size="md" block :leading-icon="LogOut" @click="exitGame">
            {{ $t('hideseek.exit') }}
          </UiButton>
        </template>
      </template>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EyeOff, Search, Footprints, Trophy, Skull, Undo2, Shield, Gem, LogOut, RotateCcw, Crown, Lock, Package, CircleDot, Flag, Scale, Crosshair, DoorOpen } from 'lucide-vue-next'
import { UiButton, UiCard, UiModal } from '../ui'
import { useGameExit } from '../../composables/useGameExit'
import type { HideSeekRole } from '../../domain/hideseek'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useI18n } from '../../stores/i18nStore'
import { hideSeekAudio } from '../../services/hideSeekAudio'

const router = useRouter()
const hideSeekStore = useHideSeekStore()
const multiplayerStore = useMultiplayerStore()
const { t } = useI18n()
const { exitGame } = useGameExit()

const SOLO_ROLES = [
  {
    role: 'seeker',
    label: 'hideseek.roleSeeker',
    desc: 'hideseek.soloSeekerDesc',
    icon: Search,
    cardClass: 'hover:border-rose-500/50',
    iconClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  {
    role: 'hider',
    label: 'hideseek.roleHider',
    desc: 'hideseek.soloHiderDesc',
    icon: EyeOff,
    cardClass: 'hover:border-emerald-500/50',
    iconClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
] as const

function startSolo(role: HideSeekRole) {
  hideSeekAudio.unlock()
  hideSeekStore.startSoloRound(role)
}

const isSeeker = computed(() => hideSeekStore.myRole === 'seeker')
const isPlaying = computed(() => hideSeekStore.phase === 'hiding' || hideSeekStore.phase === 'seeking')
const isRoundOver = computed(() => hideSeekStore.phase === 'roundOver')
const isMatchOver = computed(() => hideSeekStore.phase === 'ended')

const bannerIcon = computed(() => {
  if (hideSeekStore.phase === 'hiding') return isSeeker.value ? EyeOff : Shield
  if (hideSeekStore.exitsOpen) return DoorOpen
  return hideSeekStore.isHunting ? Crosshair : Search
})

const bannerText = computed(() => {
  if (hideSeekStore.phase === 'hiding') {
    return isSeeker.value ? t('hideseek.phaseHidingSeeker') : t('hideseek.phaseHidingHider')
  }
  if (hideSeekStore.exitsOpen) return isSeeker.value ? t('hideseek.exitsSeeker') : t('hideseek.exitsHider')
  if (hideSeekStore.isHunting) return isSeeker.value ? t('hideseek.huntSeeker') : t('hideseek.huntHider')
  return isSeeker.value ? t('hideseek.phaseSeekingSeeker') : t('hideseek.phaseSeekingHider')
})

/** One line under the banner: caught, inside a barrel, or aiming a stone. */
const status = computed(() => {
  if (!isPlaying.value) return null
  if (hideSeekStore.isJailed) return { text: t('hideseek.jailed'), icon: Lock, cls: 'border-slate-500/50 text-slate-200' }
  if (hideSeekStore.isAimingStone) return { text: t('hideseek.aimHint'), icon: CircleDot, cls: 'border-stone-400/50 text-stone-200' }
  if (hideSeekStore.isHidden) return { text: t('hideseek.hiddenHint'), icon: Package, cls: 'border-emerald-500/40 text-emerald-200' }
  return null
})
const statusText = computed(() => status.value?.text ?? '')
const statusIcon = computed(() => status.value?.icon ?? Lock)
const statusClass = computed(() => status.value?.cls ?? '')

const RESULT_KEYS = {
  caught: 'hideseek.reasonCaught',
  chests: 'hideseek.reasonChests',
  escaped: 'hideseek.reasonEscaped',
  time: 'hideseek.reasonTime',
  left: 'hideseek.reasonLeft',
} as const

const myScoreRank = computed(() => hideSeekStore.scores.findIndex(r => r.isMe))
const championName = computed(() => hideSeekStore.scores.find(r => r.id === hideSeekStore.champion)?.name ?? '')

const resultTitle = computed(() => {
  if (isRoundOver.value) return t('hideseek.roundOver', { n: hideSeekStore.round })
  if (!hideSeekStore.champion) return t('hideseek.draw')
  return hideSeekStore.champion === multiplayerStore.myPlayerId ? t('hideseek.championYou') : t('hideseek.championOther', { name: championName.value })
})

const resultSubtitle = computed(() => (hideSeekStore.endReason ? t(RESULT_KEYS[hideSeekStore.endReason]) : ''))

const resultIcon = computed(() => {
  if (isRoundOver.value) return Flag
  if (!hideSeekStore.champion) return Scale
  return myScoreRank.value === 0 ? Trophy : Skull
})

const resultColor = computed(() => {
  if (isRoundOver.value || !hideSeekStore.champion) return 'cyan' as const
  return myScoreRank.value === 0 ? ('amber' as const) : ('rose' as const)
})

/** Who won the round that just ended, from my side's point of view */
const roundLine = computed(() => {
  const side = hideSeekStore.winner === 'seeker' ? t('hideseek.seekerWonRound') : t('hideseek.hidersWonRound')
  return `${hideSeekStore.didIWin ? t('hideseek.youWin') : t('hideseek.youLose')} · ${side}`
})

function toggleSneak() {
  hideSeekAudio.unlock()
  hideSeekStore.toggleSneak()
}

// --- Virtual joystick (screen-space direction, length 0..1) ---
const joystickRef = ref<HTMLElement | null>(null)
const knob = reactive({ x: 0, y: 0 })
let activePointer: number | null = null

function updateJoystick(e: PointerEvent) {
  const el = joystickRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const radius = rect.width / 2
  let dx = e.clientX - (rect.left + radius)
  let dy = e.clientY - (rect.top + radius)
  const len = Math.hypot(dx, dy)
  if (len > radius) {
    dx = (dx / len) * radius
    dy = (dy / len) * radius
  }
  knob.x = dx
  knob.y = dy
  hideSeekStore.setJoystick(dx / radius, dy / radius)
}

function onJoystickDown(e: PointerEvent) {
  hideSeekAudio.unlock()
  activePointer = e.pointerId
  joystickRef.value?.setPointerCapture(e.pointerId)
  updateJoystick(e)
}

function onJoystickMove(e: PointerEvent) {
  if (e.pointerId === activePointer) updateJoystick(e)
}

function onJoystickUp(e: PointerEvent) {
  if (e.pointerId !== activePointer) return
  activePointer = null
  knob.x = 0
  knob.y = 0
  hideSeekStore.setJoystick(0, 0)
}
</script>
