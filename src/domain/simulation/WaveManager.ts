import { WaveConfig } from '../../types/map'

export class WaveManager {
  /**
   * Generates a new progressive wave configuration based on the previous wave or default stats.
   */
  public static createNextWave(existingWaves: WaveConfig[]): WaveConfig {
    const nextNum = existingWaves.length + 1
    const prevWave = existingWaves[existingWaves.length - 1]
    const baseHp = prevWave ? Math.round(prevWave.unitHp * 1.5) : 200
    const baseCount = prevWave ? Math.min(50, prevWave.unitCount + 2) : 10
    const baseUnitBonus = prevWave?.unitBonus ?? prevWave?.goldReward ?? 1
    const baseEndBonus = prevWave
      ? Math.min(500, Math.max(10, Math.round((prevWave.endWaveBonus ?? 50) * 1.25)))
      : 50

    return {
      waveNumber: nextNum,
      name: `Wave ${nextNum}`,
      unitHp: baseHp,
      unitSpeed: prevWave ? prevWave.unitSpeed : 3.5,
      unitCount: baseCount,
      isBoss: nextNum % 5 === 0,
      goldReward: baseUnitBonus,
      unitBonus: baseUnitBonus,
      endWaveBonus: baseEndBonus,
      characterModel: prevWave?.characterModel || 'male',
      unitScale: prevWave?.unitScale || 1.0,
      unitVariant: prevWave?.unitVariant || 'normal',
      variantTint: prevWave?.variantTint,
      immunities: prevWave?.immunities ? [...prevWave.immunities] : [],
    }
  }

  /**
   * Normalizes a raw wave from saved JSON, network payloads or legacy files into a complete WaveConfig.
   * Single owner of wave defaults for import, export, restore and multiplayer sync.
   */
  public static normalizeWave(raw: Partial<WaveConfig>, idx: number): WaveConfig {
    const unitBonus = raw.unitBonus !== undefined ? Number(raw.unitBonus) : (Number(raw.goldReward) || 1)
    return {
      waveNumber: raw.waveNumber ?? idx + 1,
      name: raw.name || `Wave ${idx + 1}`,
      unitHp: Number(raw.unitHp) || 100,
      unitSpeed: Number(raw.unitSpeed) || 2.5,
      unitCount: Number(raw.unitCount) || 10,
      isBoss: !!raw.isBoss,
      goldReward: Number(raw.goldReward) || unitBonus,
      unitBonus,
      endWaveBonus: raw.endWaveBonus !== undefined ? Number(raw.endWaveBonus) : 50,
      characterModel: raw.characterModel || 'male',
      unitScale: Number(raw.unitScale) || 1.0,
      unitVariant: raw.unitVariant || 'normal',
      variantTint: raw.variantTint,
      immunities: Array.isArray(raw.immunities) ? [...raw.immunities] : [],
    }
  }

  public static normalizeWaves(raw: unknown): WaveConfig[] {
    return Array.isArray(raw) ? raw.map((w, idx) => WaveManager.normalizeWave(w, idx)) : []
  }

  /**
   * Re-indexes waves sequentially after one is deleted.
   */
  public static reindexWaves(waves: WaveConfig[]): void {
    waves.forEach((w, i) => {
      w.waveNumber = i + 1
    })
  }
}
