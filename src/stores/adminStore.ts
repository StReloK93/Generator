import { defineStore } from 'pinia'
import { ref } from 'vue'
import { API_URL } from '../services/serverUrl'

export type AdminSignInError = '' | 'wrong' | 'too-many' | 'off' | 'failed'

const TOKEN_KEY = 'defensor_admin_token'

function readToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

function writeToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked: signed in for this page only
  }
}

/**
 * The admin (server/admin.js): the one account that changes the game's maps. Signing in gives a token the server
 * knows; this browser keeps it, so the admin signs in once (until it runs out or the server restarts).
 */
export const useAdminStore = defineStore('admin', () => {
  /** The server has an admin account (ADMIN_LOGIN / ADMIN_PASSWORD) */
  const enabled = ref(false)
  const isAdmin = ref(false)
  const login = ref('')
  const isLoginOpen = ref(false)
  const isBusy = ref(false)
  const error = ref<AdminSignInError>('')
  let token = readToken()

  const authHeaders = (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {})
  /** The sign-in token (the online chat shows it to the server to act as the admin) */
  const sessionToken = () => token

  function setToken(next: string): void {
    token = next
    writeToken(next)
  }

  /** Asks the server who this browser is. */
  async function check(): Promise<void> {
    try {
      const res = await fetch(`${API_URL}/admin/me`, { headers: authHeaders() })
      const me = await res.json()
      enabled.value = !!me.enabled
      isAdmin.value = !!me.admin
      login.value = me.login ?? ''
      if (!me.admin && token) setToken('')
    } catch {
      enabled.value = false
      isAdmin.value = false
    }
  }

  async function signIn(name: string, password: string): Promise<boolean> {
    isBusy.value = true
    error.value = ''
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: name, password }),
      })
      const reply = await res.json().catch(() => ({}))
      if (!res.ok) {
        error.value = res.status === 401 ? 'wrong' : res.status === 429 ? 'too-many' : res.status === 403 ? 'off' : 'failed'
        return false
      }
      setToken(reply.token)
      isAdmin.value = true
      login.value = reply.login
      isLoginOpen.value = false
      return true
    } catch {
      error.value = 'failed'
      return false
    } finally {
      isBusy.value = false
    }
  }

  async function signOut(): Promise<void> {
    await fetch(`${API_URL}/admin/logout`, { method: 'POST', headers: authHeaders() }).catch(() => undefined)
    setToken('')
    isAdmin.value = false
    login.value = ''
  }

  /** The server no longer knows this sign-in (it ran out, or the server restarted): sign in again. */
  function expired(): void {
    setToken('')
    isAdmin.value = false
    openSignIn()
  }

  function openSignIn(): void {
    error.value = ''
    isLoginOpen.value = true
  }

  check()

  return { enabled, isAdmin, login, isLoginOpen, isBusy, error, authHeaders, sessionToken, check, signIn, signOut, expired, openSignIn }
})
