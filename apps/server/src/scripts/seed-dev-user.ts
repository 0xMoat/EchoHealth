import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.upsert({
    where: { openid: 'dev-test-openid' },
    create: {
      openid: 'dev-test-openid',
      nickname: 'Dev Test User',
      usedThisMonth: 0,
      usageResetAt: new Date(),
    },
    update: {},
  })

  console.log('Dev user ready:')
  console.log('  userId:', user.id)
  console.log('  isPro:', user.isPro)
  console.log('')
  console.log('Use this userId in your API calls.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
