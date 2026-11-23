import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateArticleDto, ArticleMediaItemDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'

const ARTICLE_INCLUDE = {
   brand: true,
   category: true,
   tags: {
      include: {
         tag: true
      }
   },
   // Thumbnail / cover / gallery relations with the Media row attached.
   media: {
      include: {
         media: true
      },
      orderBy: {
         id: 'asc' as const
      }
   }
}

// Used when a create request has no author (auth does not exist yet, so
// there is no current identity to fall back on).
export const DEFAULT_AUTHOR = 'Unassigned'

// The slug unique index also covers soft-deleted articles, so a deleted
// article still "owns" its slug until it is restored or the slug is changed.
const SLUG_IN_USE =
   "Slug already in use for this brand (it may belong to a deleted article)"

const REQUIRED_FIELDS = [
   'title',
   'slug',
   'brandId',
   'categoryId',
   'content',
   'status',
   'visibility'
]

// Optional/nullable columns on Article. When one of these arrives as an
// empty string, treat it as "the user cleared this field" (-> null) rather
// than silently dropping it. Otherwise there's no way to remove an
// excerpt/thumbnail/SEO value once it's been set on Edit.
//
// scheduledAt is in this list (clearing a plan is legitimate); publishedAt is
// deliberately NOT: it is history, so a blank value never wipes it.
const NULLABLE_FIELDS = [
   'scheduledAt',
   'excerpt',
   'thumbnail',
   'coverImage',
   'seoTitle',
   'seoDescription',
   'canonicalUrl'
]

@Injectable()
export class ArticlesService {
   constructor(
      private prisma: PrismaService,
      private notifications: NotificationsService
   ) { }

   //// CLEAN EMPTY VALUES
   private cleanData(data: any) {
      const cleaned: any = {}

      for (const key in data) {
         const value = data[key]

         if (value === undefined) continue

         const isBlank =
            value === null ||
            (typeof value === "string" && value.trim() === "")

         if (isBlank) {
            // Blank optional fields become an explicit null (clears the
            // value). Blank required fields are dropped instead of being
            // written — an update payload with an empty title shouldn't be
            // able to null out a required column.
            if (NULLABLE_FIELDS.includes(key)) {
               cleaned[key] = null
            }
            continue
         }

         cleaned[key] = value
      }

      return cleaned
   }

   //// VALIDATE REQUIRED FIELDS (defense in depth alongside the DTO)
   private assertRequiredFields(data: Record<string, any>) {
      const missing = REQUIRED_FIELDS.filter(key => {
         const value = data[key]
         return (
            value === undefined ||
            value === null ||
            (typeof value === "string" && value.trim() === "")
         )
      })

      if (missing.length) {
         throw new BadRequestException(
            `Missing required field(s): ${missing.join(", ")}`
         )
      }
   }

   //// VALIDATE BRAND/CATEGORY RELATION
   private async assertCategoryBelongsToBrand(
      tx: any,
      brandId: number,
      categoryId: number
   ) {
      // NOTE: these must run sequentially, not via Promise.all(). Prisma's
      // interactive transactions (`$transaction(async (tx) => ...)`) hold a
      // single underlying connection — firing two queries at once on the
      // same `tx` races against that connection and can throw or behave
      // unpredictably instead of the two clean `findUnique` calls we want.
      const brand = await tx.brand.findUnique({ where: { id: brandId } })
      const category = await tx.category.findUnique({ where: { id: categoryId } })

      if (!brand)
         throw new BadRequestException("Brand not found")

      if (!category)
         throw new BadRequestException("Category not found")

      if (category.brandId !== brandId)
         throw new BadRequestException(
            "Category does not belong to the selected brand"
         )
   }

   //// VALIDATE SLUG UNIQUENESS ON CREATE (matches the @@unique([slug, brandId]) constraint)
   private async assertSlugAvailableForCreate(
      tx: any,
      slug: string,
      brandId: number
   ) {
      const existing = await tx.article.findUnique({
         where: { slug_brandId: { slug, brandId } }
      })

      if (existing)
         throw new BadRequestException(SLUG_IN_USE)
   }

   //// VALIDATE SLUG UNIQUENESS ON UPDATE (must exclude the article being edited)
   private async assertSlugAvailableForUpdate(
      tx: any,
      slug: string,
      brandId: number,
      excludeId: number
   ) {
      const existing = await tx.article.findFirst({
         where: {
            slug,
            brandId,
            id: { not: excludeId }
         }
      })

      if (existing)
         throw new BadRequestException(SLUG_IN_USE)
   }

