import { Module, OnModuleInit, LoggerService, Logger, } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { TagsController } from './tags/tags.controller';
import { TagService } from './tag/tag.service';

@Module({
  controllers: [ArticleController, TagsController],
  providers: [ArticleService, TagService]
})
export class ArticleModule {

}
