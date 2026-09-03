<template>
  <div 
    v-if="toolStore.isGameConfigModalOpen"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-6 select-none animate-in fade-in duration-200 pt-safe pb-safe"
  >
    <div 
      class="glass-panel border border-slate-700/80 w-full max-w-4xl rounded-3xl p-4 sm:p-5 shadow-2xl bg-slate-900/98 flex flex-col gap-3.5 sm:gap-4 text-xs text-slate-200 max-h-[88dvh] overflow-hidden animate-in zoom-in-95 duration-200"
    >
      <!-- MODAL HEADER -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-2xl bg-linear-to-tr from-amber-600 via-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Gamepad2 class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Tower Defense & Harakat Sozlamalari</span>
            </h2>
            <p class="text-[11px] text-slate-400">Minoralar, to'lqinlar, xaritadagi minoralar va chiqish nuqtalarini boshqarish</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Gold Badge -->
          <div class="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs">
            <span>💰 {{ characterStore.gold }} oltin</span>
          </div>

          <!-- Close Modal Button -->
          <button 
            @click="toolStore.closeGameConfig()"
            class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Yopish (Esc)"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- NAVIGATION TABS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
        <!-- Tab 1: Tower Blueprints -->
        <button 
          @click="toolStore.gameConfigActiveTab = 'towers'"
          :class="toolStore.gameConfigActiveTab === 'towers' ? 'bg-amber-600 text-white font-bold shadow-md ring-1 ring-amber-400/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          <ShieldAlert class="w-4 h-4 text-amber-300" />
          <span>Minoralar ({{ towerStore.blueprints.length }})</span>
        </button>

        <!-- Tab 2: Waves Config -->
        <button 
          @click="toolStore.gameConfigActiveTab = 'waves'"
          :class="toolStore.gameConfigActiveTab === 'waves' ? 'bg-purple-600 text-white font-bold shadow-md ring-1 ring-purple-400/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          <Swords class="w-4 h-4 text-purple-300" />
          <span>To'lqinlar ({{ characterStore.waveConfigs.length }})</span>
        </button>

        <!-- Tab 3: Placed Towers -->
        <button 
          @click="toolStore.gameConfigActiveTab = 'placed'"
          :class="toolStore.gameConfigActiveTab === 'placed' ? 'bg-sky-600 text-white font-bold shadow-md ring-1 ring-sky-400/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          <TowerControl class="w-4 h-4 text-sky-300" />
          <span>Qurilganlar ({{ towerStore.placedTowers.length }})</span>
        </button>

        <!-- Tab 4: Spawn Points & Movement -->
        <button 
          @click="toolStore.gameConfigActiveTab = 'spawns'"
          :class="toolStore.gameConfigActiveTab === 'spawns' ? 'bg-emerald-600 text-white font-bold shadow-md ring-1 ring-emerald-400/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          <Users class="w-4 h-4 text-emerald-300" />
          <span>Chiqish & Harakat</span>
        </button>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: MINORALAR (TOWER BLUEPRINTS)                                       -->
      <!-- ========================================================================= -->
      <div v-if="toolStore.gameConfigActiveTab === 'towers'" class="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
        
        <!-- Header Actions: Blueprint tabs & Create button -->
        <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-800 shrink-0">
          <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <button 
              v-for="bp in towerStore.blueprints" 
              :key="bp.id"
              @click="towerStore.selectedBlueprintId = bp.id"
              :class="towerStore.selectedBlueprintId === bp.id ? 'bg-amber-600 text-white font-bold ring-2 ring-amber-400/80 shadow-md' : 'bg-slate-850 text-slate-300 hover:bg-slate-800 border border-slate-700'"
              class="py-1.5 px-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 text-xs"
            >
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{{ bp.name }}</span>
            </button>
          </div>

          <button 
            @click="towerStore.isCreateTowerModalOpen = true"
            class="py-1.5 px-3 rounded-xl bg-linear-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Plus class="w-4 h-4" />
            <span>➕ Yangi Minora Yaratish</span>
          </button>
        </div>

        <!-- No Blueprints State -->
        <div v-if="towerStore.blueprints.length === 0" class="p-8 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col items-center text-center gap-3 my-auto">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <TowerControl class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1 max-w-md">
            <span class="font-bold text-sm text-amber-300">Hali birorta minora yaratilmagan</span>
            <span class="text-xs text-slate-400">Xaritangiz uchun sprite rasm tanlab shaxsiy mudofaa minorangizni yarating.</span>
          </div>
          <button 
            @click="towerStore.isCreateTowerModalOpen = true"
            class="py-2 px-5 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            ➕ Yangi Minora Yaratish
          </button>
        </div>

        <!-- Active Selected Blueprint Editor -->
        <div v-else-if="selectedBp" class="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <!-- Left Column: Visual Preview & Sprite Select -->
          <div class="flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/30">
            <div class="flex items-center justify-between">
              <span class="font-bold text-amber-300 text-xs">Minora Ko'rinishi</span>
              <span class="text-[10px] text-slate-400 font-mono">{{ selectedBp.assetName || 'Custom' }}</span>
            </div>

            <!-- Sprite Preview -->
            <div class="h-32 rounded-2xl bg-slate-900 checker-pattern flex items-center justify-center p-3 border border-slate-800 shadow-inner overflow-hidden">
              <img 
                :src="selectedBp.assetPath" 
                :alt="selectedBp.name"
                class="max-w-full max-h-full object-contain filter drop-shadow-lg"
              />
            </div>

            <!-- Quick Sprite Picker Grid -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-slate-400 font-semibold">Rasmni almashtirish:</span>
                <span class="text-[9px] text-slate-500 font-mono">{{ towerAvailableAssets.length }} ta</span>
              </div>
              <input 
                v-model="assetSearchQuery"
                type="text"
                placeholder="Asset qidirish..."
                class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <div class="grid grid-cols-4 gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1 rounded-xl bg-slate-900 border border-slate-800">
                <div 
                  v-for="asset in towerAvailableAssets" 
                  :key="asset.id"
                  @click="changeBlueprintAsset(selectedBp.id, asset)"
                  :class="selectedBp.assetId === asset.id ? 'ring-2 ring-amber-400 bg-amber-500/30' : 'hover:bg-slate-800 border border-slate-800/80'"
                  class="p-1 rounded-lg flex items-center justify-center aspect-square cursor-pointer transition-all"
                  :title="asset.name"
                >
                  <img :src="asset.previewSrc || asset.src" :alt="asset.name" class="max-w-full max-h-full object-contain" />
                </div>
              </div>
            </div>

            <!-- Delete Blueprint -->
            <button 
              v-if="towerStore.blueprints.length > 1"
              @click="handleRemoveSelectedBp()"
              class="w-full py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold transition-all mt-auto cursor-pointer"
            >
              🗑️ Minorani O'chirish
            </button>
          </div>

          <!-- Middle & Right Columns: Attributes Configuration Form -->
          <div class="md:col-span-2 flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800">
            <!-- Name & Cost Row -->
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-semibold text-slate-300">Minora Nomi:</span>
                <input 
                  type="text" 
                  :value="selectedBp.name"
                  @input="(e) => updateSelectedBp({ name: (e.target as HTMLInputElement).value })"
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
                />
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-semibold text-slate-300">Qurish Narxi (Oltin):</span>
                <input 
                  type="number" 
                  min="10" 
                  max="5000" 
                  step="10" 
                  :value="selectedBp.cost"
                  @input="(e) => updateSelectedBp({ cost: parseInt((e.target as HTMLInputElement).value) || 50 })"
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
                />
              </div>
            </div>

            <!-- Damage, Attack Speed, Range Sliders -->
            <div class="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <!-- Damage -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>💥 Zarar:</span>
                  <span class="font-mono text-amber-300 font-bold">{{ selectedBp.damage }}</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="500" 
                  step="5" 
                  :value="selectedBp.damage"
                  @input="(e) => updateSelectedBp({ damage: parseInt((e.target as HTMLInputElement).value) })"
                  class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <!-- Attack Speed -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>⚡ Hujum tezligi:</span>
                  <span class="font-mono text-amber-300 font-bold">{{ selectedBp.attackSpeed }}s</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3.0" 
                  step="0.1" 
                  :value="selectedBp.attackSpeed"
                  @input="(e) => updateSelectedBp({ attackSpeed: parseFloat((e.target as HTMLInputElement).value) })"
                  class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <!-- Range -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>🎯 Masofa (Radius):</span>
                  <span class="font-mono text-amber-300 font-bold">{{ selectedBp.range }}k</span>
                </div>
                <input 
                  type="range" 
                  min="1.5" 
                  max="10.0" 
                  step="0.5" 
                  :value="selectedBp.range"
                  @input="(e) => updateSelectedBp({ range: parseFloat((e.target as HTMLInputElement).value) })"
                  class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            <!-- Projectile Type & Color -->
            <div class="flex flex-col gap-1.5">
              <span class="text-[11px] font-semibold text-slate-300">Snaryad Turi:</span>
              <div class="grid grid-cols-4 gap-2">
                <button 
                  v-for="pType in projectileOptions" 
                  :key="pType.id"
                  @click="updateSelectedBp({ projectileType: pType.id as any })"
                  :class="selectedBp.projectileType === pType.id ? 'bg-amber-600/40 text-amber-300 border-amber-500 font-bold ring-1 ring-amber-400' : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'"
                  class="py-1.5 px-2 rounded-xl border text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>{{ pType.icon }}</span>
                  <span>{{ pType.name }}</span>
                </button>
              </div>
            </div>

            <!-- Splash Damage Options -->
            <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="splashToggle"
                  :checked="selectedBp.isSplash"
                  @change="(e) => updateSelectedBp({ isSplash: (e.target as HTMLInputElement).checked })"
                  class="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label for="splashToggle" class="text-xs font-semibold text-slate-200 cursor-pointer">
                  💥 Maydoniy Zarar (Splash AoE)
                </label>
              </div>

              <div v-if="selectedBp.isSplash" class="flex items-center gap-2">
                <span class="text-[10px] text-slate-400">Radius:</span>
                <input 
                  type="number" 
                  min="0.5" 
                  max="5.0" 
                  step="0.5" 
                  :value="selectedBp.splashRadius"
                  @input="(e) => updateSelectedBp({ splashRadius: parseFloat((e.target as HTMLInputElement).value) || 1.5 })"
                  class="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-amber-300 font-mono text-center"
                />
                <span class="text-[10px] text-slate-500">katak</span>
              </div>
            </div>

            <!-- Apply To Placed Towers Button -->
            <button 
              @click="handleApplySelectedBp()"
              class="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
            >
              <Sparkles class="w-4 h-4" />
              <span>✨ Xaritadagi Barcha Shu Minoralarga Qo'llash</span>
            </button>
          </div>

        </div>

      </div>

      <!-- ========================================================================= -->
      <!-- TAB 2: TO'LQINLAR (WAVES CONFIGURATOR)                                    -->
      <!-- ========================================================================= -->
      <div v-else-if="toolStore.gameConfigActiveTab === 'waves'" class="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
        
        <!-- Top Wave Tabs Row + Add Wave Button -->
        <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-800 shrink-0">
          <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <button 
              v-for="(w, idx) in characterStore.waveConfigs" 
              :key="w.waveNumber"
              @click="characterStore.selectWave(idx)"
              :class="characterStore.currentWaveIndex === idx ? 'bg-purple-600 text-white font-bold ring-2 ring-purple-400/80 shadow-md' : 'bg-slate-850 text-slate-300 hover:bg-slate-800 border border-slate-700'"
              class="py-1.5 px-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 text-xs"
            >
              <span>{{ w.name }}</span>
              <span class="text-[10px] font-mono px-1 rounded bg-slate-900/60 text-purple-300">{{ w.unitCount }}x</span>
            </button>
          </div>

          <button 
            @click="characterStore.addNewWave()"
            class="py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Plus class="w-4 h-4" />
            <span>➕ Yangi To'lqin</span>
          </button>
        </div>

        <!-- No Waves State -->
        <div v-if="characterStore.waveConfigs.length === 0" class="p-8 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col items-center text-center gap-3 my-auto">
          <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Swords class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1 max-w-md">
            <span class="font-bold text-sm text-purple-300">Birorta ham to'lqin belgilanmagan</span>
            <span class="text-xs text-slate-400">Yangi to'lqin qo'shing va undagi dushmanlar soni, joni va tezligini sozlang.</span>
          </div>
          <button 
            @click="characterStore.addNewWave()"
            class="py-2 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            ➕ 1-To'lqinni Yaratish
          </button>
        </div>

        <!-- Active Wave Editor Card -->
        <div v-else-if="selectedWave" class="flex flex-col gap-3 p-4 rounded-2xl bg-slate-950/90 border border-purple-500/30">
          
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="font-bold text-purple-300 text-sm">{{ selectedWave.name }} Sozlamalari</span>
            </div>

            <div class="flex items-center gap-2">
              <button 
                v-if="characterStore.waveConfigs.length > 1"
                @click="characterStore.deleteWave(characterStore.currentWaveIndex)"
                class="px-2.5 py-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs transition-colors cursor-pointer"
              >
                🗑️ O'chirish
              </button>
            </div>
          </div>

          <!-- Parameters Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            <!-- 1. Unit Count -->
            <div class="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span class="font-semibold">👥 Odamlar soni:</span>
                <span class="font-mono text-purple-300 font-bold">{{ selectedWave.unitCount }} ta</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                step="1" 
                :value="selectedWave.unitCount"
                @input="(e) => characterStore.setWaveUnitCount(parseInt((e.target as HTMLInputElement).value) || 1)"
                class="accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span class="text-[10px] text-slate-500">To'lqinda chiqadigan dushmanlar</span>
            </div>

            <!-- 2. HP (Health) -->
            <div class="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span class="font-semibold">❤️ Jon (HP):</span>
                <span class="font-mono text-rose-400 font-bold">{{ selectedWave.unitHp }} HP</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="5000" 
                step="10" 
                :value="selectedWave.unitHp"
                @input="(e) => characterStore.setWaveUnitHp(parseInt((e.target as HTMLInputElement).value) || 20)"
                class="accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span class="text-[10px] text-slate-500">Har bir dushmanning chidamliligi</span>
            </div>

            <!-- 3. Speed -->
            <div class="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span class="font-semibold">⚡ Yurish tezligi:</span>
                <span class="font-mono text-amber-300 font-bold">{{ selectedWave.unitSpeed }} k/s</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="5.0" 
                step="0.1" 
                :value="selectedWave.unitSpeed"
                @input="(e) => characterStore.setWaveSpeed(parseFloat((e.target as HTMLInputElement).value) || 1.0)"
                class="accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span class="text-[10px] text-slate-500">Kataklar soni sekundiga</span>
            </div>

            <!-- 4. Gold Reward -->
            <div class="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span class="font-semibold">💰 Mukofot:</span>
                <span class="font-mono text-yellow-300 font-bold">+{{ selectedWave.goldReward }} oltin</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10" 
                :value="selectedWave.goldReward"
                @input="(e) => characterStore.setWaveGoldReward(parseInt((e.target as HTMLInputElement).value) || 50)"
                class="accent-yellow-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span class="text-[10px] text-slate-500">To'lqinni qaytarganlik uchun oltin</span>
            </div>

          </div>

          <!-- Bottom Test Wave Action Button -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-800">
            <span class="text-[11px] text-slate-400">
              Hozirgi to'lqinni sinash uchun tugmani bosing:
            </span>

            <button 
              @click="handleTestWave(characterStore.currentWaveIndex)"
              class="py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Play class="w-4 h-4" />
              <span>▶️ Faqat Shu To'lqinni Sinash</span>
            </button>
          </div>

        </div>

      </div>

      <!-- ========================================================================= -->
      <!-- TAB 3: QURILGAN MINORALAR (PLACED TOWERS)                                  -->
      <!-- ========================================================================= -->
      <div v-else-if="toolStore.gameConfigActiveTab === 'placed'" class="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
        
        <!-- Placed Towers Summary Row -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-200 text-xs">Xaritada Qurilgan Minoralar:</span>
            <span class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold text-xs border border-sky-500/30">
              {{ towerStore.placedTowers.length }} ta
            </span>
          </div>

          <button 
            v-if="towerStore.placedTowers.length > 0"
            @click="towerStore.clearAllTowers()"
            class="px-2.5 py-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs transition-colors cursor-pointer"
          >
            🗑️ Barcha Minoralarni Tozalash
          </button>
        </div>

        <!-- No Placed Towers State -->
        <div v-if="towerStore.placedTowers.length === 0" class="p-8 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col items-center text-center gap-3 my-auto">
          <div class="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <TowerControl class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1 max-w-md">
            <span class="font-bold text-sm text-sky-300">Xaritada birorta ham minora qurilmagan</span>
            <span class="text-xs text-slate-400">Minoralar tabidan minora tanlab xaritadagi katakka bosing yoki o'yin rejimida do'kondan sotib oling.</span>
          </div>
        </div>

        <!-- Placed Towers List Cards -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div 
            v-for="tower in towerStore.placedTowers" 
            :key="tower.id"
            class="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-2.5 hover:border-slate-700 transition-all"
          >
            <!-- Card Top: Name & Level -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-bold text-white text-xs truncate">{{ tower.name }}</span>
                <span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                  Lvl {{ tower.level }}
                </span>
              </div>
              <span class="text-[10px] font-mono text-emerald-400 font-semibold shrink-0">
                ({{ tower.col }}, {{ tower.row }})
              </span>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-1 p-1.5 rounded-xl bg-slate-900 text-[10px] text-center">
              <div>
                <span class="text-slate-500 block">💥 Zarar</span>
                <strong class="text-amber-300">{{ tower.damage }}</strong>
              </div>
              <div>
                <span class="text-slate-500 block">🎯 Masofa</span>
                <strong class="text-sky-300">{{ tower.range }}k</strong>
              </div>
              <div>
                <span class="text-slate-500 block">☠️ Qotillik</span>
                <strong class="text-rose-400">{{ tower.killsCount }}</strong>
              </div>
            </div>

            <!-- Action Buttons: Focus, Upgrade, Sell -->
            <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/80">
              <button 
                @click="handleFocusTower(tower)"
                class="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all"
                title="Xaritada ushbu minoraga borish"
              >
                <Crosshair class="w-3 h-3 text-brand-400" />
                <span>Ko'rish</span>
              </button>

              <button 
                @click="towerStore.upgradePlacedTower(tower.id)"
                class="py-1 px-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all"
                title="Darajasini oshirish"
              >
                <Sparkles class="w-3 h-3" />
                <span>+Lvl</span>
              </button>

              <button 
                @click="towerStore.sellPlacedTower(tower.id)"
                class="py-1 px-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all"
                title="Sotish / O'chirish"
              >
                <Trash2 class="w-3 h-3" />
                <span>Sotish</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- ========================================================================= -->
      <!-- TAB 4: CHIQISH VA HARAKAT (SPAWN POINTS & MOVEMENT)                       -->
      <!-- ========================================================================= -->
      <div v-else-if="toolStore.gameConfigActiveTab === 'spawns'" class="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          <!-- LEFT CARD: SPAWN POINTS & ROUTE MANAGEMENT -->
          <div class="flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30">
            <div class="flex items-center justify-between pb-1 border-b border-slate-800">
              <span class="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                <MapPin class="w-4 h-4" />
                <span>Chiqish Nuqtalari (Spawn Points)</span>
              </span>
              <span class="text-[10px] font-mono text-emerald-400 font-bold">
                {{ characterStore.detectedDoors.length }} ta nuqta
              </span>
            </div>

            <!-- Empty State for Spawn Points -->
            <div v-if="characterStore.detectedDoors.length === 0" class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center flex flex-col items-center gap-2">
              <span class="text-xs text-slate-300 font-semibold">🚩 Hozircha chiqish nuqtasi qo'yilmagan</span>
              <p class="text-[10px] text-slate-400 leading-tight">Yangi xaritalarda boshlang'ich nuqta bo'lishi shart emas. Istalgan vaqtda nuqta qo'shishingiz mumkin.</p>
              <button 
                @click="handleTriggerAddSpawnPoint"
                class="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>+ 1-Chiqish Nuqtasini Qo'yish</span>
              </button>
            </div>

            <!-- Active Spawn Points Section -->
            <template v-else>
              <!-- Spawn Mode Toggle -->
              <div class="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button 
                  @click="characterStore.spawnMode = 'all_doors'"
                  :class="characterStore.spawnMode === 'all_doors' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'"
                  class="py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles class="w-3 h-3" />
                  <span>Barcha Nuqtalar</span>
                </button>

                <button 
                  @click="characterStore.spawnMode = 'single_door'"
                  :class="characterStore.spawnMode === 'single_door' ? 'bg-brand-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'"
                  class="py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  <MapPin class="w-3 h-3" />
                  <span>Yagona Nuqta</span>
                </button>
              </div>

              <!-- Spawn Point Dropdown Selector -->
              <div class="flex items-center gap-2">
                <select 
                  v-model.number="characterStore.selectedDoorIndex"
                  class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option 
                    v-for="(door, idx) in characterStore.detectedDoors" 
                    :key="door.id" 
                    :value="idx"
                  >
                    🚩 {{ door.name }} (Kat: {{ door.col }}, {{ door.row }})
                  </option>
                </select>

                <button 
                  @click="characterStore.removeSpawnPoint(characterStore.selectedDoorIndex)"
                  class="p-2 rounded-xl text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Ushbu chiqish nuqtasini o'chirish"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Action Buttons: Add Spawn Point & Relocate -->
              <div class="grid grid-cols-2 gap-2">
                <button 
                  @click="handleTriggerAddSpawnPoint"
                  class="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>+ Yangi Nuqta Qo'yish</span>
                </button>

                <button 
                  @click="handleTriggerRelocateSpawnPoint"
                  class="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <MapPin class="w-3.5 h-3.5" />
                  <span>📍 Ko'chirish</span>
                </button>
              </div>
            </template>

            <!-- Route Drawing Tools -->
            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2 mt-auto">
              <span class="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <Navigation class="w-3.5 h-3.5 text-brand-400" />
                <span>Marshrut (Custom Route):</span>
              </span>

              <div class="grid grid-cols-2 gap-2">
                <button 
                  @click="handleStartDrawingRoute"
                  class="py-1.5 px-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md"
                >
                  <PenTool class="w-3.5 h-3.5" />
                  <span>🖌️ Marshrut Chizish</span>
                </button>

                <button 
                  @click="characterStore.deleteCurrentRoute()"
                  class="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>Tozalash</span>
                </button>
              </div>
            </div>

          </div>

          <!-- RIGHT CARD: MOVEMENT & SIMULATION PARAMETERS -->
          <div class="flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800">
            <div class="flex items-center justify-between pb-1 border-b border-slate-800">
              <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Activity class="w-4 h-4 text-brand-400" />
                <span>Harakat va Sayr Parametrlari</span>
              </span>
            </div>

            <!-- Formation: Pairs vs Single -->
            <div class="flex flex-col gap-1.5">
              <span class="text-[11px] font-semibold text-slate-300">Harakat Tarkibi (Saf):</span>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  @click="characterStore.formation = 'pairs'"
                  :class="characterStore.formation === 'pairs' ? 'bg-brand-600 text-white font-bold ring-1 ring-brand-400' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'"
                  class="py-1.5 px-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Users class="w-3.5 h-3.5" />
                  <span>2 kishi yonma-yon (Juflik)</span>
                </button>

                <button 
                  @click="characterStore.formation = 'single'"
                  :class="characterStore.formation === 'single' ? 'bg-brand-600 text-white font-bold ring-1 ring-brand-400' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'"
                  class="py-1.5 px-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <User class="w-3.5 h-3.5" />
                  <span>1 kishilik saf</span>
                </button>
              </div>
            </div>

            <!-- Pair Distance & Unit Speed Sliders -->
            <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <!-- Pair Distance -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Oraliq masofa:</span>
                  <span class="font-mono text-brand-300 font-bold">{{ characterStore.pairDistance }}k</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.5" 
                  step="0.05" 
                  v-model.number="characterStore.pairDistance"
                  class="accent-brand-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <!-- Unit Speed -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Personaj tezligi:</span>
                  <span class="font-mono text-emerald-300 font-bold">{{ characterStore.unitSpeed }} k/s</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="6.0" 
                  step="0.1" 
                  v-model.number="characterStore.unitSpeed"
                  class="accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            <!-- Game Speed Slider -->
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span class="font-semibold">⚡ Simulyatsiya Tezligi (O'yin):</span>
                <span class="font-mono text-amber-300 font-bold">{{ characterStore.gameSpeed }}x</span>
              </div>
              <input 
                type="range" 
                min="1.0" 
                max="50.0" 
                step="1.0" 
                v-model.number="characterStore.gameSpeed"
                class="accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <!-- Follow Camera & Trail Toggles -->
            <div class="grid grid-cols-2 gap-2 text-xs">
              <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input 
                  type="checkbox" 
                  v-model="characterStore.followCamera"
                  class="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                />
                <span class="text-slate-300 font-medium">🎥 Kamera Ergashishi</span>
              </label>

              <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input 
                  type="checkbox" 
                  v-model="characterStore.showPathTrail"
                  class="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                />
                <span class="text-slate-300 font-medium">🛤️ Yo'l Chizig'i</span>
              </label>
            </div>

            <!-- Tour Playback Controls -->
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 mt-auto">
              <button 
                v-if="!characterStore.isPlaying"
                @click="characterStore.startTour()"
                class="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95"
              >
                <Play class="w-4 h-4" />
                <span>Boshlash</span>
              </button>

              <button 
                v-else
                @click="characterStore.pauseTour()"
                class="py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95"
              >
                <Pause class="w-4 h-4" />
                <span>To'xtatish</span>
              </button>

              <button 
                @click="characterStore.resetTour()"
                class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <RotateCcw class="w-4 h-4" />
                <span>Qayta</span>
              </button>

              <button 
                @click="handleStartPlayModeFromModal"
                class="py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95"
              >
                <Gamepad2 class="w-4 h-4" />
                <span>O'yinga</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Gamepad2, X, ShieldAlert, Swords, TowerControl, Users, 
  Plus, Sparkles, Trash2, Crosshair, Play, Pause, RotateCcw, 
  MapPin, Navigation, PenTool, Activity, User 
} from 'lucide-vue-next'
import { useToolStore } from '../stores/toolStore'
import { useTowerStore, PlacedTower } from '../stores/towerStore'
import { useCharacterStore } from '../stores/characterStore'
import { useAssetStore } from '../stores/assetStore'
import { useMapStore } from '../stores/mapStore'
import { AssetItem } from '../types/map'
import { requestAppFullscreen } from '../utils/fullscreen'