   //// HANDLE TAGS (supports existing tag ids AND tag names, find-or-create)
   private async handleTags(
      tx: any,
      articleId: number,
      brandId: number,
      tags?: string[],
      tagIds?: number[]
   ) {
      const ids = new Set<number>()

      for (const id of tagIds || []) {
         if (typeof id === "number") ids.add(id)
      }

      // NORMALIZE TAG NAMES
      const tagNames = (tags || [])
         .map(t => t.trim().toLowerCase())
         .filter(Boolean)

      // FIND OR CREATE EACH NAMED TAG
      for (const name of tagNames) {
         let tag = await tx.tag.findFirst({
            where: { brandId, name }
         })

         if (!tag) {
            tag = await tx.tag.create({
               data: { name, brandId }
            })
         }

         ids.add(tag.id)
      }

      if (!ids.size) return

      // CREATE ARTICLE TAG RELATIONS
      await tx.articleTag.createMany({
         data: Array.from(ids).map(tagId => ({
            articleId,
            tagId
         }))
      })
   }

   //// PARSE + VALIDATE publishedAt / scheduledAt and keep them consistent
   //
   // Rules:
   //  - Published: publishedAt is set to "now" when it was never set; an
   //    explicit publishedAt may not be in the future.
   //  - Published + an explicit future scheduledAt is contradictory -> 400.
   //    Publishing without an explicit scheduledAt supersedes a pending
   //    (future) schedule, which is cleared. A past scheduledAt is history.
   //  - Draft / Archived: dates are stored as given and publishedAt is
   //    NEVER cleared — the publication history is preserved.
   private applyDates(
      cleaned: Record<string, any>,
      existing?: {
         status: string
         publishedAt: Date | null
         scheduledAt: Date | null
         createdAt?: Date
      }
   ) {
      const now = new Date()

      for (const key of ['publishedAt', 'scheduledAt'] as const) {
         const value = cleaned[key]

         if (value === undefined || value === null) continue

         const date = new Date(value)

         if (Number.isNaN(date.getTime()))
            throw new BadRequestException(`${key} must be a valid date`)

         cleaned[key] = date
      }

      const status = cleaned.status ?? existing?.status

      if (status !== 'Published') return

      if (cleaned.publishedAt && cleaned.publishedAt.getTime() > now.getTime())
         throw new BadRequestException(
            'publishedAt cannot be in the future for a Published article. Keep it as Draft and use scheduledAt instead.'
         )

      if (cleaned.scheduledAt && cleaned.scheduledAt.getTime() > now.getTime())
         throw new BadRequestException(
            'A Published article cannot have a future scheduledAt. Keep it as Draft until then, or clear scheduledAt.'
         )

      if (!cleaned.publishedAt && !existing?.publishedAt) {
         // Newly published -> now. An already-Published legacy row that never
         // got a publishedAt is backfilled from its creation time instead of
         // pretending it was published at the moment of this edit.
         cleaned.publishedAt =
            existing?.status === 'Published' && existing.createdAt
               ? existing.createdAt
               : now
      }

      // Publishing now overrides a still-pending schedule.
      if (cleaned.scheduledAt === undefined && existing?.scheduledAt && existing.scheduledAt.getTime() > now.getTime())
         cleaned.scheduledAt = null
   }

   //// VALIDATE A MEDIA SET (thumbnail / cover / gallery)
   //
   // Returns the de-duplicated desired relations, and the URLs that should
   // mirror thumbnail/cover on the Article columns.
   private async planMedia(tx: any, items: ArticleMediaItemDto[]) {
      const seen = new Set<string>()
      const desired: { mediaId: number; type: string }[] = []

      for (const item of items) {
         const key = `${item.mediaId}:${item.type}`
         if (seen.has(key)) continue
         seen.add(key)
         desired.push({ mediaId: item.mediaId, type: item.type })
      }

      for (const single of ['thumbnail', 'cover']) {
         if (desired.filter(d => d.type === single).length > 1)
            throw new BadRequestException(`An article can only have one ${single} image`)
      }

      const ids = Array.from(new Set(desired.map(d => d.mediaId)))
      const found = ids.length
         ? await tx.media.findMany({ where: { id: { in: ids } } })
         : []

      const missing = ids.filter(id => !found.some((m: any) => m.id === id))

      if (missing.length)
         throw new BadRequestException(`Media not found: ${missing.join(', ')}`)

      const urlOf = (type: string) => {
         const rel = desired.find(d => d.type === type)
         return rel ? found.find((m: any) => m.id === rel.mediaId)?.url ?? null : null
      }

      return {
         desired,
         thumbnail: urlOf('thumbnail') as string | null,
         coverImage: urlOf('cover') as string | null
      }
   }

