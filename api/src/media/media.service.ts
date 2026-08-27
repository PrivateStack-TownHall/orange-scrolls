import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { cloudinary } from "../lib/cloudinary"
import type { UploadApiResponse } from "cloudinary"

import type { Express } from 'express'

const CLOUDINARY_FOLDER = process.env.VITE_CLOUDINARY_FOLDER || "orange-scrolls"

@Injectable()
export class MediaService {

   constructor(private prisma: PrismaService) { }

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

      // Without this guard, a request with no `file` field (e.g. the
      // frontend forgot to append it, or the multipart body failed to
      // parse) crashes below with an opaque 500.
      if (!file) {
         throw new BadRequestException("No file uploaded")
      }

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

      return this.prisma.media.create({
         data: {
            name: file.originalname,
            url: result.secure_url,
            publicId: result.public_id
         }
      })
   }

   async findAll() {
      return this.prisma.media.findMany({
         orderBy: {
            createdAt: "asc"
         }
      })
   }

   async findOne(id: number) {
      return this.prisma.media.findUnique({
         where: { id }
      })
   }

   async remove(id: number) {

      const media = await this.prisma.media.findUnique({
         where: { id }
      })

      if (!media) {
         throw new NotFoundException("Media not found")
      }

      if (media.publicId) {
         // Best-effort: don't block deleting the DB row if the asset was
         // already removed on Cloudinary's side (or never had a public_id,
         // e.g. rows created before this column existed).
         await cloudinary.uploader.destroy(media.publicId).catch(() => null)
      }

      return this.prisma.media.delete({
         where: { id }
      })
   }

}
