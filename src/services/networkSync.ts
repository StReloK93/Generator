import {
  CompactUnitSnapshot,
  WorldSnapshotPayload,
  CompactCombatEvent,
  NetworkSyncConfig,
} from '../types/multiplayer'
import { UnitVariantType } from '../types/map'
import { combatEvents } from './combatEvents'
import { getProjectileTheme } from '../utils/projectileEffectRenderer'
import characterManifest from '../assets/generated/characterManifest.json'

function getModelActionFrameCount(model: string = 'male', action: string = 'Run'): number {
  const meta = (characterManifest as any)?.[String(model || 'male').toLowerCase()]
  if (!meta || !meta.actions) {
    return model === 'warrior' ? 24 : 10
  }
  const actions = Object.values(meta.actions) as any[]
  const act =
    actions.find((a: any) => a.id.toLowerCase() === action.toLowerCase()) ||
    actions.find((a: any) => action.toLowerCase() === 'run' && /run|walk|sprint|move/i.test(a.id)) ||
    actions.find((a: any) => action.toLowerCase() === 'idle' && /idle|stand|wait/i.test(a.id)) ||
    actions.find(
      (a: any) =>
        action.toLowerCase() === 'pickup' && /die|death|dead|pickup|hit|collapse/i.test(a.id)
    ) ||
    actions[0]
  return act?.frameCount || (model === 'warrior' ? 24 : 10)
}

/**
 * Single Source of Truth configuration for multiplayer network interpolation
 */
export const networkConfig: NetworkSyncConfig = {
  /** Jitter buffer delay in ms (100ms covers 2.5 snapshot frames at 25Hz) */
  interpolationDelay: 100,
  /** Maximum number of snapshots kept in buffer */
  maxBufferSnapshots: 20,
  /** Maximum forward extrapolation time in ms when network packets stall */
  maxExtrapolationMs: 100,
  /** Spatial distance squared threshold (px^2) to trigger an immediate snap instead of lerp */
  teleportThresholdSq: 10000,
}

export interface InterpolatedUnit {
  id: string
  screenX: number
  screenY: number
  currentCol: number
  currentRow: number
  direction: number
  action: string
  frameIndex: number
  animTimer: number
  currentHp: number
  maxHp: number
  isSpawned: boolean
  isDead: boolean
  hasReachedEnd: boolean
  deathFade: number
  characterModel?: string
  offsetY?: number
  animSpeed?: number
  unitScale?: number
  unitVariant?: UnitVariantType
  variantTint?: number | string
}

export interface ClientVisualProjectile {
  id: string
  towerId: string
  targetUnitId?: string
  startX: number
  startY: number
  currentX: number
  currentY: number
  targetX: number
  targetY: number
  totalDistance: number
  traveledDistance: number
  progress: number
  speed: number
  color: number
  projectileType: string
  isSplash: boolean
  splashRadius: number
  active: boolean
}

export interface ClientExplosionRing {
  id: string
  x: number
  y: number
  radius: number
  maxRadius: number
  color: number
  alpha: number
  active: boolean
}

export interface ClientDamageFloater {
  id: string
  x: number
  y: number
  startY: number
  text: string
  color: number
  alpha: number
  isCrit: boolean
  active: boolean
}

export interface BufferedSnapshot {
  seq: number
  time: number
  receivedAt: number
  units: Map<string, CompactUnitSnapshot>
}

/**
 * High-performance Snapshot Buffer managing timestamp-ordered snapshots,
 * sequence validation (rejecting stale/out-of-order packets), and zero-allocation Map recycling.
 */
export class SnapshotBuffer {
  private snapshots: BufferedSnapshot[] = []
  private lastSeq = 0
  private lastTime = 0
  private mapPool: Map<string, CompactUnitSnapshot>[] = []

