import homeMusicUrl from '../assets/music/backgroundHomePage.mp3'

/**
 * Menu music: one recorded track (src/assets/music), looped without a seam through Web Audio.
 * It plays only on the menu pages (home, play, multiplayer: App.vue) and while the player's music setting is on. The file is fetched the first time
 * the music should play (not with the page). It tries to start at once: where the browser allows audio without a
 * gesture (an installed PWA on Android, a site the player often visits) it plays straight away; elsewhere the audio
 * stays suspended until the player's first tap or key press. It fades in and out, and pauses while the page is in the background.
 */

/** Loudness of the track at full volume (the player's music volume scales it) */
const MAX_VOLUME = 0.7
const FADE_IN_SEC = 1.5
const FADE_OUT_SEC = 0.6
/** Below this level a sample counts as silence (the encoder's padding at both ends would leave a gap in the loop) */
const SILENCE = 1e-4

/** Where the sound really starts and ends in the decoded track (seconds). */
function audibleRange(buffer: AudioBuffer): { start: number; end: number } {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
  const loud = (i: number) => channels.some(data => Math.abs(data[i]) > SILENCE)
  let first = 0
  while (first < buffer.length - 1 && !loud(first)) first++
  let last = buffer.length - 1
  while (last > first && !loud(last)) last--
  return { start: first / buffer.sampleRate, end: (last + 1) / buffer.sampleRate }
}

class BackgroundMusic {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private track: Promise<AudioBuffer | null> | null = null
  private source: AudioBufferSourceNode | null = null
  /** The player's music setting, and its volume 0..1 */
  private enabled = false
  private volume = 0.65
  /** The page that has music (home) is open */
  private active = false
  private playing = false
  private stopTimer: number | null = null

  constructor() {
    if (typeof window === 'undefined') return
    // Where audio is blocked until a gesture, any gesture may be the first one the browser accepts
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

  /** The player's music volume (0..1): follows at once while playing. */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (!this.playing || !this.ctx || !this.master) return
    const gain = this.master.gain
    gain.cancelScheduledValues(this.ctx.currentTime)
    gain.setTargetAtTime(MAX_VOLUME * this.volume, this.ctx.currentTime, 0.05)
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
    this.ctx = ctx
    return ctx
  }

  /** The track, fetched and decoded once (null when it cannot be loaded: no music then). */
  private loadTrack(ctx: AudioContext): Promise<AudioBuffer | null> {
    this.track ??= fetch(homeMusicUrl)
      .then(res => res.arrayBuffer())
      .then(data => ctx.decodeAudioData(data))
      .catch(error => {
        console.warn('[backgroundMusic] The home music could not be loaded:', error)
        return null
      })
    return this.track
  }

  private start(): void {
    if (document.hidden) return
    const ctx = this.getContext()
    if (!ctx || !this.master) return
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {})
    if (this.playing) return
    this.playing = true

    const gain = this.master.gain
    gain.cancelScheduledValues(ctx.currentTime)
    gain.setValueAtTime(gain.value, ctx.currentTime)
    void this.loadTrack(ctx).then(buffer => {
      // The page or the setting may have changed while the track loaded
      if (!buffer || !this.playing || !this.master) return
      // Every visit starts from the top of the track (back before the fade-out ended: it just plays on)
      if (!this.source) {
        const { start, end } = audibleRange(buffer)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true
        source.loopStart = start
        source.loopEnd = end
        source.connect(this.master)
        source.start(ctx.currentTime, start)
        this.source = source
      }
      gain.cancelScheduledValues(ctx.currentTime)
      gain.setValueAtTime(gain.value, ctx.currentTime)
      gain.linearRampToValueAtTime(MAX_VOLUME * this.volume, ctx.currentTime + FADE_IN_SEC)
    })
  }

  /** Fade out, then let the audio thread sleep. */
  private stop(): void {
    if (!this.playing || !this.ctx || !this.master) return
    this.playing = false
    const ctx = this.ctx
    const gain = this.master.gain
    gain.cancelScheduledValues(ctx.currentTime)
    gain.setValueAtTime(gain.value, ctx.currentTime)
    gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT_SEC)
    this.stopTimer = window.setTimeout(() => {
      this.stopTimer = null
      this.source?.stop()
      this.source?.disconnect()
      this.source = null
      ctx.suspend().catch(() => {})
    }, FADE_OUT_SEC * 1000 + 100)
  }
}

export const backgroundMusic = new BackgroundMusic()