const toolStore = useToolStore()
const towerStore = useTowerStore()
const characterStore = useCharacterStore()
const assetStore = useAssetStore()
const mapStore = useMapStore()

const selectedBp = computed(() => towerStore.selectedBlueprint)
const selectedWave = computed(() => characterStore.currentWaveConfig)

const projectileOptions = [
  { id: 'cannonball', name: "To'p (Cannon)", icon: '💣' },
  { id: 'arrow', name: "Kamon O'qi", icon: '🏹' },
  { id: 'magic_bolt', name: "Sehrli Nur", icon: '⚡' },
  { id: 'fireball', name: "Olov Shari", icon: '🔥' },
]

const assetSearchQuery = ref('')

const towerAvailableAssets = computed(() => {
  const query = assetSearchQuery.value.trim().toLowerCase()
  if (!query) return assetStore.assets
  return assetStore.assets.filter(a => (a.name || '').toLowerCase().includes(query))
})

function updateSelectedBp(updates: any) {
  if (selectedBp.value) {
    towerStore.updateBlueprint(selectedBp.value.id, updates)
  }
}

function handleRemoveSelectedBp() {
  if (selectedBp.value) {
    towerStore.removeBlueprint(selectedBp.value.id)
  }
}

function handleApplySelectedBp() {
  if (selectedBp.value) {
    towerStore.applyBlueprintToAllPlacedTowers(selectedBp.value.id)
  }
}

