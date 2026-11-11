<template>
  <!-- The player's settings, the same on the home page and in the game menu -->
  <div class="flex flex-col gap-2">
    <UiSwitch v-model="settings.soundOn" variant="emerald" custom-class="p-2.5!">
      <span class="flex items-center gap-2">
        <component :is="settings.soundOn ? Volume2 : VolumeX" class="size-4 text-emerald-300" />{{ $t('settings.sound') }}
      </span>
    </UiSwitch>

    <!-- Only Telegram gives the game a vibration motor -->
    <UiSwitch v-if="isTelegram" v-model="settings.vibrationOn" variant="emerald" custom-class="p-2.5!">
      <span class="flex items-center gap-2"><Vibrate class="size-4 text-emerald-300" />{{ $t('settings.vibration') }}</span>
    </UiSwitch>

    <!-- An installed app and Telegram already run full screen; iPhones cannot -->
    <UiSwitch v-if="canFullscreen" :model-value="isFullscreen" variant="emerald" custom-class="p-2.5!" @update:model-value="toggleAppFullscreen()">
      <span class="flex items-center gap-2"><Maximize2 class="size-4 text-emerald-300" />{{ $t('common.fullscreen') }}</span>
    </UiSwitch>

    <div class="flex flex-col gap-2 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800">
      <span class="flex items-center gap-2 text-xs font-semibold text-slate-200">
        <Languages class="size-4 text-emerald-300" />{{ $t('settings.language') }}
      </span>
      <UiTabs :model-value="i18n.currentLocale" :items="languages" variant="segmented" size="sm" fill @update:model-value="i18n.setLocale($event as SupportedLocale)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Languages, Maximize2, Vibrate, Volume2, VolumeX } from 'lucide-vue-next'
import { UiSwitch, UiTabs } from './ui'
import { useSettingsStore } from '../stores/settingsStore'
import { useI18nStore, type SupportedLocale } from '../stores/i18nStore'
import { isTelegram } from '../services/telegram'
import { isFullscreen, isStandalone } from '../utils/pwaOrientation'
import { toggleAppFullscreen } from '../utils/fullscreen'

const settings = useSettingsStore()
const i18n = useI18nStore()

const languages = computed(() => i18n.locales.map(l => ({ id: l.code, label: l.nativeName })))
const canFullscreen = computed(() => !isStandalone.value && document.fullscreenEnabled)
</script>
