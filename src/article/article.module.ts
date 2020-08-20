import { Module, OnModuleInit, LoggerService, Logger, } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { TagsController } from './tags/tags.controller';
import { TagService } from './tag/tag.service';
import { Neo4jService } from 'nest-neo4j/dist';

@Module({
  controllers: [ArticleController, TagsController],
  providers: [ArticleService, TagService]
})
export class ArticleModule implements OnModuleInit {

  constructor(private readonly neo4jService: Neo4jService) {}

  async onModuleInit() {
    await this.neo4jService.write('CREATE CONSTRAINT ON (a:Article) ASSERT a.id IS UNIQUE').catch(() => {})
    await this.neo4jService.write('CREATE CONSTRAINT ON (a:Article) ASSERT a.slug IS UNIQUE').catch(() => {})
    await this.neo4jService.write('CREATE CONSTRAINT ON (t:Tag) ASSERT t.id IS UNIQUE').catch(() => {})
    await this.neo4jService.write('CREATE CONSTRAINT ON (t:Tag) ASSERT t.name IS UNIQUE').catch(() => {})
  }
}
