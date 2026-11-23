import { Global, Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'

// Global so Articles and Media can record notifications without each
// module having to import this one explicitly.
@Global()
@Module({
   imports: [PrismaModule],
   controllers: [NotificationsController],
   providers: [NotificationsService],
   exports: [NotificationsService]
})
export class NotificationsModule { }
