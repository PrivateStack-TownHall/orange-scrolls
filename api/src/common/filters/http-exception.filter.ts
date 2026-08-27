import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'

import { Prisma } from '@prisma/client'

// Single catch-all global filter. This used to be split across two
// separate filter classes (one @Catch(Prisma.PrismaClientKnownRequestError),
// one bare @Catch() as a fallback). NestJS's rules for which filter "wins"
// when several are registered globally aren't something to rely on for
// correctness — merging them into one filter removes that ambiguity
// entirely: every exception goes through exactly one place, checked in
// the explicit order below.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost) {

    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    // 1. Known Prisma errors (unique constraint violations, missing
    //    foreign keys, record-not-found, etc.) — map to a clear 400.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`Prisma ${exception.code}: ${exception.message}`)

      let message = "Database error"

      if (exception.code === "P2002") {
        // meta.target lists which column(s) collided. When it's the
        // primary key ("id") rather than a real business field (name,
        // slug, ...), this isn't a duplicate the user created — it means
        // the table's auto-increment sequence has fallen behind the
        // actual max id (usually from a seed script that inserted
        // explicit ids). See README/notes for the fix (reset the
        // sequence with setval()).
        const target = Array.isArray(exception.meta?.target)
          ? (exception.meta?.target as string[])
          : []

        message = target.includes("id")
          ? "Database ID sequence is out of sync for this table — this is a server-side data issue, not something wrong with your input. See the backend logs / README for how to reset it."
          : `Duplicate value for: ${target.join(", ") || "a unique field"}`
      }

      if (exception.code === "P2003") {
        message =
          "This record can't be deleted or saved because it's still linked to other data (e.g. a category still has articles under it)."
      }

      if (exception.code === "P2025") {
        message = "Record not found"
      }

      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        statusCode: 400,
        message,
        code: exception.code,
        meta: exception.meta
      })

      return
    }

    // 2. Ordinary Nest HttpExceptions (BadRequestException,
    //    NotFoundException, the ValidationPipe's exceptionFactory, etc.)
    if (exception instanceof HttpException) {

      const status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      let message = "Internal server error"

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse
      }

      if (typeof exceptionResponse === "object") {
        const res: any = exceptionResponse
        message = res.message || message
      }

      response.status(status).json({
        success: false,
        statusCode: status,
        message
      })

      return
    }

    // 3. Anything else is unexpected — log the full stack trace so a 500
    //    is actually diagnosable from the server console, then return a
    //    generic message to the client (never leak internals).
    const err = exception as any
    this.logger.error(err?.message || 'Unhandled exception', err?.stack)

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error"
    })
  }
}
