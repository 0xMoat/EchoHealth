import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local',
  enabled: !!process.env.SENTRY_DSN,
  integrations: [Sentry.fastifyIntegration()],
  beforeSend(event) {
    // 过滤 4xx 业务错误，只上报 5xx
    const status = event.contexts?.response?.status_code
    if (typeof status === 'number' && status < 500) return null
    return event
  },
})
