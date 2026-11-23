/**
 * Small in-memory stand-in for PrismaService, just rich enough for the
 * HTTP regression tests (no database needed). It implements only the calls
 * the services actually make, with the where-filters they use.
 */
type Row = Record<string, any>

const matches = (row: Row, where: Row = {}): boolean =>
  Object.entries(where).every(([key, cond]) => {
    if (key === 'slug_brandId')
      return row.slug === (cond as Row).slug && row.brandId === (cond as Row).brandId
    if (cond === null) return row[key] === null || row[key] === undefined
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('not' in cond) return cond.not === null ? row[key] != null : row[key] !== cond.not
      if ('in' in cond) return cond.in.includes(row[key])
    }
    return row[key] === cond
  })

export function createFakePrisma() {
  const seq = { article: 0, notification: 0, tag: 0, media: 0, articleMedia: 0 }

  const db = {
    brands: [{ id: 1, name: 'Brand' }] as Row[],
    categories: [{ id: 10, brandId: 1, name: 'Cat', slug: 'cat' }] as Row[],
    articles: [] as Row[],
    tags: [] as Row[],
    articleTags: [] as Row[],
    media: [] as Row[],
    articleMedia: [] as Row[],
    notifications: [] as Row[],
  }

  const decorate = (a: Row | null, include?: Row) => {
    if (!a) return null
    const out: Row = { ...a }
    if (include?.brand) out.brand = db.brands.find((b) => b.id === a.brandId)
    if (include?.category) out.category = db.categories.find((c) => c.id === a.categoryId)
    if (include?.tags)
      out.tags = db.articleTags
        .filter((t) => t.articleId === a.id)
        .map((t) => ({ ...t, tag: db.tags.find((x) => x.id === t.tagId) }))
    if (include?.media)
      out.media = db.articleMedia
        .filter((m) => m.articleId === a.id)
        .map((m) => ({ ...m, media: db.media.find((x) => x.id === m.mediaId) }))
    return out
  }

  const simpleModel = (rows: Row[]) => ({
    findMany: async ({ where }: Row = {}) => rows.filter((r) => matches(r, where)),
    findUnique: async ({ where }: Row) => rows.find((r) => matches(r, where)) ?? null,
  })

  const prisma: any = {
    brand: simpleModel(db.brands),
    category: simpleModel(db.categories),
    tag: {
      ...simpleModel(db.tags),
      findFirst: async ({ where }: Row) => db.tags.find((r) => matches(r, where)) ?? null,
      create: async ({ data }: Row) => {
        const row = { id: ++seq.tag, ...data }
        db.tags.push(row)
        return row
      },
    },
    articleTag: {
      createMany: async ({ data }: Row) => void db.articleTags.push(...data),
      deleteMany: async ({ where }: Row) => {
        db.articleTags = db.articleTags.filter((r) => !matches(r, where))
      },
    },
    media: {
      ...simpleModel(db.media),
    },
    articleMedia: {
      findMany: async ({ where }: Row = {}) => db.articleMedia.filter((r) => matches(r, where)),
      createMany: async ({ data }: Row) => {
        for (const d of data) db.articleMedia.push({ id: ++seq.articleMedia, ...d })
      },
      deleteMany: async ({ where }: Row) => {
        db.articleMedia = db.articleMedia.filter((r) => !matches(r, where))
      },
    },
    article: {
      create: async ({ data }: Row) => {
        const row = {
          id: ++seq.article,
          views: 0,
          readingTime: 0,
          featured: false,
          publishedAt: null,
          scheduledAt: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        }
        db.articles.push(row)
        return { ...row }
      },
      findUnique: async ({ where, include }: Row) =>
        decorate(db.articles.find((r) => matches(r, where)) ?? null, include),
      findFirst: async ({ where, include }: Row) =>
        decorate(db.articles.find((r) => matches(r, where)) ?? null, include),
      findMany: async ({ where, include }: Row = {}) =>
        db.articles
          .filter((r) => matches(r, where))
          .map((r) => decorate(r, include))
          .reverse(),
      update: async ({ where, data, include }: Row) => {
        const row = db.articles.find((r) => matches(r, where))
        if (!row) {
          const err: any = new Error('Record to update not found.')
          err.code = 'P2025'
          throw Object.assign(
            Object.create(require('@prisma/client').Prisma.PrismaClientKnownRequestError.prototype),
            { code: 'P2025', message: err.message, meta: {} },
          )
        }
        Object.assign(row, data, { updatedAt: new Date() })
        return decorate(row, include)
      },
    },
    notification: {
      create: async ({ data }: Row) => {
        const row = {
          id: ++seq.notification,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          ...data,
        }
        db.notifications.push(row)
        return { ...row }
      },
      findMany: async ({ where, take }: Row = {}) =>
        db.notifications
          .filter((r) => matches(r, where))
          .sort((a, b) => b.id - a.id)
          .slice(0, take ?? 1000),
      findUnique: async ({ where }: Row) => db.notifications.find((r) => matches(r, where)) ?? null,
      count: async ({ where }: Row = {}) => db.notifications.filter((r) => matches(r, where)).length,
      update: async ({ where, data }: Row) => {
        const row = db.notifications.find((r) => matches(r, where))!
        Object.assign(row, data)
        return { ...row }
      },
      updateMany: async ({ where, data }: Row) => {
        const rows = db.notifications.filter((r) => matches(r, where))
        rows.forEach((r) => Object.assign(r, data))
        return { count: rows.length }
      },
    },
    $transaction: async (cb: any) => cb(prisma),
    onModuleInit: async () => undefined,
    $connect: async () => undefined,
    $disconnect: async () => undefined,
  }

  return { prisma, db }
}
