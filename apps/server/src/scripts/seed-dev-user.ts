import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
  .catch(console.error)
  .finally(() => prisma.$disconnect())
