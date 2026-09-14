export interface ImpactSparkEvent {
  x: number
  y: number
  projectileType?: string
  isSplash?: boolean
  color?: number
  count?: number
}

export interface FloatingTextEvent {
  x: number
  y: number
  text: string
  color: number
  isCrit?: boolean
}

export type CombatEventListener<T> = (data: T) => void

class CombatEventBus {
  private impactListeners = new Set<CombatEventListener<ImpactSparkEvent>>()
  private textListeners = new Set<CombatEventListener<FloatingTextEvent>>()

  public onImpact(listener: CombatEventListener<ImpactSparkEvent>): () => void {
    this.impactListeners.add(listener)
    return () => this.impactListeners.delete(listener)
  }

  public emitImpact(event: ImpactSparkEvent): void {
    for (const listener of this.impactListeners) {
      listener(event)
    }
  }

  public onFloatingText(listener: CombatEventListener<FloatingTextEvent>): () => void {
    this.textListeners.add(listener)
    return () => this.textListeners.delete(listener)
  }

  public emitFloatingText(event: FloatingTextEvent): void {
    for (const listener of this.textListeners) {
      listener(event)
    }
  }

  public clearAll(): void {
    this.impactListeners.clear()
    this.textListeners.clear()
  }
}

export const combatEvents = new CombatEventBus()
