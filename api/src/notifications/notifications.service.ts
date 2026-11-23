import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type NotificationEntity = 'article' | 'media' | 'system'

export interface NotifyInput {
   title: string
   message: string
   type?: NotificationType
   entity?: NotificationEntity
   entityId?: number | null
}

// Upper bound for one list response — the bell only shows recent items.
const MAX_LIST = 100

@Injectable()
export class NotificationsService {
   private readonly logger = new Logger(NotificationsService.name)

   constructor(private prisma: PrismaService) { }

   //// LIST (newest first, optionally unread only)
   async findAll(options: { unreadOnly?: boolean; limit?: number } = {}) {
      const take = Math.min(Math.max(options.limit ?? 50, 1), MAX_LIST)

      return this.prisma.notification.findMany({
         where: options.unreadOnly ? { isRead: false } : undefined,
         orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
         take
      })
   }

   //// UNREAD COUNT
   async countUnread() {
      const unread = await this.prisma.notification.count({
         where: { isRead: false }
      })

      return { unread }
   }

   //// MARK ONE AS READ (idempotent — keeps the original readAt)
   async markRead(id: number) {
      const existing = await this.prisma.notification.findUnique({
         where: { id }
      })

      if (!existing)
         throw new NotFoundException('Notification not found')

      if (existing.isRead) return existing

      return this.prisma.notification.update({
         where: { id },
         data: { isRead: true, readAt: new Date() }
      })
   }

   //// MARK EVERYTHING AS READ
   async markAllRead() {
      const result = await this.prisma.notification.updateMany({
         where: { isRead: false },
         data: { isRead: true, readAt: new Date() }
      })

      return { updated: result.count }
   }

   /**
    * Record a notification. This is a side effect of other operations
    * (article/media changes) and must never make them fail, so errors are
    * logged and swallowed. Returns null when nothing could be stored.
    */
   async notify(input: NotifyInput) {
      try {
         return await this.prisma.notification.create({
            data: {
               title: input.title,
               message: input.message,
               type: input.type ?? 'info',
               entity: input.entity ?? null,
               entityId: input.entityId ?? null
            }
         })
      } catch (err: any) {
         this.logger.warn(
            `Could not create notification "${input.title}": ${err?.message}`
         )
         return null
      }
   }
}
