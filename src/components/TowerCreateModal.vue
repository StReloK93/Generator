<template>
  <div 
    v-if="towerStore.isCreateTowerModalOpen"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
  >
    <div 
      class="glass-panel border border-amber-500/50 w-full max-w-xl rounded-3xl p-5 shadow-2xl bg-slate-900/98 flex flex-col gap-4 text-xs text-slate-200 max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <Plus class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-amber-300">Yangi Minora Yaratish</h2>
            <p class="text-[11px] text-slate-400">Rasm tanlang va o'zingizning shaxsiy minorangiz xususiyatlarini belgilang</p>
          </div>
        </div>
        
        <button 
          @click="closeModal"
          class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="flex flex-col gap-4 overflow-y-auto pr-1">
        
        <!-- 1. Visual Asset Image Selector -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-amber-300">1. Minora Rasmini Tanlang:</span>
            <span class="text-[10px] text-slate-400 font-mono">{{ selectedAsset?.name || 'Tanlanmagan' }}</span>
          </div>

          <div class="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 rounded-2xl bg-slate-950/80 border border-slate-800 max-h-36 overflow-y-auto">
            <div 
              v-for="asset in availableTowerAssets" 
              :key="asset.id"
              @click="selectAsset(asset)"
              :class="selectedAsset?.id === asset.id ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-500' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'"
              class="flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer group"
            >
              <div class="w-12 h-14 flex items-center justify-center overflow-hidden">
                <img 
                  :src="asset.url" 
                  :alt="asset.name"
                  class="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" 
                />
              </div>
              <span class="text-[9px] text-slate-300 truncate w-full text-center mt-1 font-mono">
                {{ asset.name.replace(/_W|_N|_E|_S|\.png/g, '') }}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Name & Cost -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-[11px] font-semibold text-slate-300">Minora Nomi:</span>
            <input 
              type="text" 
              v-model="form.name"
              placeholder="Masalan: Olov Minorasi"
              class="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[11px] font-semibold text-slate-300">Qurish Narxi (Oltin):</span>
            <input 
              type="number" 
              min="10" 
              max="5000" 
              step="10" 
              v-model.number="form.cost"
              class="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono focus:outline-none"
            />
          </div>
        </div>

        <!-- 3. Damage, Attack Speed, Range -->
        <div class="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/90 border border-slate-800">
          <!-- Damage -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-[10px] text-slate-400">
              <span>💥 Zarar:</span>
              <span class="font-mono text-amber-300 font-bold">{{ form.damage }}</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="500" 
              step="5" 
              v-model.number="form.damage"
              class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>

          <!-- Attack Speed -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-[10px] text-slate-400">
              <span>⚡ Oraliq:</span>
              <span class="font-mono text-amber-300 font-bold">{{ form.attackSpeed.toFixed(2) }}s</span>
            </div>
            <input 
              type="range" 
              min="0.05" 
              max="3.0" 
              step="0.05" 
              v-model.number="form.attackSpeed"
              class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>

          <!-- Range -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-[10px] text-slate-400">
              <span>🎯 Masofa:</span>
              <span class="font-mono text-sky-300 font-bold">{{ form.range.toFixed(1) }}k</span>
            </div>
            <input 
              type="range" 
              min="1.0" 
              max="10.0" 
              step="0.2" 
              v-model.number="form.range"
              class="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>
        </div>

        <!-- 4. Projectile Type & Splash -->
        <div class="grid grid-cols-2 gap-3">
          
          <!-- Projectile Type Selector -->
          <div class="flex flex-col gap-1">
            <span class="text-[11px] font-semibold text-slate-300">Snaryad Turi:</span>
            <select 
              v-model="form.projectileType"
              class="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="fireball">🔥 Olovli Shar (Fireball)</option>
              <option value="cannonball">💣 To'p Toshi (Cannonball)</option>
              <option value="magic_bolt">⚡ Sehrli Nur (Magic Bolt)</option>
              <option value="arrow">🏹 Kamon O'qi (Arrow)</option>
            </select>
          </div>

          <!-- Splash Toggle -->
          <div class="flex flex-col gap-1">
            <span class="text-[11px] font-semibold text-slate-300">Maydoniy Zarar (Splash):</span>
            <div class="flex items-center gap-1.5">
              <button 
                @click="form.isSplash = true"
                :class="form.isSplash ? 'bg-rose-600 text-white font-bold' : 'bg-slate-950 text-slate-400 border border-slate-700'"
                class="flex-1 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Splash (Faol)
              </button>
              <button 
                @click="form.isSplash = false"
                :class="!form.isSplash ? 'bg-slate-700 text-white font-bold' : 'bg-slate-950 text-slate-400 border border-slate-700'"
                class="flex-1 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Yakka Nishon
              </button>
            </div>
          </div>
        </div>

        <!-- Splash Sub-options if Splash is active -->
        <div v-if="form.isSplash" class="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col gap-2">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-rose-300 font-semibold">Portlash Maydoni Radiusi:</span>
            <span class="font-mono text-rose-300 font-bold">{{ form.splashRadius.toFixed(1) }} katak</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="4.0" 
            step="0.2" 
            v-model.number="form.splashRadius"
            class="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded"
          />

          <div class="flex items-center justify-between text-[11px] pt-1">
            <span class="text-rose-300">Zarar Tarqalishi:</span>
            <div class="flex items-center gap-1.5">
              <button 
                @click="form.splashType = 'falloff'"
                :class="form.splashType === 'falloff' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                class="py-1 px-2.5 rounded-lg text-[10px] cursor-pointer"
              >
                📉 Kamayuvchi (Falloff)
              </button>
              <button 
                @click="form.splashType = 'constant'"
                :class="form.splashType === 'constant' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                class="py-1 px-2.5 rounded-lg text-[10px] cursor-pointer"
              >
                🟩 Bir xil (Constant)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer Actions -->
      <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
        <button 
          @click="closeModal"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          Bekor Qilish
        </button>

        <button 
          @click="handleCreateTower"
          class="px-5 py-2 rounded-xl bg-linear-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldAlert class="w-4 h-4" />
          <span>🏰 Minora Yaratish</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X, ShieldAlert } from 'lucide-vue-next'
