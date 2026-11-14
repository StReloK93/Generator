<template>
  <!-- Heartbeat: the screen edges redden as the seeker closes in -->
  <div
    class="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(190,18,60,0.6)_100%)] transition-opacity duration-300"
    :class="hideSeekStore.dangerLevel >= 0.6 ? 'animate-pulse' : ''"
    :style="{ opacity: hideSeekStore.dangerLevel * 0.85 }"
  />

  <!-- Who caught whom, for a moment -->
  <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 -translate-y-3 scale-95" leave-active-class="transition duration-200" leave-to-class="opacity-0">
    <div v-if="hideSeekStore.catchNote" class="absolute top-24 inset-x-0 z-35 flex justify-center pointer-events-none pt-safe">
      <div
        class="flex items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur-md text-sm font-bold shadow-lg"
        :class="hideSeekStore.catchNote.me ? 'bg-rose-950/80 border-rose-500/60 text-rose-100' : hideSeekStore.catchNote.mine ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-100' : 'bg-slate-950/80 border-sky-400/50 text-sky-100'"
      >
        <Lock class="size-4 shrink-0" />
        {{ catchNoteText }}
      </div>
    </div>
  </Transition>

  <!-- Looking around the map: back to my hero -->
  <div v-if="hideSeekStore.lookAt" class="absolute bottom-24 inset-x-0 z-35 flex justify-center pointer-events-none pb-safe">
    <UiButton variant="regal-dark" size="sm" :leading-icon="Crosshair" custom-class="pointer-events-auto" @click="hideSeekStore.setLookAt(null)">
      {{ $t('hideseek.backToHero') }}
    </UiButton>
  </div>

  <!-- The count before the match: "2", "1", then the gong -->
  <div v-if="hideSeekStore.startCount > 0" class="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
    <span
      :key="hideSeekStore.startCount"
      class="font-display font-black text-8xl text-brand-200 drop-shadow-[0_0_30px_rgba(233,182,60,0.6)] animate-in zoom-in-50 fade-in duration-300"
    >
      {{ hideSeekStore.startCount }}
    </span>
  </div>

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
              <component :is="hideSeekStore.isCurse && hideSeekStore.phase === 'seeking' ? Flame : Timer" class="size-3.5 shrink-0" :class="hideSeekStore.phase === 'hiding' ? 'text-amber-300' : hideSeekStore.isCurse ? 'text-fuchsia-300 animate-pulse' : 'text-rose-300'" />
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
      <!-- Inside this ring the hero sneaks, past it the hero runs -->
      <div class="absolute inset-0 m-auto size-14 rounded-full border border-dashed border-slate-400/40" />
      <div
        class="absolute top-1/2 left-1/2 size-12 -ml-6 -mt-6 rounded-full border-2 shadow-lg transition-colors duration-150"
        :class="stick.sneaking ? 'bg-emerald-400/70 border-emerald-200/70' : 'bg-brand-400/70 border-brand-200/70'"
        :style="{ transform: `translate(${stick.knobX}px, ${stick.knobY}px)` }"
      />
    </div>
  </div>

  <!-- Touch screens walking by taps (the default): a tap runs there at once, a finger kept on the map sneaks and the hero follows it (GameCanvas) -->

  <!-- Bottom-left on desktop: key hints -->
  <div class="absolute bottom-3 left-3 z-30 pointer-events-none pb-safe pl-safe">
    <div class="flex pointer-coarse:hidden flex-col gap-0.5 max-w-72 rounded-xl bg-slate-950/70 backdrop-blur-md border border-slate-800/80 px-2.5 py-2 text-[10px] text-slate-400">
      <span class="flex items-center gap-1.5"><MousePointerClick class="size-3" />{{ $t('hideseek.clickHint') }}</span>
      <span class="flex items-center gap-1.5"><Move class="size-3" />{{ $t('hideseek.moveHint') }}</span>
      <span class="flex items-center gap-1.5"><Footprints class="size-3" />{{ $t('hideseek.sneakHint') }}</span>
      <!-- The curse: its own rule in one line (altars, chains and candles belong to hide & seek) -->
      <span v-if="hideSeekStore.isCurse" class="flex items-start gap-1.5 text-fuchsia-200/80">
        <Skull class="size-3 shrink-0 mt-px" />{{ $t('maps.howto.curse.1') }} {{ $t('maps.howto.curse.2') }}
      </span>
      <template v-else>
      <span class="flex items-start gap-1.5 text-amber-200/70">
        <Gem class="size-3 shrink-0 mt-px" />{{ isSeeker ? $t('hideseek.chestHintSeeker') : $t('hideseek.chestHintHider') }}
      </span>
      <span class="flex items-start gap-1.5">
        <DoorOpen class="size-3 shrink-0 mt-px" />{{ isSeeker ? $t('hideseek.propHintSeeker') : $t('hideseek.propHintHider') }}
      </span>
      </template>
      <span v-if="isSeeker && !hideSeekStore.isCurse" class="flex items-start gap-1.5">
        <Lamp class="size-3 shrink-0 mt-px" />{{ $t('hideseek.candleHint') }}
      </span>
      <span v-for="ability in abilityButtons" :key="ability.key" class="flex items-start gap-1.5 text-sky-200/80">
        <component :is="ability.icon" class="size-3 shrink-0 mt-px" />
        <span><b>{{ ability.key }} · {{ $t(ability.label) }}</b>: {{ $t(ability.label.replace('ability.', 'abilityHint.')) }}</span>
      </span>
    </div>
  </div>

  <!-- Skills around the right thumb: the strongest ability in the big corner button, the others on arcs around it
       (barrels, doors and candles are used by tapping them on the map) -->
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
          gadget.key === mainKey ? 'size-16 ring-2 ring-amber-400/40' : 'size-12',
          gadget.timer && gadget.timer.cooldown > 0 ? 'disabled:opacity-100!' : '',
        ]"
        :style="gadgetPlaces[gadget.key]"
        :title="`${$t(gadget.label)} (${gadget.key})`"
        @click="gadget.run"
      >
        <template #leading>
          <component :is="gadget.icon" :class="gadget.key === mainKey ? 'size-7' : 'size-5'" />
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

  <!-- Top right, under the menu: the minimap (tap to enlarge) -->
  <div class="absolute right-0 top-0 z-30 flex flex-col items-end gap-1.5 pointer-events-none pt-safe pr-safe">
    <div class="h-11 shrink-0" />
    <HideSeekMinimap
      class="pointer-events-auto cursor-pointer transition-[width] duration-200"
      :class="isMapLarge ? 'w-72 sm:w-96 portrait:w-64 short:w-56' : 'w-32 sm:w-44 short:w-28'"
      :title="$t('hideseek.map')"
      @tap="onMapTap"
    />
    <span v-if="isMapLarge" class="rounded-full bg-slate-950/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-slate-300">
      {{ $t('hideseek.mapLookHint') }}
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
    custom-class="short:max-w-3xl"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
  >
    <div class="flex flex-col gap-2 short:grid short:grid-cols-[1fr_15rem] short:items-end">
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

  <!-- Solo curse: me against bots, everyone for themselves -->
  <UiModal
    :is-open="hideSeekStore.isActive && hideSeekStore.needsSoloRole && hideSeekStore.isCurse"
    :title="$t('curse.soloTitle')"
    :subtitle="$t('curse.soloSubtitle')"
    :icon="Skull"
    icon-color="rose"
    size="sm"
    custom-class="short:max-w-3xl"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
  >
    <!-- Sideways: the choices and heroes on the left, starting on the right -->
    <div class="flex flex-col gap-2 short:flex-row short:items-start">
      <div class="flex flex-col gap-2 short:flex-1 short:min-w-0">
        <UiTabs v-model="curseBots" :items="curseBotOptions" variant="segmented" size="sm" fill />
        <HideSeekHeroPicker v-model="soloHero" />
      </div>
      <div class="flex flex-col gap-2 short:w-52 short:shrink-0">
        <UiButton variant="game-green" size="lg" block :leading-icon="Skull" @click="startCurse">
          {{ $t('curse.start') }}
        </UiButton>
        <UiButton variant="ghost" size="sm" block :leading-icon="LogOut" @click="exitGame">
          {{ $t('hideseek.exit') }}
        </UiButton>
      </div>
    </div>
  </UiModal>

  <!-- Solo: pick a role for the whole match (a bot plays the other one) -->
  <UiModal
    :is-open="hideSeekStore.isActive && hideSeekStore.needsSoloRole && !hideSeekStore.isCurse"
    :title="$t('hideseek.soloTitle')"
    :subtitle="$t('hideseek.soloSubtitle')"
    :icon="Gem"
    icon-color="amber"
    size="sm"
    custom-class="short:max-w-3xl"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
  >
    <!-- Sideways: team size and heroes on the left, the two roles (they start the match) on the right -->
    <div class="flex flex-col gap-2 short:flex-row short:items-start">
      <div class="flex flex-col gap-2 short:flex-1 short:min-w-0">
        <!-- Team size: the player plus bot teammates against as many bots -->
        <UiTabs v-model="soloTeamSize" :items="TEAM_SIZES" variant="segmented" size="sm" fill />
        <!-- Hero: each has a trait and three abilities (Q / F / G) -->
        <HideSeekHeroPicker v-model="soloHero" />
      </div>
      <div class="flex flex-col gap-2 short:w-52 short:shrink-0">
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
      <UiButton variant="ghost" size="sm" block :leading-icon="LogOut" @click="exitGame">
        {{ $t('hideseek.exit') }}
      </UiButton>
      </div>
    </div>
  </UiModal>

  <!-- Round over (break before the next round) and the final standings -->
  <UiModal
    :is-open="hideSeekStore.isActive && !hideSeekStore.needsSoloRole && !hideSeekStore.isTeleporting && (isRoundOver || isMatchOver)"
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
      <span class="text-[11px] font-semibold" :class="iWonRound ? 'text-emerald-300' : 'text-rose-300'">
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
          <Skull v-else-if="hideSeekStore.isCurse && isRoundOver && row.jailed" class="size-3.5 text-slate-500" />
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
          <UiButton variant="ghost" size="sm" block :leading-icon="LogOut" @click="exitGame">
            {{ $t('hideseek.exit') }}
          </UiButton>
        </template>
      </template>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import type { GridCoord } from '../../types/map'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Flame, Shield, EyeOff, Search, Footprints, Trophy, Skull, Undo2, Gem, LogOut, RotateCcw, Crown, Lock, Package, Flag, Scale, DoorOpen, Timer, Move, MousePointerClick, Bell, Lamp, Link, Sparkles, Waypoints, Eye, UserRound, Crosshair } from 'lucide-vue-next'
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
import { gameAudio } from '../../services/gameAudio'
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

