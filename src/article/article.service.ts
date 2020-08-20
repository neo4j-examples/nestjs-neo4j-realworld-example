import { Injectable, Scope, Inject } from '@nestjs/common';
import { User } from '../user/entity/user.entity';
import { Article } from './entity/article.entity';
import { Neo4jService } from 'nest-neo4j/dist';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Comment } from './entity/comment.entity';
import { Tag } from './entity/tag.entity';

type ArticleResponse = {
    articlesCount: number;
    articles: Record<string, any>[]
}

@Injectable({ scope: Scope.REQUEST })
export class ArticleService {

    constructor(
        @Inject(REQUEST) private readonly request: Request,
        private readonly neo4jService: Neo4jService
    ) {}

    create(title: string, description: string, body: string, tagList: string[]): Promise<Article> {
        return this.neo4jService.write(`
            MATCH (u:User {id: $userId})

            WITH u, randomUUID() AS uuid

            CREATE (a:Article {
                id: uuid,
                createdAt: datetime(),
                updatedAt: datetime()
            }) SET a += $article, a.slug = apoc.text.slug($article.title +' '+ uuid)

            CREATE (u)-[:POSTED]->(a)

            FOREACH ( name IN $tagList |
                MERGE (t:Tag {name: name})
                ON CREATE SET t.id = randomUUID(),  t.slug = apoc.text.slug(name)

                MERGE (a)-[:HAS_TAG]->(t)
            )

            RETURN u,
                a,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                exists((a)<-[:FAVORITED]-(u)) AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
        `, {
            userId: (<User> this.request.user).getId(),
            article: { title, description, body },
            tagList,
        })
            .then(res => {
                const row = res.records[0]

                return new Article(
                    row.get('a'),
                    <User> this.request.user,
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )
            })
    }

    list(): Promise<ArticleResponse> {
        const skip = this.neo4jService.int( parseInt(<string> this.request.query.offset) || 0)
        const limit = this.neo4jService.int( parseInt(<string> this.request.query.limit) || 10)

        const params: Record<string, any> = {
            userId: this.request.user ? (<User> this.request.user).getId() : null,
            skip, limit
        }

        const where = [];

        if ( this.request.query.author ) {
            where.push( `(a)<-[:POSTED]-({username: $author})` )
            params.author = this.request.query.author
        }

        if ( this.request.query.favorited ) {
            where.push( `(a)<-[:FAVORITED]-({username: $favorited})` )
            params.favorited = this.request.query.favorited
        }

        if ( this.request.query.tag ) {
            where.push( ` ALL (tag in $tags WHERE (a)-[:HAS_TAG]->({name: tag})) ` )
            params.tags = (<string> this.request.query.tag).split(',')
        }

        return this.neo4jService.read(`
            MATCH (a:Article)
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}

            WITH count(a) AS articlesCount, collect(a) AS articles

            UNWIND articles AS a

            WITH articlesCount, a
            ORDER BY a.createdAt DESC
            SKIP $skip LIMIT $limit

            RETURN
                articlesCount,
                a,
                [ (a)<-[:POSTED]-(u) | u ][0] AS author,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                CASE
                    WHEN $userId IS NOT NULL
                    THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                    ELSE false
                END AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
        `, params)
            .then(res => {
                const articlesCount = res.records.length ? res.records[0].get('articlesCount') : 0
                const articles = res.records.map(row => {
                    return new Article(
                        row.get('a'),
                        new User(row.get('author')),
                        row.get('tagList').map(tag => new Tag(tag)),
                        row.get('favoritesCount'),
                        row.get('favorited')
                    )
                })

                return {
                    articlesCount,
                    articles: articles.map(a => a.toJson()),
                }

            })
    }

    getFeed() {
        const userId = (<User> this.request.user).getId()

        const skip = this.neo4jService.int( parseInt(<string> this.request.query.offset) || 0)
        const limit = this.neo4jService.int( parseInt(<string> this.request.query.limit) || 10)

        const params: Record<string, any> = {
            userId: this.request.user ? (<User> this.request.user).getId() : null,
            skip, limit
        }

        const where = [];

        if ( this.request.query.author ) {
            where.push( `(a)<-[:POSTED]-({username: $author})` )
            params.author = this.request.query.author
        }

        if ( this.request.query.favorited ) {
            where.push( `(a)<-[:FAVORITED]-({username: $favorited})` )
            params.favorited = this.request.query.favorited
        }

        if ( this.request.query.tag ) {
            where.push( ` ALL (tag in $tags WHERE (a)-[:HAS_TAG]->({name: tag})) ` )
            params.tags = (<string> this.request.query.tag).split(',')
        }

        return this.neo4jService.read(`
            MATCH (current:User)-[:FOLLOWS]->(u)-[:POSTED]->(a)
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}

            WITH count(a) AS articlesCount, collect(a) AS articles

            UNWIND articles AS a

            WITH articlesCount, a
            ORDER BY a.createdAt DESC
            SKIP $skip LIMIT $limit

            RETURN
                articlesCount,
                a,
                [ (a)<-[:POSTED]-(u) | u ][0] AS author,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                CASE
                    WHEN $userId IS NOT NULL
                    THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                    ELSE false
                END AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
            `, params)
                .then(res => {
                    const articlesCount = res.records.length ? res.records[0].get('articlesCount') : 0
                    const articles = res.records.map(row => {
                        return new Article(
                            row.get('a'),
                            new User(row.get('author')),
                            row.get('tagList').map(tag => new Tag(tag)),
                            row.get('favoritesCount'),
                            row.get('favorited')
                        )
                    })

                    return {
                        articlesCount,
                        articles: articles.map(a => a.toJson()),
                    }
                })
    }

