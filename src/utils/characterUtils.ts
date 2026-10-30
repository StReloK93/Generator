import characterManifest from '../assets/generated/characterManifest.json'

export interface CharacterActionMeta {
  id: string
  label: string
  icon: string
  frameCount: number
}

export interface CharacterModelMeta {
  id: string
  name: string
  cellWidth: number
  cellHeight: number
  anchorX: number
  anchorY: number
  scale: number
  actions: Record<string, CharacterActionMeta>
}

const manifest: Record<string, CharacterModelMeta | undefined> = characterManifest

/**
 * Typed lookup of a character model in the generated manifest (case-insensitive).
 */
export function getCharacterMeta(model: string | null | undefined): CharacterModelMeta | undefined {
  if (!model) return undefined
  return manifest[model] || manifest[String(model).toLowerCase()]
}

/**
 * Determines action frame count from character manifest metadata.
 */
export function getModelActionFrameCount(model: string = 'male', action: string = 'Run'): number {
  const fallback = model === 'warrior' ? 24 : 10
  const meta = getCharacterMeta(model || 'male')
  if (!meta || !meta.actions) return fallback
  const actions = Object.values(meta.actions)
  const wanted = action.toLowerCase()
  const act = actions.find(a => a.id.toLowerCase() === wanted)
    || actions.find(a => wanted === 'run' && /run|walk|sprint|move/i.test(a.id))
    || actions.find(a => wanted === 'idle' && /idle|stand|wait/i.test(a.id))
    || actions.find(a => wanted === 'pickup' && /die|death|dead|pickup|hit|collapse/i.test(a.id))
    || actions[0]
  return act?.frameCount || fallback
}
