<template>
  <div class="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden select-none font-sans">
    <!-- Animated Isometric Background Glow & Grid Lines -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div class="absolute top-2/3 right-1/4 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none"></div>
      
      <!-- Subtle Isometric Grid Pattern Overlay -->
      <div class="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px]"></div>
    </div>

    <!-- Top Navigation Bar -->
    <header class="relative z-10 w-full px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 p-0.5 shadow-xl shadow-brand-500/20 flex items-center justify-center">
          <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
            🏰
          </div>
        </div>
        <div>
          <h1 class="font-black text-lg text-white tracking-wider flex items-center gap-2">
            <span>ISOCRAFT</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 tracking-normal">
              v2.0 ONLINE
            </span>
          </h1>
          <p class="text-[11px] text-slate-400 font-medium">Isometric Engine & Multiplayer Tower Defense</p>
        </div>
      </div>

      <!-- Quick Player Badge & Profile -->
      <div class="flex items-center gap-3">
        <div class="glass-panel px-3.5 py-1.5 rounded-2xl border border-slate-800 flex items-center gap-2.5 text-xs bg-slate-900/80">
          <div 
            class="w-4 h-4 rounded-full border border-white/40 shadow-sm"
            :style="{ backgroundColor: multiplayerStore.myPlayerColor }"
          ></div>
          <span class="font-bold text-slate-200">{{ multiplayerStore.myPlayerName }}</span>
        </div>
      </div>
    </header>

    <!-- Main Hero Center Content -->
    <main class="relative z-10 flex-1 max-w-6xl mx-auto w-full px-6 py-8 flex flex-col items-center justify-center text-center">
      <!-- Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-6 shadow-inner animate-in fade-in slide-in-from-bottom-3 duration-500">
        <Sparkles class="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>Haqiqiy Warcraft 3 uslubidagi izometrik TD tajribasi</span>
      </div>

      <!-- Main Catchy Title -->
      <h2 class="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        O'z Xaritangizni Yarating va <br class="hidden sm:block" />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand-400 to-indigo-400">
          Do'stlaringiz Bilan Onlayn
        </span> O'ynang
      </h2>

      <p class="text-sm sm:text-base text-slate-400 max-w-2xl mt-4 leading-relaxed animate-in fade-in slide-in-from-bottom-5 duration-700">
        Professional izometrik muharrir yordamida noyob qatlamlar va minoralar yarating, xona oching va chiqish nuqtalari bo'yicha ko'p o'yinchili janglarni boshlang!
      </p>

      <!-- 3 Primary Action Cards (New Game, Join Online, Map Editor) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mt-10 max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
        
        <!-- 1. Yangi O'yin Yaratish (Create / Host Game) -->
        <div 
          @click="createGameModalRef?.open()"
          class="group p-6 rounded-3xl bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950/95 border border-amber-500/40 hover:border-amber-400/90 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden active:scale-98"
        >
          <div class="space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg">
              🎮
            </div>
            <div>
              <div class="flex items-center justify-between">
                <h3 class="font-black text-lg text-white group-hover:text-amber-300 transition-colors">
                  Yangi O'yin Yaratish
                </h3>
                <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                  Host
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                Karta tanlang (masalan, 4 o'yinchili Burbenog TD) va do'stlaringiz qo'shilishi uchun xona oching.
              </p>
            </div>
          </div>

          <div class="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400">
            <span>Xona Ochish</span>
            <ArrowRight class="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

        <!-- 2. Onlayn O'yinga Qo'shilish (Join Online Game) -->
        <div 
          @click="joinGameModalRef?.open()"
          class="group p-6 rounded-3xl bg-gradient-to-b from-brand-500/10 via-slate-900/90 to-slate-950/95 border border-brand-500/40 hover:border-brand-400/90 hover:shadow-2xl hover:shadow-brand-500/20 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden active:scale-98"
        >
          <div class="space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg">
              🌐
            </div>
            <div>
              <div class="flex items-center justify-between">
                <h3 class="font-black text-lg text-white group-hover:text-brand-300 transition-colors">
                  O'yinga Qo'shilish
                </h3>
                <span class="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold border border-brand-500/40">
                  P2P Online
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                Do'stingiz bergan 6 xonali xona kodini kiritib, to'g'ridan-to'g'ri o'yin kutish zaliga kiring.
              </p>
            </div>
          </div>

          <div class="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-brand-400">
            <span>Kod bilan Ulanish</span>
            <ArrowRight class="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

        <!-- 3. Xarita Tahrirlovchisi (Map Redactor) -->
        <div 
          @click="goToEditor"
          class="group p-6 rounded-3xl bg-gradient-to-b from-indigo-500/10 via-slate-900/90 to-slate-950/95 border border-indigo-500/40 hover:border-indigo-400/90 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden active:scale-98"
        >
          <div class="space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg">
              🗺️
            </div>
            <div>
              <div class="flex items-center justify-between">
                <h3 class="font-black text-lg text-white group-hover:text-indigo-300 transition-colors">
                  Xarita Tahrirlovchisi
                </h3>
                <span class="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/40">
                  Redaktor
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                Plitkalar, ko'p qatlamli obyektlar, minoralar va chiqish yo'llarini noldan yasash yoki tahrirlash.
              </p>
            </div>
          </div>

          <div class="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400">
            <span>Redaktorga O'tish</span>
            <ArrowRight class="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

      </div>

      <!-- Live Active Lobbies Section on Home Page -->
      <div 
        v-if="multiplayerStore.availableRooms.length > 0" 
        class="w-full max-w-5xl mt-8 text-left space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <Radio class="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">
              Faol Ochiq Xonalar ({{ multiplayerStore.availableRooms.length }})
            </h3>
          </div>
          <span class="text-xs text-emerald-400 font-semibold">1 bosishda qo'shiling</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div 
            v-for="room in multiplayerStore.availableRooms"
            :key="room.roomId"
            class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-brand-500/80 hover:bg-slate-850 transition-all flex items-center justify-between gap-3 shadow-lg"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div 
                class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-950 font-black text-sm shadow shrink-0"
                :style="{ backgroundColor: room.hostColor || '#38bdf8' }"
              >
                {{ room.hostName ? room.hostName.slice(0, 2).toUpperCase() : 'TD' }}
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-sm text-white truncate">{{ room.roomName }}</h4>
                <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span class="text-slate-300">{{ room.mapName }}</span>
                  <span>•</span>
                  <span class="text-amber-300 font-semibold font-mono">{{ room.playersCount }} / {{ room.maxPlayers }} O'rin</span>
                </div>
              </div>
            </div>

            <button 
              @click="quickJoinRoom(room.roomId)"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow transition-all cursor-pointer shrink-0 active:scale-95"
            >
              Qo'shilish
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Solo Test Button -->
      <div class="mt-8 flex items-center gap-4">
        <button 
          @click="startSoloGame"
          class="px-5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg"
        >
          <Play class="w-3.5 h-3.5 text-emerald-400" />
          <span>Yakka (Solo) Sinov O'yini</span>
        </button>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 w-full px-6 py-4 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-900 gap-2">
      <div class="flex items-center gap-2">
        <span>© 2026 Isocraft Engine</span>
        <span>•</span>
        <span>PixiJS 8 WebGPU / WebGL</span>
      </div>
      <div class="flex items-center gap-4">
        <span>Burbenog TD Multiplayer Edition</span>
      </div>
    </footer>

    <!-- Modals -->
    <CreateGameModal ref="createGameModalRef" />
    <JoinGameModal 
      ref="joinGameModalRef" 
      @open-create-game="createGameModalRef?.open()" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, ArrowRight, Play, Radio } from 'lucide-vue-next'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import CreateGameModal from '../components/CreateGameModal.vue'
import JoinGameModal from '../components/JoinGameModal.vue'
import burbenogMapData from '../maps/Burbenog.json'

const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const characterStore = useCharacterStore()

const createGameModalRef = ref<any>(null)
const joinGameModalRef = ref<any>(null)

let discoveryTimer: any = null
onMounted(() => {
  multiplayerStore.refreshDiscovery()
  discoveryTimer = setInterval(() => {
    multiplayerStore.refreshDiscovery()
  }, 500)
})

onUnmounted(() => {
  if (discoveryTimer) clearInterval(discoveryTimer)
})

function goToEditor() {
  router.push('/editor')
}

async function quickJoinRoom(roomId: string) {
  try {
    await multiplayerStore.joinGame(roomId, router)
  } catch (e) {
    console.error('Failed to join room:', e)
  }
}

async function startSoloGame() {
  const raw = burbenogMapData as any
  const project = raw.project || raw
  mapStore.project = JSON.parse(JSON.stringify(project))
  characterStore.detectDoors()
  
  await multiplayerStore.hostNewGame('Solo Burbenog TD', project, router)
}
</script>
