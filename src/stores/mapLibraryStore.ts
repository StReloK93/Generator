import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { diffMaps, type MapDiff } from '../domain/map/MapDiff'
import {
  applyMapPayloadToStores,
  buildEditorMapPayload,
  builtinMapSaving,
  clearEditorDraft,
  dropBuiltinMap,
  findBuiltinMap,
  loadBuiltinMaps,
  putBuiltinMap,
  sanitizeMapId,
  type MapSummary,
} from '../services/mapManager'
import { API_URL } from '../services/serverUrl'
import { forgetMapPreview } from '../rendering/pixi/MapPreviewRenderer'
import { buildFullProjectJsonPayload } from '../utils/exportHelpers'
import { useMapStore } from './mapStore'
import { useAdminStore } from './adminStore'

export type MapLibraryError = '' | 'login' | 'changed' | 'saving-off' | 'failed'

/** The server version of a built-in map the editor's draft of it started from */
const baseKey = (mapId: string) => `defensor_editor_base_${sanitizeMapId(mapId)}`

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked: remembered for this page only
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage blocked: nothing was kept
  }
}

/** A map file in the same canonical form the editor saves (so only real edits show up as changes). */
function canonical(raw: any): any {
  const data = raw?.payload || raw
  const project = data.project || data
  return buildFullProjectJsonPayload(project, data.assets || [], data.characterData, data.towerData, data.waveData, data.gameSettings)
}

const errorOf = (status: number): MapLibraryError =>
  status === 401 ? 'login' : status === 409 ? 'changed' : status === 403 ? 'saving-off' : 'failed'

/**
 * The game's maps (src/maps, served by server/maps.js) managed from the editor: adding a map made in the editor,
 * copying and deleting maps, and for the built-in map open in the editor what differs from its file, saving it
 * (with the server's version check; only the signed-in admin changes maps) and throwing the edits away.
 */
