import 'dotenv/config'
import { buildApp } from './app.js'

try {
  const app = await buildApp()
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
} catch (err) {
  console.error(err)
  process.exit(1)
}
