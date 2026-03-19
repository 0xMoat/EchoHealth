import { execSync } from 'child_process'
import path from 'path'

const COMPOSE_FILE = path.resolve(__dirname, '../../../docker-compose.test.yml')

export default async function globalTeardown() {
  // 默认保留容器（加速下次运行）。设置 E2E_CLEANUP=true 时销毁。
  if (process.env.E2E_CLEANUP === 'true' || process.env.CI) {
    console.log('[e2e-teardown] Stopping and removing test containers...')
    execSync(`docker compose -f ${COMPOSE_FILE} down -v`, { stdio: 'inherit' })
    console.log('[e2e-teardown] Containers removed.')
  } else {
    console.log('[e2e-teardown] Containers kept running for fast re-runs. Run `docker compose -f docker-compose.test.yml down -v` to clean up, or set E2E_CLEANUP=true.')
  }
}
