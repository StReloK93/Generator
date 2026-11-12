import { GridCoord } from '../../types/map'
import { HideSeekMinimapView } from '../types'

const FLOOR_COLOR = 'rgba(180, 140, 90, 0.38)'
const WALL_COLOR = 'rgba(231, 214, 186, 0.85)'
/** Altars: lit ones burn bright, the others are a dim ring */
const ALTAR_LIT_COLOR = '#fbbf24'
const ALTAR_COLOR = 'rgba(251, 191, 36, 0.6)'
const TRAP_COLOR = '#f97316'
const MATE_COLOR = '#38bdf8'
const EXIT_COLOR = '#4ade80'
const JAILED_COLOR = '#94a3b8'
const ME_COLOR = '#ffffff'
// Faint marks: the bases are told apart by their floor in the game, the minimap only hints where they are
const BASE_FILL = 'rgba(239, 68, 68, 0.12)'
const BASE_EDGE = 'rgba(248, 113, 113, 0.35)'
const HOME_FILL = 'rgba(34, 197, 94, 0.12)'
const HOME_EDGE = 'rgba(74, 222, 128, 0.35)'

/**
 * Hide & seek minimap on a 2D canvas: the isometric maze as far as the player has explored it,
 * the altars (lit or not), their bells, teammates and themselves.
 */
export class HideSeekMinimapRenderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  /** The diamond the map is drawn in: scale and origin for the canvas size */
  private static layout(width: number, height: number, cols: number, rows: number) {
    const s = Math.min(width / (cols + rows), (2 * height) / (cols + rows))
    return { s, ox: width / 2 + ((rows - cols) * s) / 2, oy: (height - ((cols + rows) * s) / 2) / 2 }
  }

  /** The map cell under a point of the canvas (canvas pixels), or null off the map. */
  public cellAt(x: number, y: number, cols: number, rows: number): GridCoord | null {
    const { s, ox, oy } = HideSeekMinimapRenderer.layout(this.canvas.width, this.canvas.height, cols, rows)
    const diff = (x - ox) / s
    const sum = (2 * (y - oy)) / s
    const col = (sum + diff) / 2
    const row = (sum - diff) / 2
    return col < 0 || row < 0 || col > cols || row > rows ? null : { col, row }
  }

  public draw(view: HideSeekMinimapView): void {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = this.canvas
    ctx.clearRect(0, 0, width, height)

    // Isometric diamond fitted to the canvas: x = (col - row) * s, y = (col + row) * s / 2
    const { s, ox, oy } = HideSeekMinimapRenderer.layout(width, height, view.cols, view.rows)
    const at = (p: GridCoord) => ({ x: ox + (p.col - p.row) * s, y: oy + ((p.col + p.row) * s) / 2 })

    // Explored floor
    ctx.fillStyle = FLOOR_COLOR
    for (let row = 0; row < view.rows; row++) {
      for (let col = 0; col < view.cols; col++) {
        if (!view.explored[row * view.cols + col]) continue
        const c = at({ col, row })
        ctx.beginPath()
        ctx.moveTo(c.x, c.y - s / 2)
        ctx.lineTo(c.x + s, c.y)
        ctx.lineTo(c.x, c.y + s / 2)
        ctx.lineTo(c.x - s, c.y)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Both bases: everyone knows where they are
    const yard = (b: NonNullable<HideSeekMinimapView['seekerBase']>, fill: string, edge: string) => {
      const corners = [
        at({ col: b.col - 0.5, row: b.row - 0.5 }),
        at({ col: b.col + b.cols - 0.5, row: b.row - 0.5 }),
        at({ col: b.col + b.cols - 0.5, row: b.row + b.rows - 0.5 }),
        at({ col: b.col - 0.5, row: b.row + b.rows - 0.5 }),
      ]
      ctx.beginPath()
      corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)))
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
      ctx.strokeStyle = edge
      ctx.lineWidth = 1
      ctx.stroke()
    }
    if (view.seekerBase) yard(view.seekerBase, BASE_FILL, BASE_EDGE)
    if (view.hiderBase) yard(view.hiderBase, HOME_FILL, HOME_EDGE)

    // Walls next to explored cells
    ctx.fillStyle = WALL_COLOR
    const subCols = view.cols * 2
    for (let i = 0; i < view.walls.length; i++) {
      if (!view.walls[i]) continue
      const p = { col: (i % subCols) / 2, row: Math.floor(i / subCols) / 2 }
      const col = Math.min(view.cols - 1, Math.max(0, Math.round(p.col)))
      const row = Math.min(view.rows - 1, Math.max(0, Math.round(p.row)))
      if (!view.explored[row * view.cols + col]) continue
      const c = at(p)
      ctx.fillRect(c.x - s * 0.35, c.y - s * 0.2, s * 0.7, s * 0.4)
    }

    const dot = (p: GridCoord, radius: number, color: string, ring = false) => {
      const c = at(p)
      ctx.beginPath()
      ctx.arc(c.x, c.y, radius, 0, Math.PI * 2)
      if (ring) {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        ctx.fillStyle = color
        ctx.fill()
      }
    }
    for (const altar of view.altars) dot(altar, Math.max(2.5, s * 0.6), altar.lit ? ALTAR_LIT_COLOR : ALTAR_COLOR, !altar.lit)
    for (const trap of view.traps) dot(trap, Math.max(2, s * 0.4), TRAP_COLOR, true)
    for (const exit of view.exits) dot(exit, Math.max(3, s * 0.7), EXIT_COLOR)
    for (const mate of view.mates) dot(mate, Math.max(2, s * 0.45), mate.jailed ? JAILED_COLOR : MATE_COLOR)
    if (view.me) {
      dot(view.me, Math.max(3, s * 0.6), ME_COLOR)
      dot(view.me, Math.max(5, s * 1.1), ME_COLOR, true)
    }
  }
}