/** Solo curse: how many bots run the labyrinth with me */
const curseBotOptions = computed<TabItem[]>(() => [3, 5, 7].map(n => ({ id: n, label: t('curse.bots', { n }) })))
const curseBots = ref<string | number>(5)

function startCurse() {
  gameAudio.unlock()
  hideSeekStore.startCurseSolo(Number(curseBots.value), soloHero.value)
}

function startSolo(role: HideSeekRole) {
  gameAudio.unlock()
  hideSeekStore.startSoloRound(role, Number(soloTeamSize.value), soloHero.value)
}

const isSeeker = computed(() => hideSeekStore.myRole === 'seeker')
const isPlaying = computed(() => hideSeekStore.phase === 'hiding' || hideSeekStore.phase === 'seeking')
const isRoundOver = computed(() => hideSeekStore.phase === 'roundOver')
const isMatchOver = computed(() => hideSeekStore.phase === 'ended')

const bannerText = computed(() => {
  if (hideSeekStore.isCurse) {
    if (hideSeekStore.phase === 'hiding') return isSeeker.value ? t('curse.scatterCursed') : t('curse.scatterFree')
    return isSeeker.value ? t('curse.huntCursed') : t('curse.huntFree')
  }
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
  if (hideSeekStore.isCurse) {
    if (hideSeekStore.isJailed) return { text: t('curse.stone'), icon: Skull, cls: 'border-slate-500/50 text-slate-200' }
    if (hideSeekStore.dazedLeft > 0) return { text: t('curse.stunned', { s: hideSeekStore.dazedLeft }), icon: Skull, cls: 'border-fuchsia-400/60 text-fuchsia-200' }
    if (hideSeekStore.isProtected) return { text: t('curse.protected'), icon: Shield, cls: 'border-sky-400/60 text-sky-200' }
    if (hideSeekStore.isHidden) return { text: t('hideseek.hiddenHint'), icon: Package, cls: 'border-emerald-500/40 text-emerald-200' }
    return { text: isSeeker.value ? t('curse.huntCursed') : t('curse.huntFree'), icon: isSeeker.value ? Skull : Footprints, cls: isSeeker.value ? 'border-fuchsia-400/60 text-fuchsia-200' : 'border-emerald-500/40 text-emerald-200' }
  }
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
  survived: 'hideseek.reasonSurvived',
} as const

/** Rounds won: seekers : hiders */
const roundScore = computed(() => `${hideSeekStore.roundWins.seeker} : ${hideSeekStore.roundWins.hider}`)

/** The match is won by a side (the roles stay for the whole match) */
/** Curse: the one still standing when the round ended (nobody if the last two burnt together) */
const survivor = computed(() => (hideSeekStore.isCurse ? (hideSeekStore.scores.find(row => !row.jailed) ?? null) : null))
const championName = computed(() => hideSeekStore.scores.find(row => row.id === hideSeekStore.champion)?.name ?? '')

const resultTitle = computed(() => {
  if (isRoundOver.value) return t('hideseek.roundOver', { n: hideSeekStore.round })
  if (hideSeekStore.isCurse) return hideSeekStore.champion ? t('curse.championWon', { name: championName.value }) : t('hideseek.draw')
  const side = hideSeekStore.matchWinner
  if (!side) return t('hideseek.draw')
  return t(side === 'seeker' ? 'hideseek.seekersWonMatch' : 'hideseek.hidersWonMatch', { score: roundScore.value })
})

const iWonMatch = computed(() =>
  hideSeekStore.isCurse
    ? hideSeekStore.champion === multiplayerStore.myPlayerId
    : hideSeekStore.matchWinner !== null && hideSeekStore.matchWinner === hideSeekStore.myRole
)
/** Won the round that just ended: my side won it, or (curse) I am the one still standing */
const iWonRound = computed(() => (hideSeekStore.isCurse ? survivor.value?.isMe === true : hideSeekStore.didIWin))
/** The curse ranks single players: the match has a winner when it has a champion */
const hasMatchWinner = computed(() => (hideSeekStore.isCurse ? hideSeekStore.champion !== null : hideSeekStore.matchWinner !== null))

const resultSubtitle = computed(() => (hideSeekStore.endReason ? t(RESULT_KEYS[hideSeekStore.endReason]) : ''))

const resultIcon = computed(() => {
  if (isRoundOver.value) return Flag
  if (!hasMatchWinner.value) return Scale
  return iWonMatch.value ? Trophy : Skull
})

const resultColor = computed(() => {
  if (isRoundOver.value || !hasMatchWinner.value) return 'cyan' as const
  return iWonMatch.value ? ('amber' as const) : ('rose' as const)
})

/** Who won the round that just ended, from my side's point of view */
const roundLine = computed(() => {
  if (hideSeekStore.isCurse) return survivor.value ? t('curse.survivor', { name: survivor.value.name }) : t('curse.noSurvivor')
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
    gameAudio.unlock()
    action()
  }
}


/** The small map grows on a tap; on the big map a tap looks at that spot (the camera goes there, the map shrinks) */
function onMapTap(cell: GridCoord | null) {
  if (!isMapLarge.value) {
    isMapLarge.value = true
    return
  }
  isMapLarge.value = false
  if (cell) hideSeekStore.setLookAt(cell)
}

/** "You caught X" / "X caught you" / "X caught Y" */
const catchNoteText = computed(() => {
  const note = hideSeekStore.catchNote
  if (!note) return ''
  if (note.mine) return t('hideseek.youCaught', { name: note.caught })
  if (note.me) return t('hideseek.caughtYou', { name: note.catcher ?? '' })
  return t('hideseek.someoneCaught', { catcher: note.catcher ?? '', name: note.caught })
})

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

/**
 * Abilities first, then the role's gadgets (seeker: bell trap, candle; hider: chain); the curse has no gadgets.
 * Opening, hiding, doors and candles need no button: tapping the barrel / door / candle on the map does it (E on a
 * keyboard). count null = unlimited
 */
const gadgetButtons = computed(() => [
  ...abilityButtons.value,
  ...(hideSeekStore.isCurse ? [] : roleButtons.value.map(b => ({ ...b, timer: null }))),
])
/** The strongest ability (the longest cooldown) takes the big corner button */
const mainKey = computed(() => {
  const strongest = [...hideSeekStore.myAbilities.entries()].sort(([, a], [, b]) => b.cooldownTotal - a.cooldownTotal)[0]
  return strongest ? ABILITY_KEYS[strongest[0]] : ''
})
const roleButtons = computed(() =>
  isSeeker.value
    ? [
        { key: 'T', label: 'hideseek.trap', icon: Bell, count: hideSeekStore.gadgets.traps, active: false, blocked: false, run: run(hideSeekStore.dropTrap) },
        { key: 'C', label: 'hideseek.candle', icon: Lamp, count: hideSeekStore.gadgets.candles, active: false, blocked: false, run: run(hideSeekStore.setCandle) },
      ]
    : [
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
 * Where each skill sits, in a tidy corner: the strongest ability in the corner, the other abilities stacked straight
 * above it, the role's gadgets in a row to its left. Offsets are from the box's corner.
 */
const USE_SIZE = 64
const SKILL_SIZE = 48
const SKILL_GAP = 10
const gadgetPlaces = computed<Record<string, { right: string; bottom: string }>>(() => {
  const centre = (USE_SIZE - SKILL_SIZE) / 2
  const step = SKILL_SIZE + SKILL_GAP
  const places: Record<string, { right: string; bottom: string }> = { [mainKey.value]: { right: '0px', bottom: '0px' } }
  abilityButtons.value
    .map(g => g.key)
    .filter(key => key !== mainKey.value)
    .forEach((key, i) => (places[key] = { right: `${centre}px`, bottom: `${USE_SIZE + SKILL_GAP + i * step}px` }))
  if (!hideSeekStore.isCurse) {
    roleButtons.value.forEach((g, i) => (places[g.key] = { right: `${USE_SIZE + SKILL_GAP + i * step}px`, bottom: `${centre}px` }))
  }
  return places
})

// --- Floating joystick (screen-space direction, length 0..1) ---
/** Radius of the joystick base (size-28) in px */
const STICK_RADIUS = 56
/** The first part of a throw does nothing (a resting thumb never creeps); past FULL it runs at full speed */
const STICK_DEAD_ZONE = 0.18
const STICK_FULL = 0.6
/** Pushed less than this far (the inner ring) the hero sneaks */
const STICK_SNEAK = 0.5
/** A touch that ends this soon, without sliding, is a tap on the map */
const TAP_MS = 250
const TAP_SLOP = 10

const emit = defineEmits<{ tap: [clientX: number, clientY: number] }>()

const stickZoneRef = ref<HTMLElement | null>(null)
/** Base centre (zone px) and knob offset; at rest the base waits in the corner as a hint */
const stick = reactive({ active: false, x: 0, y: 0, knobX: 0, knobY: 0, sneaking: false })
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
  gameAudio.unlock()
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
  const tilt = reach / STICK_RADIUS
  const strength = Math.min(1, Math.max(0, (tilt - STICK_DEAD_ZONE) / (STICK_FULL - STICK_DEAD_ZONE)))
  // A gentle push (inside the inner ring) sneaks: slow and silent; pushed further it runs
  const sneaking = tilt > STICK_DEAD_ZONE && tilt < STICK_SNEAK
  if (sneaking !== stick.sneaking) {
    stick.sneaking = sneaking
    hideSeekStore.setSneakHeld(sneaking)
  }
  hideSeekStore.setJoystick(ux * strength, uy * strength)
}

function onStickUp(e: PointerEvent, tapped = true) {
  if (e.pointerId !== stickPointer) return
  stickPointer = null
  Object.assign(stick, { active: false, knobX: 0, knobY: 0, sneaking: false })
  hideSeekStore.setJoystick(0, 0)
  hideSeekStore.setSneakHeld(false)
  if (tapped && !stickTouch.moved && performance.now() - stickTouch.time < TAP_MS) emit('tap', stickTouch.x, stickTouch.y)
}
</script>
