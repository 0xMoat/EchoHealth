import automator from 'miniprogram-automator'

const WS_ENDPOINT = 'ws://localhost:9420'

let miniInstance: any = null

/** Connect to already-running DevTools via WebSocket (singleton) */
export async function launch() {
  if (miniInstance) return miniInstance
  miniInstance = await automator.connect({
    wsEndpoint: WS_ENDPOINT,
  })
  return miniInstance
}

/** No-op between suites — connection is reused. Use --forceExit to clean up. */
export async function close() {
  // intentionally empty: keep connection alive across test files
}

/** Reset to a given page (defaults to home) */
export async function resetTo(mini: any, url = '/pages/index/index') {
  await mini.reLaunch(url)
  await sleep(800)
  return mini.currentPage()
}

/** Wait ms */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Get current page path */
export async function currentPath(mini: any) {
  const page = await mini.currentPage()
  return page.path
}
