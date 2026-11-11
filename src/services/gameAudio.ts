/**
 * Synthesized game sounds (Web Audio, no audio files).
 * Hide & seek: footsteps, chest chime, heartbeat, bell, jail, doors, candles, the hunting horn,
 * and short tunes that mark the round's start, the start of the hunt and the round's end.
 * Tower defense: hits, explosions, kills, lost lives, building / upgrading / selling towers
 * (waves and the result reuse the horn and the round-end tunes).
 * Browsers only start audio after a user gesture, so input handlers call unlock().
 */
class GameAudio {
  private ctx: AudioContext | null = null
  private noise: AudioBuffer | null = null
  /** The player turned game sounds off (settings) */
  private muted = false

  public setMuted(muted: boolean): void {
    this.muted = muted
  }

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

  /** A tune must not get lost: wait for the (already unlocked) context to resume first. */
  private async play(sound: (ctx: AudioContext, out: AudioNode, t: number) => void): Promise<void> {
    const ctx = this.muted ? null : this.getContext()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') return
    sound(ctx, ctx.destination, ctx.currentTime + 0.05)
  }

  /** Soft plucked notes [frequency, start offset, length] (the tunes). */
  private melody(ctx: AudioContext, out: AudioNode, t: number, notes: [number, number, number][], volume: number): void {
    for (const [freq, at, length] of notes) {
      this.tone(out, ctx, 'triangle', freq, freq * 0.998, t + at, length, volume)
      this.tone(out, ctx, 'sine', freq * 2, freq * 1.996, t + at, length * 0.6, volume * 0.25)
    }
  }

  /** Round starts (hiders run off): a mysterious rising minor arpeggio over a low drone. */
  public playRoundStart(): void {
    void this.play((ctx, out, t) => {
      this.tone(out, ctx, 'sine', 110, 108, t, 2.4, 0.18)
      this.melody(ctx, out, t, [[220, 0, 0.9], [261.6, 0.22, 0.9], [329.6, 0.44, 0.9], [440, 0.66, 1.4]], 0.22)
    })
  }

  /** The hunt begins: a deep gong with a horn call on top. */
  public playSeekStart(): void {
    void this.play((ctx, out, t) => {
      for (const [ratio, volume] of [[1, 0.5], [2.76, 0.18], [5.4, 0.08]]) this.tone(out, ctx, 'sine', 73.4 * ratio, 72 * ratio, t, 3, volume)
      this.melody(ctx, out, t, [[146.8, 0.15, 0.5], [220, 0.5, 1.2]], 0.2)
    })
  }

  /** Round over: a bright rising call for the winner, a falling one for the loser. */
  public playRoundEnd(won: boolean): void {
    void this.play((ctx, out, t) => {
      const notes: [number, number, number][] = won
        ? [[261.6, 0, 0.5], [329.6, 0.14, 0.5], [392, 0.28, 0.5], [523.3, 0.42, 1.4]]
        : [[392, 0, 0.6], [311.1, 0.2, 0.6], [261.6, 0.4, 0.6], [196, 0.6, 1.6]]
      this.melody(ctx, out, t, notes, 0.24)
    })
  }

  /** Stereo output for one sound; null while audio is locked or the sound is inaudible. */
  private output(volume: number, pan: number): { ctx: AudioContext; out: StereoPannerNode } | null {
    const ctx = this.muted ? null : this.getContext()
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

  /** One decaying tone (shared by the bell, the heartbeat and the jail clank). */
  private tone(out: AudioNode, ctx: AudioContext, type: OscillatorType, from: number, to: number, start: number, length: number, volume: number): void {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(from, start)
    osc.frequency.exponentialRampToValueAtTime(to, start + length)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, start + length)
    osc.connect(gain).connect(out)
    osc.start(start)
    osc.stop(start + length + 0.02)
  }

  /** Heartbeat "lub-dub": the seeker is close. */
  public playHeartbeat(volume: number): void {
    const o = this.output(volume, 0)
    if (!o) return
    const t = o.ctx.currentTime
    this.tone(o.out, o.ctx, 'sine', 70, 40, t, 0.14, volume * 0.9)
    this.tone(o.out, o.ctx, 'sine', 62, 36, t + 0.17, 0.12, volume * 0.6)
  }

