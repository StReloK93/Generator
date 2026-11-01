<template>
  <!-- Phase banner (left of the right HUD panel) -->
  <div class="absolute top-3 left-3 right-64 sm:right-68 z-30 flex justify-center pointer-events-none">
    <div
      v-if="hideSeekStore.phase !== 'ended'"
      class="flex items-center gap-2 rounded-2xl border px-3 py-1.5 bg-slate-950/85 backdrop-blur-md shadow-xl"
      :class="hideSeekStore.phase === 'hiding' ? 'border-amber-500/40' : 'border-slate-700/80'"
    >
      <component :is="bannerIcon" class="size-4 shrink-0" :class="hideSeekStore.phase === 'hiding' ? 'text-amber-300' : 'text-rose-300'" />
      <span class="text-xs sm:text-sm font-extrabold text-slate-50">{{ bannerText }}</span>
      <span class="text-xs sm:text-sm font-black tabular-nums text-amber-300">{{ hideSeekStore.secondsLeft }}s</span>
    </div>
  </div>

  <!-- Touch controls: joystick + sneak toggle -->
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

  <!-- Match result -->
  <UiModal
    :is-open="hideSeekStore.isActive && hideSeekStore.phase === 'ended' && !!multiplayerStore.roomId"
    :title="hideSeekStore.didIWin ? $t('hideseek.youWin') : $t('hideseek.youLose')"
    :subtitle="resultText"
    :icon="hideSeekStore.didIWin ? Trophy : Skull"
    :icon-color="hideSeekStore.didIWin ? 'amber' : 'rose'"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
  >
    <UiButton variant="game-green" size="lg" block :leading-icon="Undo2" @click="multiplayerStore.returnToLobby(router)">
      {{ $t('hideseek.backToLobby') }}
    </UiButton>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EyeOff, Search, Footprints, Trophy, Skull, Undo2, Shield } from 'lucide-vue-next'
import { UiButton, UiModal } from '../ui'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useI18n } from '../../stores/i18nStore'
import { hideSeekAudio } from '../../services/hideSeekAudio'

const router = useRouter()
const hideSeekStore = useHideSeekStore()
const multiplayerStore = useMultiplayerStore()
const { t } = useI18n()

const isSeeker = computed(() => hideSeekStore.myRole === 'seeker')

const bannerIcon = computed(() => {
  if (hideSeekStore.phase === 'hiding') return isSeeker.value ? EyeOff : Shield
  return Search
})

const bannerText = computed(() => {
  if (hideSeekStore.phase === 'hiding') {
    return isSeeker.value ? t('hideseek.phaseHidingSeeker') : t('hideseek.phaseHidingHider')
  }
  return isSeeker.value ? t('hideseek.phaseSeekingSeeker') : t('hideseek.phaseSeekingHider')
})

const RESULT_KEYS = {
  caught: 'hideseek.reasonCaught',
  chests: 'hideseek.reasonChests',
  time: 'hideseek.reasonTime',
  left: 'hideseek.reasonLeft',
} as const

const resultText = computed(() => (hideSeekStore.endReason ? t(RESULT_KEYS[hideSeekStore.endReason]) : ''))

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
