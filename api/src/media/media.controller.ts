import {
   Controller,
   Get,
   Param,
   Query,
   Delete,
   Post,
   UseInterceptors,
   UploadedFile
} from '@nestjs/common'

import { FileInterceptor } from "@nestjs/platform-express"
import type { Express } from "express"

import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe'
import { MediaService } from './media.service'
import { DeleteMediaQueryDto } from './dto/delete-media-query.dto'
import { MAX_UPLOAD_BYTES, imageFileFilter } from './upload-validation'

@Controller("media")
export class MediaController {

   constructor(private readonly service: MediaService) { }

   @Get()
   findAll() {
      return this.service.findAll()
   }

   @Get(":id")
   findOne(@Param("id", ParsePositiveIntPipe) id: number) {
      return this.service.findOne(id)
   }

   @Post("upload")
   @UseInterceptors(
      FileInterceptor("file", {
         // fileSize is enforced by multer while streaming (-> 413);
         // fileFilter rejects a wrong MIME type up front (-> 415);
         // the service re-checks size, type and file signature.
         limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
         fileFilter: imageFileFilter
      })
   )
   upload(@UploadedFile() file: Express.Multer.File) {
      return this.service.upload(file)
   }

   // A media item that is still used by an article is NOT deleted unless the
   // caller explicitly confirms with ?force=true — otherwise 409.
   @Delete(":id")
   remove(
      @Param("id", ParsePositiveIntPipe) id: number,
      @Query() query: DeleteMediaQueryDto
   ) {
      return this.service.remove(id, query.force === 'true')
   }

}