import { useTowerStore, ProjectileType, SplashType } from '../stores/towerStore'
import { useAssetStore } from '../stores/assetStore'

const towerStore = useTowerStore()
const assetStore = useAssetStore()

// Build images + structure/column sprites available for towers
const availableTowerAssets = computed(() => {
  const assets: Array<{ id: string; name: string; url: string; filename: string }> = []

  // 1. Built-in builds
  const buildModules = import.meta.glob<string>('../assets/builds/*.png', { eager: true, import: 'default' })
  for (const [path, url] of Object.entries(buildModules)) {
    const filename = path.split('/').pop() || ''
    assets.push({
      id: `build-${filename}`,
      name: filename,
      url,
      filename,
    })
  }

  // 2. Add structure / wall columns / stone assets from asset store
  for (const a of assetStore.assets) {
    if (a.category === 'structures' || a.category === 'walls' || a.category === 'props' || a.name.includes('Column') || a.name.includes('Structure')) {
      assets.push({
        id: a.id,
        name: a.name,
        url: a.src || a.previewSrc || '',
        filename: `${a.name}.png`,
      })
    }
  }

  return assets
})

const selectedAsset = ref<any>(availableTowerAssets.value[0] || null)

const form = ref({
  name: "Olov Minorasi",
  damage: 60,
  attackSpeed: 0.5,
  range: 4.0,
  projectileType: 'fireball' as ProjectileType,
  isSplash: true,
  splashRadius: 1.5,
  splashType: 'falloff' as SplashType,
  cost: 100,
})

function selectAsset(asset: any) {
  selectedAsset.value = asset
}

function closeModal() {
  towerStore.isCreateTowerModalOpen = false
}

function handleCreateTower() {
  if (!form.value.name.trim()) {
    alert("Iltimos, minora nomini kiriting!")
    return
  }

  const assetName = selectedAsset.value ? selectedAsset.value.filename : 'stoneColumn_W.png'
  const assetPath = selectedAsset.value ? selectedAsset.value.url : '../assets/builds/stoneColumn_W.png'

  let projColor = 0xf97316
  let projSpeed = 10.5
  if (form.value.projectileType === 'cannonball') {
    projColor = 0x334155
    projSpeed = 8.5
  } else if (form.value.projectileType === 'magic_bolt') {
    projColor = 0x38bdf8
    projSpeed = 16.0
  } else if (form.value.projectileType === 'arrow') {
    projColor = 0xd97706
    projSpeed = 18.0
  }

  const newBlueprint = {
    id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: form.value.name.trim(),
    assetName,
    assetPath,
    description: `Maxsus yaratilgan minora: ${form.value.name}`,
    damage: form.value.damage,
    attackSpeed: form.value.attackSpeed,
    range: form.value.range,
    projectileType: form.value.projectileType,
    projectileSpeed: projSpeed,
    projectileColor: projColor,
    isSplash: form.value.isSplash,
    splashRadius: form.value.splashRadius,
    splashType: form.value.splashType,
    cost: form.value.cost,
  }

  towerStore.addNewBlueprint(newBlueprint)
  closeModal()
}
</script>
