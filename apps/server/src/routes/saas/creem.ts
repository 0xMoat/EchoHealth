import { FastifyInstance } from 'fastify'
import { prisma } from '../../db.js'
import { createCheckout, verifyWebhookSignature, CreemPlan } from '../../lib/creem.js'

export default async function creemRoutes(app: FastifyInstance) {
  // POST /checkout — requires auth
  app.post('/checkout', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Not authenticated' })
    }
    const { plan } = request.body as { plan?: string }
    if (!plan || !['monthly', 'pass'].includes(plan)) {
      return reply.status(400).send({ error: 'Invalid plan. Must be "monthly" or "pass"' })
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { email: true },
    })
    if (!user?.email) {
      return reply.status(400).send({ error: 'User email not found' })
    }

    try {
      const checkoutUrl = await createCheckout({
        plan: plan as CreemPlan,
        userId: request.user.id,
        userEmail: user.email,
      })
      return { checkoutUrl }
    } catch (err) {
      request.log.error(err, 'Creem checkout failed')
      return reply.status(502).send({
        error: 'Payment service unavailable. Please try again later.',
      })
    }
  })

  // POST /webhook — no auth, rawBody required for HMAC verification
  app.post('/webhook', { config: { rawBody: true } }, async (request, reply) => {
    const signature = (request.headers['creem-signature'] ?? request.headers['x-creem-signature']) as string | undefined
    if (!signature) {
      return reply.status(400).send({ error: 'Missing Creem-Signature header' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody = (request as any).rawBody as Buffer | undefined
    if (!rawBody) {
      return reply.status(400).send({ error: 'rawBody unavailable' })
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      return reply.status(400).send({ error: 'Invalid signature' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = JSON.parse(rawBody.toString()) as any
    await handleCreemEvent(event)

    return reply.status(200).send({ received: true })
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCreemEvent(event: any) {
  const type: string = event.type
  const obj = event.data?.object
  if (!obj) return

  const userId: string | undefined = obj.metadata?.userId

  switch (type) {
    case 'checkout.completed': {
      // One-time 30-Day Pass purchase
      if (!userId) return
      const creemOrderId: string = obj.id
      const amount: number = Math.round((obj.amount ?? 7.99) * 100)

      await prisma.order.upsert({
        where: { creemOrderId },
        create: { userId, amount, status: 'PAID', creemOrderId, paidAt: new Date() },
        update: { status: 'PAID', paidAt: new Date() },
      })

      const proExpireAt = new Date()
      proExpireAt.setDate(proExpireAt.getDate() + 30)
      await prisma.user.update({
        where: { id: userId },
        data: { isPro: true, proExpireAt },
      })
      break
    }

    case 'subscription.active': {
      if (!userId) return
      const creemSubscriptionId: string = obj.id
      const currentPeriodEnd = obj.current_period_end
        ? new Date(obj.current_period_end)
        : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)

      await prisma.subscription.upsert({
        where: { creemSubscriptionId },
        create: {
          userId,
          provider: 'CREEM',
          creemSubscriptionId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd,
        },
        update: { status: 'ACTIVE', currentPeriodEnd },
      })

      await prisma.user.update({
        where: { id: userId },
        data: { isPro: true, proExpireAt: currentPeriodEnd },
      })
      break
    }

    case 'subscription.renewed': {
      const creemSubscriptionId: string = obj.id
      if (!creemSubscriptionId) return
      const newPeriodEnd = obj.current_period_end
        ? new Date(obj.current_period_end)
        : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)

      const sub = await prisma.subscription.findUnique({ where: { creemSubscriptionId } })
      if (!sub) return

      await prisma.subscription.update({
        where: { creemSubscriptionId },
        data: { currentPeriodEnd: newPeriodEnd },
      })
      await prisma.user.update({
        where: { id: sub.userId },
        data: { proExpireAt: newPeriodEnd },
      })
      break
    }

    case 'subscription.cancelled': {
      const creemSubscriptionId: string = obj.id
      if (!creemSubscriptionId) return
      await prisma.subscription
        .update({
          where: { creemSubscriptionId },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        })
        .catch(() => {}) // ignore not-found
      // isPro unchanged; quota middleware checks proExpireAt on each request
      break
    }

    case 'subscription.expired': {
      const creemSubscriptionId: string = obj.id
      if (!creemSubscriptionId) return
      await prisma.subscription
        .update({ where: { creemSubscriptionId }, data: { status: 'EXPIRED' } })
        .catch(() => {})
      break
    }

    default:
      // Ignore other events
      break
  }
}
