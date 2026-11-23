import {
   Controller,
   Get,
   Post,
   Body,
   Param,
   Put,
   Delete,
   Query
} from '@nestjs/common'

import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe'
import { ArticlesService } from './articles.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { ListArticlesQueryDto } from './dto/list-articles-query.dto'

@Controller('articles')
export class ArticlesController {

   constructor(private readonly service: ArticlesService) { }

   @Post()
   create(@Body() body: CreateArticleDto) {
      return this.service.create(body)
   }

   // Live articles by default; ?deleted=true lists soft-deleted ones.
   @Get()
   findAll(@Query() query: ListArticlesQueryDto) {
      return this.service.findAll({ deleted: query.deleted === 'true' })
   }

   @Get('slug/:slug')
   findOneBySlug(@Param('slug') slug: string) {
      return this.service.findOneBySlug(slug)
   }

   @Get(':id')
   findOne(@Param('id', ParsePositiveIntPipe) id: number) {
      return this.service.findOne(id)
   }

   @Put(':id')
   update(
      @Param('id', ParsePositiveIntPipe) id: number,
      @Body() body: UpdateArticleDto
   ) {
      return this.service.update(id, body)
   }

   // Soft delete (sets deletedAt). Undo with POST /articles/:id/restore.
   @Delete(':id')
   remove(@Param('id', ParsePositiveIntPipe) id: number) {
      return this.service.remove(id)
   }

   @Post(':id/restore')
   restore(@Param('id', ParsePositiveIntPipe) id: number) {
      return this.service.restore(id)
   }

}
