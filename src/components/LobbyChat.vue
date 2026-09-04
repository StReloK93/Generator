<template>
  <UiCard 
    variant="slate" 
    padding="none" 
    custom-class="flex flex-col h-full rounded-3xl border-slate-800/90 shadow-2xl overflow-hidden backdrop-blur-md"
  >
    <!-- Chat Header -->
    <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-4 h-4 text-brand-400" />
        <span class="text-xs font-bold text-white uppercase tracking-wider">Room Chat</span>
      </div>
      <UiBadge variant="slate" size="xs">
        {{ multiplayerStore.chatMessages.length }} messages
      </UiBadge>
    </div>

    <!-- Messages Container -->
    <div 
      ref="chatScrollRef"
      class="flex-1 p-3.5 overflow-y-auto space-y-2.5 custom-scrollbar text-xs"
    >
      <div 
        v-if="multiplayerStore.chatMessages.length === 0"
        class="h-full flex items-center justify-center text-center text-slate-500 text-xs py-8"
      >
        <span>No messages yet. Be the first to say hello!</span>
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
            <span class="text-[9px] text-slate-500 font-mono">
              {{ formatTime(msg.timestamp) }}
            </span>
          </div>
          <div class="px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-slate-200 text-xs break-words leading-relaxed inline-block max-w-full">
            {{ msg.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- Input Bar -->
    <div class="p-2.5 border-t border-slate-800/80 bg-slate-900/60 flex items-center gap-2 shrink-0">
      <UiInput 
        v-model="inputMsg"
        size="sm"
        placeholder="Type a message... (Enter)"
        :maxlength="120"
        custom-class="flex-1"
        @keyup.enter="handleSend"
      />
      <UiIconButton 
        :icon="Send"
        size="md"
        variant="default"
        :disabled="!inputMsg.trim()"
        title="Send"
        custom-class="bg-brand-600 hover:bg-brand-500 text-white border-brand-500/40"
        @click="handleSend"
      />
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { MessageSquare, Send } from 'lucide-vue-next'
import { UiCard, UiInput, UiIconButton, UiBadge } from './ui'
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