  public push(payload: WorldSnapshotPayload, receivedAt: number): boolean {
    if (!payload || !payload.units) return false

    // Drop stale or out-of-order packets
    if (this.lastSeq > 0 && payload.seq <= this.lastSeq && payload.time <= this.lastTime) {
      return false
    }

    this.lastSeq = Math.max(this.lastSeq, payload.seq)
    this.lastTime = Math.max(this.lastTime, payload.time)

    // Reuse or allocate map to prevent garbage collection spikes on mobile
    let map = this.mapPool.pop()
    if (!map) {
      map = new Map<string, CompactUnitSnapshot>()
    } else {
      map.clear()
    }

    for (let i = 0; i < payload.units.length; i++) {
      const u = payload.units[i]
      map.set(u.id, u)
    }

    const snap: BufferedSnapshot = {
      seq: payload.seq,
      time: payload.time,
      receivedAt,
      units: map,
    }

    // Insert in chronological order (typically append at end)
    if (this.snapshots.length === 0 || payload.time >= this.snapshots[this.snapshots.length - 1].time) {
      this.snapshots.push(snap)
    } else {
      let inserted = false
      for (let i = this.snapshots.length - 1; i >= 0; i--) {
        if (payload.time >= this.snapshots[i].time) {
          this.snapshots.splice(i + 1, 0, snap)
          inserted = true
          break
        }
      }
      if (!inserted) {
        this.snapshots.unshift(snap)
      }
    }

    // Trim older snapshots exceeding buffer size
    while (this.snapshots.length > networkConfig.maxBufferSnapshots) {
      const old = this.snapshots.shift()
      if (old) {
        old.units.clear()
        this.mapPool.push(old.units)
      }
    }

    return true
  }

  public pruneOlderThan(cutoffTime: number): void {
    // Preserve at least 2 snapshots so interpolation never starves
    while (this.snapshots.length > 2 && this.snapshots[0].time < cutoffTime) {
      const old = this.snapshots.shift()
      if (old) {
        old.units.clear()
        this.mapPool.push(old.units)
      }
    }
  }

  public getLatestTime(): number {
    if (this.snapshots.length === 0) return 0
    return this.snapshots[this.snapshots.length - 1].time
  }

  public getSnapshotsForRender(renderTime: number): {
    s0: BufferedSnapshot
    s1: BufferedSnapshot
    alpha: number
    isExtrapolating: boolean
  } | null {
    const len = this.snapshots.length
    if (len === 0) return null

    if (len === 1) {
      return {
        s0: this.snapshots[0],
        s1: this.snapshots[0],
        alpha: 1.0,
        isExtrapolating: false,
      }
    }

    // renderTime is older than our earliest snapshot
    if (renderTime <= this.snapshots[0].time) {
      return {
        s0: this.snapshots[0],
        s1: this.snapshots[1],
        alpha: 0.0,
        isExtrapolating: false,
      }
    }

    // Find the two consecutive snapshots that bound renderTime
    for (let i = len - 1; i >= 0; i--) {
      if (this.snapshots[i].time <= renderTime) {
        if (i === len - 1) {
          // renderTime is ahead of newest snapshot -> temporary network starvation/jitter
          const s0 = this.snapshots[len - 2]
          const s1 = this.snapshots[len - 1]
          const dt = Math.max(1, s1.time - s0.time)
          const extraTime = Math.min(networkConfig.maxExtrapolationMs, renderTime - s1.time)
          const alpha = 1.0 + (extraTime / dt) * 0.9 // gentle damping to avoid overshoot
          return { s0, s1, alpha, isExtrapolating: true }
        }

        const s0 = this.snapshots[i]
        const s1 = this.snapshots[i + 1]
        const dt = Math.max(1, s1.time - s0.time)
        const alpha = Math.max(0.0, Math.min(1.0, (renderTime - s0.time) / dt))
        return { s0, s1, alpha, isExtrapolating: false }
      }
    }

    return {
      s0: this.snapshots[0],
      s1: this.snapshots[1],
      alpha: 0.0,
      isExtrapolating: false,
    }
  }

  public clear(): void {
    for (let i = 0; i < this.snapshots.length; i++) {
      this.snapshots[i].units.clear()
      this.mapPool.push(this.snapshots[i].units)
    }
    this.snapshots.length = 0
    this.lastSeq = 0
    this.lastTime = 0
  }
}

class NetworkSyncBuffer {
  // Snapshot buffer with jitter mitigation
  public snapshotBuffer = new SnapshotBuffer()
  private clientRenderTime: number | null = null

