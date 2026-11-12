/**
 * The game's backend (server/: built-in maps, PeerJS signaling, room list). Same origin as the app by default (the
 * dev server and `npm start` both host it); VITE_SERVER_URL points elsewhere when the frontend is hosted apart.
 */
export const SERVER_URL = new URL(import.meta.env.VITE_SERVER_URL || globalThis.location?.origin || 'http://localhost')
export const API_URL = `${SERVER_URL.origin}/api`
