import { Container, Graphics, Sprite } from 'pixi.js'
import { MapProject, UnitVariantType } from '../../types/map'
import { assetManager } from '../../services/assetManager'
import { networkSyncBuffer } from '../../services/networkSync'
import { getVariantTint } from '../../utils/unitVariants'
import { renderPixiUnitEffect } from '../../utils/unitEffectRenderer'
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

      const shadow = new Graphics()
      shadow.zIndex = 0
      const shadowRadiusX = tileWidth * 0.1
      const shadowRadiusY = tileHeight * 0.1
      shadow
        .ellipse(0, 0, shadowRadiusX, shadowRadiusY)
        .fill({ color: 0x000000, alpha: 0.14 })

      const sprite = new Sprite()
      sprite.zIndex = 1

      const marker = new Graphics()
      marker.zIndex = 2

      container.addChild(shadow)
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

    // Update each active unit
    for (let i = 0; i < units.length; i++) {
      const unit = units[i]
      const container = this.unitContainers[i]

      if (!unit.isSpawned || (unit.isDead && unit.deathFade !== undefined && unit.deathFade <= 0)) {
        if (container.visible) {
          container.visible = false
          this.unitLastDepths[i] = -1
        }
        continue
      }

      container.visible = true

      const shadow = container.getChildAt(0) as Graphics
      const sprite = container.getChildAt(1) as Sprite
      const marker = container.getChildAt(2) as Graphics

      const actionPrefix = unit.action || 'Idle'
      const frame = actionPrefix === 'Idle' ? '0' : unit.frameIndex || 0
      const currentWaveCfg =
        characterStore?.currentWaveConfig ||
        characterStore?.waveConfigs?.[characterStore?.currentWaveIndex ?? 0] ||
        null

      const effectiveModel = unit.characterModel || currentWaveCfg?.characterModel || 'male'
      const texture = assetManager.getCharacterTexture(
        unit.direction,
        actionPrefix,
        frame,
        effectiveModel
      )

      const fadeAlpha = unit.isDead ? Math.max(0, unit.deathFade ?? 1.0) : 1.0

      if (texture) {
        if (sprite.texture !== texture) {
          sprite.texture = texture
        }
        sprite.visible = true
        sprite.alpha = fadeAlpha

        const modelKey = String(effectiveModel).toLowerCase()
        const modelMeta = (characterManifest as any)?.[modelKey]
        const anchorX = modelMeta?.anchorX ?? 0.5
        const anchorY = modelMeta?.anchorY ?? (modelKey === 'male' ? 0.898 : 0.67)
        const cellW = modelMeta?.cellWidth || 256

        const baseScale = (tileWidth * 1.0) / cellW
        const scaleMult =
          modelMeta?.scale ??
          (modelKey === 'warrior'
            ? 1.48
            : modelKey === 'demon'
              ? 1.35
              : modelKey === 'female'
                ? 1.15
                : modelKey === 'male'
                  ? 0.95
                  : 1.0)
        const globalScale = Number(characterStore?.unitScaleMultiplier) || 1.0
        const rawUnitScale = (unit as any).unitScale ?? currentWaveCfg?.unitScale
        const customUnitScale = (Number(rawUnitScale) || 1.0) * globalScale

        sprite.scale.set(baseScale * (modelKey === 'male' ? 0.95 : scaleMult) * customUnitScale)
        sprite.anchor.set(anchorX, anchorY)

        const variant = (unit.unitVariant || currentWaveCfg?.unitVariant || 'normal') as UnitVariantType
        const effectiveTint = unit.variantTint ?? currentWaveCfg?.variantTint
        sprite.tint = getVariantTint(variant, effectiveTint)

        if (!unit.isDead) {
          renderPixiUnitEffect({
            marker,
            shadow,
            variant,
            tileWidth,
            tileHeight,
            customUnitScale,
            fadeAlpha,
            unitIndex: i,
            animTime: performance.now() * 0.001,
          })
        } else {
          shadow.visible = false
          marker.visible = false
        }
      } else {
        shadow.visible = false
        marker.visible = false
      }

      const unitElev = Number(characterStore?.unitElevation) || 0
      const rawOffsetY = unit.offsetY ?? currentWaveCfg?.offsetY ?? 0
      const unitOffsetY = rawOffsetY + unitElev
      container.position.set(unit.screenX, unit.screenY)
      sprite.position.set(0, -unitOffsetY)
      marker.position.set(0, -unitOffsetY)
      shadow.position.set(0, 0)
      shadow.scale.set(Math.max(0.4, 1.0 - unitOffsetY / 250))

      const charDepth =
        100000 + Math.round((unit.currentCol + unit.currentRow) * 1000) + 300 + (i % 10)
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
    for (const c of this.unitContainers) {
      c.visible = false
      if (parentLayersContainer) {
        parentLayersContainer.removeChild(c)
      }
      c.destroy({ children: true })
    }
    this.unitContainers = []
    this.unitLastDepths = []
  }

  public destroy(parentLayersContainer?: Container): void {
    this.clear(parentLayersContainer)
  }
}
