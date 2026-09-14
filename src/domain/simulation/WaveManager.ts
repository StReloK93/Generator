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
      animSpeed: prevWave?.animSpeed || 1.0,
      offsetY: prevWave?.offsetY || 0,
      unitScale: prevWave?.unitScale || 1.0,
      unitVariant: prevWave?.unitVariant || 'normal',
      variantTint: prevWave?.variantTint,
      immunities: prevWave?.immunities ? [...prevWave.immunities] : [],
    }
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
