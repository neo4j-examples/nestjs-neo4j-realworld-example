import { Module, OnModuleInit, LoggerService, Logger, } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { Neo4jService } from 'nest-neo4j/dist';

@Module({
  controllers: [ArticleController],
  providers: [ArticleService]
})
export class ArticleModule {

}
