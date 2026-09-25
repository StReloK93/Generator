import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { WaveConfig, UnitVariantType, TowerTraitType } from '../types/map'
import { useMapStore } from './mapStore'
import { WaveManager } from '../domain/simulation'

export const useWaveStore = defineStore('waveStore', () => {
  const mapStore = useMapStore()

  // User-created Wave Configurations
  const waveConfigs = ref<WaveConfig[]>([])
  const currentWaveIndex = ref<number>(0)
  const isWaveSaveFeedback = ref<boolean>(false)

  const currentWaveConfig = computed<WaveConfig | null>(() => {
    if (waveConfigs.value.length === 0) return null
    const idx = Math.max(0, Math.min(waveConfigs.value.length - 1, currentWaveIndex.value))
    return waveConfigs.value[idx] || waveConfigs.value[0] || null
  })

  function syncWavesToProject() {
    if (!mapStore.project) return
    ;(mapStore.project as any).waveConfigs = waveConfigs.value.map(w => ({ ...w }))
    ;(mapStore.project as any).currentWaveIndex = currentWaveIndex.value
  }

  function restoreWavesFromProject() {
    const p = mapStore.project as any
    const waves = p.waveConfigs || p.waveData?.waveConfigs || []
    if (waves && Array.isArray(waves) && waves.length > 0) {
      waveConfigs.value = waves.map((w: any) => ({
        ...w,
        unitBonus: w.unitBonus !== undefined ? Number(w.unitBonus) : (Number(w.goldReward) || 1),
        endWaveBonus: w.endWaveBonus !== undefined ? Number(w.endWaveBonus) : 50,
        characterModel: w.characterModel || 'male',
        animSpeed: Number(w.animSpeed) || 1.0,
        offsetY: Number(w.offsetY) || 0,
        unitScale: Number(w.unitScale) || 1.0,
        unitVariant: w.unitVariant || 'normal',
        variantTint: w.variantTint,
        immunities: Array.isArray(w.immunities) ? w.immunities : [],
      }))
      currentWaveIndex.value = Math.max(0, Math.min(waveConfigs.value.length - 1, p.currentWaveIndex ?? p.waveData?.currentWaveIndex ?? 0))
    } else {
      waveConfigs.value = []
      currentWaveIndex.value = 0
    }
  }

  function selectWave(idx: number) {
    currentWaveIndex.value = Math.max(0, Math.min(waveConfigs.value.length - 1, idx))
    syncWavesToProject()
  }

  function addNewWave(): WaveConfig {
    const newWave = WaveManager.createNextWave(waveConfigs.value)
    waveConfigs.value.push(newWave)
    syncWavesToProject()
    selectWave(waveConfigs.value.length - 1)
    return newWave
  }

  function deleteWave(idx: number) {
    if (waveConfigs.value.length <= 1) return
    waveConfigs.value.splice(idx, 1)
    WaveManager.reindexWaves(waveConfigs.value)
    syncWavesToProject()
    selectWave(Math.max(0, idx - 1))
  }

  function saveCurrentWave() {
    if (!currentWaveConfig.value) return
    syncWavesToProject()
    mapStore.pushHistory(`Saved Wave ${currentWaveConfig.value.waveNumber} settings`)
    isWaveSaveFeedback.value = true
    setTimeout(() => {
      isWaveSaveFeedback.value = false
    }, 2500)
  }

  function updateWaveConfig(idx: number, updates: Partial<WaveConfig>) {
    const cfg = waveConfigs.value[idx]
    if (!cfg) return
    Object.assign(cfg, updates)
    syncWavesToProject()
  }

  function setWaveUnitCount(count: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitCount = count
    }
    syncWavesToProject()
  }

  function setWaveUnitHp(hp: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitHp = hp
    }
    syncWavesToProject()
  }

  function setWaveSpeed(spd: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitSpeed = spd
    }
    syncWavesToProject()
  }

  function setWaveUnitBonus(bonus: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitBonus = Math.max(0, Math.round(bonus))
      currentWaveConfig.value.goldReward = currentWaveConfig.value.unitBonus
    }
    syncWavesToProject()
  }

  function setWaveEndBonus(bonus: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.endWaveBonus = Math.max(0, Math.round(bonus))
    }
    syncWavesToProject()
  }

  function setWaveGoldReward(reward: number) {
    setWaveUnitBonus(reward)
  }

  function setWaveCharacterModel(model: string) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.characterModel = model
    }
    syncWavesToProject()
  }

  function setWaveAnimSpeed(speed: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.animSpeed = Math.min(4.0, Math.max(0.2, Math.round(speed * 10) / 10))
    }
    syncWavesToProject()
  }

  function setWaveOffsetY(offset: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.offsetY = Math.min(100, Math.max(-100, Math.round(offset)))
    }
    syncWavesToProject()
  }

  function setWaveUnitScale(scale: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitScale = Math.min(4.0, Math.max(0.3, Math.round(scale * 100) / 100))
    }
    syncWavesToProject()
  }

  function setWaveUnitVariant(variant: UnitVariantType) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitVariant = variant
    }
    syncWavesToProject()
  }

  function setWaveVariantTint(tint?: number | string) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.variantTint = tint
    }
    syncWavesToProject()
  }

  // --- DEV & SANDBOX WAVE HELPERS ---
  function devAddWave(): WaveConfig {
    const nextNum = waveConfigs.value.length + 1
    const prevWave = waveConfigs.value[waveConfigs.value.length - 1]
    const newWave: WaveConfig = {
      waveNumber: nextNum,
      name: `Wave ${nextNum}`,
      unitHp: prevWave ? Math.round(prevWave.unitHp * 1.3) : 100,
      unitSpeed: prevWave ? prevWave.unitSpeed : 2.5,
      unitCount: prevWave ? Math.min(50, prevWave.unitCount + 2) : 12,
      isBoss: nextNum % 5 === 0,
      goldReward: prevWave ? Math.round(prevWave.goldReward * 1.2) : 50,
      characterModel: prevWave?.characterModel || 'male',
      unitVariant: prevWave?.unitVariant || 'normal',
      immunities: prevWave?.immunities ? [...prevWave.immunities] : [],
    }
    waveConfigs.value.push(newWave)
    syncWavesToProject()
    return newWave
  }

  function devUpdateActiveWaveHp(hp: number) {
    const wave = currentWaveConfig.value
    if (!wave) return
    wave.unitHp = Math.max(1, hp)
    syncWavesToProject()
  }

  function devUpdateActiveWaveSpeed(speed: number) {
    const wave = currentWaveConfig.value
    if (!wave) return
    wave.unitSpeed = Math.max(0.2, Number(speed.toFixed(2)))
    syncWavesToProject()
  }

  function devUpdateActiveWaveCount(count: number) {
    const wave = currentWaveConfig.value
    if (!wave) return
    wave.unitCount = Math.max(1, Math.min(100, count))
    syncWavesToProject()
  }

  function devToggleActiveWaveImmunity(trait: TowerTraitType) {
    const wave = currentWaveConfig.value
    if (!wave) return
    const currentList = Array.isArray(wave.immunities) ? [...wave.immunities] : []
    const idx = currentList.indexOf(trait)
    if (idx === -1) {
      currentList.push(trait)
    } else {
      currentList.splice(idx, 1)
    }
    wave.immunities = currentList
    syncWavesToProject()
  }

  function resetForNewProject() {
    waveConfigs.value = []
    currentWaveIndex.value = 0
    isWaveSaveFeedback.value = false
  }

  return {
    waveConfigs,
    currentWaveIndex,
    currentWaveConfig,
    isWaveSaveFeedback,
    syncWavesToProject,
    restoreWavesFromProject,
    selectWave,
    addNewWave,
    deleteWave,
    saveCurrentWave,
    updateWaveConfig,
    setWaveUnitCount,
    setWaveUnitHp,
    setWaveSpeed,
    setWaveUnitBonus,
    setWaveEndBonus,
    setWaveGoldReward,
    setWaveCharacterModel,
    setWaveAnimSpeed,
    setWaveOffsetY,
    setWaveUnitScale,
    setWaveUnitVariant,
    setWaveVariantTint,
    devAddWave,
    devUpdateActiveWaveHp,
    devUpdateActiveWaveSpeed,
    devUpdateActiveWaveCount,
    devToggleActiveWaveImmunity,
    resetForNewProject,
  }
})
