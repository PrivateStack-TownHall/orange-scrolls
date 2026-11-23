import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { cloudinary, CLOUDINARY_FOLDER } from "../lib/cloudinary"
import { NotificationsService } from "../notifications/notifications.service"
import { assertValidImage } from "./upload-validation"
import type { UploadApiResponse } from "cloudinary"

import type { Express } from 'express'

@Injectable()
export class MediaService {

   constructor(
      private prisma: PrismaService,
      private notifications: NotificationsService
   ) { }

   private uploadBuffer(file: Express.Multer.File): Promise<UploadApiResponse> {
      return new Promise((resolve, reject) => {
         const stream = cloudinary.uploader.upload_stream(
            {
               folder: CLOUDINARY_FOLDER,
               resource_type: "image"
            },
            (error, result) => {
               if (error || !result) {
                  return reject(error ?? new Error("Cloudinary upload failed"))
               }
               resolve(result)
            }
         )

         stream.end(file.buffer)
      })
   }

   async upload(file: Express.Multer.File) {

      // Presence, size, declared MIME type and actual file signature.
      // (A request without a `file` field used to crash below with a 500.)
      assertValidImage(file)

      let result: UploadApiResponse

      try {
         result = await this.uploadBuffer(file)
      } catch (err: any) {
         // Cloudinary's SDK throws "Must supply api_key" / "Must supply
         // cloud_name" etc. when the CLOUDINARY_* env vars are missing —
         // surface that clearly instead of a generic upload-failed message,
         // since it's almost always a .env config issue, not a bad file.
         const raw = err?.message || "Failed to upload image to Cloudinary"

         const message = /must supply/i.test(raw)
            ? `${raw} — check that CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are set in api/.env and that the server was restarted after editing it.`
            : raw

         throw new BadRequestException(message)
      }

      const media = await this.prisma.media.create({
         data: {
            name: file.originalname,
            url: result.secure_url,
            publicId: result.public_id
         }
      })

      await this.notifications.notify({
         title: "Media uploaded",
         message: `"${media.name}" was uploaded to the media library.`,
         type: "success",
         entity: "media",
         entityId: media.id
      })

      return media
   }

   async findAll() {
      return this.prisma.media.findMany({
         orderBy: {
            createdAt: "asc"
         }
      })
   }

   async findOne(id: number) {
      const media = await this.prisma.media.findUnique({
         where: { id }
      })

      if (!media)
         throw new NotFoundException("Media not found")

      return media
   }

   //// WHERE IS THIS MEDIA USED?
   // Articles linked through ArticleMedia (thumbnail/cover/gallery) — soft
   // deleted ones included, since restoring them would bring the link back —
   // plus articles that still reference the file by URL in the legacy
   // `thumbnail` / `coverImage` columns.
   async findUsage(media: { id: number; url: string }) {
      const relations = await this.prisma.articleMedia.findMany({
         where: { mediaId: media.id },
         include: {
            article: { select: { id: true, title: true, deletedAt: true } }
         }
      })

      const byUrl = await this.prisma.article.findMany({
         where: {
            OR: [{ thumbnail: media.url }, { coverImage: media.url }]
         },
         select: { id: true, title: true, deletedAt: true }
      })

      const articles = new Map<number, { id: number; title: string; deleted: boolean }>()

      for (const r of relations) {
         articles.set(r.article.id, {
            id: r.article.id,
            title: r.article.title,
            deleted: !!r.article.deletedAt
         })
      }

      for (const a of byUrl) {
         articles.set(a.id, { id: a.id, title: a.title, deleted: !!a.deletedAt })
      }

      return Array.from(articles.values())
   }

   async remove(id: number, force = false) {

      const media = await this.prisma.media.findUnique({
         where: { id }
      })

      if (!media) {
         throw new NotFoundException("Media not found")
      }

      const usage = await this.findUsage(media)

      if (usage.length && !force) {
         throw new ConflictException({
            message: `Media is still used by ${usage.length} article(s). Remove it from those articles first, or confirm the deletion (force=true) to detach it everywhere.`,
            details: { articles: usage }
         })
      }

      // Explicitly confirmed (or unused): detach every reference, then delete.
      const deleted = await this.prisma.$transaction(async (tx) => {
         if (usage.length) {
            await tx.articleMedia.deleteMany({ where: { mediaId: id } })
            await tx.article.updateMany({
               where: { thumbnail: media.url },
               data: { thumbnail: null }
            })
            await tx.article.updateMany({
               where: { coverImage: media.url },
               data: { coverImage: null }
            })
         }

         return tx.media.delete({ where: { id } })
      })

      if (media.publicId) {
         // Best-effort, and only after the DB row is gone: if Cloudinary
         // fails we are left with an orphaned remote file, never with a
         // row pointing at a destroyed asset.
         await cloudinary.uploader.destroy(media.publicId).catch(() => null)
      }

      await this.notifications.notify({
         title: "Media deleted",
         message: usage.length
            ? `"${media.name}" was deleted and detached from ${usage.length} article(s).`
            : `"${media.name}" was deleted from the media library.`,
         type: usage.length ? "warning" : "info",
         entity: "media",
         entityId: id
      })

      return deleted
   }

}
