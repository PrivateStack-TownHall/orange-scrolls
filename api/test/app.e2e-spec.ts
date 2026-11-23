import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'

import { AppModule } from '../src/app/app.module'
import { configureApp } from '../src/app.setup'
import { PrismaService } from '../prisma/prisma.service'
import { createFakePrisma } from './support/fake-prisma'

const article = (over: Record<string, unknown> = {}) => ({
  title: 'Hello world',
  slug: 'hello-world',
  brandId: 1,
  categoryId: 10,
  content: '<p>body</p>',
  author: 'Ada',
  status: 'Draft',
  visibility: 'Public',
  ...over,
})

describe('Orange Scrolls API (e2e, in-memory Prisma)', () => {
  let app: INestApplication<App>
  let db: ReturnType<typeof createFakePrisma>['db']

  beforeEach(async () => {
    const fake = createFakePrisma()
    db = fake.db

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fake.prisma)
      .compile()

    app = moduleRef.createNestApplication()
    // same pipes / filters / CORS as production (src/main.ts)
    configureApp(app)
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  const http = () => request(app.getHttpServer())

  // -------------------------------------------------------------------- root
  describe('root', () => {
    it('GET / returns the API status message', async () => {
      const res = await http().get('/').expect(200)
      expect(res.body).toEqual({ message: 'Content Operating System API SERVER' })
    })

    it('unknown routes return 404 JSON', async () => {
      const res = await http().get('/nope').expect(404)
      expect(res.body).toMatchObject({ success: false, statusCode: 404 })
    })
  })

  // ----------------------------------------------------------------- articles
  describe('articles CRUD', () => {
    it('creates, reads, lists and updates an article', async () => {
      const created = await http().post('/articles').send(article()).expect(201)
      expect(created.body).toMatchObject({ id: 1, slug: 'hello-world', status: 'Draft', author: 'Ada' })
      expect(created.body.media).toEqual([])

      await http().get('/articles/1').expect(200)
      await http().get('/articles/slug/hello-world').expect(200)

      const list = await http().get('/articles').expect(200)
      expect(list.body).toHaveLength(1)

      const updated = await http().put('/articles/1').send({ title: 'Renamed' }).expect(200)
      expect(updated.body.title).toBe('Renamed')
    })

    it('publishing sets publishedAt and a later Draft keeps it', async () => {
      await http().post('/articles').send(article()).expect(201)

      const published = await http().put('/articles/1').send({ status: 'Published' }).expect(200)
      expect(published.body.publishedAt).toBeTruthy()

      const back = await http().put('/articles/1').send({ status: 'Draft' }).expect(200)
      expect(back.body.publishedAt).toBe(published.body.publishedAt)
    })

    it('validation errors keep their message (400, not 500)', async () => {
      const res = await http().post('/articles').send({ title: '' }).expect(400)
      expect(res.body.statusCode).toBe(400)
      expect(res.body.message).toMatch(/slug/)
    })

    it('rejects a duplicate slug within the same brand', async () => {
      await http().post('/articles').send(article()).expect(201)
      const res = await http().post('/articles').send(article()).expect(400)
      expect(res.body.message).toMatch(/Slug already in use/)
    })

    it('soft delete hides the article everywhere, restore brings it back', async () => {
      await http().post('/articles').send(article()).expect(201)

      const del = await http().delete('/articles/1').expect(200)
      expect(del.body.deletedAt).toBeTruthy()

      // the row is still there (soft delete)…
      expect(db.articles).toHaveLength(1)
      // …but invisible to reads and writes
      await http().get('/articles/1').expect(404)
      await http().get('/articles/slug/hello-world').expect(404)
      await http().put('/articles/1').send({ title: 'x' }).expect(404)
      await http().delete('/articles/1').expect(404)
      expect((await http().get('/articles').expect(200)).body).toEqual([])

      // explicit opt-in lists the deleted ones
      const trash = await http().get('/articles?deleted=true').expect(200)
      expect(trash.body.map((a: any) => a.id)).toEqual([1])

      const restored = await http().post('/articles/1/restore').expect(201)
      expect(restored.body.deletedAt).toBeNull()
      await http().get('/articles/1').expect(200)

      // restoring something that is not deleted is a conflict
      await http().post('/articles/1/restore').expect(409)
    })

    it('missing articles return 404 (not 400 / null)', async () => {
      await http().get('/articles/999').expect(404)
      await http().get('/articles/slug/missing').expect(404)
      await http().put('/articles/999').send({ title: 'x' }).expect(404)
      await http().delete('/articles/999').expect(404)
      await http().post('/articles/999/restore').expect(404)
    })

    it('creating and deleting an article produces notifications', async () => {
      await http().post('/articles').send(article()).expect(201)
      await http().delete('/articles/1').expect(200)

      const res = await http().get('/notifications').expect(200)
      expect(res.body.map((n: any) => n.title)).toEqual(['Article deleted', 'Article created'])
      expect(res.body[0]).toMatchObject({ entity: 'article', entityId: 1, isRead: false })
    })
  })

  // ------------------------------------------------------------ notifications
  describe('notifications', () => {
    const seed = async () => {
      await http().post('/articles').send(article()).expect(201)
      await http().post('/articles').send(article({ slug: 'second' })).expect(201)
    }

    it('lists, counts, marks one read and marks all read', async () => {
      await seed()

      expect((await http().get('/notifications/unread-count').expect(200)).body).toEqual({ unread: 2 })

      const one = await http().patch('/notifications/1/read').expect(200)
      expect(one.body).toMatchObject({ id: 1, isRead: true })
      expect(one.body.readAt).toBeTruthy()

      expect((await http().get('/notifications?unread=true').expect(200)).body).toHaveLength(1)

      expect((await http().patch('/notifications/read-all').expect(200)).body).toEqual({ updated: 1 })
      expect((await http().get('/notifications/unread-count').expect(200)).body).toEqual({ unread: 0 })
    })

    it('returns 404 for an unknown notification', async () => {
      await http().patch('/notifications/999/read').expect(404)
    })

    it('rejects bad query values with 400', async () => {
      await http().get('/notifications?unread=maybe').expect(400)
      await http().get('/notifications?limit=0').expect(400)
    })
  })

  // --------------------------------------------------------------- invalid IDs
  describe('invalid :id', () => {
    it.each(['abc', '0', '-1', '1.5', '12abc', '1e3', '007', '0x10'])('GET /articles/%s -> 400', async (id) => {
      const res = await http().get(`/articles/${id}`).expect(400)
      expect(res.body.message).toBe('id must be a positive integer')
    })

    it.each([
      ['put', '/articles/abc'],
      ['delete', '/articles/0'],
      ['post', '/articles/abc/restore'],
      ['patch', '/notifications/abc/read'],
      ['get', '/brands/abc'],
      ['get', '/categories/-3'],
      ['get', '/tags/x'],
      ['delete', '/media/abc'],
      ['get', '/media/0'],
    ])('%s %s -> 400', async (method, url) => {
      await (http() as any)[method](url).send({}).expect(400)
    })

    it('missing brand / media return 404', async () => {
      await http().get('/brands/999').expect(404)
      await http().get('/media/999').expect(404)
    })
  })
})
