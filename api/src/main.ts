import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import { BadRequestException, ValidationPipe } from '@nestjs/common'

import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn"]
  })

  app.enableCors()

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(err => {
          const constraints = Object.values(err.constraints || {})
          return `${err.property}: ${constraints.join(", ")}`
        })
        // NOTE: must throw an HttpException (not a plain Error), otherwise
        // HttpExceptionFilter's `instanceof HttpException` check fails and
        // every validation error gets reported to the client as a generic
        // 500 "Internal server error" instead of a 400 with the real message.
        return new BadRequestException(messages.join(" | "))
      }
    })
  )

  app.useGlobalFilters(new HttpExceptionFilter())

  const port = process.env.PORT || 3000

  await app.listen(port)

  console.log(`🚀 Orange Scrolls API running on port ${port}`)
}

bootstrap()