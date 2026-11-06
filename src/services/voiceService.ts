import Peer, { MediaConnection } from 'peerjs'
import { resolvePeerOptions } from './networkService'

/**
 * Room voice chat: every player in voice calls every other one directly (WebRTC mesh over PeerJS media calls).
 * The game's data link stays host-centred; voice gets its own peer, named after the room and the player,
 * so everyone can reach everyone from the lobby's player list alone.
 */

/** Who should get my voice: a player in the room, and whether my microphone goes to them (team channel). */
export interface VoiceTarget {
  id: string
  hearsMe: boolean
}

export interface VoiceEvents {
  /** Players whose voice link is open */
  onConnected: (ids: string[]) => void
  /** Players talking right now (mine included) */
  onSpeaking: (ids: string[]) => void
}

export type VoiceJoinResult = 'ok' | 'listen-only' | 'failed'

interface VoiceLink {
  call: MediaConnection
  /** My microphone as sent on this link: its own copy, so it can be silenced for this player alone */
  track: MediaStreamTrack
  audio: HTMLAudioElement | null
  analyser: AnalyserNode | null
  startedAt: number
}

/** A call still without the other side's voice after this long is dropped and tried again */
const CALL_TIMEOUT_MS = 8000
/** How often links are checked: calls to players who came into voice, dropped links */
const SYNC_INTERVAL_MS = 3000
const SPEAKING_POLL_MS = 150
/** Average loudness (0..1) above which someone counts as talking */
const SPEAKING_LEVEL = 0.04
const MAX_REGISTER_RETRIES = 4

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: false,
}

function voicePeerId(roomId: string, playerId: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `isocraft-voice-${clean(roomId)}-${clean(playerId)}`
}

function callerPlayerId(call: MediaConnection): string | null {
  return (call.metadata as { playerId?: string } | undefined)?.playerId ?? null
}

function loudness(analyser: AnalyserNode, buffer: Uint8Array): number {
  analyser.getByteTimeDomainData(buffer)
  let sum = 0
  for (const v of buffer) {
    const s = (v - 128) / 128
    sum += s * s
  }
  return Math.sqrt(sum / buffer.length)
}

class VoiceService {
  private peer: Peer | null = null
  private roomId = ''
  private myId = ''
  private events: VoiceEvents | null = null
  private audioContext: AudioContext | null = null
  /** Microphone, or a silent track when there is none (the others are still heard) */
  private micTrack: MediaStreamTrack | null = null
  private micAnalyser: AnalyserNode | null = null
  private micEnabled = true
  private links = new Map<string, VoiceLink>()
  private targets: VoiceTarget[] = []
  private mutedIds = new Set<string>()
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private speakingTimer: ReturnType<typeof setInterval> | null = null
  private levelBuffer = new Uint8Array(512)
  private lastConnected = ''
  private lastSpeaking = ''

  /** Must run from a tap/click: browsers (iOS above all) only open the microphone and start sound from one. */
  public async join(roomId: string, myId: string, events: VoiceEvents): Promise<VoiceJoinResult> {
    this.leave()
    this.roomId = roomId
    this.myId = myId
    this.events = events

    this.audioContext = new AudioContext()
    void this.audioContext.resume()

    const hasMic = await this.openMicrophone()
    const registered = await this.register()
    if (!registered) {
      this.leave()
      return 'failed'
    }

    this.syncTimer = setInterval(() => this.syncLinks(), SYNC_INTERVAL_MS)
    this.speakingTimer = setInterval(() => this.pollSpeaking(), SPEAKING_POLL_MS)
    this.syncLinks()
    return hasMic ? 'ok' : 'listen-only'
  }

  public leave() {
    if (this.syncTimer) clearInterval(this.syncTimer)
    if (this.speakingTimer) clearInterval(this.speakingTimer)
    this.syncTimer = null
    this.speakingTimer = null

    for (const id of [...this.links.keys()]) this.closeLink(id)

    if (this.peer) {
      const peer = this.peer
      this.peer = null
      peer.destroy()
    }
    this.micTrack?.stop()
    this.micTrack = null
    this.micAnalyser = null
    void this.audioContext?.close()
    this.audioContext = null

    this.emitConnected()
    this.lastSpeaking = ''
    this.events?.onSpeaking([])
    this.events = null
    this.lastConnected = ''
    this.roomId = ''
    this.myId = ''
  }

  public setMicEnabled(enabled: boolean) {
    this.micEnabled = enabled
    this.applyTrackStates()
  }

  /** The players in the room and who hears me; links to players who left are closed. */
  public setTargets(targets: VoiceTarget[]) {
    this.targets = targets.filter(t => t.id !== this.myId)
    if (!this.peer) return
    this.syncLinks()
    this.applyTrackStates()
  }

  public setMutedIds(ids: string[]) {
    this.mutedIds = new Set(ids)
    for (const [id, link] of this.links) {
      if (link.audio) link.audio.muted = this.mutedIds.has(id)
    }
  }

  private async openMicrophone(): Promise<boolean> {
    try {
      // Missing outside secure pages (https / localhost)
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-media-devices')
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
      this.micTrack = stream.getAudioTracks()[0] ?? null
    } catch (e) {
      console.warn('[Voice] Microphone unavailable:', e)
      this.micTrack = null
    }

    if (this.micTrack && this.audioContext) {
      this.micAnalyser = this.createAnalyser(new MediaStream([this.micTrack]))
      return true
    }
    // A call needs an audio track to carry the other side's voice back: send silence
    this.micTrack = this.audioContext?.createMediaStreamDestination().stream.getAudioTracks()[0] ?? null
    return false
  }

