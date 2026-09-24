import { Container, Graphics, Sprite } from 'pixi.js'
import { MapProject, UnitVariantType } from '../../types/map'
import { useWaveStore } from '../../stores/waveStore'
import { useGameStore } from '../../stores/gameStore'
import { assetManager } from '../../services/assetManager'
import { networkSyncBuffer } from '../../services/networkSync'
import { getVariantTint } from '../../utils/unitVariants'
import { renderPixiUnitEffect } from '../../utils/unitEffectRenderer'
import { gridToScreen } from '../../utils/isometric'
import { CrowdSimulation } from '../../domain/simulation/CrowdSimulation'
import characterManifest from '../../assets/generated/characterManifest.json'

export class UnitRenderer {
  public unitContainers: Container[] = []
  private unitLastDepths: number[] = []

  public renderUnits(
    characterStore: any,
    project: MapProject,
    parentLayersContainer: Container
  ): void {
    if (!characterStore.isEnabled) {
      for (const c of this.unitContainers) c.visible = false
      return
    }

    const { tileWidth, tileHeight } = project
    const units =
      networkSyncBuffer.renderUnitsList.length > 0
        ? networkSyncBuffer.renderUnitsList
        : characterStore.units || []

    // Ensure container pool size matches units count
    while (this.unitContainers.length < units.length) {
      const container = new Container()
      container.sortableChildren = true

      const sprite = new Sprite()
      sprite.zIndex = 1

      const marker = new Graphics()
      marker.zIndex = 2

      container.addChild(sprite)
      container.addChild(marker)

      parentLayersContainer.addChild(container)
      this.unitContainers.push(container)
    }

    // Hide extra containers
    for (let i = units.length; i < this.unitContainers.length; i++) {
      this.unitContainers[i].visible = false
    }

    let needsDepthSort = false
    if (this.unitLastDepths.length !== units.length) {
      needsDepthSort = true
      this.unitLastDepths = new Array(units.length).fill(-1)
    }

    const waveStore = useWaveStore()
    const gameStore = useGameStore()
    const currentWaveCfg =
      waveStore?.currentWaveConfig ||
      waveStore?.waveConfigs?.[waveStore?.currentWaveIndex ?? 0] ||
      null

    // Update each active unit
    for (let i = 0; i < units.length; i++) {
      const unit = units[i]
      const container = this.unitContainers[i]

      const isSpawned = unit.lifecycle ? unit.lifecycle.isSpawned : unit.isSpawned
      const isDead = unit.lifecycle ? unit.lifecycle.isDead : unit.isDead
      const deathFade = unit.lifecycle ? unit.lifecycle.deathFade : unit.deathFade

      if (!isSpawned || (isDead && deathFade !== undefined && deathFade <= 0)) {
        if (container.visible) {
          container.visible = false
          this.unitLastDepths[i] = -1
        }
        continue
      }

      container.visible = true

      const sprite = container.getChildAt(0) as Sprite
      const marker = container.getChildAt(1) as Graphics

      const actionPrefix = (unit.animation ? unit.animation.action : unit.action) || 'Idle'
      const frame = actionPrefix === 'Idle' ? '0' : (unit.animation ? unit.animation.frameIndex : unit.frameIndex) || 0

      const effectiveModel = (unit.identity ? unit.identity.model : unit.characterModel) || currentWaveCfg?.characterModel || 'male'
      const direction = unit.movement ? unit.movement.direction : (unit.direction ?? 2)
      const texture = assetManager.getCharacterTexture(
        direction,
        actionPrefix,
        frame,
        effectiveModel
      )

      const fadeAlpha = isDead ? Math.max(0, deathFade ?? 1.0) : 1.0

      if (texture) {
        if (sprite.texture !== texture) {
          sprite.texture = texture
        }
        sprite.visible = true
        sprite.alpha = fadeAlpha

        const modelKey = String(effectiveModel).toLowerCase()
        const modelMeta = (characterManifest as any)?.[modelKey]
        const anchorX = modelMeta?.anchorX ?? 0.5
        const anchorY = modelMeta?.anchorY ?? 0.898
        const cellW = modelMeta?.cellWidth || 256

        const baseScale = (tileWidth * 1.0) / cellW
        const scaleMult = modelMeta?.scale ?? 1.0
        const globalScale = Number(characterStore?.unitScaleMultiplier) || 1.0
        const rawUnitScale = (unit.identity ? unit.identity.scale : (unit as any).unitScale) ?? currentWaveCfg?.unitScale
        const customUnitScale = (Number(rawUnitScale) || 1.0) * globalScale

        sprite.scale.set(baseScale * scaleMult * customUnitScale)
        sprite.anchor.set(anchorX, anchorY)

        const variant = ((unit.identity ? unit.identity.variant : unit.unitVariant) || currentWaveCfg?.unitVariant || 'normal') as UnitVariantType
        const effectiveTint = (unit.identity ? unit.identity.variantTint : unit.variantTint) ?? currentWaveCfg?.variantTint
        sprite.tint = getVariantTint(variant, effectiveTint)

        if (!isDead) {
          renderPixiUnitEffect({
            marker,
            variant,
            tileWidth,
            tileHeight,
            customUnitScale,
            fadeAlpha,
            unitIndex: i,
            animTime: performance.now() * 0.001,
          })
        } else {
          marker.visible = false
        }
      } else {
        marker.visible = false
      }

      const unitElev = Number(characterStore?.unitElevation) || 0
      const rawOffsetY = (unit.identity ? unit.identity.offsetY : unit.offsetY) ?? currentWaveCfg?.offsetY ?? 0
      const unitOffsetY = rawOffsetY + unitElev

      const col = unit.movement ? unit.movement.currentCol : unit.currentCol
      const row = unit.movement ? unit.movement.currentRow : unit.currentRow
      const baseScreen = gridToScreen(col, row, tileWidth, tileHeight)

      const sideOffset = unit.identity ? unit.identity.sideOffset : (unit.sideOffset ?? 0)
      let finalScreenX = baseScreen.x
      let finalScreenY = baseScreen.y

      if (gameStore.formation === 'pairs' && sideOffset !== 0) {
        // Calculate side offset perpendicular to direction
        const perpX = Math.cos((direction * Math.PI) / 4 + Math.PI / 2)
        const perpY = Math.sin((direction * Math.PI) / 4 + Math.PI / 2) * 0.5
        const offsetDist = tileWidth * 0.15 * sideOffset
        finalScreenX += perpX * offsetDist
        finalScreenY += perpY * offsetDist
      }

      container.position.set(finalScreenX, finalScreenY)
      sprite.position.set(0, -unitOffsetY)
      marker.position.set(0, -unitOffsetY)

      const charDepth =
        100000 + Math.round((col + row) * 1000) + 300 + (i % 10)
      if (container.zIndex !== charDepth) {
        container.zIndex = charDepth
        needsDepthSort = true
      }
      this.unitLastDepths[i] = charDepth
    }

    if (needsDepthSort) {
      parentLayersContainer.sortChildren()
    }
  }

  public clear(parentLayersContainer?: Container): void {
    try {
      for (const c of this.unitContainers) {
        c.visible = false
        if (parentLayersContainer && !parentLayersContainer.destroyed && c.parent === parentLayersContainer) {
          parentLayersContainer.removeChild(c)
        }
        if (c && !c.destroyed) {
          c.destroy({ children: true })
        }
      }
      this.unitContainers = []
      this.unitLastDepths = []
    } catch (e) {
      console.warn('[UnitRenderer] clear caught:', e)
    }
  }

  public destroy(parentLayersContainer?: Container): void {
    this.clear(parentLayersContainer)
  }
}
