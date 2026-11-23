import {
   Controller,
   Get,
   Post,
   Body,
   Param,
   Put,
   Delete
} from '@nestjs/common'

import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe'

import { TagsService } from './tags.service'
import { CreateTagDto } from './dto/create-tag.dto'
import { UpdateTagDto } from './dto/update-tag.dto'

@Controller('tags')
export class TagsController {

   constructor(private readonly service: TagsService) { }

   // CREATE
   @Post()
   create(@Body() body: CreateTagDto) {
      return this.service.create(body)
   }

   // GET ALL
   @Get()
   findAll() {
      return this.service.findAll()
   }

   // GET ONE
   @Get(':id')
   findOne(@Param('id', ParsePositiveIntPipe) id: number) {
      return this.service.findOne(id)
   }

   // UPDATE
   @Put(':id')
   update(
      @Param('id', ParsePositiveIntPipe) id: number,
      @Body() body: UpdateTagDto
   ) {
      return this.service.update(id, body)
   }

   // DELETE
   @Delete(':id')
   remove(@Param('id', ParsePositiveIntPipe) id: number) {
      return this.service.remove(id)
   }

}