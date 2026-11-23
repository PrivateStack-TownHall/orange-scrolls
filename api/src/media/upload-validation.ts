import {
   BadRequestException,
   PayloadTooLargeException,
   UnsupportedMediaTypeException
} from '@nestjs/common'
import type { Express } from 'express'

// 5 MB. Enforced by multer while the body streams in (see media.controller),
// so an oversized file is rejected without being fully buffered in memory.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

// Raster formats only. SVG is intentionally NOT accepted: it can carry
// <script>, so serving user-supplied SVG from the media library is a
// stored-XSS vector, and it has no reliable magic number to verify.
export const ALLOWED_IMAGE_MIME_TYPES = [
   'image/png',
   'image/jpeg',
   'image/gif',
   'image/webp'
] as const

export const ALLOWED_TYPES_LABEL = 'PNG, JPEG, GIF or WebP'

export function isAllowedMimeType(mimetype?: string): boolean {
   return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(
      (mimetype || '').toLowerCase()
   )
}

// The client-declared Content-Type is trivially spoofable, so the actual
// bytes are checked as well.
function sniffImageType(buf: Buffer): string | null {
   if (!buf || buf.length < 12) return null

   if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
      return 'image/png'

   if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
      return 'image/jpeg'

   const head = buf.subarray(0, 6).toString('ascii')
   if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif'

   if (
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
   )
      return 'image/webp'

   return null
}

/** Multer fileFilter: rejects by declared MIME type before reading the body. */
export function imageFileFilter(
   _req: unknown,
   file: Express.Multer.File,
   cb: (error: Error | null, acceptFile: boolean) => void
) {
   if (!isAllowedMimeType(file.mimetype)) {
      return cb(
         new UnsupportedMediaTypeException(
            `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_TYPES_LABEL}.`
         ),
         false
      )
   }

   cb(null, true)
}

/** Final check on the uploaded file: presence, size, MIME type and content. */
export function assertValidImage(file?: Express.Multer.File) {
   if (!file) throw new BadRequestException('No file uploaded')

   if (file.size > MAX_UPLOAD_BYTES || file.buffer?.length > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(
         `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
      )
   }

   if (!isAllowedMimeType(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
         `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_TYPES_LABEL}.`
      )
   }

   const sniffed = sniffImageType(file.buffer)

   if (!sniffed || sniffed !== file.mimetype.toLowerCase().replace('image/jpg', 'image/jpeg')) {
      throw new UnsupportedMediaTypeException(
         `File content does not match its declared type. Allowed: ${ALLOWED_TYPES_LABEL}.`
      )
   }
}
