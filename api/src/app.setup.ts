import {
   BadRequestException,
   INestApplication,
   ValidationPipe
} from '@nestjs/common'
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface'

import { HttpExceptionFilter } from './common/filters/http-exception.filter'

/**
 * ValidationPipe with `transform: true` also coerces primitive route params
 * to their TypeScript type — `@Param('id') id: number` turns "1e3", "007" or
 * "0x10" into 1000 / 7 / 16 *before* a param-level pipe such as
 * ParsePositiveIntPipe sees them, which both defeats strict ID validation
 * and makes that pipe reject the already-converted number. Leave primitive
 * params as the raw string and let the dedicated pipe do the parsing; DTO
 * classes (body/query) are still validated and transformed as usual.
 */
class AppValidationPipe extends ValidationPipe {
   protected transformPrimitive(value: any) {
      return value
   }
}

// Local dev origins only (Vite dev server, preview, etc.).
const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

/**
 * Resolve the CORS policy from the environment.
 *
 *  - CORS_ORIGIN set  -> exactly those origins (comma separated). A literal
 *    "*" is honoured, because that is an explicit decision by the operator.
 *  - CORS_ORIGIN unset, NODE_ENV !== "production" -> localhost origins only.
 *  - CORS_ORIGIN unset, NODE_ENV === "production" -> CORS stays disabled
 *    (same-origin only). It is never silently wide open.
 */
export function resolveCorsOptions(
   env: NodeJS.ProcessEnv = process.env
): CorsOptions | false {
   const raw = env.CORS_ORIGIN?.trim()

   if (raw) {
      const origins = raw
         .split(',')
         .map((o) => o.trim())
         .filter(Boolean)

      return { origin: origins.includes('*') ? true : origins }
   }

   if (env.NODE_ENV === 'production') return false

   return { origin: DEV_ORIGIN }
}

/**
 * Shared bootstrap configuration. Used by main.ts and by the e2e tests so
 * HTTP regressions run through the same pipes/filters as production.
 */
export function configureApp(app: INestApplication) {
   const cors = resolveCorsOptions()
   if (cors) app.enableCors(cors)

   app.useGlobalPipes(
      new AppValidationPipe({
         whitelist: true,
         forbidNonWhitelisted: true,
         transform: true,
         exceptionFactory: (errors) => {
            const messages = errors.map((err) => {
               const constraints = Object.values(err.constraints || {})
               return `${err.property}: ${constraints.join(', ')}`
            })
            // NOTE: must throw an HttpException (not a plain Error),
            // otherwise HttpExceptionFilter's `instanceof HttpException`
            // check fails and every validation error is reported as a
            // generic 500 instead of a 400 with the real message.
            return new BadRequestException(messages.join(' | '))
         }
      })
   )

   app.useGlobalFilters(new HttpExceptionFilter())

   return app
}
