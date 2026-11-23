import { expireUsage } from './counts'
import { brutalUsageRoutes, type BrutalBindings } from './route'

export default {
  fetch: (request, env, ctx) => brutalUsageRoutes.fetch(request, env, ctx),
  scheduled(controller, env, ctx) {
    ctx.waitUntil(expireUsage(env.DB, new Date(controller.scheduledTime)))
  }
} satisfies ExportedHandler<BrutalBindings>