  // Public non-reactive interpolated units ready for 60 FPS Pixi rendering
  public renderUnitsMap = new Map<string, InterpolatedUnit>()
  public renderUnitsList: InterpolatedUnit[] = []

  // Client-side visual combat effect pools (zero garbage collection during active play)
  public projectilesPool: ClientVisualProjectile[] = []
  public explosionRingsPool: ClientExplosionRing[] = []
  public damageFloatersPool: ClientDamageFloater[] = []

  // Telemetry metrics
  public packetsReceived = 0
  public packetsSent = 0
  public bytesReceived = 0
  public bytesSent = 0
  public ppsIn = 0
  public ppsOut = 0
  public kbpsIn = 0
  public kbpsOut = 0

  private lastMetricsSampleTime = performance.now()
  private recentPacketsIn = 0
  private recentPacketsOut = 0
  private recentBytesIn = 0
  private recentBytesOut = 0

  constructor() {
    this.initPools()
  }

  private initPools() {
    for (let i = 0; i < 60; i++) {
      this.projectilesPool.push({
        id: `pool-proj-${i}`,
        towerId: '',
        targetUnitId: '',
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
        totalDistance: 1,
        traveledDistance: 0,
        progress: 0,
        speed: 1200,
        color: 0xffaa00,
        projectileType: 'cannonball',
        isSplash: false,
        splashRadius: 1.5,
        active: false,
      })
    }

    for (let i = 0; i < 30; i++) {
      this.explosionRingsPool.push({
        id: `pool-exp-${i}`,
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 30,
        color: 0xff4400,
        alpha: 0,
        active: false,
      })
    }

    for (let i = 0; i < 40; i++) {
      this.damageFloatersPool.push({
        id: `pool-df-${i}`,
        x: 0,
        y: 0,
        startY: 0,
        text: '',
        color: 0xffffff,
        alpha: 0,
        isCrit: false,
        active: false,
      })
    }
  }

  public recordPacketIn(byteLength = 120) {
    this.packetsReceived++
    this.bytesReceived += byteLength
    this.recentPacketsIn++
    this.recentBytesIn += byteLength
    this.updateMetrics()
  }

  public recordPacketOut(byteLength = 120) {
    this.packetsSent++
    this.bytesSent += byteLength
    this.recentPacketsOut++
    this.recentBytesOut += byteLength
    this.updateMetrics()
  }

  private updateMetrics() {
    const now = performance.now()
    const elapsed = now - this.lastMetricsSampleTime
    if (elapsed >= 1000) {
      this.ppsIn = Math.round((this.recentPacketsIn * 1000) / elapsed)
      this.ppsOut = Math.round((this.recentPacketsOut * 1000) / elapsed)
      this.kbpsIn = Math.round(((this.recentBytesIn * 1000) / elapsed / 1024) * 10) / 10
      this.kbpsOut = Math.round(((this.recentBytesOut * 1000) / elapsed / 1024) * 10) / 10

      this.recentPacketsIn = 0
      this.recentPacketsOut = 0
      this.recentBytesIn = 0
      this.recentBytesOut = 0
      this.lastMetricsSampleTime = now
    }
  }

  /**
   * Pushes high-frequency dynamic world snapshot into non-reactive buffer
   */
  public pushSnapshot(payload: WorldSnapshotPayload) {
    if (!payload || !payload.units) return
    const now = performance.now()
    this.snapshotBuffer.push(payload, now)
  }

