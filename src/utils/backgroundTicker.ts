/**
 * Calls `onTick(deltaSec)` every `intervalMs` from a Web Worker timer.
 * Unlike requestAnimationFrame, worker timers keep running while the tab is hidden.
 * Returns a stop function.
 */
export function startBackgroundTicker(intervalMs: number, onTick: (deltaSec: number) => void): () => void {
  const url = URL.createObjectURL(
    new Blob([`setInterval(() => postMessage(0), ${intervalMs})`], { type: 'text/javascript' })
  )
  const worker = new Worker(url)
  let last = performance.now()

  worker.onmessage = () => {
    const now = performance.now()
    // Clamp so a throttled/suspended tab does not jump the simulation forward in one huge step
    onTick(Math.min(0.25, (now - last) / 1000))
    last = now
  }

  return () => {
    worker.terminate()
    URL.revokeObjectURL(url)
  }
}
