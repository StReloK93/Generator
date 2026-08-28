<template>
  <div class="absolute bottom-4 left-4 z-20 flex flex-col gap-2 pointer-events-none select-none max-w-sm w-full sm:w-100">
    
    <!-- MAIN TOWER DEFENSE REDAKTOR PANEL -->
    <div 
      class="glass-panel p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl bg-slate-900/95 pointer-events-auto flex flex-col gap-3 text-xs text-slate-200"
      @mousedown.stop
      @mouseup.stop
      @click.stop
      @pointerdown.stop
      @wheel.stop
    >
      <!-- Top Redaktor Tabs Row -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <div class="flex items-center gap-1">
          <!-- Tab 1: Tower Blueprints Editor -->
          <button 
            @click="activeTab = 'blueprints'"
            :class="activeTab === 'blueprints' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold' : 'text-slate-400 hover:text-slate-200 border-transparent'"
            class="py-1 px-2 rounded-lg border text-[11px] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert class="w-3.5 h-3.5" />
            <span>Minoralar Redaktori</span>
          </button>

          <!-- Tab 2: Waves Configurator -->
          <button 
            @click="activeTab = 'waves'"
            :class="activeTab === 'waves' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold' : 'text-slate-400 hover:text-slate-200 border-transparent'"
            class="py-1 px-2 rounded-lg border text-[11px] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Swords class="w-3.5 h-3.5" />
            <span>To'lqinlar Redaktori</span>
          </button>

          <!-- Tab 3: Placed Towers List -->
          <button 
            @click="activeTab = 'placed'"
            :class="activeTab === 'placed' ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold' : 'text-slate-400 hover:text-slate-200 border-transparent'"
            class="py-1 px-2 rounded-lg border text-[11px] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <TowerControl class="w-3.5 h-3.5" />
            <span>Qurilganlar ({{ towerStore.placedTowers.length }})</span>
          </button>
        </div>

        <!-- Gold Balance Badge -->
        <div class="flex items-center gap-1 font-mono text-[11px]">
          <span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
            💰 {{ characterStore.gold }}
          </span>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- TAB 1: MINORALAR REDAKTORI (TOWER BLUEPRINTS EDITOR)      -->
      <!-- ========================================================= -->
      <div v-if="activeTab === 'blueprints'" class="flex flex-col gap-2.5">
        
        <!-- If no blueprints created yet -->
        <div v-if="towerStore.blueprints.length === 0" class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center text-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <TowerControl class="w-5 h-5" />
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="font-bold text-xs text-amber-300">Hali birorta minora yaratilmagan</span>
            <span class="text-[11px] text-slate-400">Xaritangiz uchun rasm tanlab o'zingizning shaxsiy minorangizni yarating.</span>
          </div>
          <button 
            @click="towerStore.isCreateTowerModalOpen = true"
            class="w-full py-2 px-3 rounded-xl bg-linear-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>➕ Yangi Minora Yaratish</span>
          </button>
        </div>

        <!-- If blueprints exist -->
        <template v-else-if="towerStore.selectedBlueprint">
          <!-- Blueprint Selector Tabs + Add New Tower Button -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button 
              v-for="bp in towerStore.blueprints" 
              :key="bp.id"
              @click="towerStore.selectedBlueprintId = bp.id"
              :class="towerStore.selectedBlueprintId === bp.id ? 'bg-amber-600 text-white font-bold shadow-md ring-1 ring-amber-400' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'"
              class="py-1 px-2.5 rounded-xl transition-all text-center flex items-center gap-1.5 cursor-pointer shrink-0 text-[11px]"
            >
              <span>{{ bp.name }}</span>
            </button>

            <!-- Add New Tower Button -->
            <button 
              @click="towerStore.isCreateTowerModalOpen = true"
              class="py-1 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-md"
              title="Yangi shaxsiy minora yaratish"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>➕ Yangi Minora</span>
            </button>
          </div>

          <!-- Active Blueprint Full Configuration Form -->
          <div class="p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/30 flex flex-col gap-2.5">
            <div class="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px]">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-amber-300 text-xs">{{ towerStore.selectedBlueprint.name }}</span>
              </div>
              
              <div class="flex items-center gap-2">
                <span class="font-mono text-amber-400 font-bold text-[10px]">
                  Narxi: {{ towerStore.selectedBlueprint.cost }} oltin
                </span>

                <button 
                  v-if="towerStore.blueprints.length > 1"
                  @click="towerStore.removeBlueprint(towerStore.selectedBlueprint.id)"
                  class="p-1 rounded-lg text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Ushbu minorani o'chirish"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Tower Image / Sprite Switcher -->
            <div class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden p-0.5">
                    <img 
                      :src="getBlueprintImageUrl(towerStore.selectedBlueprint)" 
                      :alt="towerStore.selectedBlueprint.name"
                      class="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-semibold">Minora Rasmi:</span>
                    <span class="text-[10px] font-mono text-amber-300 truncate max-w-32">
                      {{ towerStore.selectedBlueprint.assetName }}
                    </span>
                  </div>
                </div>

                <button 
                  @click="isSpritePickerOpen = !isSpritePickerOpen"
                  class="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ImageIcon class="w-3 h-3" />
                  <span>{{ isSpritePickerOpen ? 'Yopish' : 'Rasmni Almashtirish' }}</span>
                </button>
              </div>

              <!-- Available Sprites Grid (When open) -->
              <div v-if="isSpritePickerOpen" class="grid grid-cols-5 gap-1.5 p-1.5 rounded-xl bg-slate-950 border border-slate-800 max-h-36 overflow-y-auto custom-scrollbar mt-1">
                <div 
                  v-for="asset in availableTowerAssets" 
                  :key="asset.id"
                  @click="changeBlueprintSprite(asset)"
                  :class="towerStore.selectedBlueprint.assetName === asset.filename || towerStore.selectedBlueprint.assetPath === asset.url ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'"
                  class="flex flex-col items-center justify-center p-1 rounded-lg border cursor-pointer transition-all hover:scale-105"
                  :title="asset.name"
                >
                  <div class="w-8 h-8 flex items-center justify-center overflow-hidden">
                    <img :src="asset.url" :alt="asset.name" class="max-w-full max-h-full object-contain" />
                  </div>
                  <span class="text-[8px] text-slate-300 truncate w-full text-center mt-0.5 font-mono">
                    {{ asset.name.replace(/_W|_N|_E|_S|\.png/g, '') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Parameter Sliders Grid -->
            <div class="grid grid-cols-2 gap-2 text-[11px]">
              
              <!-- 1. Boshlang'ich Zarar (Damage) -->
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>💥 Boshlang'ich Zarar:</span>
                  <span class="font-mono text-amber-300 font-bold">{{ towerStore.selectedBlueprint.damage }}</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="500" 
                  step="5" 
                  v-model.number="towerStore.selectedBlueprint.damage"
                  @input="onBlueprintInput"
                  class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                />
              </div>

              <!-- 2. Otish Oralig'i (Attack Speed / Cooldown) -->
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>⚡ Otish Oralig'i:</span>
                  <span class="font-mono text-amber-300 font-bold">{{ towerStore.selectedBlueprint.attackSpeed.toFixed(2) }}s</span>
                </div>
                <input 
                  type="range" 
                  min="0.05" 
                  max="3.0" 
                  step="0.05" 
                  v-model.number="towerStore.selectedBlueprint.attackSpeed"
                  @input="onBlueprintInput"
                  class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                />
              </div>

              <!-- 3. Otish Masofasi (Range) -->
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>🎯 Otish Masofasi:</span>
                  <span class="font-mono text-amber-300 font-bold">{{ towerStore.selectedBlueprint.range.toFixed(1) }} katak</span>
                </div>
                <input 
                  type="range" 
                  min="1.0" 
                  max="8.0" 
                  step="0.2" 
                  v-model.number="towerStore.selectedBlueprint.range"
                  @input="onBlueprintInput"
                  class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                />
              </div>

              <!-- 4. Maydoniy Zarar (Splash Toggle) -->
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>💥 Maydoniy Zarar (Splash):</span>
                </div>
                <div class="flex items-center gap-1 mt-0.5">
                  <button 
                    @click="setSplash(true)"
                    :class="towerStore.selectedBlueprint.isSplash ? 'bg-amber-600 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                    class="flex-1 py-0.5 rounded text-[10px] transition-colors cursor-pointer text-center"
                  >
                    Ha (Splash)
                  </button>
                  <button 
                    @click="setSplash(false)"
                    :class="!towerStore.selectedBlueprint.isSplash ? 'bg-slate-700 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                    class="flex-1 py-0.5 rounded text-[10px] transition-colors cursor-pointer text-center"
                  >
                    Yakka
                  </button>
                </div>
              </div>
            </div>

            <!-- Splash Radius & Falloff controls (if Splash is active) -->
            <div v-if="towerStore.selectedBlueprint.isSplash" class="p-2 rounded-lg bg-amber-950/30 border border-amber-500/20 flex flex-col gap-1.5 text-[11px]">
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-amber-300">Portlash Radiusi (Radius):</span>
                <span class="font-mono text-amber-300 font-bold">{{ towerStore.selectedBlueprint.splashRadius.toFixed(1) }} katak</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="3.5" 
                step="0.1" 
                v-model.number="towerStore.selectedBlueprint.splashRadius"
                @input="onBlueprintInput"
                class="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded"
              />

              <div class="flex items-center justify-between text-[10px] pt-1">
                <span class="text-slate-300">Zarar Tarqalishi:</span>
                <div class="flex items-center gap-1">
                  <button 
                    @click="setSplashType('falloff')"
                    :class="towerStore.selectedBlueprint.splashType === 'falloff' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                    class="py-0.5 px-2 rounded text-[9px] cursor-pointer"
                  >
                    📉 Kamayuvchi
                  </button>
                  <button 
                    @click="setSplashType('constant')"
                    :class="towerStore.selectedBlueprint.splashType === 'constant' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                    class="py-0.5 px-2 rounded text-[9px] cursor-pointer"
                  >
                    🟩 Bir xil
                  </button>
                </div>
              </div>
            </div>

            <!-- Cost and Projectile Type Selection -->
            <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <div class="flex flex-col gap-0.5">
                <span class="text-[10px] text-slate-400">Qurish Narxi (Oltin):</span>
                <input 
                  type="number" 
                  min="10" 
                  max="5000" 
                  step="10" 
                  v-model.number="towerStore.selectedBlueprint.cost"
                  @input="onBlueprintInput"
                  class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="flex flex-col gap-0.5">
                <span class="text-[10px] text-slate-400">Snaryad Turi:</span>
                <select 
                  v-model="towerStore.selectedBlueprint.projectileType"
                  @change="onBlueprintInput"
                  class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="cannonball">💣 To'p Toshi (Cannon)</option>
                  <option value="magic_bolt">⚡ Sehrli Nur (Magic)</option>
                  <option value="fireball">🔥 Olovli Shar (Fireball)</option>
                  <option value="arrow">🏹 Kamon O'qi (Arrow)</option>
                </select>
              </div>
            </div>

            <!-- Action Buttons: Place on map & Apply to placed towers -->
            <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
              <button 
                @click="toggleSelectBlueprint(towerStore.selectedBlueprint.id)"
                :class="towerStore.activeBuildTowerId === towerStore.selectedBlueprint.id ? 'bg-amber-600 text-white ring-2 ring-amber-400 font-bold' : 'bg-linear-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold'"
                class="py-1.5 px-2 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md"
              >
                <Hammer class="w-3.5 h-3.5" />
                <span>{{ towerStore.activeBuildTowerId === towerStore.selectedBlueprint.id ? "Xaritani bosing..." : "Xaritaga Qurish" }}</span>
              </button>

              <button 
                @click="towerStore.applyBlueprintToAllPlacedTowers(towerStore.selectedBlueprint.id)"
                class="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Ushbu turdagi barcha mavjud minoralarga yangi xususiyatlarni qo'llash"
              >
                <RefreshCw class="w-3.5 h-3.5 text-amber-400" />
                <span>Barchasiga Qo'llash</span>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- ========================================================= -->
      <!-- TAB 2: TO'LQINLAR REDAKTORI (WAVE CONFIGURATOR)           -->
      <!-- ========================================================= -->
      <div v-if="activeTab === 'waves'" class="flex flex-col gap-2.5">
        
        <!-- If no waves created yet -->
        <div v-if="characterStore.waveConfigs.length === 0" class="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex flex-col items-center text-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Swords class="w-5 h-5" />
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="font-bold text-xs text-purple-300">Hali birorta to'lqin yaratilmagan</span>
            <span class="text-[11px] text-slate-400">Dushmanlar to'lqinini sozlash uchun birinchi to'lqinni qo'shing.</span>
          </div>
          <button 
            @click="characterStore.addNewWave()"
            class="w-full py-2 px-3 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>➕ 1-To'lqinni Qo'shish</span>
          </button>
        </div>

        <!-- If waves exist -->
        <template v-else-if="characterStore.currentWaveConfig">
          <!-- Wave Selection Row + Add Wave Button -->
          <div class="flex items-center gap-1 overflow-x-auto pb-1">
            <button 
              v-for="(w, idx) in characterStore.waveConfigs" 
              :key="w.waveNumber"
              @click="characterStore.selectWave(idx)"
              :class="characterStore.currentWaveIndex === idx ? 'bg-purple-600 text-white font-bold shadow-md ring-1 ring-purple-400' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'"
              class="py-1 px-2 rounded-lg text-[10px] transition-colors cursor-pointer text-center font-mono shrink-0"
            >
              W{{ w.waveNumber }}
            </button>

            <button 
              @click="characterStore.addNewWave()"
              class="py-1 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
              title="Yangi to'lqin qo'shish"
            >
              <Plus class="w-3 h-3" />
              <span>Qo'shish</span>
            </button>
          </div>

          <!-- Selected Wave Full Customization Form -->
          <div class="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/40 flex flex-col gap-2.5">
            
            <!-- Wave Name Input -->
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] text-purple-300 font-semibold">To'lqin Nomi:</span>
              <input 
                type="text" 
                v-model="characterStore.currentWaveConfig.name"
                class="w-full bg-slate-900 border border-purple-500/40 rounded px-2.5 py-1 text-xs text-purple-200 font-medium focus:outline-none focus:border-purple-400"
              />
            </div>

            <!-- Parameter Sliders -->
            <div class="grid grid-cols-2 gap-2 text-[11px]">
              
              <!-- 1. Odamlar Soni (Unit Count: 1 - 100) -->
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>👥 Odamlar soni:</span>
                  <span class="font-mono text-amber-300 font-bold">{{ characterStore.currentWaveConfig.unitCount }} ta</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  step="1" 
                  v-model.number="characterStore.currentWaveConfig.unitCount"
                  @input="characterStore.setWaveUnitCount(characterStore.currentWaveConfig.unitCount)"
                  class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                />
              </div>

              <!-- 2. Unit Joni (Hit Points: 20 - 20000) -->
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                  <span>❤️ Odam Joni (HP):</span>
                  <span class="font-mono text-emerald-400 font-bold">{{ characterStore.currentWaveConfig.unitHp }}</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="10000" 
                  step="20" 
                  v-model.number="characterStore.currentWaveConfig.unitHp"
                  @input="characterStore.setWaveUnitHp(characterStore.currentWaveConfig.unitHp)"
                  class="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                />
              </div>

            <!-- 3. Harakat Tezligi (Unit Base Speed: 0.8 to 6.0 katak/sek) -->
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center justify-between text-[10px] text-slate-400">
                <span>🏃 Unit Tezligi:</span>
                <span class="font-mono text-amber-300 font-bold">{{ characterStore.currentWaveConfig.unitSpeed.toFixed(1) }} k/s</span>
              </div>
              <input 
                type="range" 
                min="0.8" 
                max="6.0" 
                step="0.2" 
                v-model.number="characterStore.currentWaveConfig.unitSpeed"
                @input="characterStore.setWaveSpeed(characterStore.currentWaveConfig.unitSpeed)"
                class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            <!-- 4. G'alaba Oltin Mukofoti -->
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center justify-between text-[10px] text-slate-400">
                <span>💰 Mukofot (Oltin):</span>
                <span class="font-mono text-yellow-300 font-bold">+{{ characterStore.currentWaveConfig.goldReward }}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10" 
                v-model.number="characterStore.currentWaveConfig.goldReward"
                class="w-full accent-yellow-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>
          </div>

          <!-- Quick Unit Count Buttons -->
          <div class="flex flex-col gap-1 pt-0.5">
            <span class="text-[10px] text-slate-400">Odamlar sonini tezkor tanlash:</span>
            <div class="flex items-center gap-1">
              <button 
                v-for="cnt in [2, 6, 10, 20, 50, 100]" 
                :key="cnt"
                @click="characterStore.setWaveUnitCount(cnt)"
                :class="characterStore.currentWaveConfig.unitCount === cnt ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'"
                class="flex-1 py-0.5 rounded text-[10px] border transition-colors cursor-pointer text-center font-mono"
              >
                {{ cnt }}
              </button>
            </div>
          </div>

          <!-- O'YIN SIMULYATSIYA TEZLATGICHI (Simulation Fast-Forward Multiplier: 1x to 50x) -->
          <div class="flex flex-col gap-1 p-2 rounded-xl bg-slate-900 border border-purple-500/20">
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-slate-400 flex items-center gap-1">
                <Zap class="w-3 h-3 text-amber-400" />
                <span>⚡ O'yin Tezlatgichi (Simulyatsiya):</span>
              </span>
              <span class="font-mono text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                {{ characterStore.gameSpeed.toFixed(1) }}x
              </span>
            </div>

            <input 
              type="range" 
              min="0.5" 
              max="50.0" 
              step="0.5" 
              v-model.number="characterStore.gameSpeed"
              class="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />

            <div class="flex items-center gap-1">
              <button 
                v-for="spd in [1, 2, 5, 10, 20, 50]" 
                :key="spd"
                @click="characterStore.gameSpeed = spd"
                :class="characterStore.gameSpeed === spd ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'"
                class="flex-1 py-0.5 rounded text-[9px] border transition-colors cursor-pointer text-center font-mono"
              >
                {{ spd }}x
              </button>
            </div>
          </div>

          <!-- Wave Actions: Save Wave, Test Wave & Delete wave -->
          <div class="flex flex-col gap-1.5 pt-1 border-t border-purple-500/20">
            <!-- Save Wave Button -->
            <button 
              @click="characterStore.saveCurrentWave()"
              :class="characterStore.isWaveSaveFeedback ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-linear-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 shadow-md shadow-purple-600/30'"
              class="w-full py-2 px-3 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check v-if="characterStore.isWaveSaveFeedback" class="w-4 h-4 text-emerald-200" />
              <Save v-else class="w-4 h-4" />
              <span>{{ characterStore.isWaveSaveFeedback ? "✅ To'lqin Saqlandi!" : "💾 To'lqinni Saqlash" }}</span>
            </button>

            <div class="grid grid-cols-2 gap-1.5">
              <!-- Test this specific wave -->
              <button 
                @click="toggleTestWave"
                :class="characterStore.isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 ring-1 ring-amber-400/50' : 'bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-purple-200'"
                class="py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Pause v-if="characterStore.isPlaying" class="w-3.5 h-3.5 fill-current" />
                <Play v-else class="w-3.5 h-3.5 fill-current" />
                <span>{{ characterStore.isPlaying ? "Sinovni To'xtatish" : "To'lqinni Sinash" }}</span>
              </button>

              <button 
                v-if="characterStore.waveConfigs.length > 1"
                @click="characterStore.deleteWave(characterStore.currentWaveIndex)"
                class="py-1.5 px-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5 text-rose-400" />
                <span>O'chirish</span>
              </button>
            </div>
          </div>
        </div>
        </template>
      </div>

      <!-- ========================================================= -->
      <!-- TAB 3: QURILGAN MINORALAR (PLACED TOWERS LIST)            -->
      <!-- ========================================================= -->
      <div v-if="activeTab === 'placed'" class="flex flex-col gap-2">
        
        <div v-if="towerStore.placedTowers.length > 0" class="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
          <div 
            v-for="t in towerStore.placedTowers" 
            :key="t.id"
            @click="towerStore.selectedPlacedTowerId = t.id"
            :class="towerStore.selectedPlacedTowerId === t.id ? 'ring-2 ring-sky-400 bg-sky-950/40 border-sky-500' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'"
            class="p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between"
          >
            <div class="flex flex-col">
              <span class="font-bold text-slate-200 text-xs">{{ t.name }} (Lvl {{ t.level }})</span>
              <span class="text-[10px] text-slate-400 font-mono">
                Katak: ({{ t.col }}, {{ t.row }}) | 💥 {{ t.damage }} DMG | 🎯 {{ t.range }}k
              </span>
            </div>

            <div class="flex items-center gap-1">
              <button 
                @click.stop="towerStore.upgradePlacedTower(t.id)"
                class="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                title="Kuchaytirish (+35%)"
              >
                <Zap class="w-3 h-3 text-amber-300" />
              </button>
              <button 
                @click.stop="towerStore.removePlacedTower(t.id)"
                class="p-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px]"
                title="Olib tashlash"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-[11px] text-slate-400 text-center py-4 bg-slate-950/40 rounded-xl border border-slate-800/60">
          Xaritada hali birorta minora qurilmadi. "Minoralar Redaktori" bo'limidan minora tanlab xaritaga qo'ying!
        </div>

        <button 
          v-if="towerStore.placedTowers.length > 0"
          @click="towerStore.clearAllTowers()"
          class="w-full py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <Trash2 class="w-3 h-3 text-rose-400" />
          <span>Barcha Minoralarni Tozalash</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  ShieldAlert, Swords, TowerControl, Hammer, Zap, Trash2, RotateCcw, Plus, RefreshCw, Save, Check, Image as ImageIcon, Play, Pause 
} from 'lucide-vue-next'
import { useTowerStore } from '../stores/towerStore'
import { useCharacterStore } from '../stores/characterStore'
import { useAssetStore } from '../stores/assetStore'

