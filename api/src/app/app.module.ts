import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { TagsModule } from '../tags/tags.module';
import { ArticlesModule } from '../articles/articles.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [BrandsModule, CategoriesModule, TagsModule, ArticlesModule, MediaModule, NotificationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
