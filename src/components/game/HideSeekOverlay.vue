<template>
  <!-- Heartbeat: the screen edges redden as the seeker closes in -->
  <div
    class="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(190,18,60,0.6)_100%)] transition-opacity duration-300"
    :class="hideSeekStore.dangerLevel >= 0.6 ? 'animate-pulse' : ''"
    :style="{ opacity: hideSeekStore.dangerLevel * 0.85 }"
  />

  <!-- Top strip: clock first, then the indicators (menu / voice sit top-right, mr-24 leaves them room) -->
  <div class="absolute inset-x-0 top-0 z-30 pt-safe pl-safe pr-safe pointer-events-none">
    <div class="mr-24 flex flex-col items-start gap-1.5">
      <div class="min-h-10 flex items-center gap-1.5 w-full">
        <HideSeekPanel class="flex-1 min-w-0">
          <template #lead>
            <div
              v-if="isPlaying"
              class="flex items-center gap-1.5 h-8 shrink-0 rounded-full border px-2.5 bg-slate-950/80 backdrop-blur-md"
              :class="hideSeekStore.exitsOpen ? 'border-emerald-400/70 animate-pulse' : hideSeekStore.isHunting ? 'border-rose-500/70 animate-pulse' : hideSeekStore.phase === 'hiding' ? 'border-amber-500/40' : 'border-slate-700/80'"
              :title="bannerText"
            >
              <Timer class="size-3.5 shrink-0" :class="hideSeekStore.phase === 'hiding' ? 'text-amber-300' : 'text-rose-300'" />
              <span class="text-xs font-black tabular-nums text-amber-300">{{ formattedTime }}</span>
            </div>
          </template>
        </HideSeekPanel>
      </div>
      <div
        v-if="statusText"
        class="flex items-center gap-1.5 h-7 rounded-full border px-2.5 bg-slate-950/80 backdrop-blur-md text-[11px] font-bold"
        :class="statusClass"
      >
        <component :is="statusIcon" class="size-3.5 shrink-0" />{{ statusText }}
      </div>
    </div>
  </div>

  <!-- Touch screens with the joystick chosen in the settings: the lower left of the screen is a floating joystick. It
       appears under the thumb wherever it lands; a quick tap there still taps the map. -->
  <div
    v-if="settings.controls === 'joystick'"
    ref="stickZoneRef"
    class="hidden pointer-coarse:block absolute left-0 bottom-0 w-1/2 h-3/4 z-25 touch-none"
    @pointerdown="onStickDown"
    @pointermove="onStickMove"
    @pointerup="onStickUp"
    @pointercancel="onStickUp($event, false)"
  >
    <div
      class="absolute size-28 -ml-14 -mt-14 rounded-full border-2 backdrop-blur-sm transition-opacity duration-150 pointer-events-none"
      :class="stick.active ? 'bg-slate-900/50 border-slate-500/60 opacity-100' : 'bg-slate-900/40 border-slate-600/40 opacity-60'"
      :style="stickBaseStyle"
    >
      <div
        class="absolute top-1/2 left-1/2 size-12 -ml-6 -mt-6 rounded-full bg-brand-400/70 border-2 border-brand-200/70 shadow-lg"
        :style="{ transform: `translate(${stick.knobX}px, ${stick.knobY}px)` }"
      />
    </div>
  </div>

  <!-- Touch screens walking by taps (the default): sneaking is a switch under the left thumb -->
  <div v-else class="hidden pointer-coarse:flex absolute left-0 bottom-0 z-30 pb-safe pl-safe flex-col items-center gap-1 pointer-events-none">
    <UiButton
      :variant="hideSeekStore.isSneaking ? 'game-green' : 'secondary'"
      size="md"
      :disabled="!hideSeekStore.canMove"
      custom-class="size-15 p-0! rounded-full! pointer-events-auto backdrop-blur-md"
      :title="$t('hideseek.sneak')"
      @click="hideSeekStore.setSneakHeld(!hideSeekStore.isSneaking)"
    >
      <template #leading><Footprints class="size-6" /></template>
    </UiButton>
    <span class="rounded-full bg-slate-950/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold" :class="hideSeekStore.isSneaking ? 'text-emerald-300' : 'text-slate-400'">
      {{ $t('hideseek.sneak') }}
    </span>
  </div>

  <!-- Bottom-left on desktop: key hints -->
  <div class="absolute bottom-3 left-3 z-30 pointer-events-none pb-safe pl-safe">
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
      <span v-if="isSeeker" class="flex items-start gap-1.5">
        <Lamp class="size-3 shrink-0 mt-px" />{{ $t('hideseek.candleHint') }}
      </span>
      <span v-for="ability in abilityButtons" :key="ability.key" class="flex items-start gap-1.5 text-sky-200/80">
        <component :is="ability.icon" class="size-3 shrink-0 mt-px" />
        <span><b>{{ ability.key }} · {{ $t(ability.label) }}</b>: {{ $t(ability.label.replace('ability.', 'abilityHint.')) }}</span>
      </span>
    </div>
  </div>

  <!-- Skills around the right thumb: the main "use" button in the corner, the others on an arc around it -->
  <div class="absolute right-0 bottom-0 z-30 pb-safe pr-safe pointer-events-none">
    <div class="relative size-52 mr-1 mb-1">
      <UiButton
        v-for="gadget in gadgetButtons"
        :key="gadget.key"
        :variant="gadget.active ? 'game-green' : 'secondary'"
        size="md"
        :disabled="!hideSeekStore.canMove || gadget.count === 0 || gadget.blocked"
        :custom-class="[
          'absolute! p-0! rounded-full! pointer-events-auto backdrop-blur-md',
          gadget.key === 'E' ? 'size-16 ring-2 ring-amber-400/40' : 'size-12',
          gadget.timer && gadget.timer.cooldown > 0 ? 'disabled:opacity-100!' : '',
        ]"
        :style="gadgetPlaces[gadget.key]"
        :title="`${$t(gadget.label)} (${gadget.key})`"
        @click="gadget.run"
      >
        <template #leading>
          <component :is="gadget.icon" :class="gadget.key === 'E' ? 'size-7' : 'size-5'" />
          <template v-if="gadget.timer">
            <!-- Working: the ring runs down, red and pulsing in its last seconds -->
            <svg v-if="gadget.timer.left > 0" class="absolute -inset-1 -rotate-90 pointer-events-none" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="16.5" fill="none" stroke-width="3" stroke-linecap="round"
                :class="isEnding(gadget.timer) ? 'stroke-rose-400 animate-pulse' : 'stroke-emerald-300'"
                :stroke-dasharray="`${(gadget.timer.left / gadget.timer.total) * RING} ${RING}`"
              />
            </svg>
            <span
              v-if="gadget.timer.left > 0"
              class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 min-w-5 h-4 px-1 rounded-full text-[10px] font-black leading-4 tabular-nums text-slate-950"
              :class="isEnding(gadget.timer) ? 'bg-rose-400 animate-pulse' : 'bg-emerald-300'"
            >{{ Math.ceil(gadget.timer.left) }}</span>
            <!-- Cooling down: a dark sweep over the button and the seconds to wait -->
            <template v-else-if="gadget.timer.cooldown > 0">
              <span class="absolute inset-0 rounded-full pointer-events-none" :style="{ background: `conic-gradient(rgba(2, 6, 23, 0.75) ${(gadget.timer.cooldown / gadget.timer.cooldownTotal) * 100}%, rgba(2, 6, 23, 0.25) 0)` }" />
              <span class="absolute inset-0 flex items-center justify-center text-sm font-black text-white tabular-nums drop-shadow">{{ Math.ceil(gadget.timer.cooldown) }}</span>
            </template>
          </template>
          <span
            v-if="gadget.count !== null"
            class="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black leading-5 tabular-nums"
          >{{ gadget.count }}</span>
          <span class="pointer-coarse:hidden absolute -bottom-1 -right-1 px-1 rounded bg-slate-950 border border-slate-700 text-[9px] font-bold text-slate-300">{{ gadget.key }}</span>
        </template>
      </UiButton>
    </div>
  </div>

  <!-- Top right, under the menu: the minimap (tap to enlarge); with the joystick, holding the right half sneaks -->
  <div class="absolute right-0 top-0 z-30 flex flex-col items-end gap-1.5 pointer-events-none pt-safe pr-safe">
    <div class="h-11 shrink-0" />
    <HideSeekMinimap
      class="pointer-events-auto cursor-pointer transition-[width] duration-200"
      :class="isMapLarge ? 'w-72 sm:w-96 portrait:w-64' : 'w-32 sm:w-44'"
      :title="$t('hideseek.map')"
      @click="isMapLarge = !isMapLarge"
    />
    <span
      v-if="settings.controls === 'joystick'"
      class="hidden pointer-coarse:flex items-center gap-1 rounded-full bg-slate-950/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold transition-colors"
      :class="hideSeekStore.isSneaking ? 'text-emerald-300' : 'text-slate-400'"
    >
      <Footprints class="size-3" />{{ hideSeekStore.isSneaking ? $t('hideseek.sneak') : $t('hideseek.sneakTouchHint') }}
    </span>
  </div>

  <!-- Room game: everyone picks their hero here; the match starts once all have -->
  <UiModal
    :is-open="hideSeekStore.isActive && hideSeekStore.heroesMissing > 0"
    :title="$t('hideseek.pickHero')"
    :subtitle="$t('hideseek.pickHeroSubtitle', { s: hideSeekStore.pickSecondsLeft })"
    :icon="UserRound"
    icon-color="amber"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
  >
    <div class="flex flex-col gap-2">
      <template v-if="hideSeekStore.needsHero">
        <HideSeekHeroPicker v-model="roomHero" />
        <UiButton variant="game-green" size="lg" block @click="multiplayerStore.selectHeroModel(roomHero)">
          {{ $t('hideseek.pickHeroConfirm') }}
        </UiButton>
      </template>
      <p v-else class="text-center text-sm text-slate-300 py-4">
        {{ $t('hideseek.waitingHeroes', { n: hideSeekStore.heroesMissing }) }}
      </p>
    </div>
  </UiModal>

  <!-- Solo: pick a role for the whole match (a bot plays the other one) -->
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
      <!-- Team size: the player plus bot teammates against as many bots -->
      <UiTabs v-model="soloTeamSize" :items="TEAM_SIZES" variant="segmented" size="sm" fill />
      <!-- Hero: each has a trait and three abilities (Q / F / G) -->
      <HideSeekHeroPicker v-model="soloHero" />
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
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EyeOff, Search, Footprints, Trophy, Skull, Undo2, Gem, LogOut, RotateCcw, Crown, Lock, Package, Flag, Scale, DoorOpen, Timer, Move, MousePointerClick, Bell, Hand, Lamp, Link, Sparkles, Waypoints, Eye, UserRound } from 'lucide-vue-next'
import { UiButton, UiCard, UiModal, UiTabs, type TabItem } from '../ui'
import HideSeekPanel from './HideSeekPanel.vue'
import HideSeekMinimap from './HideSeekMinimap.vue'
import { useGameExit } from '../../composables/useGameExit'
import type { HideSeekRole } from '../../domain/hideseek'
import { DEFAULT_HERO_MODEL, useHideSeekStore } from '../../stores/hideSeekStore'
import HideSeekHeroPicker from './HideSeekHeroPicker.vue'
import { ABILITY_ICONS, ABILITY_KEYS } from './hideSeekTraitInfo'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useI18n } from '../../stores/i18nStore'
import { hideSeekAudio } from '../../services/hideSeekAudio'
import { haptic } from '../../services/telegram'
import { useSettingsStore } from '../../stores/settingsStore'