export const useMapLibraryStore = defineStore('mapLibrary', () => {
  const mapStore = useMapStore()
  const admin = useAdminStore()
/** The built-in map open in the editor (none for a map made in the editor) */
  const entry = shallowRef<MapSummary | null>(null)
  /** Server version the edits started from: saving over a newer one asks first */
  const baseVersion = ref('')
  const diff = shallowRef<MapDiff | null>(null)
  const isOpen = ref(false)
  const isBusy = ref(false)
  const error = ref<MapLibraryError>('')
  /** The server's version when someone else saved the map in between (saving over it uses this) */
  let conflictVersion = ''
  let baseline: { version: string; payload: any } | null = null

  const changeCount = computed(() => diff.value?.count ?? 0)
  /** The server takes changes to its maps from this browser (its admin is signed in, or it has no admin account) */
  const canWrite = computed(() => builtinMapSaving.canSave && (!builtinMapSaving.needsLogin || admin.isAdmin))
  /** Changes wait for the admin to sign in */
  const needsLogin = computed(() => builtinMapSaving.canSave && builtinMapSaving.needsLogin && !admin.isAdmin)

  /** A change to the server's maps. Resolves to the reply, or null (with `error` set) when it did not go through. */
  async function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<any | null> {
    if (!canWrite.value || isBusy.value) return null
    isBusy.value = true
    error.value = ''
    try {
      const res = await fetch(`${API_URL}/maps${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...admin.authHeaders(), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const reply = await res.json().catch(() => ({}))
      if (!res.ok) {
        error.value = errorOf(res.status)
        if (res.status === 409) conflictVersion = reply.version
        if (res.status === 401) admin.expired()
        return null
      }
      return reply
    } catch {
      error.value = 'failed'
      return null
    } finally {
      isBusy.value = false
    }
  }

  /** The editor opened map `mapId` (from its draft or from the map file). */
  function startEditing(mapId: string, source: 'editor_draft' | 'builtin' | 'custom'): void {
    entry.value = findBuiltinMap(mapId) ?? null
    error.value = ''
    diff.value = null
    if (!entry.value) return
    const stored = readStorage(baseKey(mapId))
    baseVersion.value = source === 'builtin' || !stored ? (entry.value.version ?? '') : stored
    writeStorage(baseKey(mapId), baseVersion.value)
    refresh()
  }

  /** What the editor's map differs in from the saved file. */
  function refresh(): void {
    const map = entry.value
    if (!map) return
    const version = map.version ?? ''
    const base = baseline?.version === version ? baseline : (baseline = { version, payload: canonical(map.raw) })
    diff.value = diffMaps(base.payload, buildEditorMapPayload())
  }

  function open(): void {
    refresh()
    error.value = ''
    isOpen.value = true
  }

  /** The saved file is what the editor holds now: a fresh start from it. */
  function settle(map: MapSummary): void {
    entry.value = map
    baseVersion.value = map.version ?? ''
    writeStorage(baseKey(map.id), baseVersion.value)
    clearEditorDraft(map.id)
    forgetMapPreview(map.id)
    refresh()
  }

  /** Writes the editor's map into its file on the server. `overwrite`: even if someone saved it in between. */
  async function save(overwrite = false): Promise<boolean> {
    const map = entry.value
    if (!map?.file) return false
    const payload = buildEditorMapPayload()
    // The file keeps its own project id and birth date (the editor renames the id after the address)
    const saved = map.raw?.project || {}
    payload.project.id = saved.id ?? payload.project.id
    payload.project.createdAt = saved.createdAt ?? payload.project.createdAt
    const reply = await request('PUT', `/${encodeURIComponent(map.file)}`, payload, { 'If-Match': overwrite ? conflictVersion : baseVersion.value })
    if (!reply) return false
    settle(putBuiltinMap(map.file, payload, reply.version))
    return true
  }

  /** Adds a map to the game's maps as a new file. Resolves to the new map (null when it did not go through). */
  async function add(name: string, payload: any): Promise<MapSummary | null> {
    const reply = await request('POST', '', { name, map: payload })
    if (!reply) return null
    // The map's id follows its file, the address the game and the editor open it by
    payload.project.id = sanitizeMapId(reply.file)
    return putBuiltinMap(reply.file, payload, reply.version)
  }

  /** The map made in the editor becomes one of the game's maps; the editor goes on editing it as such. */
  async function addOpenMap(name: string): Promise<MapSummary | null> {
    const payload = buildEditorMapPayload()
    const draftId = payload.project.id
    const map = await add(name, payload)
    if (!map) return null
    clearEditorDraft(draftId)
    mapStore.project.id = map.id
    mapStore.project.name = map.name
    settle(map)
    return map
  }

  /** A copy of a game map under a new name. */
  function duplicate(map: MapSummary, name: string): Promise<MapSummary | null> {
    const copy = JSON.parse(JSON.stringify(map.raw))
    const project = copy.project || copy
    project.name = name
    project.createdAt = Date.now()
    return add(name, copy.project ? copy : { project: copy, assets: [] })
  }

  /** Deletes a game map (the server keeps it in its trash). */
  async function remove(map: MapSummary): Promise<boolean> {
    if (!map.file || !(await request('DELETE', `/${encodeURIComponent(map.file)}`))) return false
    dropBuiltinMap(map.file)
    clearEditorDraft(map.id)
    removeStorage(baseKey(map.id))
    forgetMapPreview(map.id)
    if (entry.value?.file === map.file) entry.value = null
    return true
  }

  /** Throws the editor's edits away: back to the map file as the server has it now. */
  async function discard(): Promise<void> {
    const current = entry.value
    if (!current) return
    if (error.value === 'changed') await loadBuiltinMaps()
    const map = findBuiltinMap(current.id) ?? current
    applyMapPayloadToStores(map.raw)
    error.value = ''
    settle(map)
  }

  return {
    entry,
    diff,
    isOpen,
    isBusy,
    error,
    changeCount,
    canWrite,
    needsLogin,
    startEditing,
    refresh,
    open,
    save,
    addOpenMap,
    duplicate,
    remove,
    discard,
  }
})