   //// MAKE THE ARTICLE'S ArticleMedia ROWS MATCH THE DESIRED SET
   // Only the difference is written: relations that stay are untouched,
   // removed ones are deleted, new ones are created.
   private async syncMedia(
      tx: any,
      articleId: number,
      desired: { mediaId: number; type: string }[]
   ) {
      const current = await tx.articleMedia.findMany({ where: { articleId } })

      const keyOf = (r: { mediaId: number; type: string }) => `${r.mediaId}:${r.type}`
      const wanted = new Set(desired.map(keyOf))
      const have = new Set<string>(current.map(keyOf))

      const removeIds = current.filter((r: any) => !wanted.has(keyOf(r))).map((r: any) => r.id)
      const toCreate = desired.filter(d => !have.has(keyOf(d)))

      if (removeIds.length)
         await tx.articleMedia.deleteMany({ where: { id: { in: removeIds } } })

      if (toCreate.length)
         await tx.articleMedia.createMany({
            data: toCreate.map(d => ({ articleId, mediaId: d.mediaId, type: d.type }))
         })
   }

   // Keep the legacy thumbnail/coverImage URL columns in step with the
   // relations, unless the caller set those columns explicitly.
   private mirrorMediaColumns(
      cleaned: Record<string, any>,
      plan: { thumbnail: string | null; coverImage: string | null }
   ) {
      if (!('thumbnail' in cleaned)) cleaned.thumbnail = plan.thumbnail
      if (!('coverImage' in cleaned)) cleaned.coverImage = plan.coverImage
   }

   //// CREATE ARTICLE
   async create(data: CreateArticleDto) {

      const { tags, tagIds, media, ...articleData } = data as any

      const cleanedData = this.cleanData(articleData)

      if (!cleanedData.author) cleanedData.author = DEFAULT_AUTHOR

      this.assertRequiredFields(cleanedData)

      this.applyDates(cleanedData)

      const created = await this.prisma.$transaction(async (tx) => {

         // VALIDATE RELATIONS BEFORE WRITE (clear 400 instead of an opaque FK crash)
         await this.assertCategoryBelongsToBrand(
            tx,
            cleanedData.brandId,
            cleanedData.categoryId
         )

         await this.assertSlugAvailableForCreate(tx, cleanedData.slug, cleanedData.brandId)

         const mediaPlan = media !== undefined
            ? await this.planMedia(tx, media)
            : null

         if (mediaPlan) this.mirrorMediaColumns(cleanedData, mediaPlan)

         // CREATE ARTICLE
         const article = await tx.article.create({
            data: cleanedData
         })

         // HANDLE TAGS
         await this.handleTags(
            tx,
            article.id,
            article.brandId,
            tags,
            tagIds
         )

         // HANDLE MEDIA
         if (mediaPlan) await this.syncMedia(tx, article.id, mediaPlan.desired)

         // RETURN ARTICLE
         return tx.article.findUnique({
            where: { id: article.id },
            include: ARTICLE_INCLUDE
         })

      })

      await this.notifications.notify({
         title: created?.status === 'Published' ? 'Article published' : 'Article created',
         message: `"${created?.title}" was created as ${created?.status}.`,
         type: 'success',
         entity: 'article',
         entityId: created?.id
      })

      return created

   }

   //// FIND ALL (live articles by default; deleted ones only on request)
   async findAll(options: { deleted?: boolean } = {}) {
      return this.prisma.article.findMany({
         where: {
            deletedAt: options.deleted ? { not: null } : null
         },
         include: ARTICLE_INCLUDE,
         orderBy: options.deleted
            ? { deletedAt: 'desc' }
            : { createdAt: 'desc' }
      })
   }

