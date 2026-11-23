import { v2 as cloudinary } from 'cloudinary'
import { Logger } from '@nestjs/common'

const logger = new Logger('Cloudinary')

// All Cloudinary config comes from env — nothing is hardcoded here.
// Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// Optional: CLOUDINARY_FOLDER (defaults to "orange-scrolls")
//
// Older local .env files used VITE_CLOUDINARY_CLOUD_NAME / _FOLDER. Those
// names were a mistake (VITE_ is a frontend-only prefix). They are still
// honoured as a fallback so an existing .env keeps working, but log a
// deprecation warning — rename them to the CLOUDINARY_* names.
const legacy: string[] = []

function readEnv(name: string, legacyName: string): string | undefined {
   const value = process.env[name]
   if (value) return value

   const old = process.env[legacyName]
   if (old) legacy.push(`${legacyName} -> ${name}`)
   return old || undefined
}

export const CLOUDINARY_CLOUD_NAME = readEnv('CLOUDINARY_CLOUD_NAME', 'VITE_CLOUDINARY_CLOUD_NAME')

export const CLOUDINARY_FOLDER =
   readEnv('CLOUDINARY_FOLDER', 'VITE_CLOUDINARY_FOLDER') || 'orange-scrolls'

cloudinary.config({
   cloud_name: CLOUDINARY_CLOUD_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,
   secure: true
})

if (legacy.length) {
   logger.warn(
      `Deprecated env var name(s) in use: ${legacy.join(', ')}. Rename them in api/.env.`
   )
}

// Warn at boot instead of only failing on the first upload attempt — much
// easier to spot in the startup log than after a confusing 400 in the UI.
const missing = [
   !CLOUDINARY_CLOUD_NAME && 'CLOUDINARY_CLOUD_NAME',
   !process.env.CLOUDINARY_API_KEY && 'CLOUDINARY_API_KEY',
   !process.env.CLOUDINARY_API_SECRET && 'CLOUDINARY_API_SECRET'
].filter(Boolean)

if (missing.length) {
   logger.warn(
      `Missing env var(s): ${missing.join(', ')} — media/image uploads will fail until these are set in api/.env (then restart the server).`
   )
}

export { cloudinary }
