import { Controller, Get, Post, Body, UseGuards, UseInterceptors, Param, NotFoundException, Put, Delete } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleService } from './article.service';
import { JwtAuthGuard } from 'src/user/auth/jwt.auth-guard';
import { Neo4jTypeInterceptor } from 'nest-neo4j/dist';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateCommentDto } from './dto/create-comment.dto';


@UseInterceptors(Neo4jTypeInterceptor)
@Controller('articles')
export class ArticleController {

    constructor(private readonly articleService: ArticleService) {}

    @Get()
    getList() {
        return this.articleService.list()
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    async postList(@Body() createArticleDto: CreateArticleDto) {
        const article = await this.articleService.create(
            createArticleDto.article.title,
            createArticleDto.article.description,
            createArticleDto.article.body,
            createArticleDto.article.tagList
        )

        return {
            article: article.toJson()
        }
    }

    @Get('/:slug')
    async getIndex(@Param('slug') slug: string) {
        const article = await this.articleService.find(slug)

        if ( !article ) throw new NotFoundException()

        return {
            article: article.toJson()
        }
    }

    @UseGuards(JwtAuthGuard)
    @Put('/:slug')
    async putIndex(@Param('slug') slug: string, @Body() updateArticleDto: UpdateArticleDto) {
        const article = await this.articleService.update(slug, updateArticleDto.article)

        if ( !article ) throw new NotFoundException()

        return {
            article: article.toJson()
        }
    }

    @UseGuards(JwtAuthGuard)
    @Put('/:slug')
    async deleteIndex(@Param('slug') slug: string) {
        const article = await this.articleService.delete(slug)

        if ( !article ) throw new NotFoundException()

        return 'OK'
    }

    @UseGuards(JwtAuthGuard)
    @Post('/:slug/favorite')
    async postFavorite(@Param('slug') slug: string) {
        const article = await this.articleService.favorite(slug)

        if ( !article ) throw new NotFoundException()

        return {
            article: article.toJson()
        }
    }

    @UseGuards(JwtAuthGuard)
    @Delete('/:slug/favorite')
    async deleteFavorite(@Param('slug') slug: string) {
        const article = await this.articleService.unfavorite(slug)

        if ( !article ) throw new NotFoundException()

        return {
            article: article.toJson()
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('/:slug/comments')
    async postComments(@Param('slug') slug: string, @Body() createCommentDto: CreateCommentDto) {
        const comment = await this.articleService.comment(slug, createCommentDto.comment.body)

        if ( !comment ) throw new NotFoundException()

        return {
            comment: comment.toJson()
        }
    }

    @Get('/:slug/comments')
    async getComments(@Param('slug') slug: string) {
        const comments = await this.articleService.getComments(slug)


        return {
            comments: comments.map(comment => comment.toJson()),
        }
    }

    @UseGuards(JwtAuthGuard)
    @Delete('/:slug')
    async deleteComment(@Param('slug') slug: string) {
        const comment = await this.articleService.delete(slug)

        if ( !comment ) throw new NotFoundException()

        return 'OK'
    }

}
