import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import { configureApp } from './app.setup'

async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn"]
  })

  // CORS, ValidationPipe and HttpExceptionFilter live in app.setup.ts so
  // the e2e tests exercise exactly the same configuration.
  configureApp(app)

  const port = process.env.PORT || 3000

  await app.listen(port)

  console.log(`🚀 Orange Scrolls API running on port ${port}`)
}

bootstrap()
