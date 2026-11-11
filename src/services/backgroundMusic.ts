/**
 * Home page music, synthesized live with Web Audio (no audio files, so nothing to license): a driving, ancient
 * and magical tune in D Phrygian dominant (the old eastern scale) — a frame drum beat, a plucked bass and lute,
 * a brass drone and, every second time round, a ney melody, with bell sparkles on top, in a hall reverb.
 * Bars are scheduled a little ahead over an endless 16-bar cycle, so the loop has no seam.
 * It plays only while the home page is open and the player's music setting is on. Browsers only start audio
 * after a user gesture, so it begins on the player's first tap or key press; it pauses in the background.
 */

/** Loudness of the whole piece */
const VOLUME = 0.3
/** One eighth note at 100 BPM; a bar is 8 of them (4/4) */
const EIGHTH = 60 / 100 / 2
const BAR = EIGHTH * 8
/** How far ahead (seconds) bars get scheduled */
const LOOKAHEAD = 1

/** One bar: its chord (MIDI notes, root first) and the ney melody [start eighth, length in eighths, note] */
interface Bar {
  chord: [number, number, number]
  melody: [number, number, number][]
}

// D – Eb – D – Cm – Bb – Cm – Eb – D, the melody on top
const BARS: Bar[] = [
  { chord: [50, 54, 57], melody: [[0, 2, 69], [2, 1, 70], [3, 1, 69], [4, 2, 66], [6, 2, 67]] },
  { chord: [51, 55, 58], melody: [[0, 3, 70], [3, 1, 69], [4, 2, 67], [6, 2, 66]] },
  { chord: [50, 54, 57], melody: [[0, 2, 69], [2, 2, 74], [4, 2, 72], [6, 2, 70]] },
  { chord: [48, 51, 55], melody: [[0, 4, 67], [4, 2, 72], [6, 2, 70]] },
  { chord: [46, 50, 53], melody: [[0, 2, 70], [2, 1, 69], [3, 1, 67], [4, 2, 66], [6, 2, 67]] },
  { chord: [48, 51, 55], melody: [[0, 3, 67], [3, 1, 66], [4, 2, 63], [6, 2, 66]] },
  { chord: [51, 55, 58], melody: [[0, 2, 67], [2, 2, 70], [4, 2, 69], [6, 2, 67]] },
  { chord: [50, 54, 57], melody: [[0, 2, 66], [2, 6, 62]] },
]

/** Frame drum, per eighth note: deep "doum", sharp "tek", or nothing (an old maqsum-like beat) */
const DRUM: ('doum' | 'tek' | null)[] = ['doum', 'tek', null, 'tek', 'doum', null, 'tek', null]
/** Plucked bass, per eighth note: semitones above the chord root an octave down (null = rest) */
const BASS = [0, null, 0, 12, 0, null, 7, 0]
/** Lute, per eighth note: which chord tone (an octave up) it plucks */
const LUTE = [0, 1, 2, 1, 0, 2, 1, 2]

function frequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

class BackgroundMusic {
  private ctx: AudioContext | null = null
  /** Everything the piece plays goes here: dry to the master, and through the reverb */
  private bus: GainNode | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  /** The player's music setting */
  private enabled = false
  /** The page that has music (home) is open */
  private active = false
  /** The player has touched the page, so the browser lets audio start */
  private unlocked = false
  private playing = false
  private timer: number | null = null
  private stopTimer: number | null = null
  private nextBarAt = 0
  private barIndex = 0

  constructor() {
    if (typeof window === 'undefined') return
    // Any gesture may be the first one the browser accepts audio after
    for (const type of ['pointerdown', 'touchend', 'keydown', 'click']) {
      window.addEventListener(type, () => this.onGesture(), { capture: true, passive: true })
    }
    document.addEventListener('visibilitychange', () => this.onVisibility())
  }

  /** The player's music setting. */
  public setEnabled(on: boolean): void {
    this.enabled = on
    this.update()
  }

  /** Whether the page that has music is open. */
  public setActive(on: boolean): void {
    this.active = on
    this.update()
  }

  private update(): void {
    if (this.enabled && this.active) this.start()
    else this.stop()
  }

