import { describe, it, expect } from 'vitest'
import { WaveManager } from '@/domain/simulation/WaveManager'
import { WaveConfig } from '@/types/map'

describe('WaveManager Domain Logic', () => {
  it('createNextWave should generate default Wave 1 when no waves exist', () => {
    const wave1 = WaveManager.createNextWave([])
    expect(wave1.waveNumber).toBe(1)
    expect(wave1.unitHp).toBe(200)
    expect(wave1.unitCount).toBe(10)
    expect(wave1.isBoss).toBe(false)
    expect(wave1.endWaveBonus).toBe(50)
  })

  it('createNextWave should scale HP and count progressively based on previous wave', () => {
    const wave1: WaveConfig = {
      waveNumber: 1,
      name: 'Wave 1',
      unitHp: 100,
      unitCount: 10,
      unitSpeed: 3.5,
      goldReward: 2,
      unitBonus: 2,
      endWaveBonus: 40,
      isBoss: false,
    }

    const wave2 = WaveManager.createNextWave([wave1])
    expect(wave2.waveNumber).toBe(2)
    expect(wave2.unitHp).toBe(150) // 100 * 1.5
    expect(wave2.unitCount).toBe(12) // 10 + 2
    expect(wave2.endWaveBonus).toBe(50) // 40 * 1.25
  })

  it('createNextWave should mark every 5th wave as Boss wave', () => {
    const waves: WaveConfig[] = [
      { waveNumber: 1, name: 'W1', unitHp: 100, unitCount: 10, unitSpeed: 3.5, isBoss: false, goldReward: 1 },
      { waveNumber: 2, name: 'W2', unitHp: 150, unitCount: 12, unitSpeed: 3.5, isBoss: false, goldReward: 1 },
      { waveNumber: 3, name: 'W3', unitHp: 200, unitCount: 14, unitSpeed: 3.5, isBoss: false, goldReward: 1 },
      { waveNumber: 4, name: 'W4', unitHp: 250, unitCount: 16, unitSpeed: 3.5, isBoss: false, goldReward: 1 },
    ]

    const wave5 = WaveManager.createNextWave(waves)
    expect(wave5.waveNumber).toBe(5)
    expect(wave5.isBoss).toBe(true)
  })

  it('reindexWaves should sequentially re-number all waves from 1', () => {
    const waves: WaveConfig[] = [
      { waveNumber: 1, name: 'W1', unitHp: 100, unitCount: 10, unitSpeed: 3.5, isBoss: false, goldReward: 1 },
      { waveNumber: 4, name: 'W4', unitHp: 250, unitCount: 16, unitSpeed: 3.5, isBoss: false, goldReward: 1 },
      { waveNumber: 9, name: 'W9', unitHp: 500, unitCount: 20, unitSpeed: 3.5, isBoss: false, goldReward: 1 },
    ]

    WaveManager.reindexWaves(waves)
    expect(waves[0].waveNumber).toBe(1)
    expect(waves[1].waveNumber).toBe(2)
    expect(waves[2].waveNumber).toBe(3)
  })
})
