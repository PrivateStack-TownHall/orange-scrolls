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

import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Controller('categories')
export class CategoriesController {

   constructor(private readonly service: CategoriesService) { }

   // CREATE
   @Post()
   create(@Body() body: CreateCategoryDto) {
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
      @Body() body: UpdateCategoryDto
   ) {
      return this.service.update(id, body)
   }

   // DELETE
   @Delete(':id')
   remove(@Param('id', ParsePositiveIntPipe) id: number) {
      return this.service.remove(id)
   }

}