const towerStore = useTowerStore()
const characterStore = useCharacterStore()
const assetStore = useAssetStore()

function toggleTestWave() {
  if (characterStore.isPlaying) {
    characterStore.pauseTour()
  } else {
    characterStore.testWave(characterStore.currentWaveIndex)
  }
}

const activeTab = ref<'blueprints' | 'waves' | 'placed'>('blueprints')
const isSpritePickerOpen = ref(false)

// Available build images + structures from asset store
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
    if (a.category === 'structures' || a.category === 'walls' || a.category === 'props' || a.name.includes('Column') || a.name.includes('Structure') || a.name.includes('stairs')) {
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

function getBlueprintImageUrl(bp: any): string {
  if (!bp) return ''
  if (bp.assetPath) return bp.assetPath
  const match = availableTowerAssets.value.find(a => a.filename === bp.assetName || a.name === bp.assetName)
  return match ? match.url : ''
}

function changeBlueprintSprite(asset: any) {
  if (towerStore.selectedBlueprint) {
    towerStore.selectedBlueprint.assetName = asset.filename
    towerStore.selectedBlueprint.assetPath = asset.url
    towerStore.selectedBlueprint.assetId = asset.id
    onBlueprintInput()
  }
}

function toggleSelectBlueprint(bpId: string) {
  if (towerStore.activeBuildTowerId === bpId) {
    towerStore.selectBuildTower(null)
  } else {
    towerStore.selectBuildTower(bpId)
  }
}

function onBlueprintInput() {
  if (towerStore.selectedBlueprint) {
    towerStore.syncBlueprintChanges(towerStore.selectedBlueprint.id)
  }
}

function setSplash(val: boolean) {
  if (towerStore.selectedBlueprint) {
    towerStore.selectedBlueprint.isSplash = val
    onBlueprintInput()
  }
}

function setSplashType(type: 'falloff' | 'constant') {
  if (towerStore.selectedBlueprint) {
    towerStore.selectedBlueprint.splashType = type
    onBlueprintInput()
  }
}
</script>