  /**
   * True 60 FPS smooth interpolation step:
   * Uses historical snapshot buffer with jitter delay (SSOT networkConfig.interpolationDelay)
   * to guarantee continuous, zero-jumping motion on clients.
   */
  public interpolate(deltaSec: number) {
    const latestServerTime = this.snapshotBuffer.getLatestTime()
    if (latestServerTime === 0) return

    const targetRenderTime = latestServerTime - networkConfig.interpolationDelay

    if (this.clientRenderTime === null) {
      this.clientRenderTime = targetRenderTime
    } else {
      // Advance local client render clock by frame delta
      this.clientRenderTime += deltaSec * 1000

      // Smooth clock drift compensation without sudden jumps
      const drift = targetRenderTime - this.clientRenderTime
      if (Math.abs(drift) > 400) {
        // Hard snap after huge stutter or background tab sleep
        this.clientRenderTime = targetRenderTime
      } else if (drift > 20) {
        // Speed up slightly to catch up with host
        this.clientRenderTime += deltaSec * 1000 * 0.08
      } else if (drift < -20) {
        // Slow down slightly to let host stay ahead of jitter window
        this.clientRenderTime -= deltaSec * 1000 * 0.08
      }
    }

    const pair = this.snapshotBuffer.getSnapshotsForRender(this.clientRenderTime)
    if (!pair) return

    const { s0, s1, alpha, isExtrapolating } = pair

    // Prune snapshots older than 500ms before current render time
    this.snapshotBuffer.pruneOlderThan(this.clientRenderTime - 500)

    // Update all units present in current bounding snapshots
    for (const [id, curr] of s1.units.entries()) {
      let renderUnit = this.renderUnitsMap.get(id)
      if (!renderUnit) {
        renderUnit = {
          id: curr.id,
          screenX: curr.x,
          screenY: curr.y,
          currentCol: curr.col,
          currentRow: curr.row,
          direction: curr.d,
          action: curr.a || 'Run',
          frameIndex: curr.f || 0,
          animTimer: 0,
          currentHp: curr.hp,
          maxHp: curr.mhp || curr.hp || 100,
          isSpawned: (curr.fl & 1) !== 0,
          hasReachedEnd: (curr.fl & 2) !== 0,
          isDead: (curr.fl & 4) !== 0,
          deathFade: curr.df ?? 1.0,
          characterModel: curr.m || 'male',
          offsetY: curr.oy || 0,
          animSpeed: curr.as || 1.0,
          unitScale: curr.us || 1.0,
          unitVariant: (curr.uv as any) || 'normal',
          variantTint: curr.vt,
        }
        this.renderUnitsMap.set(id, renderUnit)
        this.renderUnitsList.push(renderUnit)
      } else {
        renderUnit.unitScale = curr.us || renderUnit.unitScale || 1.0
        if (curr.uv) renderUnit.unitVariant = curr.uv as any
        if (curr.vt !== undefined) renderUnit.variantTint = curr.vt
      }

      const prev = s0.units.get(id)

      let targetX = curr.x
      let targetY = curr.y
      let targetCol = curr.col
      let targetRow = curr.row

      if (prev) {
        const dx = curr.x - prev.x
        const dy = curr.y - prev.y
        const distSq = dx * dx + dy * dy

        if (distSq > networkConfig.teleportThresholdSq) {
          // Hard snap on genuine teleport or forced reposition (> 100px)
          targetX = alpha >= 0.5 ? curr.x : prev.x
          targetY = alpha >= 0.5 ? curr.y : prev.y
          targetCol = alpha >= 0.5 ? curr.col : prev.col
          targetRow = alpha >= 0.5 ? curr.row : prev.row
        } else {
          // Continuous smooth lerp
          targetX = prev.x + dx * alpha
          targetY = prev.y + dy * alpha
          targetCol = prev.col + (curr.col - prev.col) * alpha
          targetRow = prev.row + (curr.row - prev.row) * alpha
        }
      }

      if (isExtrapolating) {
        // Gentle velocity follow during network packet freeze
        const followRate = Math.min(1.0, deltaSec * 25)
        renderUnit.screenX += (targetX - renderUnit.screenX) * followRate
        renderUnit.screenY += (targetY - renderUnit.screenY) * followRate
        renderUnit.currentCol += (targetCol - renderUnit.currentCol) * followRate
        renderUnit.currentRow += (targetRow - renderUnit.currentRow) * followRate
      } else {
        renderUnit.screenX = targetX
        renderUnit.screenY = targetY
        renderUnit.currentCol = targetCol
        renderUnit.currentRow = targetRow
      }

      renderUnit.direction = curr.d
      if (curr.m) renderUnit.characterModel = curr.m
      if (curr.oy !== undefined) renderUnit.offsetY = curr.oy
      if (curr.as !== undefined) renderUnit.animSpeed = curr.as
      renderUnit.currentHp = curr.hp
      if (curr.mhp) renderUnit.maxHp = curr.mhp
      renderUnit.isSpawned = (curr.fl & 1) !== 0
      renderUnit.hasReachedEnd = (curr.fl & 2) !== 0
      renderUnit.isDead = (curr.fl & 4) !== 0

      // Action and Animation Frame Cycle at 60 FPS
      if (renderUnit.action !== curr.a) {
        renderUnit.action = curr.a
        renderUnit.frameIndex = curr.f || 0
        renderUnit.animTimer = 0
      } else if (Math.abs(renderUnit.frameIndex - curr.f) > 6) {
        renderUnit.frameIndex = curr.f
      }

      if (renderUnit.isDead) {
        if (curr.df !== undefined) {
          renderUnit.deathFade = curr.df
        } else if (renderUnit.deathFade > 0) {
          renderUnit.deathFade = Math.max(0, renderUnit.deathFade - deltaSec * 0.9)
        }
      } else {
        // Local 60 FPS smooth animation frame progression
        const maxFrames = getModelActionFrameCount(renderUnit.characterModel, renderUnit.action)
        const animMultiplier = Math.max(0.1, renderUnit.animSpeed || 1.0)
        const frameDuration = (maxFrames > 15 ? 0.04 : 0.07) / animMultiplier

        renderUnit.animTimer = (renderUnit.animTimer || 0) + deltaSec
        if (renderUnit.animTimer >= frameDuration) {
          renderUnit.animTimer = 0
          renderUnit.frameIndex = (renderUnit.frameIndex + 1) % maxFrames
        }
      }
    }

    // Clean up units removed from active snapshot
    for (const [id, renderUnit] of this.renderUnitsMap.entries()) {
      if (!s1.units.has(id)) {
        if (renderUnit.isDead && renderUnit.deathFade > 0) {
          renderUnit.deathFade = Math.max(0, renderUnit.deathFade - deltaSec * 1.2)
          if (renderUnit.deathFade <= 0) {
            this.renderUnitsMap.delete(id)
          }
        } else {
          this.renderUnitsMap.delete(id)
        }
      }
    }

    // Keep renderUnitsList synchronized in-place (Zero GC array allocations)
    let writeIdx = 0
    for (let i = 0; i < this.renderUnitsList.length; i++) {
      const u = this.renderUnitsList[i]
      if (this.renderUnitsMap.has(u.id)) {
        if (writeIdx !== i) {
          this.renderUnitsList[writeIdx] = u
        }
        writeIdx++
      }
    }
    this.renderUnitsList.length = writeIdx

    // Animate local combat effects at 60 FPS
    this.updateCombatEffects(deltaSec)
  }

