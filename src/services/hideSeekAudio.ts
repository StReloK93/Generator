/**
 * Synthesized hide & seek sounds (Web Audio, no audio files): footsteps and the chest-opening chime.
 * Browsers only start audio after a user gesture, so input handlers call unlock().
 */
class HideSeekAudio {
  private ctx: AudioContext | null = null
  private noise: AudioBuffer | null = null

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof AudioContext === 'undefined') return null
    this.ctx = new AudioContext()
    const length = Math.floor(this.ctx.sampleRate * 0.15)
    this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
    }
    return this.ctx
  }

  public unlock(): void {
    const ctx = this.getContext()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  }

  /** Stereo output for one sound; null while audio is locked or the sound is inaudible. */
  private output(volume: number, pan: number): { ctx: AudioContext; out: StereoPannerNode } | null {
    const ctx = this.getContext()
    if (!ctx || ctx.state !== 'running' || volume <= 0.01) return null
    const out = ctx.createStereoPanner()
    out.pan.value = Math.max(-1, Math.min(1, pan))
    out.connect(ctx.destination)
    return { ctx, out }
  }

  /** A short filtered noise scuff plus a low thump. volume 0..1, pan -1 (left) .. 1 (right) */
  public playFootstep(volume: number, pan: number): void {
    const o = this.output(volume, pan)
    if (!o || !this.noise) return
    const { ctx, out } = o
    const t = ctx.currentTime

    const scuff = ctx.createBufferSource()
    scuff.buffer = this.noise
    scuff.playbackRate.value = 0.75 + Math.random() * 0.4
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 700 + Math.random() * 400
    const scuffGain = ctx.createGain()
    scuffGain.gain.setValueAtTime(volume * 0.9, t)
    scuffGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    scuff.connect(filter).connect(scuffGain).connect(out)
    scuff.start(t)
    scuff.stop(t + 0.15)

    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(110, t)
    thump.frequency.exponentialRampToValueAtTime(45, t + 0.08)
    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(volume * 0.6, t)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
    thump.connect(thumpGain).connect(out)
    thump.start(t)
    thump.stop(t + 0.1)
  }

  /** Three rising bell notes: a chest was opened somewhere. */
  public playChime(volume: number, pan: number): void {
    const o = this.output(volume, pan)
    if (!o) return
    const { ctx, out } = o
    const notes = [880, 1108.7, 1318.5]
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.09
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(volume * 0.45, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      osc.connect(gain).connect(out)
      osc.start(t)
      osc.stop(t + 0.65)
    })
  }
}

export const hideSeekAudio = new HideSeekAudio()