  private async register(): Promise<boolean> {
    const peerOptions = await resolvePeerOptions()
    const peerId = voicePeerId(this.roomId, this.myId)

    return new Promise((resolve) => {
      const attempt = (retry: number) => {
        const peer = new Peer(peerId, peerOptions)
        this.peer = peer
        let opened = false

        peer.on('open', () => {
          opened = true
          resolve(true)
        })
        peer.on('call', (call) => this.answerCall(call))
        peer.on('disconnected', () => {
          setTimeout(() => {
            if (this.peer === peer && peer.disconnected && !peer.destroyed) peer.reconnect()
          }, 2000)
        })
        peer.on('error', (err) => {
          // A call to a player not in voice yet: tried again on the next sync
          if (err.type === 'peer-unavailable' || opened || this.peer !== peer) return
          peer.destroy()
          // 'unavailable-id': after a page refresh the server may still hold the old one for a moment
          if (retry < MAX_REGISTER_RETRIES) {
            setTimeout(() => {
              if (this.peer === peer) attempt(retry + 1)
            }, 1000 * 2 ** retry)
          } else {
            this.peer = null
            resolve(false)
          }
        })
      }
      attempt(0)
    })
  }

  /** One call per pair: the player with the smaller id calls, the other answers. */
  private syncLinks() {
    if (!this.peer?.open) return
    const wanted = new Set(this.targets.map(t => t.id))

    for (const [id, link] of this.links) {
      const stale = !link.audio && Date.now() - link.startedAt > CALL_TIMEOUT_MS
      if (!wanted.has(id) || stale) this.closeLink(id)
    }

    for (const target of this.targets) {
      if (this.links.has(target.id) || this.myId > target.id) continue
      const track = this.cloneMicTrack()
      if (!track) continue
      const call = this.peer.call(voicePeerId(this.roomId, target.id), new MediaStream([track]), {
        metadata: { playerId: this.myId },
      })
      if (!call) {
        track.stop()
        continue
      }
      this.watchCall(target.id, call, track)
    }
    this.applyTrackStates()
  }

  private answerCall(call: MediaConnection) {
    const playerId = callerPlayerId(call)
    if (!playerId || !this.targets.some(t => t.id === playerId)) {
      call.close()
      return
    }
    // The caller came back (page refresh): the new call replaces the old link
    this.closeLink(playerId)
    const track = this.cloneMicTrack()
    if (!track) {
      call.close()
      return
    }
    call.answer(new MediaStream([track]))
    this.watchCall(playerId, call, track)
    this.applyTrackStates()
  }

  private watchCall(playerId: string, call: MediaConnection, track: MediaStreamTrack) {
    const link: VoiceLink = { call, track, audio: null, analyser: null, startedAt: Date.now() }
    this.links.set(playerId, link)

    call.on('stream', (stream) => {
      if (this.links.get(playerId) !== link || link.audio) return
      const audio = new Audio()
      audio.autoplay = true
      audio.srcObject = stream
      audio.muted = this.mutedIds.has(playerId)
      audio.play().catch((e) => console.warn('[Voice] Playback blocked:', e))
      link.audio = audio
      link.analyser = this.createAnalyser(stream)
      this.emitConnected()
    })
    const drop = () => {
      if (this.links.get(playerId) === link) this.closeLink(playerId)
    }
    call.on('close', drop)
    call.on('error', drop)
  }

  private closeLink(playerId: string) {
    const link = this.links.get(playerId)
    if (!link) return
    this.links.delete(playerId)
    link.track.stop()
    if (link.audio) {
      link.audio.pause()
      link.audio.srcObject = null
    }
    link.call.close()
    this.emitConnected()
  }

  private cloneMicTrack(): MediaStreamTrack | null {
    return this.micTrack?.clone() ?? null
  }

  /** My voice goes only where it is meant to, and nowhere while the microphone is off. */
  private applyTrackStates() {
    for (const [id, link] of this.links) {
      const hearsMe = this.targets.find(t => t.id === id)?.hearsMe ?? false
      link.track.enabled = this.micEnabled && hearsMe
    }
  }

  private createAnalyser(stream: MediaStream): AnalyserNode | null {
    if (!this.audioContext) return null
    const analyser = this.audioContext.createAnalyser()
    analyser.fftSize = this.levelBuffer.length
    this.audioContext.createMediaStreamSource(stream).connect(analyser)
    return analyser
  }

  private pollSpeaking() {
    const speaking: string[] = []
    if (this.micEnabled && this.micAnalyser && loudness(this.micAnalyser, this.levelBuffer) > SPEAKING_LEVEL) {
      speaking.push(this.myId)
    }
    for (const [id, link] of this.links) {
      if (link.analyser && !this.mutedIds.has(id) && loudness(link.analyser, this.levelBuffer) > SPEAKING_LEVEL) {
        speaking.push(id)
      }
    }
    const key = speaking.join(',')
    if (key === this.lastSpeaking) return
    this.lastSpeaking = key
    this.events?.onSpeaking(speaking)
  }

  private emitConnected() {
    const ids = [...this.links].filter(([, link]) => link.audio).map(([id]) => id)
    const key = ids.join(',')
    if (key === this.lastConnected) return
    this.lastConnected = key
    this.events?.onConnected(ids)
  }
}

export const voiceService = new VoiceService()
