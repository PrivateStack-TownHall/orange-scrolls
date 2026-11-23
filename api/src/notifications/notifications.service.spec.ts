import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { PrismaService } from '../../prisma/prisma.service'

describe('NotificationsService', () => {
  let service: NotificationsService
  let prisma: any

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(NotificationsService)
  })

  describe('listing', () => {
    it('lists newest first', async () => {
      prisma.notification.findMany.mockResolvedValue([])
      await service.findAll()

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
      })
    })

    it('unreadOnly filters on isRead=false', async () => {
      prisma.notification.findMany.mockResolvedValue([])
      await service.findAll({ unreadOnly: true })

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isRead: false } }),
      )
    })

    it('caps the page size', async () => {
      prisma.notification.findMany.mockResolvedValue([])
      await service.findAll({ limit: 100000 })

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      )
    })

    it('counts unread', async () => {
      prisma.notification.count.mockResolvedValue(3)

      await expect(service.countUnread()).resolves.toEqual({ unread: 3 })
      expect(prisma.notification.count).toHaveBeenCalledWith({ where: { isRead: false } })
    })
  })

  describe('markRead()', () => {
    it('marks an unread notification as read with a readAt timestamp', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 1, isRead: false })
      prisma.notification.update.mockResolvedValue({ id: 1, isRead: true })

      await service.markRead(1)

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isRead: true, readAt: expect.any(Date) },
      })
    })

    it('is idempotent: an already-read notification keeps its readAt', async () => {
      const read = { id: 1, isRead: true, readAt: new Date('2024-01-01') }
      prisma.notification.findUnique.mockResolvedValue(read)

      await expect(service.markRead(1)).resolves.toBe(read)
      expect(prisma.notification.update).not.toHaveBeenCalled()
    })

    it('throws 404 for an unknown notification', async () => {
      prisma.notification.findUnique.mockResolvedValue(null)

      await expect(service.markRead(404)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.notification.update).not.toHaveBeenCalled()
    })
  })

  describe('markAllRead()', () => {
    it('only touches unread rows and reports how many changed', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 4 })

      await expect(service.markAllRead()).resolves.toEqual({ updated: 4 })
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      })
    })
  })

  describe('notify()', () => {
    it('stores entity / entityId and defaults the type to info', async () => {
      prisma.notification.create.mockResolvedValue({ id: 9 })

      await service.notify({ title: 'T', message: 'M', entity: 'article', entityId: 5 })

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { title: 'T', message: 'M', type: 'info', entity: 'article', entityId: 5 },
      })
    })

    it('never throws: a failing insert must not break the calling operation', async () => {
      prisma.notification.create.mockRejectedValue(new Error('db down'))

      await expect(service.notify({ title: 'T', message: 'M' })).resolves.toBeNull()
    })
  })
})
