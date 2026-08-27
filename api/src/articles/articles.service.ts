import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'

const ARTICLE_INCLUDE = {
   brand: true,
   category: true,
   tags: {
      include: {
         tag: true
      }
   }
}

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
const NULLABLE_FIELDS = [
   'excerpt',
   'thumbnail',
   'coverImage',
   'seoTitle',
   'seoDescription',
   'canonicalUrl'
]

@Injectable()
export class ArticlesService {
   constructor(private prisma: PrismaService) { }

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
         throw new BadRequestException("Slug already in use for this brand")
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
         throw new BadRequestException("Slug already in use for this brand")
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

   //// CREATE ARTICLE
   async create(data: CreateArticleDto) {

      const { tags, tagIds, ...articleData } = data as any

      const cleanedData = this.cleanData(articleData)

      this.assertRequiredFields(cleanedData)

      return this.prisma.$transaction(async (tx) => {

         // VALIDATE RELATIONS BEFORE WRITE (clear 400 instead of an opaque FK crash)
         await this.assertCategoryBelongsToBrand(
            tx,
            cleanedData.brandId,
            cleanedData.categoryId
         )

         await this.assertSlugAvailableForCreate(tx, cleanedData.slug, cleanedData.brandId)

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

         // RETURN ARTICLE
         return tx.article.findUnique({
            where: { id: article.id },
            include: ARTICLE_INCLUDE
         })

      })

   }

   //// FIND ALL
   async findAll() {
      return this.prisma.article.findMany({
         include: ARTICLE_INCLUDE,
         orderBy: {
            createdAt: 'desc'
         }
      })
   }

   //// FIND ONE
   async findOne(id: number) {

      const article = await this.prisma.article.findUnique({
         where: { id },
         include: ARTICLE_INCLUDE
      })

      if (!article)
         throw new NotFoundException("Article not found")

      return article
   }

   //// DELETE
   async remove(id: number) {

      const article = await this.prisma.article.findUnique({
         where: { id }
      })

      if (!article)
         throw new NotFoundException("Article not found")

      return this.prisma.article.delete({
         where: { id }
      })

   }

   //// FIND BY SLUG
   async findOneBySlug(slug: string) {

      const article = await this.prisma.article.findFirst({
         where: { slug },
         include: ARTICLE_INCLUDE
      })

      if (!article)
         throw new NotFoundException("Article not found")

      return article
   }

   //// UPDATE
   async update(id: number, data: UpdateArticleDto) {

      const { tags, tagIds, ...articleData } = data as any

      const cleanedData = this.cleanData(articleData)

      const existing = await this.prisma.article.findUnique({
         where: { id }
      })

      if (!existing)
         throw new NotFoundException("Article not found")

      const brandId = cleanedData.brandId ?? existing.brandId

      return this.prisma.$transaction(async (tx) => {

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

         return tx.article.findUnique({
            where: { id },
            include: ARTICLE_INCLUDE
         })

      })

   }
}
