<template>
  <section class="flex flex-col min-h-0 min-w-0">
    <!-- Who is online -->
    <h3 class="h-6 flex items-center gap-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-sky-300 shrink-0">
      <span :class="['size-2 rounded-full', online.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600']" />
      {{ $t('online.title') }}
      <span class="ml-auto font-bold text-slate-500 tabular-nums">{{ online.others.length }}</span>
    </h3>

    <!-- One line, however many are online: it slides sideways (the chat below keeps its room).
         A name only; who is followed, banned or the admin shows in its colour; where they are, once picked. -->
    <div class="shrink-0 flex gap-1.5 pb-1.5 pt-0.5 px-0.5 overflow-x-auto no-scrollbar" :class="online.others.length > 3 ? 'mask-r-from-85%' : ''">
      <UiButton
        v-for="player in online.others"
        :key="player.id"
        variant="ghost"
        size="xs"
        :custom-class="[
          'shrink-0 h-8! px-2.5! rounded-xl! border!',
          selectedId === player.id ? 'border-sky-400/70! bg-sky-500/10!' : online.followingId === player.id ? 'border-sky-500/40! bg-slate-950/40!' : 'border-slate-800! bg-slate-950/40!',
        ].join(' ')"
        @click="selectedId = selectedId === player.id ? '' : player.id"
      >
        <span class="flex items-center gap-1.5 whitespace-nowrap">
          <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: player.color }" />
          <span
            class="max-w-24 truncate text-[11px] font-bold"
            :class="online.isBanned(player.id) ? 'text-rose-300 line-through' : player.admin ? 'text-amber-200' : 'text-slate-100'"
          >{{ player.name }}</span>
        </span>
      </UiButton>
      <p v-if="online.others.length === 0" class="text-[11px] text-slate-500 px-1 py-1">{{ $t(online.connected ? 'online.nobody' : 'online.offline') }}</p>
    </div>

    <!-- The picked player: where they are, follow them, and the admin's ban -->
    <div v-if="selected" class="shrink-0 mb-1.5 p-2 rounded-xl border border-sky-500/30 bg-sky-500/5 flex flex-col gap-1.5">
      <p class="text-[11px] text-slate-300 truncate">
        <span class="font-bold" :style="{ color: selected.color }">{{ selected.name }}</span> · {{ placeText(selected) }}
      </p>
      <div class="flex flex-wrap items-center gap-1.5">
        <UiButton
          v-if="online.followingId === selected.id"
          variant="secondary"
          size="xs"
          :leading-icon="EyeOff"
          @click="online.unfollow()"
        >
          {{ $t('online.unfollow') }}
        </UiButton>
        <UiButton v-else variant="primary" size="xs" :leading-icon="Eye" @click="online.follow(selected.id)">
          {{ $t('online.follow') }}
        </UiButton>
        <template v-if="online.isAdmin">
          <span class="ml-auto text-[10px] uppercase tracking-wider text-slate-500">{{ $t('online.ban') }}</span>
          <UiButton v-for="option in BAN_OPTIONS" :key="option.minutes" variant="danger" size="xs" @click="online.ban(selected.id, option.minutes)">
            {{ $t(option.label) }}
          </UiButton>
          <UiButton v-if="online.isBanned(selected.id)" variant="secondary" size="xs" :leading-icon="Mic" @click="online.unban(selected.id)">
            {{ $t('online.unban') }}
          </UiButton>
        </template>
      </div>
    </div>

    <!-- The big chat -->
    <div ref="logRef" class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/40 p-2">
      <p v-if="online.messages.length === 0" class="m-auto text-center text-[11px] text-slate-500">{{ $t('online.empty') }}</p>
      <div v-for="message in online.messages" :key="message.id" class="group flex items-start gap-1.5 text-xs leading-snug">
        <p class="flex-1 min-w-0 wrap-break-word">
          <ShieldCheck v-if="message.admin" class="inline size-3 -mt-0.5 mr-0.5 text-amber-300" />
          <span class="font-bold mr-1" :style="{ color: message.color }">{{ message.name }}:</span>
          <span class="text-slate-200">{{ message.text }}</span>
        </p>
        <span class="text-[9px] text-slate-500 tabular-nums shrink-0 pt-0.5">{{ time(message.at) }}</span>
        <UiIconButton
          v-if="online.isAdmin"
          :icon="Trash2"
          size="xs"
          variant="ghost"
          :title="$t('online.delete')"
          custom-class="shrink-0 -my-1 text-slate-500 hover:text-rose-400"
          @click="online.deleteMessage(message.id)"
        />
      </div>
    </div>

    <p v-if="online.myBanUntil" class="shrink-0 mt-1 flex items-center gap-1.5 text-[11px] text-rose-300">
      <MicOff class="size-3.5" /> {{ $t('online.bannedUntil', { time: time(online.myBanUntil) }) }}
    </p>
    <div class="shrink-0 pt-1.5 flex items-center gap-1.5">
      <UiInput
        v-model="draft"
        size="sm"
        :placeholder="$t('online.placeholder')"
        :maxlength="200"
        :disabled="!online.connected || !!online.myBanUntil"
        custom-class="flex-1 min-w-0"
        @keyup.enter="send"
      />
      <UiIconButton :icon="Send" size="sm" variant="success" :title="$t('lobby.send')" :disabled="!draft.trim() || !online.connected || !!online.myBanUntil" @click="send" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Eye, EyeOff, Mic, MicOff, Send, ShieldCheck, Trash2 } from 'lucide-vue-next'
import { UiButton, UiIconButton, UiInput } from '../ui'
import { useOnlineStore, type OnlinePlayer } from '../../stores/onlineStore'
import { useI18nStore } from '../../stores/i18nStore'

/** Everyone online, following one of them into rooms, and the big chat (the admin deletes messages and bans) */
const online = useOnlineStore()
const { t } = useI18nStore()

const BAN_OPTIONS = [
  { minutes: 10, label: 'online.ban10m' },
  { minutes: 60, label: 'online.ban1h' },
  { minutes: 24 * 60, label: 'online.ban1d' },
]

const selectedId = ref('')
const selected = computed(() => online.others.find(p => p.id === selectedId.value) ?? null)
const draft = ref('')
const logRef = ref<HTMLElement | null>(null)

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function placeText(player: OnlinePlayer): string {
  if (player.place === 'lobby') return t(player.isHost ? 'online.placeHosting' : 'online.placeLobby', { room: player.roomName || player.mapName })
  if (player.place === 'game') return t('online.placeGame', { room: player.roomName || player.mapName })
  return t(`online.place.${player.place}`)
}

function send() {
  if (online.sendMessage(draft.value)) draft.value = ''
}

// The newest message stays in view
watch(
  () => online.messages.length,
  async () => {
    await nextTick()
    logRef.value?.scrollTo({ top: logRef.value.scrollHeight })
  },
  { immediate: true }
)
</script>
