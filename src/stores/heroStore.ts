import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { HeroDomain, HeroState } from '../domain/hero/HeroDomain'
import { AStarPathfinder } from '../domain/pathfinding/AStarPathfinder'
import { useMapStore } from './mapStore'
import { getModelActionFrameCount } from '@/utils/characterUtils'

export const HERO_MODELS = [
  { id: 'warrior', label: 'Warrior' },
  { id: 'orc', label: 'Orc' },
  { id: 'demon', label: 'Demon' },
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'zombi', label: 'Zombi' },
  { id: 'bird', label: 'Bird' },
  { id: 'barry', label: 'Barry' },
] as const

export interface TargetMarkerState {
  col: number
  row: number
  timer: number
  maxDuration: number
}

export const useHeroStore = defineStore('hero', () => {
  const isEnabled = ref<boolean>(true)
  const isSelected = ref<boolean>(true)

  const hero = ref<HeroState>({
    id: 'player-hero',
    name: 'Hero',
    model: 'warrior',
    currentCol: 10,
    currentRow: 10,
    direction: 2,
    action: 'Idle',
    frameIndex: 0,
    animTimer: 0,
    speed: 4.0,
    path: [],
    isSelected: true,
    isEnabled: true,
    scale: 1.15,
  })

  const targetMarker = ref<TargetMarkerState | null>(null)

  const isMoving = computed(() => hero.value.action === 'Run' && hero.value.path.length > 0)
  const activeModel = computed(() => hero.value.model)

  function setHeroModel(model: string): void {
    hero.value.model = model
    hero.value.frameIndex = 0
    hero.value.animTimer = 0
  }

  function setHeroSpeed(speed: number): void {
    hero.value.speed = Math.max(1.0, Math.min(12.0, speed))
  }

  function setHeroScale(scale: number): void {
    hero.value.scale = Math.max(0.5, Math.min(2.5, scale))
  }

  function selectHero(val: boolean = true): void {
    isSelected.value = val
    hero.value.isSelected = val
  }

  function toggleHero(val?: boolean): void {
    isEnabled.value = val !== undefined ? val : !isEnabled.value
    hero.value.isEnabled = isEnabled.value
  }

  function spawnHeroAt(col: number, row: number): void {
    hero.value.currentCol = col
    hero.value.currentRow = row
    hero.value.path = []
    hero.value.action = 'Idle'
  }

  function moveTo(targetCol: number, targetRow: number): void {
    if (!isEnabled.value) return

    const mapStore = useMapStore()
    const cols = mapStore.project.cols || 30
    const rows = mapStore.project.rows || 30

    const isWalkable = (subCol: number, subRow: number) => {
      if (mapStore.isSubCellBlocked(subCol, subRow)) return false
      return true
    }

    const path = AStarPathfinder.findPath(
      { col: hero.value.currentCol, row: hero.value.currentRow },
      { col: targetCol, row: targetRow },
      cols,
      rows,
      isWalkable
    )

    if (path.length > 0) {
      hero.value.path = path
      hero.value.targetCol = targetCol
      hero.value.targetRow = targetRow
      hero.value.action = 'Run'

      // Set destination visual marker
      targetMarker.value = {
        col: targetCol,
        row: targetRow,
        timer: 0,
        maxDuration: 1.2,
      }
    }
  }

  function updateHero(deltaSec: number, tileWidth: number = 128, tileHeight: number = 64): void {
    if (!isEnabled.value) return

    // Advance position along waypoints
    HeroDomain.advanceHero(hero.value, deltaSec, tileWidth, tileHeight)

    // Update animations
    const maxFrames = getModelActionFrameCount(hero.value.model, hero.value.action)
    HeroDomain.updateAnimation(hero.value, deltaSec, maxFrames)

    // Update target marker timer
    if (targetMarker.value) {
      targetMarker.value.timer += deltaSec
      if (targetMarker.value.timer >= targetMarker.value.maxDuration) {
        targetMarker.value = null
      }
    }
  }

  return {
    isEnabled,
    isSelected,
    hero,
    targetMarker,
    isMoving,
    activeModel,
    setHeroModel,
    setHeroSpeed,
    setHeroScale,
    selectHero,
    toggleHero,
    spawnHeroAt,
    moveTo,
    updateHero,
  }
})
