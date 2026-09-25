import { GridCoord, MapProject } from '../../types/map'
import { isInsideGrid } from '../../utils/isometric'
import { IsoEngine } from '../../engine/IsoEngine'
import { useHeroStore } from '../../stores/heroStore'

export interface GameControllerDependencies {
  engine: IsoEngine
  mapStore: any
  toolStore: any
  towerStore: any
  characterStore: any
  gameStore?: any
  routeStore?: any
  multiplayerStore: any
  notify: any
  t: (key: string, params?: any) => string
}

export class GameController {
  private deps: GameControllerDependencies
  public pendingBuildCell: GridCoord | null = null
  public lastBuildTimestamp = 0
  public lastTouchTimestamp = 0

  constructor(dependencies: GameControllerDependencies) {
    this.deps = dependencies
  }

  public setupSimulationLoop(): void {
    const { engine, characterStore, gameStore, towerStore, multiplayerStore, mapStore, toolStore } = this.deps
    const heroStore = useHeroStore()
    const isHeroMode = mapStore.project?.gameMode === 'hero'

    heroStore.toggleHero(isHeroMode)
    if (isHeroMode) {
      heroStore.selectHero(true)
    }

    engine.onTick = (rawDeltaSec: number) => {
      const simSpeed = Math.max(0.1, Math.min(50.0, gameStore?.gameSpeed || 1.0))
      const effectiveDelta = rawDeltaSec * simSpeed

      if (!multiplayerStore.roomId || multiplayerStore.isHost) {
        characterStore.updateTick(effectiveDelta)

        if (!isHeroMode) {
          towerStore.updateCombatTick(effectiveDelta)
        }

        if (multiplayerStore.roomId && multiplayerStore.isHost) {
          multiplayerStore.broadcastGameTick()
        }
      } else {
        characterStore.updateClientInterpolation(rawDeltaSec)
      }

      // Update hero movement and animation only in Hero mode
      if (isHeroMode) {
        heroStore.updateHero(effectiveDelta, mapStore.project.tileWidth, mapStore.project.tileHeight)
      }

      engine.renderCharacter(characterStore, mapStore.project)

      if (!isHeroMode) {
        engine.renderTowersAndCombat(
          towerStore,
          mapStore.project,
          characterStore,
          toolStore.hoveredCell
        )
      }
      engine.renderTeammateHovers(multiplayerStore.teammateHovers, mapStore.project)
    }
  }

  public stopSimulationLoop(): void {
    this.deps.engine.stopTicker()
  }

