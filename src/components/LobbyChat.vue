<template>
  <UiCard padding="none" custom-class="flex-col h-full">
    <!-- Chat Header -->
    <div class="px-3 pt-3 pb-2 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <MessageSquare class="size-4 text-brand-300" />
        <h2 class="text-sm font-extrabold text-slate-50">{{ $t('lobby.chatTitle') }}</h2>
      </div>
      <UiBadge variant="slate" size="xs">
        {{ multiplayerStore.chatMessages.length }}
      </UiBadge>
    </div>

    <!-- Messages Container -->
    <div 
      ref="chatScrollRef"
      class="flex-1 min-h-0 px-3 pb-2 overflow-y-auto space-y-2 text-xs"
    >
      <div 
        v-if="multiplayerStore.chatMessages.length === 0"
        class="h-full flex items-center justify-center text-center text-slate-500 text-xs py-8"
      >
        <span>{{ $t('lobby.chatPlaceholder') }}</span>
      </div>

      <div 
        v-for="msg in multiplayerStore.chatMessages" 
        :key="msg.id"
        class="animate-in fade-in duration-150"
      >
        <!-- System notification -->
        <div v-if="msg.isSystem" class="px-2.5 py-1 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] text-amber-300/90 italic text-center">
          {{ msg.text }}
        </div>

        <!-- Normal player message -->
        <div v-else class="flex flex-col gap-0.5">
          <div class="flex items-center gap-1.5">
            <span 
              class="font-bold text-[11px]"
              :style="{ color: msg.senderColor }"
            >
              {{ msg.senderName }}:
            </span>
            <span class="text-[9px] text-slate-500">
              {{ formatTime(msg.timestamp) }}
            </span>
          </div>
          <div class="px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-slate-200 text-xs wrap-break-word leading-relaxed inline-block max-w-full">
            {{ msg.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- Input Bar -->
    <div class="p-2 border-t border-slate-800 flex items-center gap-2 shrink-0">
      <UiInput 
        v-model="inputMsg"
        size="sm"
        :placeholder="$t('lobby.chatPlaceholder')"
        :maxlength="120"
        custom-class="flex-1"
        @keyup.enter="handleSend"
      />
      <UiButton
        variant="primary"
        size="icon"
        :leading-icon="Send"
        :disabled="!inputMsg.trim()"
        :title="$t('lobby.send')"
        @click="handleSend"
      />
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { MessageSquare, Send } from 'lucide-vue-next'
import { UiCard, UiInput, UiButton, UiBadge } from './ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'

const multiplayerStore = useMultiplayerStore()
const inputMsg = ref('')
const chatScrollRef = ref<HTMLDivElement | null>(null)

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function handleSend() {
  if (!inputMsg.value.trim()) return
  multiplayerStore.sendChat(inputMsg.value)
  inputMsg.value = ''
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (chatScrollRef.value) {
      chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
    }
  })
}

watch(
  () => multiplayerStore.chatMessages.length,
  () => {
    scrollToBottom()
  }
)
</script>
