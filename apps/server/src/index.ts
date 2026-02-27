import 'dotenv/config'
import { buildApp } from './app.js'

const app = await buildApp()
await app.listen({ port: 3000, host: '0.0.0.0' })
console.log('Server running on http://localhost:3000')
