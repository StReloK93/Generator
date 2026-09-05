<template>
  <div class="relative h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans px-8 py-4 pt-safe pb-safe">
    
    <!-- ================= BACKGROUND FX & ATMOSPHERE ================= -->
    <!-- Taktik Panjara (Cyber Grid) -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-size-[32px_32px] pointer-events-none"></div>
    
    <!-- Radar / Scanning Sweep Effect -->
    <div class="absolute inset-0 bg-linear-to-b from-cyan-500/4 via-transparent to-transparent pointer-events-none animate-[pulse_4s_ease-in-out_infinite]"></div>

    <!-- Ambient Glowing Orbs -->
    <div class="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Hexagon Overlay Pattern -->
    <div class="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] bg-size-[16px_16px] pointer-events-none"></div>


    <!-- ================= TOP HUD HEADER ================= -->
    <header class="relative z-20 w-full flex items-center justify-between">
      <!-- Game Logo / Insignia -->
      <div class="flex items-center gap-3">
        <div class="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-linear-to-br from-amber-400 via-amber-600 to-amber-900 p-[1.5px] shadow-[0_0_20px_rgba(245,158,11,0.4)]">
          <div class="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center backdrop-blur-md">
            <Castle class="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          </div>
        </div>

        <div class="flex flex-col text-left">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-linear-to-b from-white via-amber-200 to-amber-500 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              ISOCRAFT
            </span>
            <UiBadge variant="amber" style-type="glow" size="xs">
              TD CORE
            </UiBadge>
          </div>
          <span class="text-[9px] font-black tracking-[0.3em] uppercase text-cyan-400 drop-shadow flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            Tactical Defense Grid
          </span>
        </div>
      </div>

      <!-- Commander Profile Badge -->
      <div class="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 pl-2 pr-4 py-1.5 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <div class="relative">
          <div 
            class="w-7 h-7 rounded-xl border-2 border-white/60 shadow-inner flex items-center justify-center text-[10px] font-black text-slate-950"
            :style="{ backgroundColor: multiplayerStore.myPlayerColor || '#38bdf8' }"
          >
            {{ multiplayerStore.myPlayerName ? multiplayerStore.myPlayerName.slice(0, 1).toUpperCase() : 'C' }}
          </div>
          <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950 ring-2 ring-emerald-500/40"></span>
        </div>
        <div class="flex flex-col text-left">
          <span class="text-[8px] uppercase tracking-widest font-black text-slate-400">Commander</span>
          <span class="font-extrabold text-xs text-white tracking-wide truncate max-w-32.5">
            {{ multiplayerStore.myPlayerName }}
          </span>
        </div>
      </div>
    </header>


    <!-- ================= MAIN ARENA (LANDSCAPE 2-COLUMN) ================= -->
    <main class="relative z-20 flex-1 grid grid-cols-12 gap-8 items-center my-auto w-full max-w-6xl mx-auto min-h-0">
      
      <!-- LEFT COLUMN: Live War Lobbies / Tactical Monitor (5 cols) -->
      <div class="col-span-5 flex flex-col justify-center h-full max-h-60">
        
        <!-- Open Lobbies Found -->
        <div v-if="multiplayerStore.availableRooms.length > 0" class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <Radio class="w-4 h-4 text-emerald-400 animate-pulse" />
              <span class="text-[11px] font-black uppercase tracking-widest text-emerald-400 drop-shadow">
                Live Deployments ({{ multiplayerStore.availableRooms.length }})
              </span>
            </div>
            <button 
              type="button"
              class="text-[10px] text-slate-400 hover:text-emerald-300 font-black uppercase tracking-wider cursor-pointer transition-colors"
              @click="router.push('/play')" 
            >
              Browse All &rarr;
            </button>
          </div>

          <div class="flex flex-col gap-2.5 overflow-y-auto pr-1">
            <UiCard 
              v-for="room in multiplayerStore.availableRooms.slice(0, 2)" 
              :key="room.roomId"
              variant="default"
              padding="sm"
              interactive
              custom-class="hover:border-emerald-500/40 group"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div 
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-950 font-black text-xs border border-white/30 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0"
                    :style="{ backgroundColor: room.hostColor || '#10b981' }"
                  >
                    {{ room.hostName ? room.hostName.slice(0, 2).toUpperCase() : 'TD' }}
                  </div>
                  <div class="min-w-0 text-left">
                    <h4 class="font-extrabold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">{{ room.roomName }}</h4>
                    <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span class="text-slate-300 font-semibold truncate max-w-22.5">{{ room.mapName }}</span>
                      <span>•</span>
                      <span class="text-amber-400 font-black font-mono">{{ room.playersCount }}/{{ room.maxPlayers }}</span>
                    </div>
                  </div>
                </div>

                <!-- Quick Deploy Mini-Button -->
                <UiButton
                  variant="game-green"
                  size="xs"
                  @click="router.push('/play')"
                >
                  Engage
                </UiButton>
              </div>
            </UiCard>
          </div>
        </div>

        <!-- No Rooms / Singleplayer Campaign Status Card -->
        <UiCard 
          v-else 
          variant="slate"
          padding="lg"
          custom-class="relative overflow-hidden group text-left"
        >
          <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
          
          <div class="flex items-center gap-2 mb-2">
            <ShieldAlert class="w-4 h-4 text-amber-400 animate-bounce" />
            <span class="text-[10px] font-black tracking-widest text-amber-400 uppercase">Perimeter Status: Normal</span>
          </div>
          <h2 class="text-base font-black text-white tracking-wide">Base Fortification Active</h2>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">
            Construct defenses, withstand unrelenting waves of invaders, or formulate custom siege layouts.
          </p>
        </UiCard>

      </div>

      <!-- Spacing Column (1 col) -->
      <div class="col-span-1"></div>

      <!-- RIGHT COLUMN: Heavy Armor Action Buttons (6 cols) -->
      <div class="col-span-6 flex flex-col gap-3.5 justify-center">
        
        <!-- 1. BATTLE / PLAY GAME BUTTON -->
        <button 
          type="button"
          class="group relative w-full p-4 rounded-2xl bg-linear-to-r from-amber-500 via-yellow-500 to-amber-600 border-t-2 border-amber-200 border-b-[6px] border-amber-950 active:border-b-2 active:translate-y-1 shadow-[0_12px_30px_rgba(245,158,11,0.45)] hover:shadow-[0_12px_35px_rgba(245,158,11,0.65)] transition-all duration-150 cursor-pointer flex items-center justify-between overflow-hidden"
          @click="router.push('/play')"
        >
          <!-- Shimmer Sweep Line -->
          <div class="absolute inset-0 w-1/3 bg-white/30 skew-x-12 group-hover:translate-x-[400%] transition-transform duration-700 pointer-events-none"></div>

          <div class="flex items-center gap-3.5 relative z-10">
            <div class="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner group-hover:scale-105 transition-transform">
              <Swords class="w-7 h-7 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            </div>
            <div class="text-left">
              <div class="font-black text-xl text-slate-950 tracking-wider uppercase drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
                BATTLE COMMENCE
              </div>
              <span class="text-[10px] font-black text-amber-950/80 tracking-widest uppercase">
                Host / Join Multiplayer Arena
              </span>
            </div>
          </div>

          <div class="w-10 h-10 rounded-xl bg-amber-900/70 border border-amber-400/40 flex items-center justify-center text-amber-200 shadow group-hover:bg-amber-950 transition-colors">
            <ChevronRight class="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <!-- 2. TACTICAL MAP EDITOR BUTTON -->
        <button 
          type="button"
          class="group relative w-full p-3.5 rounded-2xl bg-linear-to-r from-cyan-600 via-blue-600 to-indigo-700 border-t-2 border-cyan-300 border-b-[6px] border-slate-950 active:border-b-2 active:translate-y-1 shadow-[0_10px_25px_rgba(6,182,212,0.35)] hover:shadow-[0_10px_30px_rgba(6,182,212,0.55)] transition-all duration-150 cursor-pointer flex items-center justify-between overflow-hidden"
          @click="goToEditor"
        >
          <!-- Shimmer Sweep Line -->
          <div class="absolute inset-0 w-1/3 bg-white/25 skew-x-12 group-hover:translate-x-[400%] transition-transform duration-700 pointer-events-none"></div>

          <div class="flex items-center gap-3.5 relative z-10">
            <div class="w-11 h-11 rounded-xl bg-slate-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner group-hover:scale-105 transition-transform">
              <Layers class="w-6 h-6 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
            </div>
            <div class="text-left">
              <div class="flex items-center gap-2">
                <span class="font-black text-base text-white tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  MAP ARCHITECT
                </span>
                <UiBadge variant="cyan" size="xs">
                  EDITOR
                </UiBadge>
              </div>
              <span class="text-[10px] font-extrabold text-cyan-200/80 tracking-widest uppercase">
                Forge Waves & Pathing Nodes
              </span>
            </div>
          </div>

          <div class="w-9 h-9 rounded-xl bg-slate-950/70 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow group-hover:bg-slate-900 transition-colors">
            <ChevronRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <!-- 3. ASSET STUDIO / EDITOR BUTTON -->
        <button 
          type="button"
          class="group relative w-full p-3 rounded-2xl bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-800 border-t-2 border-emerald-300 border-b-6 border-slate-950 active:border-b-2 active:translate-y-1 shadow-[0_10px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_10px_30px_rgba(16,185,129,0.55)] transition-all duration-150 cursor-pointer flex items-center justify-between overflow-hidden"
          @click="router.push('/asset-editor')"
        >
          <!-- Shimmer Sweep Line -->
          <div class="absolute inset-0 w-1/3 bg-white/25 skew-x-12 group-hover:translate-x-[400%] transition-transform duration-700 pointer-events-none"></div>

          <div class="flex items-center gap-3.5 relative z-10">
            <div class="w-10 h-10 rounded-xl bg-slate-950/80 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner group-hover:scale-105 transition-transform">
              <Wrench class="w-5 h-5 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </div>
            <div class="text-left">
              <div class="flex items-center gap-2">
                <span class="font-black text-sm text-white tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  ASSET EDITOR
                </span>
                <UiBadge variant="emerald" size="xs">
                  STUDIO
                </UiBadge>
              </div>
              <span class="text-[9px] font-extrabold text-emerald-200/80 tracking-widest uppercase">
                Combine Sprites & Export Transparent PNG
              </span>
            </div>
          </div>

          <div class="w-8 h-8 rounded-xl bg-slate-950/70 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow group-hover:bg-slate-900 transition-colors">
            <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

      </div>

    </main>


    <!-- ================= BOTTOM SUB-HUD ================= -->
    <footer class="relative z-20 w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-slate-800/80 pt-2">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
        <span>PROTOCOL v1.4.2 &bull; ALL SYSTEMS ONLINE</span>
      </div>
      <div class="flex items-center gap-4 text-slate-400">
        <span class="hover:text-white cursor-pointer transition-colors">ISOCRAFT STUDIOS</span>
        <span class="text-amber-400/80 font-mono">READY</span>
      </div>
    </footer>

    <!-- Editor Setup Modal -->
    <WelcomeProjectModal ref="editorSetupModalRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Castle, 
  Radio, 
  Swords, 
  Layers, 
  ChevronRight, 
  ShieldAlert,
  Wrench
} from 'lucide-vue-next'
import { UiBadge, UiCard, UiButton } from '../components/ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import { assetManager } from '../services/assetManager'

const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const editorSetupModalRef = ref<any>(null)

let discoveryTimer: any = null
onMounted(() => {
  assetManager.preloadRemainingInBackground()

  multiplayerStore.refreshDiscovery()
  discoveryTimer = setInterval(() => {
    multiplayerStore.refreshDiscovery()
  }, 1000)
})

onUnmounted(() => {
  if (discoveryTimer) clearInterval(discoveryTimer)
})

function goToEditor() {
  editorSetupModalRef.value?.open('new', false)
}
</script>