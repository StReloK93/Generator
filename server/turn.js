import Turn from 'node-turn'

/**
 * TURN relay: when two players' networks block a direct WebRTC link (mobile carriers, CGNAT, strict NAT),
 * their traffic goes through this server instead. Enabled by TURN_PUBLIC_IP (the VPS's public IPv4) and TURN_PASSWORD.
 */
function readConfig() {
  const env = process.env
  const config = {
    publicIp: env.TURN_PUBLIC_IP || '',
    port: Number(env.TURN_PORT) || 3478,
    minPort: Number(env.TURN_MIN_PORT) || 49160,
    maxPort: Number(env.TURN_MAX_PORT) || 49200,
    user: env.TURN_USER || 'defensor',
    password: env.TURN_PASSWORD || '',
  }
  return config.publicIp && config.password ? config : null
}

/** Relay entries the clients add to their ICE servers (empty when the relay is off). */
export function turnIceServers() {
  const config = readConfig()
  if (!config) return []
  return [{ urls: `turn:${config.publicIp}:${config.port}?transport=udp`, username: config.user, credential: config.password }]
}

export function startTurnServer() {
  const config = readConfig()
  if (!config) {
    console.log('TURN relay off (set TURN_PUBLIC_IP and TURN_PASSWORD to enable it)')
    return
  }
  new Turn({
    listeningPort: config.port,
    listeningIps: ['0.0.0.0'],
    externalIps: config.publicIp,
    minPort: config.minPort,
    maxPort: config.maxPort,
    authMech: 'long-term',
    realm: 'defensor',
    credentials: { [config.user]: config.password },
    debugLevel: 'ERROR',
  }).start()
  console.log(`TURN relay: udp ${config.publicIp}:${config.port} (relay ports ${config.minPort}-${config.maxPort})`)
}
