import { Test, TestingModule } from '@nestjs/testing'
import {
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common'

jest.mock('../lib/cloudinary', () => ({
  CLOUDINARY_FOLDER: 'test-folder',
  cloudinary: {
    uploader: {
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
      upload_stream: jest.fn(),
    },
  },
}))

import { cloudinary } from '../lib/cloudinary'
import { MediaService } from './media.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { MAX_UPLOAD_BYTES } from './upload-validation'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0])

const file = (over: any = {}) =>
  ({
    originalname: 'a.png',
    mimetype: 'image/png',
    size: PNG.length,
    buffer: PNG,
    ...over,
  }) as any

describe('MediaService', () => {
  let service: MediaService
  let prisma: any
  let notifications: { notify: jest.Mock }

  beforeEach(async () => {
    jest.clearAllMocks()

    prisma = {
      media: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      articleMedia: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
      article: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
      $transaction: jest.fn(),
    }
    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma))
    notifications = { notify: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile()

    service = module.get(MediaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  // ----------------------------------------------------------------- upload
  describe('upload()', () => {
    const mockCloudinarySuccess = () =>
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((_opts, cb) => ({
        end: () => cb(null, { secure_url: 'https://cdn/a.png', public_id: 'test-folder/a' }),
      }))

    it('stores the media row and records a notification', async () => {
      mockCloudinarySuccess()
      prisma.media.create.mockResolvedValue({ id: 3, name: 'a.png' })

      const res = await service.upload(file())

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        { folder: 'test-folder', resource_type: 'image' },
        expect.any(Function),
      )
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: { name: 'a.png', url: 'https://cdn/a.png', publicId: 'test-folder/a' },
      })
      expect(res.id).toBe(3)
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'media', entityId: 3, type: 'success' }),
      )
    })

    it('rejects a missing file with 400', async () => {
      await expect(service.upload(undefined as any)).rejects.toThrow('No file uploaded')
    })

    it('rejects a non-image MIME type with 415', async () => {
      await expect(service.upload(file({ mimetype: 'application/pdf' }))).rejects.toBeInstanceOf(
        UnsupportedMediaTypeException,
      )
    })

    it('rejects SVG (script-capable) with 415', async () => {
      await expect(service.upload(file({ mimetype: 'image/svg+xml' }))).rejects.toBeInstanceOf(
        UnsupportedMediaTypeException,
      )
    })

    it('rejects content that does not match the declared type with 415', async () => {
      const fake = Buffer.from('<html><script>alert(1)</script></html>')
      await expect(service.upload(file({ buffer: fake, size: fake.length }))).rejects.toBeInstanceOf(
        UnsupportedMediaTypeException,
      )
      expect(prisma.media.create).not.toHaveBeenCalled()
    })

    it('rejects an oversized file with 413', async () => {
      await expect(service.upload(file({ size: MAX_UPLOAD_BYTES + 1 }))).rejects.toBeInstanceOf(
        PayloadTooLargeException,
      )
    })
  })

  // ------------------------------------------------------------------ reads
  describe('findOne()', () => {
    it('returns the media', async () => {
      prisma.media.findUnique.mockResolvedValue({ id: 1 })
      await expect(service.findOne(1)).resolves.toEqual({ id: 1 })
    })

    it('throws 404 instead of returning null', async () => {
      prisma.media.findUnique.mockResolvedValue(null)
      await expect(service.findOne(9)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  // ----------------------------------------------------------------- delete
  describe('remove()', () => {
    const media = { id: 4, name: 'x.png', url: 'https://cdn/x.png', publicId: 'f/x' }

    it('throws 404 for a missing media item', async () => {
      prisma.media.findUnique.mockResolvedValue(null)
      await expect(service.remove(4)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.media.delete).not.toHaveBeenCalled()
    })

    it('deletes unused media (DB row first, then Cloudinary) and notifies', async () => {
      prisma.media.findUnique.mockResolvedValue(media)
      prisma.media.delete.mockResolvedValue(media)

      await service.remove(4)

      expect(prisma.articleMedia.deleteMany).not.toHaveBeenCalled()
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 4 } })
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('f/x')
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'media', entityId: 4 }),
      )
    })

    it('returns 409 with the using articles when the media is still related', async () => {
      prisma.media.findUnique.mockResolvedValue(media)
      prisma.articleMedia.findMany.mockResolvedValue([
        { mediaId: 4, article: { id: 8, title: 'Post', deletedAt: null } },
      ])

      let error: any
      try {
        await service.remove(4)
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(ConflictException)
      expect(error.getResponse().details.articles).toEqual([{ id: 8, title: 'Post', deleted: false }])
      expect(prisma.media.delete).not.toHaveBeenCalled()
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled()
    })

    it('also treats a URL-only reference (legacy thumbnail column) as "in use"', async () => {
      prisma.media.findUnique.mockResolvedValue(media)
      prisma.article.findMany.mockResolvedValue([{ id: 2, title: 'Old', deletedAt: null }])

      await expect(service.remove(4)).rejects.toBeInstanceOf(ConflictException)
    })

    it('counts soft-deleted articles as users too (restoring would re-link it)', async () => {
      prisma.media.findUnique.mockResolvedValue(media)
      prisma.articleMedia.findMany.mockResolvedValue([
        { mediaId: 4, article: { id: 8, title: 'Gone', deletedAt: new Date() } },
      ])

      await expect(service.remove(4)).rejects.toBeInstanceOf(ConflictException)
    })

    it('force=true detaches every reference and then deletes', async () => {
      prisma.media.findUnique.mockResolvedValue(media)
      prisma.articleMedia.findMany.mockResolvedValue([
        { mediaId: 4, article: { id: 8, title: 'Post', deletedAt: null } },
      ])
      prisma.media.delete.mockResolvedValue(media)

      await service.remove(4, true)

      expect(prisma.articleMedia.deleteMany).toHaveBeenCalledWith({ where: { mediaId: 4 } })
      expect(prisma.article.updateMany).toHaveBeenCalledWith({
        where: { thumbnail: media.url },
        data: { thumbnail: null },
      })
      expect(prisma.article.updateMany).toHaveBeenCalledWith({
        where: { coverImage: media.url },
        data: { coverImage: null },
      })
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 4 } })
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'warning' }),
      )
    })

    it('does not fail when Cloudinary destroy rejects', async () => {
      prisma.media.findUnique.mockResolvedValue(media)
      prisma.media.delete.mockResolvedValue(media)
      ;(cloudinary.uploader.destroy as jest.Mock).mockRejectedValueOnce(new Error('boom'))

      await expect(service.remove(4)).resolves.toEqual(media)
    })
  })
})