function changeBlueprintAsset(bpId: string, asset: AssetItem) {
  towerStore.updateBlueprint(bpId, {
    assetId: asset.id,
    assetName: asset.name,
    assetPath: asset.previewSrc || asset.src,
  })
}

function handleTestWave(idx: number) {
  toolStore.closeGameConfig()
  characterStore.testWave(idx)
}

function handleFocusTower(tower: PlacedTower) {
  toolStore.closeGameConfig()
  toolStore.setSelectedElement({
    col: tower.col,
    row: tower.row,
    layerId: 'layer-objects',
    itemId: tower.id,
  })
}

function handleTriggerAddSpawnPoint() {
  toolStore.closeGameConfig()
  characterStore.isSettingSpawnPoint = true
  characterStore.spawnPointPlacementMode = 'add'
}

function handleTriggerRelocateSpawnPoint() {
  toolStore.closeGameConfig()
  characterStore.isSettingSpawnPoint = true
  characterStore.spawnPointPlacementMode = 'relocate'
}

function handleStartDrawingRoute() {
  toolStore.closeGameConfig()
  characterStore.startDrawingCustomRoute()
}

function handleStartPlayModeFromModal() {
  toolStore.closeGameConfig()
  requestAppFullscreen()
  characterStore.startLoadingScreen(mapStore.project.name || 'Xarita')
  characterStore.setLoadingProgress(30, "Assetlar tekshirilmoqda...")
  setTimeout(() => {
    characterStore.setLoadingProgress(100, "Tayyor!")
    characterStore.startPlayMode()
    characterStore.finishLoadingScreen()
  }, 400)
}
</script>

<style scoped>
.checker-pattern {
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%), 
    linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%), 
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.6);
}
</style>
