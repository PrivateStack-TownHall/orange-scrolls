import { v2 as cloudinary } from 'cloudinary'
import { Logger } from '@nestjs/common'

const logger = new Logger('Cloudinary')

// All Cloudinary config comes from env — nothing is hardcoded here.
// Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// Optional: CLOUDINARY_FOLDER (defaults to "orange-scrolls" in media.service.ts)
cloudinary.config({
   cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,
   secure: true
})

// Warn at boot instead of only failing on the first upload attempt — much
// easier to spot in the startup log than after a confusing 400 in the UI.
const missing = [
   !process.env.CLOUDINARY_CLOUD_NAME && 'CLOUDINARY_CLOUD_NAME',
   !process.env.CLOUDINARY_API_KEY && 'CLOUDINARY_API_KEY',
   !process.env.CLOUDINARY_API_SECRET && 'CLOUDINARY_API_SECRET'
].filter(Boolean)

if (missing.length) {
   logger.warn(
      `Missing env var(s): ${missing.join(', ')} — media/image uploads will fail until these are set in api/.env (then restart the server).`
   )
}

export { cloudinary }