  public handleCellClick(gridCoord: GridCoord): void {
    const { mapStore, towerStore, gameStore, routeStore, multiplayerStore, toolStore, notify, t } =
      this.deps
    const heroStore = useHeroStore()
    const isHeroMode = mapStore.project?.gameMode === 'hero'

    if (!isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
      if (!isHeroMode) {
        towerStore.selectPlacedTower(null)
        this.pendingBuildCell = null
        towerStore.setPendingBuildCell(null)
        toolStore.setHoveredCell(null)
      }
      return
    }

    // 1. HERO REJIMI: Point-and-Click Hero Harakati
    if (isHeroMode) {
      if (heroStore.isEnabled) {
        const distToHero = Math.hypot(
          gridCoord.col - heroStore.hero.currentCol,
          gridCoord.row - heroStore.hero.currentRow
        )
        if (distToHero < 0.9) {
          heroStore.selectHero(true)
        } else if (heroStore.isSelected) {
          heroStore.moveTo(gridCoord.col, gridCoord.row)
        }
      }
      return
    }

    // 2. TD REJIMI: Minora qurish va tanlash
    // 2.1 If building a tower from shop
    if (towerStore.activeBuildTowerId) {
      // Check if cell already has a placed tower!
      const existingTower = towerStore.placedTowers.find(
        (t: any) => t.col === gridCoord.col && t.row === gridCoord.row
      )
      if (existingTower) {
        notify.warning(t('game.tileAlreadyOccupied'), t('game.cannotPlaceHere'))
        return
      }

      // Check if cell is blocked by spawn point or route
      const isBlocked = routeStore?.isCellBlockedForBuilding
        ? routeStore.isCellBlockedForBuilding(gridCoord.col, gridCoord.row)
        : false

      if (isBlocked) {
        notify.warning(t('game.cannotBuildSpawnWalk'), t('game.cannotBuildSpawnTitle'))
        return
      }

      // Check if cell is in buildable zone
      if (!mapStore.isCellBuildable(gridCoord.col, gridCoord.row)) {
        notify.warning(t('game.cannotPlaceHere'), t('game.cannotPlaceHere'))
        return
      }

      // First tap on a cell: Target and highlight this cell
      if (
        !this.pendingBuildCell ||
        this.pendingBuildCell.col !== gridCoord.col ||
        this.pendingBuildCell.row !== gridCoord.row
      ) {
        this.pendingBuildCell = { col: gridCoord.col, row: gridCoord.row }
        towerStore.setPendingBuildCell(this.pendingBuildCell)
        toolStore.setHoveredCell({ col: gridCoord.col, row: gridCoord.row })
        towerStore.selectPlacedTower(null)
        return
      }

      // Second tap on the SAME active cell: Validate and place the tower!
      const bp = towerStore.blueprints.find((b: any) => b.id === towerStore.activeBuildTowerId)
      if (bp) {
        let currentGold = gameStore?.gold ?? 0
        if (multiplayerStore.roomId) {
          const myPl = multiplayerStore.players.find(
            (p: any) => p.id === multiplayerStore.myPlayerId
          )
          if (myPl) currentGold = myPl.gold ?? 0
        }

        if (currentGold < bp.cost) {
          notify.gold(
            t('game.needGoldForTower', { cost: bp.cost, current: currentGold }),
            t('game.notEnoughGold')
          )
          return
        }
      }

      const placed = towerStore.placeTowerAt(gridCoord.col, gridCoord.row)
      if (placed) {
        this.lastBuildTimestamp = Date.now()
        this.pendingBuildCell = null
        towerStore.setPendingBuildCell(null)
        toolStore.setHoveredCell(null)
        towerStore.selectBuildTower(null)
        towerStore.selectPlacedTower(null)
      }
      return
    }

    // If a tower was just built within 450ms, ignore selecting it
    if (Date.now() - this.lastBuildTimestamp < 450) {
      towerStore.selectPlacedTower(null)
      return
    }

    // 2.2 Check if a placed tower exists on this cell (explicit click to select/inspect)
    const clickedTower = towerStore.placedTowers.find(
      (t: any) => t.col === gridCoord.col && t.row === gridCoord.row
    )
    if (clickedTower) {
      towerStore.selectPlacedTower(clickedTower.id)
      return
    }

    towerStore.selectPlacedTower(null)
  }

  public handlePointerMove(gridCoord: GridCoord): void {
    const { towerStore, toolStore, multiplayerStore, mapStore } = this.deps

    if (!towerStore.activeBuildTowerId || !this.pendingBuildCell) {
      toolStore.setHoveredCell(gridCoord)
    }

    if (
      multiplayerStore.roomId &&
      isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)
    ) {
      multiplayerStore.broadcastTeammateHover(gridCoord.col, gridCoord.row)
    }
  }

  public handlePointerLeave(): void {
    const { towerStore, toolStore } = this.deps
    if (!towerStore.activeBuildTowerId || !this.pendingBuildCell) {
      toolStore.setHoveredCell(null)
    }
  }

  public handleContextMenu(): void {
    const { towerStore, toolStore, mapStore } = this.deps
    const heroStore = useHeroStore()

    // 1. Deselect hero
    if (heroStore.isSelected) {
      heroStore.selectHero(false)
      return
    }

    // 2. Cancel tower build in TD mode
    if (towerStore.activeBuildTowerId) {
      this.pendingBuildCell = null
      towerStore.setPendingBuildCell(null)
      toolStore.setHoveredCell(null)
      towerStore.selectBuildTower(null)
      return
    }

    // 3. Deselect placed tower
    if (towerStore.selectedPlacedTowerId) {
      towerStore.selectPlacedTower(null)
    }
  }

  public resetBuildState(): void {
    this.pendingBuildCell = null
    this.deps.towerStore.setPendingBuildCell(null)
    this.deps.toolStore.setHoveredCell(null)
  }

  public destroy(): void {
    this.stopSimulationLoop()
    this.resetBuildState()
  }
}
