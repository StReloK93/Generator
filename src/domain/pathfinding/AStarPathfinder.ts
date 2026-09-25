import { GridCoord } from '../../types/map'

interface AStarNode {
  col: number
  row: number
  g: number
  h: number
  f: number
  parent: AStarNode | null
}

export class AStarPathfinder {
  /**
   * Finds the shortest walkable path on an isometric grid with 2x2 subgrid (0.5 tile precision) using A* algorithm.
   */
  public static findPath(
    start: GridCoord,
    target: GridCoord,
    cols: number,
    rows: number,
    isWalkable?: (subCol: number, subRow: number) => boolean
  ): GridCoord[] {
    const maxSubCols = cols * 2
    const maxSubRows = rows * 2

    const startSubCol = Math.max(0, Math.min(maxSubCols - 1, Math.round(start.col * 2)))
    const startSubRow = Math.max(0, Math.min(maxSubRows - 1, Math.round(start.row * 2)))
    let targetSubCol = Math.max(0, Math.min(maxSubCols - 1, Math.round(target.col * 2)))
    let targetSubRow = Math.max(0, Math.min(maxSubRows - 1, Math.round(target.row * 2)))

    // If target itself is blocked, find closest neighboring walkable subcell
    if (isWalkable && !isWalkable(targetSubCol, targetSubRow)) {
      let closestDist = Infinity
      let bestAdj: { sc: number; sr: number } | null = null
      const checkRadius = 4
      for (let dc = -checkRadius; dc <= checkRadius; dc++) {
        for (let dr = -checkRadius; dr <= checkRadius; dr++) {
          const nc = targetSubCol + dc
          const nr = targetSubRow + dr
          if (nc >= 0 && nc < maxSubCols && nr >= 0 && nr < maxSubRows && isWalkable(nc, nr)) {
            const d = Math.hypot(dc, dr)
            if (d < closestDist) {
              closestDist = d
              bestAdj = { sc: nc, sr: nr }
            }
          }
        }
      }
      if (bestAdj) {
        targetSubCol = bestAdj.sc
        targetSubRow = bestAdj.sr
      }
    }

    if (startSubCol === targetSubCol && startSubRow === targetSubRow) {
      return [{ col: targetSubCol * 0.5, row: targetSubRow * 0.5 }]
    }

    const openList: AStarNode[] = []
    const closedSet = new Set<string>()
    const nodeMap = new Map<string, AStarNode>()

    const startNode: AStarNode = {
      col: startSubCol,
      row: startSubRow,
      g: 0,
      h: this.heuristic(startSubCol, startSubRow, targetSubCol, targetSubRow),
      f: 0,
      parent: null,
    }
    startNode.f = startNode.g + startNode.h
    openList.push(startNode)
    nodeMap.set(`${startSubCol},${startSubRow}`, startNode)

    // 8-directional isometric movement (orthogonal + diagonal)
    const neighbors = [
      { dc: 1, dr: 0, cost: 1.0 },
      { dc: -1, dr: 0, cost: 1.0 },
      { dc: 0, dr: 1, cost: 1.0 },
      { dc: 0, dr: -1, cost: 1.0 },
      { dc: 1, dr: 1, cost: 1.414 },
      { dc: 1, dr: -1, cost: 1.414 },
      { dc: -1, dr: 1, cost: 1.414 },
      { dc: -1, dr: -1, cost: 1.414 },
    ]

    let iterations = 0
    const maxIterations = maxSubCols * maxSubRows * 6

    while (openList.length > 0 && iterations++ < maxIterations) {
      let lowestIndex = 0
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIndex].f) {
          lowestIndex = i
        }
      }

      const current = openList[lowestIndex]
      const currentKey = `${current.col},${current.row}`

      // Target reached
      if (current.col === targetSubCol && current.row === targetSubRow) {
        return this.reconstructSubgridPath(current)
      }

      openList.splice(lowestIndex, 1)
      closedSet.add(currentKey)

      for (const offset of neighbors) {
        const nc = current.col + offset.dc
        const nr = current.row + offset.dr

        if (nc < 0 || nc >= maxSubCols || nr < 0 || nr >= maxSubRows) continue

        const nKey = `${nc},${nr}`
        if (closedSet.has(nKey)) continue

        if (isWalkable && !isWalkable(nc, nr)) continue

        // Prevent cutting across diagonal corners if both adjacent orthogonal subcells are blocked
        if (offset.dc !== 0 && offset.dr !== 0 && isWalkable) {
          const blockA = !isWalkable(current.col + offset.dc, current.row)
          const blockB = !isWalkable(current.col, current.row + offset.dr)
          if (blockA && blockB) continue
        }

        const tentativeG = current.g + offset.cost
        let neighbor = nodeMap.get(nKey)

        if (!neighbor) {
          neighbor = {
            col: nc,
            row: nr,
            g: tentativeG,
            h: this.heuristic(nc, nr, targetSubCol, targetSubRow),
            f: 0,
            parent: current,
          }
          neighbor.f = neighbor.g + neighbor.h
          nodeMap.set(nKey, neighbor)
          openList.push(neighbor)
        } else if (tentativeG < neighbor.g) {
          neighbor.parent = current
          neighbor.g = tentativeG
          neighbor.f = neighbor.g + neighbor.h
        }
      }
    }

    // Direct fallback
    return [
      { col: startSubCol * 0.5, row: startSubRow * 0.5 },
      { col: targetSubCol * 0.5, row: targetSubRow * 0.5 },
    ]
  }

  private static heuristic(c1: number, r1: number, c2: number, r2: number): number {
    const dc = Math.abs(c1 - c2)
    const dr = Math.abs(r1 - r2)
    return (dc + dr) + (1.414 - 2) * Math.min(dc, dr)
  }

  private static reconstructSubgridPath(endNode: AStarNode): GridCoord[] {
    const path: GridCoord[] = []
    let curr: AStarNode | null = endNode
    while (curr) {
      path.push({ col: curr.col * 0.5, row: curr.row * 0.5 })
      curr = curr.parent
    }
    path.reverse()
    return path
  }
}