const router = useRouter()
const hideSeekStore = useHideSeekStore()
const settings = useSettingsStore()
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

/** Solo with bots: 1 against 1 up to 5 against 5 */
const TEAM_SIZES: TabItem[] = [1, 3, 5].map(n => ({ id: n, label: `${n} × ${n}` }))
const soloTeamSize = ref<string | number>(5)
const soloHero = ref(DEFAULT_HERO_MODEL)

/** Room game: the hero I am about to pick (the match waits until everyone picked) */
const roomHero = ref(DEFAULT_HERO_MODEL)

function startSolo(role: HideSeekRole) {
  hideSeekAudio.unlock()
  hideSeekStore.startSoloRound(role, Number(soloTeamSize.value), soloHero.value)
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

/** One line under the banner: caught, inside a barrel, holding a chain. */
const status = computed(() => {
  if (!isPlaying.value) return null
  if (hideSeekStore.isJailed) return { text: t('hideseek.jailed'), icon: Lock, cls: 'border-slate-500/50 text-slate-200' }
  if (hideSeekStore.aimingSlot >= 0) return { text: t('hideseek.aimBlink'), icon: Waypoints, cls: 'border-purple-400/60 text-purple-200' }
  if (hideSeekStore.isSensed) return { text: t('hideseek.sensed'), icon: Eye, cls: 'border-rose-400/60 text-rose-200' }
  if (hideSeekStore.isHidden) return { text: t('hideseek.hiddenHint'), icon: Package, cls: 'border-emerald-500/40 text-emerald-200' }
  if (hideSeekStore.chainHolding > 0) return { text: t('hideseek.chainHolding', { s: hideSeekStore.chainHolding }), icon: Link, cls: 'border-violet-400/60 text-violet-200' }
  if (hideSeekStore.chainHeld > 0) return { text: t('hideseek.chainHeld', { s: hideSeekStore.chainHeld }), icon: Link, cls: 'border-violet-400/60 text-violet-200' }
  if (hideSeekStore.dazedLeft > 0) return { text: t('hideseek.dazed', { s: hideSeekStore.dazedLeft }), icon: Sparkles, cls: 'border-amber-400/60 text-amber-200' }
  return null
})
const statusText = computed(() => status.value?.text ?? '')
const statusIcon = computed(() => status.value?.icon ?? Lock)
const statusClass = computed(() => status.value?.cls ?? '')

const RESULT_KEYS = {
  caught: 'hideseek.reasonCaught',
  altars: 'hideseek.reasonAltars',
  escaped: 'hideseek.reasonEscaped',
  time: 'hideseek.reasonTime',
  left: 'hideseek.reasonLeft',
} as const

/** Rounds won: seekers : hiders */
const roundScore = computed(() => `${hideSeekStore.roundWins.seeker} : ${hideSeekStore.roundWins.hider}`)

/** The match is won by a side (the roles stay for the whole match) */
const resultTitle = computed(() => {
  if (isRoundOver.value) return t('hideseek.roundOver', { n: hideSeekStore.round })
  const side = hideSeekStore.matchWinner
  if (!side) return t('hideseek.draw')
  return t(side === 'seeker' ? 'hideseek.seekersWonMatch' : 'hideseek.hidersWonMatch', { score: roundScore.value })
})

const iWonMatch = computed(() => hideSeekStore.matchWinner !== null && hideSeekStore.matchWinner === hideSeekStore.myRole)

const resultSubtitle = computed(() => (hideSeekStore.endReason ? t(RESULT_KEYS[hideSeekStore.endReason]) : ''))

const resultIcon = computed(() => {
  if (isRoundOver.value) return Flag
  if (!hideSeekStore.matchWinner) return Scale
  return iWonMatch.value ? Trophy : Skull
})

const resultColor = computed(() => {
  if (isRoundOver.value || !hideSeekStore.matchWinner) return 'cyan' as const
  return iWonMatch.value ? ('amber' as const) : ('rose' as const)
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


/** An ability button's timers: what it started still runs (left of total), then its cooldown */
interface AbilityTimer {
  left: number
  total: number
  cooldown: number
  cooldownTotal: number
}
/** Circumference of the ring (r = 16.5 in a 36 box) */
const RING = 2 * Math.PI * 16.5
/** In its last seconds a running ability warns that it is about to end */
const ENDING_SEC = 2
const isEnding = (timer: AbilityTimer) => timer.left <= ENDING_SEC

/** My hero's abilities (both roles): green with a running ring while one works, then the cooldown sweep */
const abilityButtons = computed(() =>
  hideSeekStore.myAbilities.map((ability, slot) => ({
    key: ABILITY_KEYS[slot],
    label: `hideseek.ability.${ability.id}`,
    icon: ABILITY_ICONS[ability.id],
    count: null,
    active: ability.left > 0,
    blocked: ability.cooldown > 0,
    timer: ability as AbilityTimer | null,
    run: run(() => hideSeekStore.castAbility(slot)),
  }))
)

// A short buzz when a running ability is about to end, and another when it is over
watch(
  () => hideSeekStore.myAbilities.map(a => a.left),
  (now, before) => {
    now.forEach((left, i) => {
      const was = before?.[i] ?? 0
      if (was > ENDING_SEC && left <= ENDING_SEC && left > 0) haptic('light')
      else if (was > 0 && left === 0) haptic('medium')
    })
  }
)

/** Abilities first; seeker: bell trap, candle, open; hider: hide in a barrel, chain. count null = unlimited */
const gadgetButtons = computed(() => [...abilityButtons.value, ...roleButtons.value.map(b => ({ ...b, timer: null }))])
const roleButtons = computed(() =>
  isSeeker.value
    ? [
        { key: 'T', label: 'hideseek.trap', icon: Bell, count: hideSeekStore.gadgets.traps, active: false, blocked: false, run: run(hideSeekStore.dropTrap) },
        { key: 'C', label: 'hideseek.candle', icon: Lamp, count: hideSeekStore.gadgets.candles, active: false, blocked: false, run: run(hideSeekStore.setCandle) },
        { key: 'E', label: 'hideseek.open', icon: Hand, count: null, active: false, blocked: false, run: run(hideSeekStore.useNearest) },
      ]
    : [
        { key: 'E', label: 'hideseek.hide', icon: Package, count: null, active: hideSeekStore.isHidden, blocked: false, run: run(hideSeekStore.useNearest) },
        // Chain: unlocked by lighting an altar; the badge counts the cooldown down
        {
          key: 'R',
          label: 'hideseek.chain',
          icon: Link,
          count: hideSeekStore.chainCooldown > 0 ? hideSeekStore.chainCooldown : null,
          active: hideSeekStore.chainHolding > 0,
          blocked: hideSeekStore.myAltars === 0 || hideSeekStore.chainCooldown > 0,
          run: run(hideSeekStore.useChain),
        },
      ]
)

/**
 * Where each skill sits: the main "use" button (E) in the corner; the hero's abilities (Q / F / G) evenly on an inner
 * quarter circle around it (from its left up to above it), the role's gadgets on an outer one between them. Every one is
 * a short thumb move away. Offsets are from the box's corner.
 */
const USE_SIZE = 64
const SKILL_SIZE = 48
const INNER_RADIUS = 88
const OUTER_RADIUS = 150
/** Outer ring: from this angle (left) to that one (up), between the inner buttons */
const OUTER_FROM = 162
const OUTER_TO = 108
const gadgetPlaces = computed<Record<string, { right: string; bottom: string }>>(() => {
  const offset = USE_SIZE / 2 - SKILL_SIZE / 2
  const places: Record<string, { right: string; bottom: string }> = { E: { right: '0px', bottom: '0px' } }
  const ring = (keys: string[], radius: number, from: number, to: number) =>
    keys.forEach((key, i) => {
      const degrees = keys.length === 1 ? (from + to) / 2 : from - (i * (from - to)) / (keys.length - 1)
      const angle = (degrees * Math.PI) / 180
      places[key] = {
        right: `${Math.round(offset - Math.cos(angle) * radius)}px`,
        bottom: `${Math.round(offset + Math.sin(angle) * radius)}px`,
      }
    })
  ring(abilityButtons.value.map(g => g.key), INNER_RADIUS, 180, 90)
  ring(roleButtons.value.map(g => g.key).filter(key => key !== 'E'), OUTER_RADIUS, OUTER_FROM, OUTER_TO)
  return places
})

// --- Floating joystick (screen-space direction, length 0..1) ---
/** Radius of the joystick base (size-28) in px */
const STICK_RADIUS = 56
/** The first part of a throw does nothing (a resting thumb never creeps); past FULL it runs at full speed */
const STICK_DEAD_ZONE = 0.18
const STICK_FULL = 0.6
/** A touch that ends this soon, without sliding, is a tap on the map */
const TAP_MS = 250
const TAP_SLOP = 10

const emit = defineEmits<{ tap: [clientX: number, clientY: number] }>()

const stickZoneRef = ref<HTMLElement | null>(null)
/** Base centre (zone px) and knob offset; at rest the base waits in the corner as a hint */
const stick = reactive({ active: false, x: 0, y: 0, knobX: 0, knobY: 0 })
let stickPointer: number | null = null
let stickTouch = { x: 0, y: 0, time: 0, moved: false }

const stickBaseStyle = computed(() =>
  stick.active
    ? { left: `${stick.x}px`, top: `${stick.y}px` }
    : { left: 'calc(env(safe-area-inset-left, 0px) + 4.75rem)', top: 'calc(100% - env(safe-area-inset-bottom, 0px) - 4.75rem)' }
)

function onStickDown(e: PointerEvent) {
  const zone = stickZoneRef.value
  if (stickPointer !== null || !zone) return
  hideSeekAudio.unlock()
  stickPointer = e.pointerId
  zone.setPointerCapture(e.pointerId)
  const rect = zone.getBoundingClientRect()
  // The base appears right under the thumb: nothing moves until the thumb slides
  Object.assign(stick, { active: true, x: e.clientX - rect.left, y: e.clientY - rect.top, knobX: 0, knobY: 0 })
  stickTouch = { x: e.clientX, y: e.clientY, time: performance.now(), moved: false }
}

function onStickMove(e: PointerEvent) {
  const zone = stickZoneRef.value
  if (e.pointerId !== stickPointer || !zone) return
  if (Math.hypot(e.clientX - stickTouch.x, e.clientY - stickTouch.y) > TAP_SLOP) stickTouch.moved = true
  const rect = zone.getBoundingClientRect()
  const dx = e.clientX - rect.left - stick.x
  const dy = e.clientY - rect.top - stick.y
  const len = Math.hypot(dx, dy)
  if (len < 1e-3) return hideSeekStore.setJoystick(0, 0)
  const ux = dx / len
  const uy = dy / len
  // Pulled past the rim: the base follows the thumb, so turning around answers at once
  if (len > STICK_RADIUS) {
    stick.x += ux * (len - STICK_RADIUS)
    stick.y += uy * (len - STICK_RADIUS)
  }
  const reach = Math.min(len, STICK_RADIUS)
  stick.knobX = ux * reach
  stick.knobY = uy * reach
  const strength = Math.min(1, Math.max(0, (reach / STICK_RADIUS - STICK_DEAD_ZONE) / (STICK_FULL - STICK_DEAD_ZONE)))
  hideSeekStore.setJoystick(ux * strength, uy * strength)
}

function onStickUp(e: PointerEvent, tapped = true) {
  if (e.pointerId !== stickPointer) return
  stickPointer = null
  Object.assign(stick, { active: false, knobX: 0, knobY: 0 })
  hideSeekStore.setJoystick(0, 0)
  if (tapped && !stickTouch.moved && performance.now() - stickTouch.time < TAP_MS) emit('tap', stickTouch.x, stickTouch.y)
}
</script>