  /** A bell trap ringing. */
  public playBell(volume: number, pan: number): void {
    const o = this.output(volume, pan)
    if (!o) return
    for (let i = 0; i < 4; i++) {
      const t = o.ctx.currentTime + i * 0.22
      this.tone(o.out, o.ctx, 'triangle', 1568, 1560, t, 0.5, volume * 0.35)
      this.tone(o.out, o.ctx, 'sine', 2349, 2340, t, 0.35, volume * 0.15)
    }
  }

  /** An ability: a short rising whoosh. */
  public playAbility(volume: number, pan: number): void {
    const o = this.output(volume, pan)
    if (!o) return
    const t = o.ctx.currentTime
    this.tone(o.out, o.ctx, 'sine', 320, 980, t, 0.22, volume * 0.35)
    this.tone(o.out, o.ctx, 'triangle', 640, 1960, t + 0.04, 0.16, volume * 0.15)
  }

  /** A heavy door creaking open (rising) or shut (falling, with a thud). */
  public playDoor(volume: number, pan: number, open: boolean): void {
    const o = this.output(volume, pan)
    if (!o) return
    const t = o.ctx.currentTime
    const creak = o.ctx.createOscillator()
    creak.type = 'sawtooth'
    creak.frequency.setValueAtTime(open ? 140 : 220, t)
    creak.frequency.linearRampToValueAtTime(open ? 230 : 120, t + 0.45)
    const filter = o.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 900
    filter.Q.value = 6
    const gain = o.ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(volume * 0.25, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    creak.connect(filter).connect(gain).connect(o.out)
    creak.start(t)
    creak.stop(t + 0.55)
    if (!open) this.tone(o.out, o.ctx, 'sine', 90, 50, t + 0.42, 0.18, volume * 0.6)
  }

  /** A candle blown out (soft puff) or lit (small hiss). */
  public playCandle(volume: number, pan: number, lit: boolean): void {
    const o = this.output(volume, pan)
    if (!o || !this.noise) return
    const t = o.ctx.currentTime
    const air = o.ctx.createBufferSource()
    air.buffer = this.noise
    air.playbackRate.value = lit ? 0.6 : 0.3
    const filter = o.ctx.createBiquadFilter()
    filter.type = lit ? 'highpass' : 'lowpass'
    filter.frequency.value = lit ? 2500 : 600
    const gain = o.ctx.createGain()
    gain.gain.setValueAtTime(volume * 0.5, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    air.connect(filter).connect(gain).connect(o.out)
    air.start(t)
    air.stop(t + 0.35)
  }

  /** The exit gates open: a deep gong and a rising call. */
  public playGates(): void {
    void this.play((ctx, out, t) => {
      for (const [ratio, volume] of [[1, 0.45], [2.76, 0.15], [5.4, 0.06]]) this.tone(out, ctx, 'sine', 65.4 * ratio, 64 * ratio, t, 2.6, volume)
      this.melody(ctx, out, t, [[196, 0.2, 0.5], [261.6, 0.45, 0.5], [392, 0.7, 1.4]], 0.2)
    })
  }

  /** The hunt begins: two calls of a low horn. */
  public playHunt(): void {
    void this.play((ctx, out, t) => {
      this.melody(ctx, out, t, [[110, 0, 0.6], [146.8, 0.35, 0.6], [110, 0.9, 0.6], [146.8, 1.25, 1.2]], 0.22)
    })
  }

  /** Tower defense: a projectile lands — a flying shot thuds, a sky strike cracks, a beam sizzles. */
  public playHit(behavior: 'flying' | 'strike' | 'beam'): void {
    const o = this.output(1, (Math.random() - 0.5) * 0.4)
    if (!o || !this.noise) return
    const { ctx, out } = o
    const t = ctx.currentTime
    if (behavior === 'flying') {
      this.tone(out, ctx, 'sine', 180 + Math.random() * 40, 60, t, 0.12, 0.22)
      this.noiseBurst(ctx, out, t, 'lowpass', 1400, 0.18, 0.08)
    } else if (behavior === 'strike') {
      this.noiseBurst(ctx, out, t, 'highpass', 2500, 0.25, 0.18)
      this.tone(out, ctx, 'square', 900, 120, t, 0.15, 0.06)
    } else {
      this.tone(out, ctx, 'sawtooth', 1400 + Math.random() * 300, 700, t, 0.14, 0.05)
      this.noiseBurst(ctx, out, t, 'bandpass', 4000, 0.08, 0.12)
    }
  }

  /** Tower defense: a splash shot explodes. */
  public playExplosion(): void {
    const o = this.output(1, (Math.random() - 0.5) * 0.4)
    if (!o) return
    const t = o.ctx.currentTime
    this.tone(o.out, o.ctx, 'sine', 120, 35, t, 0.5, 0.45)
    this.noiseBurst(o.ctx, o.out, t, 'lowpass', 900, 0.4, 0.4)
  }

  /** Tower defense: an enemy falls — a short falling groan. */
  public playKill(): void {
    const o = this.output(1, (Math.random() - 0.5) * 0.5)
    if (!o) return
    const t = o.ctx.currentTime
    this.tone(o.out, o.ctx, 'sawtooth', 240 + Math.random() * 60, 70, t, 0.28, 0.08)
    this.tone(o.out, o.ctx, 'sine', 130, 50, t, 0.25, 0.2)
  }

  /** Tower defense: an enemy got through and a life is lost — a low warning toll. */
  public playLifeLost(): void {
    const o = this.output(1, 0)
    if (!o) return
    const t = o.ctx.currentTime
    this.tone(o.out, o.ctx, 'triangle', 196, 190, t, 0.5, 0.25)
    this.tone(o.out, o.ctx, 'triangle', 185, 180, t + 0.18, 0.6, 0.22)
  }

  /** Tower defense: a tower is built (hammer knocks and a settling thump). */
  public playBuild(): void {
    const o = this.output(1, 0)
    if (!o) return
    const t = o.ctx.currentTime
    for (let i = 0; i < 3; i++) {
      this.tone(o.out, o.ctx, 'square', 700, 500, t + i * 0.09, 0.05, 0.08)
      this.noiseBurst(o.ctx, o.out, t + i * 0.09, 'bandpass', 2000, 0.12, 0.05)
    }
    this.tone(o.out, o.ctx, 'sine', 110, 55, t + 0.3, 0.2, 0.4)
  }

  /** Tower defense: a tower levels up — a bright rising sparkle. */
  public playUpgrade(): void {
    void this.play((ctx, out, t) => {
      this.melody(ctx, out, t, [[523.3, 0, 0.3], [659.3, 0.08, 0.3], [784, 0.16, 0.3], [1046.5, 0.24, 0.6]], 0.18)
    })
  }

  /** Tower defense: a tower is sold — coins clinking. */
  public playSell(): void {
    const o = this.output(1, 0)
    if (!o) return
    const t = o.ctx.currentTime
    for (const [freq, at] of [[2093, 0], [2637, 0.07], [2349, 0.15]]) this.tone(o.out, o.ctx, 'triangle', freq, freq, t + at, 0.25, 0.12)
  }

  /** A short filtered noise burst (impacts, knocks, explosions). */
  private noiseBurst(ctx: AudioContext, out: AudioNode, t: number, type: BiquadFilterType, freq: number, volume: number, length: number): void {
    if (!this.noise) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + length)
    src.connect(filter).connect(gain).connect(out)
    src.start(t)
    src.stop(t + length + 0.02)
  }

  /** Curse genre: the curse jumps to someone — a dark falling whisper with a ghostly chord. */
  public playCurse(volume: number, pan: number): void {
    const o = this.output(Math.max(volume, 0.35), pan)
    if (!o || !this.noise) return
    const { ctx, out } = o
    const t = ctx.currentTime
    this.tone(out, ctx, 'sawtooth', 620, 90, t, 0.6, 0.06)
    this.tone(out, ctx, 'sine', 155.6, 146.8, t, 1.1, 0.3)
    this.tone(out, ctx, 'sine', 233.1, 220, t + 0.05, 1, 0.14)
    this.noiseBurst(ctx, out, t, 'bandpass', 900, 0.25, 0.5)
  }

  /** Jail door clank: someone was caught (low) or set free (high). */
  public playJail(volume: number, freed: boolean): void {
    const o = this.output(volume, 0)
    if (!o) return
    const t = o.ctx.currentTime
    const base = freed ? 660 : 180
    this.tone(o.out, o.ctx, 'square', base, base * (freed ? 1.5 : 0.6), t, 0.25, volume * 0.25)
    this.tone(o.out, o.ctx, 'square', base * 1.5, base * (freed ? 2 : 0.5), t + 0.12, 0.3, volume * 0.2)
  }
}

export const gameAudio = new GameAudio()
