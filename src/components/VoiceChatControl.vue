<template>
  <div class="relative flex items-center gap-1">
    <!-- Quick microphone switch once in voice -->
    <UiIconButton
      v-if="voiceStore.isJoined && voiceStore.hasMic"
      :icon="voiceStore.isMicOn ? Mic : MicOff"
      :size="size"
      :variant="voiceStore.isMicOn ? 'success' : 'danger'"
      :title="voiceStore.isMicOn ? $t('voice.micOff') : $t('voice.micOn')"
      :custom-class="[buttonClass, isMeSpeaking ? 'ring-2 ring-emerald-400' : '']"
      @click="voiceStore.toggleMic()"
    />
    <UiIconButton
      :icon="voiceStore.isJoining ? Loader2 : Headphones"
      :size="size"
      :variant="isOpen || voiceStore.isJoined ? 'amber' : 'ghost'"
      :title="$t('voice.title')"
      :custom-class="[buttonClass, voiceStore.isJoining ? '[&_svg]:animate-spin' : '']"
      @click="isOpen = !isOpen"
    />

    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-1.5 w-56 max-w-[calc(100vw-1.5rem)] z-50 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl p-2 flex flex-col gap-2 text-xs"
    >
      <div class="flex items-center gap-1.5 px-1 font-extrabold text-slate-50">
        <Headphones class="size-4 text-brand-300" />
        {{ $t('voice.title') }}
      </div>

      <template v-if="voiceStore.isJoined">
        <p v-if="!voiceStore.hasMic" class="px-1 text-[11px] text-amber-300">{{ $t('voice.listenOnly') }}</p>

        <!-- Who hears me: the whole room or only my side -->
        <UiTabs
          v-if="voiceStore.hasTeams"
          :model-value="voiceStore.channel"
          :items="channelTabs"
          size="xs"
          fill
          @update:model-value="voiceStore.setChannel($event as VoiceChannel)"
        />

        <ul class="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
          <li
            v-for="p in otherPlayers"
            :key="p.id"
            class="flex items-center gap-2 px-1.5 py-1 rounded-lg bg-slate-900/60"
          >
            <span
              :class="['size-2.5 rounded-full shrink-0 transition-shadow', voiceStore.speakingIds.includes(p.id) ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950' : '']"
              :style="{ backgroundColor: p.color }"
            />
            <span class="flex-1 min-w-0 truncate font-semibold text-slate-200">{{ p.name }}</span>
            <span v-if="!voiceStore.connectedIds.includes(p.id)" class="text-[10px] text-slate-500 shrink-0">{{ $t('voice.notInVoice') }}</span>
            <UiIconButton
              v-else
              :icon="voiceStore.mutedIds.includes(p.id) ? VolumeX : Volume2"
              size="sm"
              :variant="voiceStore.mutedIds.includes(p.id) ? 'danger' : 'ghost'"
              :title="$t('voice.mutePlayer')"
              @click="voiceStore.togglePlayerMuted(p.id)"
            />
          </li>
          <li v-if="otherPlayers.length === 0" class="px-1.5 py-2 text-center text-slate-500">{{ $t('voice.alone') }}</li>
        </ul>

        <UiButton variant="danger" size="sm" block :leading-icon="PhoneOff" @click="voiceStore.leave()">
          {{ $t('voice.leave') }}
        </UiButton>
      </template>

      <template v-else>
        <p class="px-1 text-[11px] text-slate-400">{{ $t('voice.hint') }}</p>
        <UiButton
          variant="game-green"
          size="sm"
          block
          :leading-icon="Mic"
          :disabled="voiceStore.isJoining"
          @click="handleJoin"
        >
          {{ $t('voice.join') }}
        </UiButton>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Headphones, Mic, MicOff, Volume2, VolumeX, PhoneOff, Loader2, Users, Shield } from 'lucide-vue-next'
import { UiButton, UiIconButton, UiTabs, type IconButtonSize, type TabItem } from './ui'
import { useVoiceStore, type VoiceChannel } from '../stores/voiceStore'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'

withDefaults(defineProps<{ size?: IconButtonSize; buttonClass?: string }>(), {
  size: 'sm',
  buttonClass: '',
})

const voiceStore = useVoiceStore()
const multiplayerStore = useMultiplayerStore()
const notify = useNotificationStore()
const { t } = useI18n()

const isOpen = ref(false)

const otherPlayers = computed(() => multiplayerStore.players.filter(p => p.id !== multiplayerStore.myPlayerId))
const isMeSpeaking = computed(() => voiceStore.speakingIds.includes(multiplayerStore.myPlayerId))

const channelTabs = computed<TabItem[]>(() => [
  { id: 'all', label: t('voice.channelAll'), icon: Users },
  { id: 'team', label: t('voice.channelTeam'), icon: Shield },
])

async function handleJoin() {
  const result = await voiceStore.join()
  if (result === 'failed') notify.error(t('voice.failed'))
  else if (result === 'listen-only') notify.warning(t('voice.listenOnly'))
}
</script>