  /**
   * Pushes authoritative combat events to spawn local visual effects
   */
  public pushCombatEvent(event: CompactCombatEvent) {
    if (!event || !event.type) return

    if (event.type === 'TOWER_FIRE') {
      let proj: ClientVisualProjectile | null = null
      for (let i = 0; i < this.projectilesPool.length; i++) {
        if (!this.projectilesPool[i].active) {
          proj = this.projectilesPool[i]
          break
        }
      }
      if (!proj) proj = this.projectilesPool[0]

      if (proj) {
        proj.id = event.id || `proj-${Date.now()}`
        proj.towerId = event.towerId || ''
        proj.targetUnitId = event.unitId || ''
        proj.startX = event.startX || 0
        proj.startY = event.startY || 0
        proj.currentX = event.startX || 0
        proj.currentY = event.startY || 0
        proj.targetX = event.targetX || 0
        proj.targetY = event.targetY || 0

        // If target unit exists in interpolated render map, lock onto its current position
        if (proj.targetUnitId) {
          const u = this.renderUnitsMap.get(proj.targetUnitId)
          if (u && !u.isDead) {
            proj.targetX = u.screenX
            proj.targetY = u.screenY - 32 - (u.offsetY || 0)
          }
        }

        proj.totalDistance = Math.hypot(proj.targetX - proj.startX, proj.targetY - proj.startY) || 1
        proj.traveledDistance = 0
        proj.progress = 0
        // Speed in px/s: event.speed if already in px/s (>50), or convert from tile/s
        proj.speed = event.speed && event.speed > 50 ? event.speed : (event.speed || 10) * 128 * 1.5
        proj.color = event.color || 0xf97316
        proj.projectileType = event.projType || 'cannonball'
        proj.isSplash = Boolean(event.isSplash)
        proj.splashRadius = event.splashRadius || 1.5
        proj.active = true
      }
    } else if (event.type === 'COMBAT_HIT') {
      const hitX = event.currentX || event.targetX || 0
      const hitY = event.currentY || event.targetY || 0

      // Spawn shockwave ring for all hits (AoE wide, or single-target crisp ripple)
      const hasNearbyRing = this.explosionRingsPool.some(
        r => r.active && Math.hypot(r.x - hitX, r.y - hitY) < 20
      )
      if (!hasNearbyRing) {
        let ring: ClientExplosionRing | null = null
        for (let i = 0; i < this.explosionRingsPool.length; i++) {
          if (!this.explosionRingsPool[i].active) {
            ring = this.explosionRingsPool[i]
            break
          }
        }
        if (!ring) ring = this.explosionRingsPool[0]

        if (ring) {
          const theme = getProjectileTheme(event.projType || 'fireball')
          const isArrow = event.projType === 'arrow'
          const isSplash = Boolean(event.isSplash)
          ring.id = `ring-${Date.now()}`
          ring.x = hitX
          ring.y = hitY
          ring.radius = 3
          ring.maxRadius = isSplash ? (event.splashRadius || 1.5) * 128 * 0.65 : (isArrow ? 14 : 18)
          ring.color = theme.shockwaveColorHex
          ring.alpha = 0.95
          ring.active = true
        }
      }

      // If hit has damage floater
      if (event.damage !== undefined && event.damage > 0) {
        let df: ClientDamageFloater | null = null
        for (let i = 0; i < this.damageFloatersPool.length; i++) {
          if (!this.damageFloatersPool[i].active) {
            df = this.damageFloatersPool[i]
            break
          }
        }
        if (!df) df = this.damageFloatersPool[0]

        if (df) {
          let floaterX = hitX + (Math.random() * 20 - 10)
          let floaterY = hitY - 36
          if (event.unitId) {
            const u = this.renderUnitsMap.get(event.unitId)
            if (u) {
              floaterX = u.screenX + (Math.random() * 20 - 10)
              floaterY = u.screenY - 36 - (u.offsetY || 0)
            }
          }
          df.id = `df-${Date.now()}-${Math.random()}`
          df.x = floaterX
          df.y = floaterY
          df.startY = floaterY
          df.text = `-${event.damage}`
          df.color = event.isCrit ? 0xef4444 : 0xfbbf24
          df.alpha = 1.0
          df.isCrit = Boolean(event.isCrit)
          df.active = true
        }
      }
    } else if (event.type === 'UNIT_DIED') {
      const hitX = event.targetX || 0
      const hitY = event.targetY || 0
      const goldReward = event.goldReward || 0
      if (goldReward > 0) {
        let df: ClientDamageFloater | null = null
        for (let i = 0; i < this.damageFloatersPool.length; i++) {
          if (!this.damageFloatersPool[i].active) {
            df = this.damageFloatersPool[i]
            break
          }
        }
        if (!df) df = this.damageFloatersPool[0]

        if (df) {
          df.id = `gold-${Date.now()}-${Math.random()}`
          df.x = hitX + (Math.random() * 12 - 6)
          df.y = hitY - 24
          df.startY = df.y
          df.text = `+${goldReward} G`
          df.color = 0xfacc15
          df.alpha = 1.0
          df.isCrit = true
          df.active = true
        }
      }
    }
  }

