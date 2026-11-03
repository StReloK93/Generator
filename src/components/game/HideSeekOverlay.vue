<template>
  <!-- Heartbeat: the screen edges redden as the seeker closes in -->
  <div
    class="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(190,18,60,0.6)_100%)] transition-opacity duration-300"
    :class="hideSeekStore.dangerLevel >= 0.6 ? 'animate-pulse' : ''"
    :style="{ opacity: hideSeekStore.dangerLevel * 0.85 }"
  />

  <!-- Top strip: clock first, then the indicators; the middle of the screen stays free (menu sits top-right) -->
  <div class="absolute top-2 left-2 right-16 z-30 flex flex-col items-start gap-1.5 pointer-events-none pt-safe pl-safe">
    <div class="flex items-start gap-1.5 w-full">
      <div
        v-if="isPlaying"
        class="flex items-center gap-1.5 h-8 shrink-0 rounded-full border px-2.5 bg-slate-950/80 backdrop-blur-md"
        :class="hideSeekStore.exitsOpen ? 'border-emerald-400/70 animate-pulse' : hideSeekStore.isHunting ? 'border-rose-500/70 animate-pulse' : hideSeekStore.phase === 'hiding' ? 'border-amber-500/40' : 'border-slate-700/80'"
        :title="bannerText"
      >
        <Timer class="size-3.5 shrink-0" :class="hideSeekStore.phase === 'hiding' ? 'text-amber-300' : 'text-rose-300'" />
        <span class="text-xs font-black tabular-nums text-amber-300">{{ formattedTime }}</span>
      </div>
      <HideSeekPanel class="flex-1 min-w-0" />
    </div>
    <div
      v-if="statusText"
      class="flex items-center gap-1.5 h-7 rounded-full border px-2.5 bg-slate-950/80 backdrop-blur-md text-[11px] font-bold"
      :class="statusClass"
    >
      <component :is="statusIcon" class="size-3.5 shrink-0" />{{ statusText }}
    </div>
  </div>

  <!-- Bottom-left: joystick on touch screens, key hints on desktop -->
  <div class="absolute bottom-3 left-3 z-30 pointer-events-none pb-safe pl-safe">
    <div
      ref="joystickRef"
      class="hidden pointer-coarse:block relative size-28 rounded-full bg-slate-900/60 border-2 border-slate-600/60 backdrop-blur-sm pointer-events-auto touch-none"
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

    <div class="flex pointer-coarse:hidden flex-col gap-0.5 max-w-72 rounded-xl bg-slate-950/70 backdrop-blur-md border border-slate-800/80 px-2.5 py-2 text-[10px] text-slate-400">
      <span class="flex items-center gap-1.5"><MousePointerClick class="size-3" />{{ $t('hideseek.clickHint') }}</span>
      <span class="flex items-center gap-1.5"><Move class="size-3" />{{ $t('hideseek.moveHint') }}</span>
      <span class="flex items-center gap-1.5"><Footprints class="size-3" />{{ $t('hideseek.sneakHint') }}</span>
      <span class="flex items-start gap-1.5 text-amber-200/70">
        <Gem class="size-3 shrink-0 mt-px" />{{ isSeeker ? $t('hideseek.chestHintSeeker') : $t('hideseek.chestHintHider') }}
      </span>
      <span class="flex items-start gap-1.5">
        <DoorOpen class="size-3 shrink-0 mt-px" />{{ isSeeker ? $t('hideseek.propHintSeeker') : $t('hideseek.propHintHider') }}
      </span>
    </div>
  </div>

  <!-- Right edge: gadgets in a column (the middle of the screen stays free) -->
  <div class="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2.5 pointer-events-none pr-safe">
    <UiButton
      v-for="gadget in gadgetButtons"
      :key="gadget.key"
      :variant="gadget.active ? 'game-green' : 'secondary'"
      size="md"
      :disabled="!hideSeekStore.canMove || gadget.count === 0"
      custom-class="relative size-12 p-0! rounded-full! pointer-events-auto backdrop-blur-md"
      :title="`${$t(gadget.label)} (${gadget.key})`"
      @click="gadget.run"
    >
      <template #leading>
        <component :is="gadget.icon" class="size-5" />
        <span
          v-if="gadget.count !== null"
          class="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black leading-5 tabular-nums"
        >{{ gadget.count }}</span>
        <span class="pointer-coarse:hidden absolute -bottom-1 -right-1 px-1 rounded bg-slate-950 border border-slate-700 text-[9px] font-bold text-slate-300">{{ gadget.key }}</span>
      </template>
    </UiButton>
  </div>

  <!-- Bottom-right corner: minimap (tap to enlarge); holding the empty right half of the screen sneaks -->
  <div class="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-1.5 pointer-events-none pb-safe pr-safe">
    <span
      class="hidden pointer-coarse:flex items-center gap-1 rounded-full bg-slate-950/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold transition-colors"
      :class="hideSeekStore.isSneaking ? 'text-emerald-300' : 'text-slate-400'"
    >
      <Footprints class="size-3" />{{ hideSeekStore.isSneaking ? $t('hideseek.sneak') : $t('hideseek.sneakTouchHint') }}
    </span>
    <HideSeekMinimap
      class="pointer-events-auto cursor-pointer transition-[width] duration-200"
      :class="isMapLarge ? 'w-72 sm:w-96' : 'w-36 sm:w-44'"
      :title="$t('hideseek.map')"
      @click="isMapLarge = !isMapLarge"
    />
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
import { EyeOff, Search, Footprints, Trophy, Skull, Undo2, Gem, LogOut, RotateCcw, Crown, Lock, Package, CircleDot, Flag, Scale, DoorOpen, Timer, Move, MousePointerClick, Flame, Bell, Hand } from 'lucide-vue-next'
import { UiButton, UiCard, UiModal } from '../ui'
import HideSeekPanel from './HideSeekPanel.vue'
import HideSeekMinimap from './HideSeekMinimap.vue'
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

const formattedTime = computed(() => {
  const total = Math.max(0, hideSeekStore.secondsLeft)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
})

const isMapLarge = ref(false)

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
      ]
)

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
