import { PrismaClient } from "@prisma/client"
import fs from "fs"

const prisma = new PrismaClient()

const data = JSON.parse(
   fs.readFileSync("./prisma/COSdata.json", "utf-8")
)

async function main() {

   console.log("Cleaning database...")

   await prisma.articleTag.deleteMany()
   await prisma.article.deleteMany()
   await prisma.media.deleteMany()
   await prisma.tag.deleteMany()
   await prisma.category.deleteMany()
   await prisma.brand.deleteMany()

   console.log("Database cleaned")

   console.log("Seeding brands...")

   await prisma.brand.createMany({
      data: data.brands.map((b: any) => ({
         id: Number(b.id),
         name: b.name,
         description: b.description,
         logoImage: b.logoImage
      }))
   })

   console.log("Seeding categories...")

   await prisma.category.createMany({
      data: data.categories.map((c: any) => ({
         id: Number(c.id),
         name: c.name,
         slug: c.slug ?? c.name.toLowerCase().replace(/\s+/g, "-"),
         brandId: Number(c.brandId)
      }))
   })

   console.log("Seeding tags...")

   await prisma.tag.createMany({
      data: data.tags.map((t: any) => ({
         id: Number(t.id),
         name: t.name,
         brandId: Number(t.brandId)
      }))
   })

   console.log("Seeding media...")

   await prisma.media.createMany({
      data: data.media.map((m: any) => ({
         id: Number(m.id),
         name: m.name,
         url: m.url
      }))
   })

   console.log("Seeding articles...")

   for (const article of data.articles) {

      const createdArticle = await prisma.article.create({
         data: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            brandId: article.brandId,
            categoryId: article.categoryId,
            excerpt: article.excerpt,
            content: article.content,
            thumbnail: article.thumbnail,
            coverImage: article.coverImage,
            author: article.author,
            status: article.status,
            visibility: article.visibility,
            featured: article.featured,
            views: article.views,
            readingTime: article.readingTime,
            seoTitle: article.seoTitle,
            seoDescription: article.seoDescription,
            canonicalUrl: article.canonicalUrl,
            publishedAt: article.publishedAt
               ? new Date(article.publishedAt)
               : null
         }
      })

      if (article.tagIds) {

         await prisma.articleTag.createMany({
            data: article.tagIds.map((tagId: number) => ({
               articleId: createdArticle.id,
               tagId: tagId
            }))
         })

      }

   }

   console.log("Seed completed successfully")

   // Explicit `id` values were used above (createMany + create with `id`),
   // which does NOT advance Postgres's auto-increment sequence for each
   // table. Without this, the very next INSERT that relies on the
   // sequence (e.g. creating a category from the UI) collides with an id
   // that already exists, throwing a P2002 "duplicate id" error that has
   // nothing to do with the data actually being a duplicate.
   console.log("Resyncing auto-increment sequences...")

   const tables = ["Brand", "Category", "Tag", "Media", "Article"]

   for (const table of tables) {
      await prisma.$executeRawUnsafe(`
         SELECT setval(
            pg_get_serial_sequence('"${table}"', 'id'),
            COALESCE((SELECT MAX(id) FROM "${table}"), 1),
            true
         )
      `)
   }

   console.log("Sequences resynced")

}

main()
   .catch((e) => {
      console.error(e)
      process.exit(1)
   })
   .finally(async () => {
      await prisma.$disconnect()
   })