   //// FIND ONE
   async findOne(id: number) {

      const article = await this.prisma.article.findFirst({
         where: { id, deletedAt: null },
         include: ARTICLE_INCLUDE
      })

      if (!article)
         throw new NotFoundException("Article not found")

      return article
   }

   //// SOFT DELETE
   // The row stays in the database with deletedAt set, so it can be restored.
   async remove(id: number) {

      const article = await this.prisma.article.findFirst({
         where: { id, deletedAt: null }
      })

      if (!article)
         throw new NotFoundException("Article not found")

      const deleted = await this.prisma.article.update({
         where: { id },
         data: { deletedAt: new Date() }
      })

      await this.notifications.notify({
         title: 'Article deleted',
         message: `"${article.title}" was deleted. You can restore it from the Deleted view.`,
         type: 'warning',
         entity: 'article',
         entityId: id
      })

      return deleted

   }

   //// RESTORE (undo a soft delete)
   async restore(id: number) {

      const article = await this.prisma.article.findUnique({
         where: { id }
      })

      if (!article)
         throw new NotFoundException("Article not found")

      if (!article.deletedAt)
         throw new ConflictException("Article is not deleted")

      const restored = await this.prisma.article.update({
         where: { id },
         data: { deletedAt: null },
         include: ARTICLE_INCLUDE
      })

      await this.notifications.notify({
         title: 'Article restored',
         message: `"${article.title}" was restored.`,
         type: 'success',
         entity: 'article',
         entityId: id
      })

      return restored

   }

   //// FIND BY SLUG
   async findOneBySlug(slug: string) {

      const article = await this.prisma.article.findFirst({
         where: { slug, deletedAt: null },
         include: ARTICLE_INCLUDE
      })

      if (!article)
         throw new NotFoundException("Article not found")

      return article
   }

   //// UPDATE
   async update(id: number, data: UpdateArticleDto) {

      const { tags, tagIds, media, ...articleData } = data as any

      const cleanedData = this.cleanData(articleData)

      // A soft-deleted article cannot be modified (restore it first).
      const existing = await this.prisma.article.findFirst({
         where: { id, deletedAt: null }
      })

      if (!existing)
         throw new NotFoundException("Article not found")

      this.applyDates(cleanedData, existing)

      const brandId = cleanedData.brandId ?? existing.brandId

      const updated = await this.prisma.$transaction(async (tx) => {

         // ONLY RE-VALIDATE THE BRAND/CATEGORY RELATION WHEN ONE OF THEM CHANGES
         if (cleanedData.brandId !== undefined || cleanedData.categoryId !== undefined) {
            await this.assertCategoryBelongsToBrand(
               tx,
               brandId,
               cleanedData.categoryId ?? existing.categoryId
            )
         }

         // ONLY RE-CHECK SLUG UNIQUENESS WHEN THE SLUG IS ACTUALLY CHANGING
         if (cleanedData.slug) {
            await this.assertSlugAvailableForUpdate(tx, cleanedData.slug, brandId, id)
         }

         const mediaPlan = media !== undefined
            ? await this.planMedia(tx, media)
            : null

         if (mediaPlan) this.mirrorMediaColumns(cleanedData, mediaPlan)

         const article = await tx.article.update({
            where: { id },
            data: cleanedData
         })

         // Only touch tag relations when the caller actually sent tag data.
         // Previously this ran unconditionally, which meant saving an
         // unrelated field (e.g. just the title) silently wiped every tag
         // off the article.
         const tagsProvided = tags !== undefined || tagIds !== undefined

         if (tagsProvided) {
            await tx.articleTag.deleteMany({
               where: { articleId: id }
            })

            await this.handleTags(
               tx,
               article.id,
               article.brandId,
               tags,
               tagIds
            )
         }

         // Same rule for media: omitted = untouched, [] = remove all.
         if (mediaPlan) await this.syncMedia(tx, id, mediaPlan.desired)

         return tx.article.findUnique({
            where: { id },
            include: ARTICLE_INCLUDE
         })

      })

      const becamePublished =
         existing.status !== 'Published' && updated?.status === 'Published'

      await this.notifications.notify({
         title: becamePublished ? 'Article published' : 'Article updated',
         message: becamePublished
            ? `"${updated?.title}" was published.`
            : `"${updated?.title}" was updated.`,
         type: 'success',
         entity: 'article',
         entityId: id
      })

      return updated

   }
}
