import { Test, TestingModule } from '@nestjs/testing'
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { ArticlesService } from './articles.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

const createPrismaMock = () => {
  const prisma: any = {
    article: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    brand: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    category: { findUnique: jest.fn().mockResolvedValue({ id: 10, brandId: 1 }) },
    tag: { findFirst: jest.fn(), create: jest.fn() },
    articleTag: { createMany: jest.fn(), deleteMany: jest.fn() },
    articleMedia: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    media: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  }
  prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma))
  return prisma
}

const baseCreate = {
  title: 'T',
  slug: 's',
  brandId: 1,
  categoryId: 10,
  content: 'c',
  status: 'Draft',
  visibility: 'Public',
}

describe('ArticlesService lifecycle', () => {
  let service: ArticlesService
  let prisma: any
  let notifications: { notify: jest.Mock }

  beforeEach(async () => {
    prisma = createPrismaMock()
    notifications = { notify: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile()

    service = module.get(ArticlesService)
  })

  // --------------------------------------------------------------- soft delete
  describe('soft delete and restore', () => {
    it('remove() sets deletedAt instead of deleting the row', async () => {
      prisma.article.findFirst.mockResolvedValueOnce({ id: 5, title: 'Hello' })
      prisma.article.update.mockResolvedValueOnce({ id: 5, deletedAt: new Date() })

      await service.remove(5)

      expect(prisma.article.findFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
      })
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { deletedAt: expect.any(Date) },
      })
      expect((prisma.article as any).delete).toBeUndefined()
    })

    it('remove() throws 404 for a missing or already-deleted article', async () => {
      prisma.article.findFirst.mockResolvedValueOnce(null)

      await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.article.update).not.toHaveBeenCalled()
      expect(notifications.notify).not.toHaveBeenCalled()
    })

    it('restore() clears deletedAt and returns the article with relations', async () => {
      prisma.article.findUnique.mockResolvedValueOnce({
        id: 5,
        title: 'Hello',
        deletedAt: new Date(),
      })
      prisma.article.update.mockResolvedValueOnce({ id: 5, deletedAt: null })

      const res = await service.restore(5)

      expect(prisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 }, data: { deletedAt: null } }),
      )
      expect(res.deletedAt).toBeNull()
    })

    it('restore() throws 404 when the article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValueOnce(null)
      await expect(service.restore(404)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('restore() throws 409 when the article is not deleted', async () => {
      prisma.article.findUnique.mockResolvedValueOnce({ id: 5, deletedAt: null })
      await expect(service.restore(5)).rejects.toBeInstanceOf(ConflictException)
      expect(prisma.article.update).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------ deleted articles hidden
  describe('deleted articles are excluded', () => {
    it('findAll() only returns live articles by default', async () => {
      prisma.article.findMany.mockResolvedValueOnce([])

      await service.findAll()

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      )
    })

    it('findAll({ deleted: true }) is the explicit opt-in for the Deleted view', async () => {
      prisma.article.findMany.mockResolvedValueOnce([])

      await service.findAll({ deleted: true })

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: { not: null } } }),
      )
    })

    it('findOne() filters deletedAt and returns 404 for a deleted article', async () => {
      prisma.article.findFirst.mockResolvedValueOnce(null)

      await expect(service.findOne(5)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.article.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5, deletedAt: null } }),
      )
    })

    it('findOneBySlug() filters deletedAt', async () => {
      prisma.article.findFirst.mockResolvedValueOnce(null)

      await expect(service.findOneBySlug('gone')).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.article.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'gone', deletedAt: null } }),
      )
    })

    it('update() cannot modify a deleted article (404, nothing written)', async () => {
      prisma.article.findFirst.mockResolvedValueOnce(null)

      await expect(service.update(5, { title: 'x' } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(prisma.article.findFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
      })
      expect(prisma.article.update).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------- publishedAt / scheduledAt
  describe('publishedAt / scheduledAt', () => {
    const created = (data: any) => {
      prisma.article.findFirst.mockResolvedValue(null)
      prisma.article.findUnique.mockResolvedValue(null)
      prisma.article.create.mockResolvedValue({ id: 1, brandId: 1 })
      return service.create({ ...baseCreate, ...data } as any)
    }

    it('create() as Published sets publishedAt when none is given', async () => {
      await created({ status: 'Published' })

      const data = prisma.article.create.mock.calls[0][0].data
      expect(data.publishedAt).toBeInstanceOf(Date)
    })

    it('create() as Published keeps a supplied (past) publishedAt', async () => {
      await created({ status: 'Published', publishedAt: '2020-01-02T03:04:05.000Z' })

      const data = prisma.article.create.mock.calls[0][0].data
      expect(data.publishedAt.toISOString()).toBe('2020-01-02T03:04:05.000Z')
    })

    it('create() as Draft does not invent a publishedAt', async () => {
      await created({ status: 'Draft' })

      expect(prisma.article.create.mock.calls[0][0].data.publishedAt).toBeUndefined()
    })

    it('create() as Draft stores a future scheduledAt', async () => {
      const when = new Date(Date.now() + 86_400_000).toISOString()
      await created({ status: 'Draft', scheduledAt: when })

      expect(prisma.article.create.mock.calls[0][0].data.scheduledAt.toISOString()).toBe(when)
    })

    it('create() as Published rejects a future publishedAt', async () => {
      const when = new Date(Date.now() + 86_400_000).toISOString()

      await expect(created({ status: 'Published', publishedAt: when })).rejects.toBeInstanceOf(
        BadRequestException,
      )
      expect(prisma.article.create).not.toHaveBeenCalled()
    })

    it('create() as Published rejects a future scheduledAt', async () => {
      const when = new Date(Date.now() + 86_400_000).toISOString()

      await expect(created({ status: 'Published', scheduledAt: when })).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('create() rejects an unparseable date', async () => {
      await expect(created({ publishedAt: 'not-a-date' })).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('update() Draft -> Published sets publishedAt', async () => {
      prisma.article.findFirst
        .mockResolvedValueOnce({ id: 1, brandId: 1, categoryId: 10, status: 'Draft', publishedAt: null, scheduledAt: null })
      prisma.article.update.mockResolvedValue({ id: 1, brandId: 1 })
      prisma.article.findUnique.mockResolvedValue({ id: 1, status: 'Published', title: 'T' })

      await service.update(1, { status: 'Published' } as any)

      const data = prisma.article.update.mock.calls[0][0].data
      expect(data.publishedAt).toBeInstanceOf(Date)
    })

    it('update() Published -> Draft / Archived keeps the existing publishedAt (history)', async () => {
      const original = new Date('2024-05-05T00:00:00.000Z')

      for (const status of ['Draft', 'Archived']) {
        prisma.article.update.mockClear()
        prisma.article.findFirst.mockResolvedValueOnce({
          id: 1, brandId: 1, categoryId: 10, status: 'Published', publishedAt: original, scheduledAt: null,
        })
        prisma.article.update.mockResolvedValue({ id: 1, brandId: 1 })
        prisma.article.findUnique.mockResolvedValue({ id: 1, status, title: 'T' })

        await service.update(1, { status } as any)

        const data = prisma.article.update.mock.calls[0][0].data
        expect(data.status).toBe(status)
        expect(data).not.toHaveProperty('publishedAt') // untouched, not nulled
      }
    })

    it('update() never clears publishedAt when the payload sends it blank', async () => {
      prisma.article.findFirst.mockResolvedValueOnce({
        id: 1, brandId: 1, categoryId: 10, status: 'Draft', publishedAt: new Date(), scheduledAt: null,
      })
      prisma.article.update.mockResolvedValue({ id: 1, brandId: 1 })
      prisma.article.findUnique.mockResolvedValue({ id: 1, status: 'Draft', title: 'T' })

      await service.update(1, { title: 'x', publishedAt: '' } as any)

      expect(prisma.article.update.mock.calls[0][0].data).not.toHaveProperty('publishedAt')
    })

    it('update() clears scheduledAt when it is sent blank/null', async () => {
      prisma.article.findFirst.mockResolvedValueOnce({
        id: 1, brandId: 1, categoryId: 10, status: 'Draft', publishedAt: null, scheduledAt: new Date(),
      })
      prisma.article.update.mockResolvedValue({ id: 1, brandId: 1 })
      prisma.article.findUnique.mockResolvedValue({ id: 1, status: 'Draft', title: 'T' })

      await service.update(1, { scheduledAt: null } as any)

      expect(prisma.article.update.mock.calls[0][0].data.scheduledAt).toBeNull()
    })

    it('update() publishing now supersedes a pending future schedule', async () => {
      prisma.article.findFirst.mockResolvedValueOnce({
        id: 1, brandId: 1, categoryId: 10, status: 'Draft', publishedAt: null,
        scheduledAt: new Date(Date.now() + 86_400_000),
      })
      prisma.article.update.mockResolvedValue({ id: 1, brandId: 1 })
      prisma.article.findUnique.mockResolvedValue({ id: 1, status: 'Published', title: 'T' })

      await service.update(1, { status: 'Published' } as any)

      const data = prisma.article.update.mock.calls[0][0].data
      expect(data.scheduledAt).toBeNull()
      expect(data.publishedAt).toBeInstanceOf(Date)
    })
  })

  // ------------------------------------------------------------- ArticleMedia
  describe('ArticleMedia', () => {
    const mediaRows = [
      { id: 1, url: 'https://cdn/thumb.png' },
      { id: 2, url: 'https://cdn/cover.png' },
      { id: 3, url: 'https://cdn/g1.png' },
    ]

    it('create() creates thumbnail, cover and gallery relations and mirrors the URL columns', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      prisma.article.create.mockResolvedValue({ id: 7, brandId: 1 })
      prisma.media.findMany.mockResolvedValue(mediaRows)

      await service.create({
        ...baseCreate,
        media: [
          { mediaId: 1, type: 'thumbnail' },
          { mediaId: 2, type: 'cover' },
          { mediaId: 3, type: 'gallery' },
        ],
      } as any)

      const data = prisma.article.create.mock.calls[0][0].data
      expect(data).not.toHaveProperty('media')
      expect(data.thumbnail).toBe('https://cdn/thumb.png')
      expect(data.coverImage).toBe('https://cdn/cover.png')

      expect(prisma.articleMedia.createMany).toHaveBeenCalledWith({
        data: [
          { articleId: 7, mediaId: 1, type: 'thumbnail' },
          { articleId: 7, mediaId: 2, type: 'cover' },
          { articleId: 7, mediaId: 3, type: 'gallery' },
        ],
      })
    })

    it('create() rejects media ids that do not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      prisma.media.findMany.mockResolvedValue([mediaRows[0]])

      await expect(
        service.create({
          ...baseCreate,
          media: [{ mediaId: 1, type: 'thumbnail' }, { mediaId: 42, type: 'gallery' }],
        } as any),
      ).rejects.toThrow('Media not found: 42')

      expect(prisma.article.create).not.toHaveBeenCalled()
    })

    it('rejects two thumbnails (or two covers) on one article', async () => {
      prisma.article.findUnique.mockResolvedValue(null)

      await expect(
        service.create({
          ...baseCreate,
          media: [{ mediaId: 1, type: 'thumbnail' }, { mediaId: 2, type: 'thumbnail' }],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('update() adds new relations and removes the ones that are no longer wanted', async () => {
      prisma.article.findFirst.mockResolvedValueOnce({
        id: 7, brandId: 1, categoryId: 10, status: 'Draft', publishedAt: null, scheduledAt: null,
      })
      prisma.article.update.mockResolvedValue({ id: 7, brandId: 1 })
      prisma.article.findUnique.mockResolvedValue({ id: 7, status: 'Draft', title: 'T' })
      prisma.media.findMany.mockResolvedValue(mediaRows)
      prisma.articleMedia.findMany.mockResolvedValue([
        { id: 100, articleId: 7, mediaId: 1, type: 'thumbnail' }, // stays
        { id: 101, articleId: 7, mediaId: 2, type: 'cover' },     // removed
      ])

      await service.update(7, {
        media: [
          { mediaId: 1, type: 'thumbnail' },
          { mediaId: 3, type: 'gallery' }, // added
        ],
      } as any)

      expect(prisma.articleMedia.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [101] } } })
      expect(prisma.articleMedia.createMany).toHaveBeenCalledWith({
        data: [{ articleId: 7, mediaId: 3, type: 'gallery' }],
      })

      // the cover relation is gone, so the mirrored column is cleared too
      const data = prisma.article.update.mock.calls[0][0].data
      expect(data.thumbnail).toBe('https://cdn/thumb.png')
      expect(data.coverImage).toBeNull()
    })

    it('update() with media: [] removes every relation', async () => {
      prisma.article.findFirst.mockResolvedValueOnce({
        id: 7, brandId: 1, categoryId: 10, status: 'Draft', publishedAt: null, scheduledAt: null,
      })
      prisma.article.update.mockResolvedValue({ id: 7, brandId: 1 })
      prisma.article.findUnique.mockResolvedValue({ id: 7, status: 'Draft', title: 'T' })
      prisma.articleMedia.findMany.mockResolvedValue([
        { id: 100, articleId: 7, mediaId: 1, type: 'thumbnail' },
        { id: 101, articleId: 7, mediaId: 3, type: 'gallery' },
      ])

      await service.update(7, { media: [] } as any)

      expect(prisma.articleMedia.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [100, 101] } } })
      expect(prisma.articleMedia.createMany).not.toHaveBeenCalled()
    })

    it('update() without a media key leaves relations alone', async () => {
      prisma.article.findFirst.mockResolvedValueOnce({
        id: 7, brandId: 1, categoryId: 10, status: 'Draft', publishedAt: null, scheduledAt: null,
      })
      prisma.article.update.mockResolvedValue({ id: 7, brandId: 1 })
      prisma.article.findUnique.mockResolvedValue({ id: 7, status: 'Draft', title: 'T' })

      await service.update(7, { title: 'only title' } as any)

      expect(prisma.articleMedia.findMany).not.toHaveBeenCalled()
      expect(prisma.articleMedia.deleteMany).not.toHaveBeenCalled()
      expect(prisma.articleMedia.createMany).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------- notifications
  describe('notifications', () => {
    it('create / update / remove / restore each record a notification', async () => {
      prisma.article.findUnique.mockResolvedValueOnce(null) // slug is free
      prisma.article.create.mockResolvedValue({ id: 1, brandId: 1 })
      prisma.article.findUnique.mockResolvedValue({ id: 1, title: 'T', status: 'Draft' })
      await service.create(baseCreate as any)

      prisma.article.findFirst.mockResolvedValueOnce({
        id: 1, brandId: 1, categoryId: 10, status: 'Draft', publishedAt: null, scheduledAt: null,
      })
      prisma.article.update.mockResolvedValue({ id: 1, brandId: 1 })
      await service.update(1, { title: 'x' } as any)

      prisma.article.findFirst.mockResolvedValueOnce({ id: 1, title: 'T' })
      await service.remove(1)

      prisma.article.findUnique.mockResolvedValueOnce({ id: 1, title: 'T', deletedAt: new Date() })
      await service.restore(1)

      const titles = notifications.notify.mock.calls.map((c) => c[0].title)
      expect(titles).toEqual([
        'Article created',
        'Article updated',
        'Article deleted',
        'Article restored',
      ])
      for (const [arg] of notifications.notify.mock.calls) {
        expect(arg).toMatchObject({ entity: 'article', entityId: 1 })
      }
    })
  })
})
