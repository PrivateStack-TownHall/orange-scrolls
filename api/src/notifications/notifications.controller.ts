import {
   Controller,
   Get,
   Param,
   Patch,
   Query
} from '@nestjs/common'

import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe'
import { NotificationsService } from './notifications.service'
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto'

@Controller('notifications')
export class NotificationsController {

   constructor(private readonly service: NotificationsService) { }

   @Get()
   findAll(@Query() query: ListNotificationsQueryDto) {
      return this.service.findAll({
         unreadOnly: query.unread === 'true',
         limit: query.limit
      })
   }

   @Get('unread-count')
   countUnread() {
      return this.service.countUnread()
   }

   // NOTE: declared before ':id/read' so "read-all" is never parsed as an id.
   @Patch('read-all')
   markAllRead() {
      return this.service.markAllRead()
   }

   @Patch(':id/read')
   markRead(@Param('id', ParsePositiveIntPipe) id: number) {
      return this.service.markRead(id)
   }

}
