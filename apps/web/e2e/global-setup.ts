import { execSync } from 'child_process'
import path from 'path'

const COMPOSE_FILE = path.resolve(__dirname, '../../../docker-compose.test.yml')
const SERVER_DIR = path.resolve(__dirname, '../../server')
const TEST_DB_URL = 'postgresql://postgres:test@localhost:5433/echohealth_test'

function run(cmd: string, opts?: { cwd?: string; env?: Record<string, string> }) {
  console.log(`[e2e-setup] ${cmd}`)
  execSync(cmd, {
    stdio: 'inherit',
    cwd: opts?.cwd,
    env: { ...process.env, ...opts?.env },
  })
}

/** Wait for a TCP port to accept connections. */
function waitForPort(port: number, host = 'localhost', timeoutMs = 30_000): Promise<void> {
  const { createConnection } = require('net')
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = createConnection({ host, port })
      socket.on('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`))
        } else {
          setTimeout(tryConnect, 500)
        }
      })
    }
    tryConnect()
  })
}

export default async function globalSetup() {
  console.log('[e2e-setup] Starting test containers via OrbStack...')

  // 1. Start containers (idempotent — won't recreate if already running)
  run(`docker compose -f ${COMPOSE_FILE} up -d --wait`)

  // 2. Wait for PostgreSQL and Redis to be reachable
  console.log('[e2e-setup] Waiting for PostgreSQL (5433) and Redis (6380)...')
  await Promise.all([
    waitForPort(5433),
    waitForPort(6380),
  ])
  console.log('[e2e-setup] Containers ready.')

  // 3. Sync Prisma schema to test database (db push handles schema drift better than migrate deploy)
  console.log('[e2e-setup] Syncing Prisma schema...')
  run('npx prisma db push --accept-data-loss', {
    cwd: SERVER_DIR,
    env: { DATABASE_URL: TEST_DB_URL },
  })

  console.log('[e2e-setup] Setup complete.')
}
