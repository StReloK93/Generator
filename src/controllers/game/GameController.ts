import { GridCoord } from '../../types/map'
import { isInsideGrid } from '../../utils/isometric'
import { IsoEngine } from '../../engine/IsoEngine'
import { useHeroStore } from '../../stores/heroStore'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { getMapMode } from '../../domain/map'
import { hideSeekAudio } from '../../services/hideSeekAudio'
import { startBackgroundTicker } from '../../utils/backgroundTicker'
import type { useMapStore } from '../../stores/mapStore'
import type { useToolStore } from '../../stores/toolStore'
import type { useTowerStore } from '../../stores/towerStore'
import type { useCharacterStore } from '../../stores/characterStore'
import type { useGameStore } from '../../stores/gameStore'
import type { useRouteStore } from '../../stores/routeStore'
import type { useMultiplayerStore } from '../../stores/multiplayerStore'
import type { useNotificationStore } from '../../stores/notificationStore'
import type { useI18n } from '../../stores/i18nStore'

export interface GameControllerDependencies {
  engine: IsoEngine
  mapStore: ReturnType<typeof useMapStore>
  toolStore: ReturnType<typeof useToolStore>
  towerStore: ReturnType<typeof useTowerStore>
  characterStore: ReturnType<typeof useCharacterStore>
  gameStore: ReturnType<typeof useGameStore>
  routeStore: ReturnType<typeof useRouteStore>
  multiplayerStore: ReturnType<typeof useMultiplayerStore>
  notify: ReturnType<typeof useNotificationStore>
  t: ReturnType<typeof useI18n>['t']
  /** Centers the camera on a grid point (hide & seek follows the own character) */
  followCamera: (col: number, row: number) => void
}

export class GameController {
  private deps: GameControllerDependencies
  public pendingBuildCell: GridCoord | null = null
  public lastBuildTimestamp = 0
  public lastTouchTimestamp = 0
  private stopBackgroundTicker: (() => void) | null = null
  private onVisibilityChange: (() => void) | null = null
  private removeInputListeners: (() => void) | null = null

  constructor(dependencies: GameControllerDependencies) {
    this.deps = dependencies
  }

  public setupSimulationLoop(): void {
    if (getMapMode(this.deps.mapStore.project) === 'hideseek') {
      this.setupHideSeekLoop()
      return
    }

    const { engine, characterStore, gameStore, towerStore, multiplayerStore, mapStore, toolStore } = this.deps
    const heroStore = useHeroStore()
    const isHeroMode = mapStore.project?.gameMode === 'hero'

    heroStore.toggleHero(isHeroMode)
    if (isHeroMode) {
      heroStore.selectHero(true)
    }

    const simulate = (rawDeltaSec: number) => {
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
    }

    engine.onTick = (rawDeltaSec: number) => {
      simulate(rawDeltaSec)
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

    // A hidden tab gets no animation frames. The multiplayer host is the authoritative simulation,
    // so keep it (and its broadcasts) running from a worker timer until the tab is visible again.
    this.onVisibilityChange = () => {
      this.stopBackgroundTicker?.()
      this.stopBackgroundTicker = null
      if (document.hidden && multiplayerStore.roomId && multiplayerStore.isHost) {
        this.stopBackgroundTicker = startBackgroundTicker(40, simulate)
      }
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  /** Hide & seek: keyboard movement, own-character camera, match tick and fog of war rendering. */
  private setupHideSeekLoop(): void {
    const { engine, mapStore, multiplayerStore, followCamera } = this.deps
    const hideSeekStore = useHideSeekStore()
    hideSeekStore.startMatch()

    const isTyping = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      hideSeekAudio.unlock()
      if (hideSeekStore.setKey(e.code, true)) e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      hideSeekStore.setKey(e.code, false)
    }
    const onBlur = () => hideSeekStore.releaseInput()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    this.removeInputListeners = () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }

    const simulate = (rawDeltaSec: number) => {
      hideSeekStore.tick(rawDeltaSec, mapStore.project.tileWidth, mapStore.project.tileHeight)
    }

    engine.onTick = (rawDeltaSec: number) => {
      simulate(rawDeltaSec)
      engine.renderHideSeek(hideSeekStore.getRenderView(), mapStore.project)
      const me = hideSeekStore.getMyPosition()
      if (me) followCamera(me.col, me.row)
    }

    // The host owns the match clock: keep it running while its tab is hidden
    this.onVisibilityChange = () => {
      this.stopBackgroundTicker?.()
      this.stopBackgroundTicker = null
      if (document.hidden && multiplayerStore.isHost) {
        this.stopBackgroundTicker = startBackgroundTicker(40, simulate)
      }
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  public stopSimulationLoop(): void {
    this.deps.engine.stopTicker()
    this.stopBackgroundTicker?.()
    this.stopBackgroundTicker = null
    this.removeInputListeners?.()
    this.removeInputListeners = null
    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
      this.onVisibilityChange = null
    }
  }

  public handleCellClick(gridCoord: GridCoord): void {
    const { mapStore, towerStore, gameStore, routeStore, multiplayerStore, toolStore, notify, t } =
      this.deps
    const heroStore = useHeroStore()
    const isHeroMode = mapStore.project?.gameMode === 'hero'

    // Hide & seek: click / tap walks there (WASD and the touch joystick steer directly)
    if (getMapMode(mapStore.project) === 'hideseek') {
      hideSeekAudio.unlock()
      useHideSeekStore().moveTo(gridCoord.col, gridCoord.row)
      return
    }

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

        if (currentGold < bp.levels[0].cost) {
          notify.gold(
            t('game.needGoldForTower', { cost: bp.levels[0].cost, current: currentGold }),
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
    const { towerStore, toolStore } = this.deps
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