  private onGesture(): void {
    this.unlocked = true
    if (this.enabled && this.active && (!this.playing || this.ctx?.state !== 'running')) this.start()
  }

  private onVisibility(): void {
    if (!this.ctx) return
    if (document.hidden) this.ctx.suspend().catch(() => {})
    else if (this.playing) this.ctx.resume().catch(() => {})
  }

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof AudioContext === 'undefined') return null
    const ctx = new AudioContext()
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    this.bus = ctx.createGain()
    const dry = ctx.createGain()
    dry.gain.value = 0.8
    const reverb = ctx.createConvolver()
    reverb.buffer = this.hallImpulse(ctx, 2.5)
    const wet = ctx.createGain()
    wet.gain.value = 0.35
    this.bus.connect(dry).connect(this.master)
    this.bus.connect(reverb).connect(wet).connect(this.master)

    const length = Math.floor(ctx.sampleRate * 0.3)
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

    this.ctx = ctx
    return ctx
  }

  private start(): void {
    if (!this.unlocked || document.hidden) return
    const ctx = this.getContext()
    if (!ctx || !this.master) return
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {})
    if (this.playing) return
    this.playing = true
    // Every visit starts from the top of the tune
    this.barIndex = 0
    this.nextBarAt = 0

    const gain = this.master.gain
    gain.cancelScheduledValues(ctx.currentTime)
    gain.setValueAtTime(gain.value, ctx.currentTime)
    gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 1.5)
    this.timer = window.setInterval(() => this.schedule(), 250)
    this.schedule()
  }

  /** Fade out, then let the audio thread sleep. */
  private stop(): void {
    if (!this.playing || !this.ctx || !this.master) return
    this.playing = false
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
    const ctx = this.ctx
    const gain = this.master.gain
    gain.cancelScheduledValues(ctx.currentTime)
    gain.setValueAtTime(gain.value, ctx.currentTime)
    gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
    this.stopTimer = window.setTimeout(() => {
      this.stopTimer = null
      ctx.suspend().catch(() => {})
    }, 700)
  }

  private schedule(): void {
    const ctx = this.ctx
    const out = this.bus
    if (!ctx || !out || ctx.state !== 'running') return
    // Back from a pause (or never started): pick the cycle up from now
    if (this.nextBarAt <= ctx.currentTime) this.nextBarAt = ctx.currentTime + 0.1
    while (this.nextBarAt < ctx.currentTime + LOOKAHEAD) {
      this.playBar(ctx, out, this.barIndex, this.nextBarAt)
      this.barIndex = (this.barIndex + 1) % (BARS.length * 2)
      this.nextBarAt += BAR
    }
  }

  /** Bars 0–7 are the groove alone, bars 8–15 add the ney melody. */
  private playBar(ctx: AudioContext, out: AudioNode, index: number, t: number): void {
    const bar = BARS[index % BARS.length]
    const withMelody = index >= BARS.length
    const root = bar.chord[0]

    // A big low drum at the top of each 4 bars
    if (index % 4 === 0) this.bigDrum(ctx, out, t)
    for (let i = 0; i < 8; i++) {
      const at = t + i * EIGHTH
      const hit = DRUM[i]
      if (hit === 'doum') this.doum(ctx, out, at)
      else if (hit === 'tek') this.tek(ctx, out, at, i === 7 ? 0.5 : 1)

      const bass = BASS[i]
      if (bass !== null) this.pluck(ctx, out, frequency(root - 12 + bass), at, 0.14, 0.35, 500)
      this.pluck(ctx, out, frequency(bar.chord[LUTE[i]] + 12), at, withMelody ? 0.05 : 0.07, 0.4, 2400)
    }

    this.drone(ctx, out, bar.chord, t)

    if (withMelody) {
      for (const [step, length, note] of bar.melody) this.ney(ctx, out, frequency(note), t + step * EIGHTH, length * EIGHTH)
    } else if (index % 2 === 1) {
      // Magic sparkle: a quick falling run of bells over the chord
      ;[...bar.chord].reverse().forEach((note, i) => this.bell(ctx, out, frequency(note + 24), t + BAR * 0.5 + i * EIGHTH * 0.5))
    }
  }

  /** The deep frame drum stroke: a falling sine thump with a little skin noise. */
  private doum(ctx: AudioContext, out: AudioNode, t: number): void {
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(110, t)
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.18)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.55, t + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    osc.connect(gain).connect(out)
    osc.start(t)
    osc.stop(t + 0.4)
    this.noiseHit(ctx, out, t, 'lowpass', 800, 0.12, 0.06)
  }

  /** The sharp rim stroke. */
  private tek(ctx: AudioContext, out: AudioNode, t: number, accent: number): void {
    this.noiseHit(ctx, out, t, 'bandpass', 3200, 0.22 * accent, 0.07)
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 420
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.08 * accent, t + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
    osc.connect(gain).connect(out)
    osc.start(t)
    osc.stop(t + 0.08)
  }

  /** A big war drum with a long boom (marks each phrase). */
  private bigDrum(ctx: AudioContext, out: AudioNode, t: number): void {
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(70, t)
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.8)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.7, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    osc.connect(gain).connect(out)
    osc.start(t)
    osc.stop(t + 1.25)
    this.noiseHit(ctx, out, t, 'lowpass', 400, 0.3, 0.25)
  }

  private noiseHit(ctx: AudioContext, out: AudioNode, t: number, type: BiquadFilterType, freq: number, volume: number, length: number): void {
    if (!this.noise) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = type === 'bandpass' ? 1.5 : 0.7
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
    src.connect(filter).connect(gain).connect(out)
    src.start(t)
    src.stop(t + length + 0.02)
  }

  /** A plucked string (bass or lute): a bright saw that closes quickly, like an oud. */
  private pluck(ctx: AudioContext, out: AudioNode, freq: number, t: number, volume: number, length: number, brightness: number): void {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 2
    filter.frequency.setValueAtTime(brightness, t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(150, freq * 1.2), t + length)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
    osc.connect(filter).connect(gain).connect(out)
    osc.start(t)
    osc.stop(t + length + 0.02)
  }

  /** A low brass drone under the bar: root and fifth, swelling with the beat. */
  private drone(ctx: AudioContext, out: AudioNode, chord: [number, number, number], t: number): void {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(350, t)
    filter.frequency.linearRampToValueAtTime(900, t + BAR * 0.5)
    filter.frequency.linearRampToValueAtTime(350, t + BAR)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.05, t + 0.1)
    gain.gain.setValueAtTime(0.05, t + BAR - 0.1)
    gain.gain.linearRampToValueAtTime(0, t + BAR + 0.05)
    filter.connect(gain).connect(out)
    for (const note of [chord[0] - 12, chord[2] - 12]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = frequency(note)
      osc.connect(filter)
      osc.start(t)
      osc.stop(t + BAR + 0.1)
    }
  }

  /** The ney (reed flute): breathy, with a vibrato that grows on long notes and a slide into each note. */
  private ney(ctx: AudioContext, out: AudioNode, freq: number, t: number, length: number): void {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq * 0.97, t)
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.06)
    const vibrato = ctx.createOscillator()
    vibrato.frequency.value = 5.5
    const depth = ctx.createGain()
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(freq * 0.012, t + length)
    vibrato.connect(depth).connect(osc.frequency)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.13, t + 0.04)
    gain.gain.setValueAtTime(0.11, t + Math.max(0.05, length - 0.08))
    gain.gain.linearRampToValueAtTime(0, t + length)
    osc.connect(gain).connect(out)
    for (const node of [osc, vibrato]) {
      node.start(t)
      node.stop(t + length + 0.05)
    }
    this.noiseHit(ctx, out, t, 'bandpass', freq * 2, 0.02, Math.min(length, 0.3))
  }

  /** A glass bell (inharmonic partials). */
  private bell(ctx: AudioContext, out: AudioNode, freq: number, t: number): void {
    for (const [ratio, volume, length] of [[1, 0.05, 1.6], [2.76, 0.015, 0.9]]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * ratio
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
      osc.connect(gain).connect(out)
      osc.start(t)
      osc.stop(t + length + 0.05)
    }
  }

  /** A stereo hall: decaying noise, different in each ear. */
  private hallImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds)
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
    }
    return buffer
  }
}

export const backgroundMusic = new BackgroundMusic()
