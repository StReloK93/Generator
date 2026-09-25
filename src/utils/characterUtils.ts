import characterManifest from '../assets/generated/characterManifest.json'

/**
 * Determines action frame count from character manifest metadata.
 */
export function getModelActionFrameCount(model: string = 'male', action: string = 'Run'): number {
  const meta = (characterManifest as any)?.[String(model || 'male').toLowerCase()]
  if (!meta || !meta.actions) {
    return model === 'warrior' ? 24 : 10
  }
  const actions = Object.values(meta.actions) as any[]
  const act = actions.find((a: any) => a.id.toLowerCase() === action.toLowerCase())
    || actions.find((a: any) => action.toLowerCase() === 'run' && /run|walk|sprint|move/i.test(a.id))
    || actions.find((a: any) => action.toLowerCase() === 'idle' && /idle|stand|wait/i.test(a.id))
    || actions.find((a: any) => action.toLowerCase() === 'pickup' && /die|death|dead|pickup|hit|collapse/i.test(a.id))
    || actions[0]
  return act?.frameCount || (model === 'warrior' ? 24 : 10)
}
