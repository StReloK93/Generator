<template>
  <div class="flex flex-col h-full rounded-3xl bg-slate-950/80 border border-slate-800/90 shadow-2xl overflow-hidden backdrop-blur-md">
    <!-- Chat Header -->
    <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-4 h-4 text-brand-400" />
        <span class="text-xs font-bold text-white uppercase tracking-wider">Xona Chati</span>
      </div>
      <span class="text-[10px] font-mono text-slate-500">
        {{ multiplayerStore.chatMessages.length }} xabar
      </span>
    </div>

    <!-- Messages Container -->
    <div 
      ref="chatScrollRef"
      class="flex-1 p-3.5 overflow-y-auto space-y-2.5 custom-scrollbar text-xs"
    >
      <div 
        v-if="multiplayerStore.chatMessages.length === 0"
        class="h-full flex items-center justify-center text-center text-slate-600 text-xs py-8"
      >
        <span>Xabarlar yo'q. Birinchi bo'lib yozing!</span>
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
    <div class="p-2.5 border-t border-slate-800/80 bg-slate-900/60 flex items-center gap-2">
      <input 
        v-model="inputMsg"
        type="text"
        placeholder="Xabar yozing... (Enter)"
        maxlength="120"
        class="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40"
        @keyup.enter="handleSend"
      />
      <button 
        @click="handleSend"
        :disabled="!inputMsg.trim()"
        class="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
        title="Yuborish"
      >
        <Send class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { MessageSquare, Send } from 'lucide-vue-next'
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