    find(slug: string): Promise<Article | undefined> {
        return this.neo4jService.read(`
            MATCH (a:Article {slug: $slug})
            RETURN
                a,
                [ (a)<-[:POSTED]-(u) | u ][0] AS author,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                CASE
                    WHEN $userId IS NOT NULL
                    THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                    ELSE false
                END AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
        `, {
            slug,
            userId: this.request.user ? (<User> this.request.user).getId() : null,
        })
            .then(res => {
                if ( !res.records.length ) return undefined;

                const row = res.records[0]

                return new Article(
                    row.get('a'),
                    new User(row.get('author')),
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )
            })
    }

    update(slug: string, updates: Record<string, any>): Promise<Article> {
        const tagList = updates.tagList || []

        return this.neo4jService.write(`
            MATCH (u:User {id: $userId})-[:POSTED]->(a:Article {slug: $slug})

            SET a += $updates

            FOREACH (r IN CASE WHEN size($tagList) > 0 THEN [ (a)-[r:HAS_TAG]->() | r] ELSE [] END |
                DELETE r
            )

            FOREACH ( name IN $tagList |
                MERGE (t:Tag {name: name}) ON CREATE SET t.id = randomUUID(), t.slug = apoc.text.slug(name)
                MERGE (a)-[:HAS_TAG]->(t)
            )

            RETURN
                a,
                [ (a)<-[:POSTED]-(ux) | ux ][0] AS author,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                CASE
                    WHEN $userId IS NOT NULL
                    THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                    ELSE false
                END AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
        `, {
            slug,
            userId: (<User> this.request.user).getId(),
            updates,
            tagList
        })
            .then(res => {
                if ( !res.records.length ) return undefined;

                const row = res.records[0]

                return new Article(
                    row.get('a'),
                    new User(row.get('author')),
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )
            })

    }

    delete(slug: string) {
        return this.neo4jService.write(`
            MATCH (u:User {id: $userId})-[:POSTED]->(a:Article {slug: $slug})
            FOREACH (c IN [ (a)<-[:ON]-(c:Comment) | c ] |
                DETACH DELETE c
            )
            DETACH DELETE a
            RETURN a
        `, { userId: (<User> this.request.user).getId(), slug })
            .then(res => res.records.length === 1)
    }

    favorite(slug: string): Promise<Article> {
        return this.neo4jService.write(`
            MATCH (a:Article {slug: $slug})
            MATCH (u:User {id: $userId})

            MERGE (u)-[r:FAVORITED]->(a)
            ON CREATE SET r.createdAt = datetime()

            RETURN a,
                [ (a)<-[:POSTED]-(ux) | ux ][0] AS author,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                CASE
                    WHEN $userId IS NOT NULL
                    THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                    ELSE false
                END AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
        `, {
            slug,
            userId: (<User> this.request.user).getId(),
        })
            .then(res => {
                if ( !res.records.length ) return undefined;

                const row = res.records[0]

                return new Article(
                    row.get('a'),
                    new User(row.get('author')),
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )
            })
    }

    unfavorite(slug: string): Promise<Article> {
        return this.neo4jService.write(`
            MATCH (a:Article {slug: $slug})
            MATCH (u:User {id: $userId})

            OPTIONAL MATCH (u)-[r:FAVORITED]->(a)
            DELETE r

            RETURN a,
                [ (a)<-[:POSTED]-(ux) | ux ][0] AS author,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                CASE
                    WHEN $userId IS NOT NULL
                    THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                    ELSE false
                END AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
        `, {
            slug,
            userId: (<User> this.request.user).getId(),
        })
            .then(res => {
                if ( !res.records.length ) return undefined;

                const row = res.records[0]

                return new Article(
                    row.get('a'),
                    new User(row.get('author')),
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )
            })
    }

    comment(slug: string, body: string): Promise<Comment> {
        return this.neo4jService.write(`
            MATCH (a:Article {slug: $slug})
            MATCH (u:User {id: $userId})

            CREATE (u)-[:COMMENTED]->(c:Comment {
                id: randomUUID(),
                createdAt: datetime(),
                updatedAt: datetime(),
                body: $body
            })-[:FOR]->(a)

            RETURN c, u
        `, {
            slug,
            userId: (<User> this.request.user).getId(),
            body,
        })
            .then(res => {
                if ( !res.records.length ) return undefined;

                const row = res.records[0]

                return new Comment(row.get('c'), new User(row.get('u')))
            })
    }

    getComments(slug: string): Promise<Comment[]> {
        return this.neo4jService.read(`
            MATCH (:Article {slug: $slug})<-[:FOR]-(c:Comment)<-[:COMMENTED]-(a)
            RETURN c, a
            ORDER BY c.createdAt DESC
        `, { slug })
            .then(res => {
                if ( !res.records.length ) return [];

                return res.records.map(row => new Comment(row.get('c'), new User(row.get('a'))))
            })
    }

    deleteComment(slug: string, commentId: string): Promise<boolean> {
        return this.neo4jService.write(`
            MATCH (:Article {slug: $slug})<-[:FOR]-(c:Comment {id: $commentId})<-[:COMMENTED]-(a:User {id: $userId})
            DETACH DELETE c

            RETURN c, a
        `, {
            slug,
            userId: (<User> this.request.user).getId(),
            commentId,
        })
            .then(res => {
                return res.records.length === 1
            })
    }



}
