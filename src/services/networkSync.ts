import { CompactUnitSnapshot, WorldSnapshotPayload, CompactCombatEvent } from '../types/multiplayer'

export interface InterpolatedUnit {
  id: string
  screenX: number
  screenY: number
  currentCol: number
  currentRow: number
  direction: number
  action: string
  frameIndex: number
  currentHp: number
  maxHp: number
  isSpawned: boolean
  isDead: boolean
  hasReachedEnd: boolean
  deathFade: number
}

export interface ClientVisualProjectile {
  id: string
  towerId: string
  startX: number
  startY: number
  currentX: number
  currentY: number
  targetX: number
  targetY: number
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

class NetworkSyncBuffer {
  // Snapshot ring buffer
  private previousSnapshot: Map<string, CompactUnitSnapshot> | null = null
  private previousTime = 0
  private currentSnapshot: Map<string, CompactUnitSnapshot> | null = null
  private currentTime = 0

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
    for (let i = 0; i < 40; i++) {
      this.projectilesPool.push({
        id: `pool-proj-${i}`,
        towerId: '',
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
        progress: 0,
        speed: 10,
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
    this.previousSnapshot = this.currentSnapshot
    this.previousTime = this.currentTime || (now - 40)

    const nextMap = new Map<string, CompactUnitSnapshot>()
    for (let i = 0; i < payload.units.length; i++) {
      const u = payload.units[i]
      nextMap.set(u.id, u)
    }

    this.currentSnapshot = nextMap
    this.currentTime = now
  }

  /**
   * True 60 FPS interpolation step: lerps positions between previous & current snapshots
   */
  public interpolate(deltaSec: number) {
    if (!this.currentSnapshot || this.currentSnapshot.size === 0) {
      return
    }

    const now = performance.now()
    const snapshotInterval = Math.max(15, this.currentTime - this.previousTime)

    const currentIds = new Set<string>()

    for (const [id, curr] of this.currentSnapshot.entries()) {
      currentIds.add(id)

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
          currentHp: curr.hp,
          maxHp: curr.mhp || curr.hp || 100,
          isSpawned: (curr.fl & 1) !== 0,
          hasReachedEnd: (curr.fl & 2) !== 0,
          isDead: (curr.fl & 4) !== 0,
          deathFade: curr.df ?? 1.0,
        }
        this.renderUnitsMap.set(id, renderUnit)
      }

      const prev = this.previousSnapshot ? this.previousSnapshot.get(id) : null

      if (prev && !renderUnit.isDead) {
        // True lerp between network snapshots
        const blend = Math.min(1.0, Math.max(0.0, (now - this.previousTime) / snapshotInterval))
        renderUnit.screenX = prev.x + (curr.x - prev.x) * blend
        renderUnit.screenY = prev.y + (curr.y - prev.y) * blend
        renderUnit.currentCol = prev.col + (curr.col - prev.col) * blend
        renderUnit.currentRow = prev.row + (curr.row - prev.row) * blend
      } else {
        renderUnit.screenX += (curr.x - renderUnit.screenX) * Math.min(1.0, deltaSec * 25)
        renderUnit.screenY += (curr.y - renderUnit.screenY) * Math.min(1.0, deltaSec * 25)
        renderUnit.currentCol = curr.col
        renderUnit.currentRow = curr.row
      }

      renderUnit.direction = curr.d
      renderUnit.action = curr.a
      renderUnit.frameIndex = curr.f
      renderUnit.currentHp = curr.hp
      if (curr.mhp) renderUnit.maxHp = curr.mhp
      renderUnit.isSpawned = (curr.fl & 1) !== 0
      renderUnit.hasReachedEnd = (curr.fl & 2) !== 0
      renderUnit.isDead = (curr.fl & 4) !== 0
      if (curr.df !== undefined) renderUnit.deathFade = curr.df
    }

    // Clean up units that are removed from snapshot
    for (const id of this.renderUnitsMap.keys()) {
      if (!currentIds.has(id)) {
        this.renderUnitsMap.delete(id)
      }
    }

    // Keep renderUnitsList synchronized
    this.renderUnitsList = Array.from(this.renderUnitsMap.values())

    // 2. Animate local combat effects at 60 FPS
    this.updateCombatEffects(deltaSec)
  }

