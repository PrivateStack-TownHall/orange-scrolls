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

import { BrandsService } from './brands.service'
import { CreateBrandDto } from './dto/create-brand.dto'
import { UpdateBrandDto } from './dto/update-brand.dto'

@Controller('brands')
export class BrandsController {

   constructor(private readonly service: BrandsService) { }

   // CREATE
   @Post()
   create(@Body() body: CreateBrandDto) {
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
      @Body() body: UpdateBrandDto
   ) {
      return this.service.update(id, body)
   }

   // DELETE
   @Delete(':id')
   remove(@Param('id', ParsePositiveIntPipe) id: number) {
      return this.service.remove(id)
   }

}