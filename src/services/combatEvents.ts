export interface ImpactSparkEvent {
  x: number
  y: number
  projectileType: string
}

export interface StrikeVisualEvent {
  x: number
  y: number
  startX?: number
  startY?: number
  projectileType: string
  /** The unit it hit, so the strike moves along with it */
  targetUnitId?: string
}

export interface FloatingTextEvent {
  x: number
  y: number
  text: string
  color: number
  isCrit?: boolean
}

/** Expanding ground ring of a splash hit; maxRadius matches the real splash damage area. */
export interface ShockwaveEvent {
  x: number
  y: number
  maxRadius: number
  color: number
}

export type CombatEventListener<T> = (data: T) => void

/**
 * Visual-only events. Dropped while the tab is hidden: nothing renders them then, and a hidden
 * multiplayer host keeps simulating, so queued effects would pile up and burst on return.
 */
function isTabHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden
}

class CombatEventBus {
  private impactListeners = new Set<CombatEventListener<ImpactSparkEvent>>()
  private strikeListeners = new Set<CombatEventListener<StrikeVisualEvent>>()
  private textListeners = new Set<CombatEventListener<FloatingTextEvent>>()
  private shockwaveListeners = new Set<CombatEventListener<ShockwaveEvent>>()

  public onImpact(listener: CombatEventListener<ImpactSparkEvent>): () => void {
    this.impactListeners.add(listener)
    return () => this.impactListeners.delete(listener)
  }

  public emitImpact(event: ImpactSparkEvent): void {
    if (isTabHidden()) return
    for (const listener of this.impactListeners) {
      listener(event)
    }
  }

  public onStrike(listener: CombatEventListener<StrikeVisualEvent>): () => void {
    this.strikeListeners.add(listener)
    return () => this.strikeListeners.delete(listener)
  }

  public emitStrike(event: StrikeVisualEvent): void {
    if (isTabHidden()) return
    for (const listener of this.strikeListeners) {
      listener(event)
    }
  }

  public onShockwave(listener: CombatEventListener<ShockwaveEvent>): () => void {
    this.shockwaveListeners.add(listener)
    return () => this.shockwaveListeners.delete(listener)
  }

  public emitShockwave(event: ShockwaveEvent): void {
    if (isTabHidden()) return
    for (const listener of this.shockwaveListeners) {
      listener(event)
    }
  }

  public onFloatingText(listener: CombatEventListener<FloatingTextEvent>): () => void {
    this.textListeners.add(listener)
    return () => this.textListeners.delete(listener)
  }

  public emitFloatingText(event: FloatingTextEvent): void {
    if (isTabHidden()) return
    for (const listener of this.textListeners) {
      listener(event)
    }
  }

  public clearAll(): void {
    this.impactListeners.clear()
    this.textListeners.clear()
    this.shockwaveListeners.clear()
  }
}

export const combatEvents = new CombatEventBus()
