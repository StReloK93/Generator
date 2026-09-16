import { execSync } from 'child_process'

console.log('🏰 Delegating to unified fast atlas generator (buildAtlases.js)...')
execSync('node scripts/buildAtlases.js', { stdio: 'inherit' })