  /**
   * Pushes authoritative combat events to spawn local visual effects
   */
  public pushCombatEvent(event: CompactCombatEvent) {
    if (!event || !event.type) return

    if (event.type === 'TOWER_FIRE') {
      // Spawn local projectile from pool
      const proj = this.projectilesPool.find(p => !p.active) || this.projectilesPool[0]
      if (proj) {
        proj.id = event.id || `proj-${Date.now()}`
        proj.towerId = event.towerId || ''
        proj.startX = event.startX || 0
        proj.startY = event.startY || 0
        proj.currentX = event.startX || 0
        proj.currentY = event.startY || 0
        proj.targetX = event.targetX || 0
        proj.targetY = event.targetY || 0
        proj.progress = 0
        proj.speed = event.speed || 12.0
        proj.color = event.color || 0xf97316
        proj.projectileType = event.projType || 'cannonball'
        proj.isSplash = Boolean(event.isSplash)
        proj.splashRadius = event.splashRadius || 1.5
        proj.active = true
      }
    } else if (event.type === 'COMBAT_HIT') {
      const hitX = event.currentX || event.targetX || 0
      const hitY = event.currentY || event.targetY || 0

      // Spawn damage floater from pool
      if (event.damage !== undefined && event.damage > 0) {
        const df = this.damageFloatersPool.find(f => !f.active) || this.damageFloatersPool[0]
        if (df) {
          df.id = `df-${Date.now()}-${Math.random()}`
          df.x = hitX + (Math.random() * 12 - 6)
          df.y = hitY - 14
          df.startY = df.y
          df.text = `-${Math.round(event.damage)}`
          df.color = event.isCrit ? 0xf59e0b : 0xffffff
          df.alpha = 1.0
          df.isCrit = Boolean(event.isCrit)
          df.active = true
        }
      }

      // Spawn explosion ring from pool if splash or heavy hit
      if (event.isSplash || event.projType === 'cannonball' || event.projType === 'fireball') {
        const ring = this.explosionRingsPool.find(r => !r.active) || this.explosionRingsPool[0]
        if (ring) {
          ring.id = `ring-${Date.now()}`
          ring.x = hitX
          ring.y = hitY
          ring.radius = 4
          ring.maxRadius = (event.splashRadius || 1.5) * 36
          ring.color = event.projType === 'fireball' ? 0xef4444 : (event.projType === 'magic_bolt' ? 0x38bdf8 : 0xf59e0b)
          ring.alpha = 0.95
          ring.active = true
        }
      }
    }
  }

  /**
   * Updates local visual projectile, explosion, and damage floater animations at 60 FPS
   */
  private updateCombatEffects(deltaSec: number) {
    // 1. Update Projectiles
    for (let i = 0; i < this.projectilesPool.length; i++) {
      const proj = this.projectilesPool[i]
      if (!proj.active) continue

      const dx = proj.targetX - proj.startX
      const dy = proj.targetY - proj.startY
      const dist = Math.hypot(dx, dy) || 1

      proj.progress += (proj.speed * 40 * deltaSec) / dist
      if (proj.progress >= 1.0) {
        proj.progress = 1.0
        proj.currentX = proj.targetX
        proj.currentY = proj.targetY
        proj.active = false
      } else {
        proj.currentX = proj.startX + dx * proj.progress
        proj.currentY = proj.startY + dy * proj.progress
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
    this.previousSnapshot = null
    this.currentSnapshot = null
    this.renderUnitsMap.clear()
    this.renderUnitsList = []
    for (const p of this.projectilesPool) p.active = false
    for (const r of this.explosionRingsPool) r.active = false
    for (const df of this.damageFloatersPool) df.active = false
  }
}

export const networkSyncBuffer = new NetworkSyncBuffer()
