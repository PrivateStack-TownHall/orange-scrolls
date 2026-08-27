import {
   Controller,
   Get,
   Post,
   Body,
   Param,
   Patch,
   Delete,
   UseInterceptors,
   UploadedFile,
   ParseFilePipe,
   MaxFileSizeValidator,
   FileTypeValidator
} from '@nestjs/common'

import { FileInterceptor } from "@nestjs/platform-express"
import type { Express } from "express"

import { MediaService } from './media.service'
import { CreateMediaDto } from './dto/create-media.dto'
import { UpdateMediaDto } from './dto/update-media.dto'

@Controller("media")
export class MediaController {

   constructor(private readonly service: MediaService) { }

   @Get()
   findAll() {
      return this.service.findAll()
   }

   @Get(":id")
   findOne(@Param("id") id: string) {
      return this.service.findOne(Number(id))
   }

   @Post("upload")
   @UseInterceptors(FileInterceptor("file"))
   upload(
      @UploadedFile(
         new ParseFilePipe({
            validators: [
               // 5MB max, images only — before this there was no limit at
               // all, so any file type/size could be pushed to storage.
               new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
               new FileTypeValidator({ fileType: /^image\/(png|jpe?g|gif|webp|svg\+xml)$/ })
            ]
         })
      )
      file: Express.Multer.File
   ) {
      return this.service.upload(file)
   }

   @Delete(":id")
   remove(@Param("id") id: string) {
      return this.service.remove(Number(id))
   }

}