  /**
   * Emits spark particles and splash explosion ring right at the exact impact position
   */
  private triggerLocalImpact(proj: ClientVisualProjectile) {
    const theme = getProjectileTheme(proj.projectileType, proj.color)
    const isArrow = proj.projectileType === 'arrow'
    const isSplash = Boolean(proj.isSplash && proj.splashRadius > 0)
    const sparkCount = isArrow ? 8 : (isSplash ? 16 : 10)

    combatEvents.emitImpact({
      x: proj.currentX,
      y: proj.currentY,
      color: theme.sparkColorHex,
      count: sparkCount,
      projectileType: proj.projectileType,
    })

    // Spawn Impact Shockwave Ring for ALL hits (matching TowerLivePreview!)
    let ring: ClientExplosionRing | null = null
    for (let i = 0; i < this.explosionRingsPool.length; i++) {
      if (!this.explosionRingsPool[i].active) {
        ring = this.explosionRingsPool[i]
        break
      }
    }
    if (!ring) ring = this.explosionRingsPool[0]

    if (ring) {
      ring.id = `ring-${Date.now()}-${Math.random()}`
      ring.x = proj.currentX
      ring.y = proj.currentY
      ring.radius = 3
      ring.maxRadius = isSplash
        ? (proj.splashRadius || 1.5) * 128 * 0.65
        : (isArrow ? 14 : 18)
      ring.color = theme.shockwaveColorHex
      ring.alpha = 0.95
      ring.active = true
    }
  }

  /**
   * Updates local visual projectile, explosion, and damage floater animations at 60 FPS
   */
  private updateCombatEffects(deltaSec: number) {
    // 1. Update Projectiles with dynamic homing tracking
    for (let i = 0; i < this.projectilesPool.length; i++) {
      const proj = this.projectilesPool[i]
      if (!proj.active) continue

      // Dynamically track unit position in real-time
      if (proj.targetUnitId) {
        const targetUnit = this.renderUnitsMap.get(proj.targetUnitId)
        if (targetUnit && !targetUnit.isDead) {
          proj.targetX = targetUnit.screenX
          proj.targetY = targetUnit.screenY - 32 - (targetUnit.offsetY || 0)
        }
      }

      const dx = proj.targetX - proj.currentX
      const dy = proj.targetY - proj.currentY
      const distToTarget = Math.hypot(dx, dy)
      const moveStep = proj.speed * deltaSec

      if (distToTarget <= moveStep || distToTarget < 14) {
        proj.currentX = proj.targetX
        proj.currentY = proj.targetY
        proj.active = false
        this.triggerLocalImpact(proj)
      } else {
        const dirX = dx / distToTarget
        const dirY = dy / distToTarget
        proj.currentX += dirX * moveStep
        proj.currentY += dirY * moveStep
        proj.traveledDistance = (proj.traveledDistance || 0) + moveStep
        proj.progress = Math.min(1.0, proj.traveledDistance / Math.max(1, proj.totalDistance))
      }
    }

    // 2. Update Explosion Rings
    for (let i = 0; i < this.explosionRingsPool.length; i++) {
      const ring = this.explosionRingsPool[i]
      if (!ring.active) continue

      ring.radius += (ring.maxRadius - ring.radius) * Math.min(1.0, deltaSec * 14)
      ring.alpha = Math.max(0, ring.alpha - deltaSec * 3.5)

      if (ring.alpha <= 0.02 || ring.radius >= ring.maxRadius * 0.96) {
        ring.active = false
      }
    }

    // 3. Update Damage Floaters
    for (let i = 0; i < this.damageFloatersPool.length; i++) {
      const df = this.damageFloatersPool[i]
      if (!df.active) continue

      df.y -= deltaSec * 36
      df.alpha = Math.max(0, df.alpha - deltaSec * 1.8)

      if (df.alpha <= 0.02) {
        df.active = false
      }
    }
  }

  public clear() {
    this.clientRenderTime = null
    this.snapshotBuffer.clear()
    this.renderUnitsMap.clear()
    this.renderUnitsList.length = 0
    for (let i = 0; i < this.projectilesPool.length; i++) this.projectilesPool[i].active = false
    for (let i = 0; i < this.explosionRingsPool.length; i++) this.explosionRingsPool[i].active = false
    for (let i = 0; i < this.damageFloatersPool.length; i++) this.damageFloatersPool[i].active = false
  }
}

export const networkSyncBuffer = new NetworkSyncBuffer()
