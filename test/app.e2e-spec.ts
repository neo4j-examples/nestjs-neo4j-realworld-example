import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnprocessableEntityException } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ValidationError } from 'class-validator';
import { UnprocessibleEntityValidationPipe } from '../src/pipes/unprocessible-entity-validation.pipe';
import { Neo4jService } from 'nest-neo4j/dist';
import { O_TRUNC } from 'constants';

describe('AppController (e2e)', () => {
    let app: INestApplication;
    let neo4j: Neo4jService
    let api

    // Test Credentials
    const username = Math.random().toString()
    const email = `${username}@neo4j.com`
    const password = Math.random().toString()
    let token

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new UnprocessibleEntityValidationPipe());
        await app.init();

        api = app.getHttpServer()
        neo4j = app.get(Neo4jService)
    });

    describe('/users', () => {
        describe('POST / → sign up', () => {
            it('should return 422 on missing info', () => {
                request(api)
                    .post('/users')
                    .send({ user: {} })
                    .expect(422)
                    .expect(res => {
                        expect(res.body.errors).toBeInstanceOf(Object)
                        expect(res.body.errors.email).toBeInstanceOf(Array)
                        expect(res.body.errors.password).toBeInstanceOf(Array)
                        expect(res.body.errors.username).toBeInstanceOf(Array)
                    })
            })

            it('should create user', () => {
                request(api)
                    .post('/users')
                    .send({ user: { username, email, password } })
                    .expect(201)
                    .expect(res => {
                        expect(res.body.user).toBeInstanceOf(Object)
                        expect(res.body.user.email).toEqual(email)
                        expect(res.body.user.username).toEqual(username)
                        expect(res.body.user.password).toBeUndefined()
                        expect(res.body.user.bio).toBeDefined()
                        expect(res.body.user.image).toBeDefined()
                    })
            })
        })

        describe('POST /login → login', () => {
            // Guards run before pipes so this won't return a 422: https://github.com/nestjs/passport/issues/129
            // it('should return 422 on missing info', () => {
            //   request(api)
            //     .post('/users/login')
            //     .send({ user: {} })
            //     .expect(422)
            //     .expect(res => {
            //       expect(res.body.errors).toBeInstanceOf(Object)
            //       expect(res.body.errors.password).toBeInstanceOf(Array)
            //       expect(res.body.errors.username).toBeInstanceOf(Array)
            //     })
            // })

            it('should return 401 on bad username', () => {
                request(api)
                    .post('/users/login')
                    .send({ user: { email: 'unknown@neo4j.com' } })
                    .expect(401)
            })

            it('should return 401 on bad password', () => {
                request(api)
                    .post('/users/login')
                    .send({ user: { email, password: 'badpassword' } })
                    .expect(401)
            })

            it('should return 201 with user profile and token on success', () => {
                request(api)
                    .post('/users/login')
                    .send({ user: { email, password } })
                    .expect(201)
                    .expect(res => {
                        expect(res.body.user).toBeInstanceOf(Object)
                        expect(res.body.user.email).toEqual(email)
                        expect(res.body.user.username).toEqual(username)
                        expect(res.body.user.password).toBeUndefined()
                        expect(res.body.user.bio).toBeDefined()
                        expect(res.body.user.image).toBeDefined()
                        expect(res.body.user.token).toBeDefined()

                        token = res.body.user.token
                    })
            })
        })
    })

    describe('/user', () => {
        describe('GET / → User info', () => {
            it('should require a valid token', () => {
                request(api)
                    .get('/user')
                    .expect(403)
            })

            it('should return user info and generate a new token', () => {
                request(api)
                    .get('/user')
                    .set({ Authorization: `Token ${token}` })
                    .expect(200)
                    .expect(res => {
                        expect(res.body.user).toBeInstanceOf(Object)
                        expect(res.body.user.email).toEqual(email)
                        expect(res.body.user.username).toEqual(username)
                        expect(res.body.user.password).toBeUndefined()
                        // TODO: Re-enable after publishing nest-neo4j
                        // expect(res.body.user.bio).toBeDefined()
                        expect(res.body.user.image).toBeDefined()
                        expect(res.body.user.token).toBeDefined()

                        token = res.body.user.token
                    })
            })
        })

        describe('PUT / → Update user', () => {
            it('should require a valid token', () => {
                request(api)
                    .put('/user')
                    .expect(403)
            })

            it('should update user info', () => {
                let bio = 'Interesting'
                request(api)
                    .put('/user')
                    .set({ Authorization: `Token ${token}` })
                    .send({ user: { bio } })
                    .expect(200)
                    .expect(res => {
                        expect(res.body.user).toBeInstanceOf(Object)
                        expect(res.body.user.email).toEqual(email)
                        expect(res.body.user.username).toEqual(username)
                        expect(res.body.user.password).toBeUndefined()
                        expect(res.body.user.image).toBeDefined()
                        expect(res.body.user.token).toBeDefined()
                        expect(res.body.user.bio).toEqual(bio)

                        token = res.body.user.token
                    })
            })
        })

    })

    describe('/articles', () => {
        const jane = 'jane'
        const johnjacob = 'johnjacob'
        const tag = Math.random().toString() // 'unique'
        const slug = 'test-1'
        const title = 'Building Applications with Neo4j and Typescript'
        const otherCommentId = '1234'
        let articleCount

        const article = {
            title: "How to train your dragon",
            description: "Ever wonder how?",
            body: "Very carefully.",
            tagList: ["dragons", "training"],
        }
        let newSlug
        let commentId

        beforeAll(() => neo4j.write(`
            MERGE (johnjacob:User {username: $johnjacob})
            SET johnjacob:Test,
                johnjacob += { id: randomUUID(), email: $johnjacob +'@neo4j.com', bio: $johnjacob }

            MERGE (jane:User {username: $jane}) SET jane:Test

            MERGE (neo4j:Tag {name: 'neo4j'})
            MERGE (typescript:Tag {name: 'typescript'})
            MERGE (nestjs:Tag {name: 'nestjs'})
            MERGE (tag:Tag:Test {name: $tag})

            MERGE (a1:Article:Test {
                slug: $slug,
                title: $title,
                description: 'Write some code'

            })
            SET a1 += { id: randomUUID(), createdAt: datetime(), updatedAt: datetime() }
            MERGE (johnjacob)-[:POSTED]->(a1)
            MERGE (a1)-[:HAS_TAG]->(neo4j)
            MERGE (a1)-[:HAS_TAG]->(typescript)
            MERGE (a1)-[:HAS_TAG]->(nestjs)

            MERGE (a2:Article:Test {
                slug: 'test-2',
                title: 'testing Applications with Neo4j and Typescript',
                description: 'Test the code'
            })
            SET a2 += { id: randomUUID(), createdAt: datetime(), updatedAt: datetime() }
            MERGE (johnjacob)-[:POSTED]->(a2)
            MERGE (a2)-[:HAS_TAG]->(neo4j)
            MERGE (a2)-[:HAS_TAG]->(typescript)
            MERGE (a2)-[:HAS_TAG]->(tag)

            MERGE (jane)-[:FAVORITED]->(a1)

            MERGE (jane)-[:COMMENTED]->(:Comment:Test {
                id: $otherCommentId,
                body: 'Great!',
                createdAt: datetime(),
                updatedAt: datetime()
            })-[:FOR]->(a1)

            WITH distinct 0 as n

            MATCH (a:Article) WITH count(a) AS articleCount
            RETURN articleCount
        `, { jane, johnjacob, tag, slug, title, otherCommentId, }).then(res => articleCount = res.records[0].get('articleCount').toNumber()))

        afterAll(() => neo4j.write('MATCH (a:Test) DETACH DELETE a'))

        describe('GET / → List articles', () => {
            it('should return a list of articles without token', () => {
                request(api)
                    .get('/articles')
                    .expect(200)
                    .expect(res => {
                        expect(res.body.articles).toBeInstanceOf(Array)
                        expect(res.body.articles.length).toEqual(articleCount)

                        res.body.articles.map(article => {
                            expect(article.id).toBeDefined()
                            expect(article.title).toBeDefined()
                            expect(article.slug).toBeDefined()
                            expect(article.createdAt).toBeDefined()
                            expect(/^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/.test(article.createdAt)).toBeTruthy()
                            expect(article.updatedAt).toBeDefined()
                            expect(/^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/.test(article.updatedAt)).toBeTruthy()
                            expect(article.description).toBeDefined()
                            expect(article.tagList).toBeInstanceOf(Array)
                            expect(article.tagList.length).toBeGreaterThan(0)
                            expect(article.favorited).toBeFalsy()
                            expect(article.favoritesCount).toBeDefined()
                            expect(Number.isInteger(article.favoritesCount)).toBeTruthy()
                            expect(article.author).toBeDefined()
                        })
                    })
            })

            it('should return a list of articles with token', () => {
                request(api)
                    .get('/articles')
                    .send({ Authorization: `Token ${token}` })
                    .expect(200)
            })

            it('should apply pagination', () => {
                request(api)
                    .get('/articles?limit=1')
                    .expect(200)
                    .expect(res => {
                        expect(res.body.articles).toBeInstanceOf(Array)
                        expect(res.body.articles.length).toEqual(1)
                    })
            })

            it('should apply pagination', () => {
                request(api)
                    .get('/articles?limit=1')
                    .expect(200)
                    .expect(res => {
                        expect(res.body.articles).toBeInstanceOf(Array)
                        expect(res.body.articles.length).toEqual(1)
                    })
            })

            it('should filter by author', () => {
                request(api)
                    .get(`/articles?author=${johnjacob}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.articles).toBeInstanceOf(Array)
                        expect(res.body.articles.length).toEqual(2)
                        expect(res.body.articles.filter(article => article.author.username !== johnjacob)).toEqual([])
                    })
            })

            it('should filter by favorited', () => {
                request(api)
                    .get(`/articles?favorited=${jane}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.articles).toBeInstanceOf(Array)
                        expect(res.body.articles.length).toEqual(1)
                    })
            })

            it('should filter by tag', () => {
                request(api)
                    .get(`/articles?tag=${tag}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.articles).toBeInstanceOf(Array)
                        expect(res.body.articles.length).toEqual(1)

                        expect(res.body.articles.filter(a => a.tagList.includes(tag)).length).toEqual(res.body.articles.length)
                    })
            })
        })

        describe('GET /:slug → Article by slug', () => {
            it('should return 404 when article not found', () => {
                request(api)
                    .get('/articles/unknown-slug')
                    .expect(404)
            })

            it('should return article by slug', () => {
                request(api)
                    .get(`/articles/${slug}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.article).toBeDefined()

                        expect(res.body.article.id).toBeDefined()
                        expect(res.body.article.title).toBeDefined()
                        expect(res.body.article.slug).toBeDefined()
                        expect(res.body.article.createdAt).toBeDefined()
                        expect(/^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/.test(res.body.article.createdAt)).toBeTruthy()
                        expect(res.body.article.updatedAt).toBeDefined()
                        expect(/^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/.test(res.body.article.updatedAt)).toBeTruthy()
                        expect(res.body.article.description).toBeDefined()
                        expect(res.body.article.tagList).toBeInstanceOf(Array)
                        expect(res.body.article.tagList.length).toBeGreaterThan(0)
                        expect(res.body.article.favorited).toBeFalsy()
                        expect(res.body.article.favoritesCount).toBeDefined()
                        expect(Number.isInteger(res.body.article.favoritesCount)).toBeTruthy()
                        expect(res.body.article.author).toBeDefined()
                        expect(res.body.article.author.username).toEqual(johnjacob)
                    })
            })

            it('should return article by slug with token', () => {
                request(api)
                    .get(`/articles/${slug}`)
                    .send({ Authorization: `Token ${token} ` })
                    .expect(200)
                    .expect(res => {
                        expect(res.body.article).toBeDefined()

                        expect(res.body.article.id).toBeDefined()
                        expect(res.body.article.title).toBeDefined()
                        expect(res.body.article.slug).toBeDefined()
                        expect(res.body.article.createdAt).toBeDefined()
                        expect(/^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/.test(res.body.article.createdAt)).toBeTruthy()
                        expect(res.body.article.updatedAt).toBeDefined()
                        expect(/^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/.test(res.body.article.updatedAt)).toBeTruthy()
                        expect(res.body.article.description).toBeDefined()
                        expect(res.body.article.tagList).toBeInstanceOf(Array)
                        expect(res.body.article.tagList.length).toBeGreaterThan(0)
                        expect(res.body.article.favorited).toBeFalsy()
                        expect(res.body.article.favoritesCount).toBeDefined()
                        expect(Number.isInteger(res.body.article.favoritesCount)).toBeTruthy()
                        expect(res.body.article.author).toBeDefined()
                        expect(res.body.article.author.username).toEqual(johnjacob)
                    })
            })
        })

        describe('POST / → Create article', () => {
            it('should require a valid token', () => {
                request(api)
                    .post('/articles')
                    .expect(403)
            })

            it('should return 422 on missing info', () => {
                request(api)
                    .post('/articles')
                    .set({ Authorization: `Token ${token}` })
                    .send({ article: {} })
                    .expect(422)
                    .expect(res => {
                        expect(res.body.errors).toBeInstanceOf(Object)
                        expect(res.body.errors.title).toBeInstanceOf(Array)
                        expect(res.body.errors.description).toBeInstanceOf(Array)
                        expect(res.body.errors.body).toBeInstanceOf(Array)
                    })
            })

            it('should create a new article', () => {
                request(api)
                    .post('/articles')
                    .set({ Authorization: `Token ${token}` })
                    .send({ article })
                    .expect(201)
                    .expect(res => {
                        expect(res.body.article).toBeInstanceOf(Object)
                        expect(res.body.article.title).toEqual(article.title)
                        expect(res.body.article.description).toEqual(article.description)
                        expect(res.body.article.body).toEqual(article.body)
                        expect(res.body.article.tagList.sort()).toEqual(article.tagList)
                        expect(res.body.article.slug).toBeDefined()

                        expect(res.body.article.author).toBeDefined()
                        expect(res.body.article.author.username).toEqual(username)

                        newSlug = res.body.article.slug
                    })
            })

            it('should return newly created article', () => {
                request(api)
                    .get(`/articles/${newSlug}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.article).toBeInstanceOf(Object)
                        expect(res.body.article.title).toEqual(article.title)
                        expect(res.body.article.description).toEqual(article.description)
                        expect(res.body.article.body).toEqual(article.body)
                        expect(res.body.article.tagList.sort()).toEqual(article.tagList)
                        expect(res.body.article.slug).toBeDefined()

                        expect(res.body.article.author).toBeDefined()
                        expect(res.body.article.author.username).toEqual(username)

                        newSlug = res.body.article.slug
                    })
            })
        })

        describe('PUT / → Update article', () => {
            it('should require a valid token', () => {
                request(api)
                    .put(`/articles/${newSlug}`)
                    .send({ article: {} })
                    .expect(403)
            })

            it('should return 422 on missing info', () => {
                request(api)
                    .put(`/articles/${slug}`)
                    .set({ Authorization: `Token ${token}` })
                    .expect(422)
            })

            it('should not let you edit article from another author', () => {
                request(api)
                    .put(`/articles/${slug}`)
                    .set({ Authorization: `Token ${token}` })
                    .send({ article: { body: 'newbody' } })
                    // TODO: 403
                    // .expect(403)
                    .expect(404)
            })

            it('should update and return updated record', () => {
                let body = 'Updated body'

                request(api)
                    .put(`/articles/${newSlug}`)
                    .set({ Authorization: `Token ${token}` })
                    .send({ article: { body } })
                    .expect(200)
                    .expect(res => {
                        expect(res.body.article.title).toEqual(article.title)
                        expect(res.body.article.description).toEqual(article.description)
                        expect(res.body.article.tagList.sort()).toEqual(article.tagList)
                        expect(res.body.article.slug).toBeDefined()
                        expect(res.body.article.author).toBeDefined()
                        expect(res.body.article.author.username).toEqual(username)

                        expect(res.body.article.body).toEqual(body)
                    })
            })
        })

        describe('POST /:slug/favorite → Favorite an article', () => {
            it('should require a valid token', () => {
                request(api)
                    .post(`/articles/${slug}/favorite`)
                    .expect(403)
            })

            it('should create favorited relationship and return updated record', () => {
                request(api)
                    .post(`/articles/${newSlug}/favorite`)
                    .set({ Authorization: `Token ${token}` })
                    .expect(201)
                    .expect(res => {
                        expect(res.body.article.slug).toEqual(newSlug)
                        expect(res.body.article.favorited).toEqual(true)
                        expect(res.body.article.favoritesCount).toBeGreaterThan(0)
                    })
            })
        })

        describe('DELETE /:slug/favorite → Remove a favorite', () => {
            it('should require a valid token', () => {
                request(api)
                    .delete(`/articles/${slug}/favorite`)
                    .expect(403)
            })

            it('should create favorited relationship and return updated record', () => {
                request(api)
                    .delete(`/articles/${newSlug}/favorite`)
                    .set({ Authorization: `Token ${token}` })
                    .expect(200)
                    .expect(res => {
                        expect(res.body.article.slug).toEqual(newSlug)
                        expect(res.body.article.favorited).toEqual(false)
                    })
            })
        })

        describe('GET /:slug/comments → List comments for an article', () => {
            it('should return a list of comments', () => {
                request(api)
                    .get(`/articles/${slug}/comments`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.comments).toBeInstanceOf(Array)
                        expect(res.body.comments.length).toEqual(1)
                        expect(res.body.comments[0].body).toEqual('Great!')
                        expect(res.body.comments[0].createdAt).toBeDefined()
                        expect(res.body.comments[0].updatedAt).toBeDefined()
                        expect(res.body.comments[0].author).toBeInstanceOf(Object)
                        expect(res.body.comments[0].author.username).toEqual(jane)
                    })
            })
            it('should return a list of comments with token', () => {
                request(api)
                    .get(`/articles/${slug}/comments`)
                    .set({ Authorization: `Token ${token}` })
                    .expect(200)
                    .expect(res => {
                        expect(res.body.comments).toBeInstanceOf(Array)
                        expect(res.body.comments.length).toEqual(1)
                        expect(res.body.comments[0].body).toEqual('Great!')
                        expect(res.body.comments[0].createdAt).toBeDefined()
                        expect(res.body.comments[0].updatedAt).toBeDefined()
                        expect(res.body.comments[0].author).toBeInstanceOf(Object)
                        expect(res.body.comments[0].author.username).toEqual(jane)
                    })
            })
        })

        describe('POST /:slug/comments/:commentId → Post a comment', () => {
            let body = 'Hello!'


            it('should require a valid token', () => {
                request(api)
                    .post(`/articles/${slug}/comments`)
                    .expect(403)
            })

            it('should return 422 on missing info', () => {
                request(api)
                    .post(`/articles/${slug}/comments`)
                    .set({ Authorization: `Token ${token}` })
                    .send({ comment: {  } })
                    .expect(422)
            })

            it('should return 404 if article not found', () => {
                request(api)
                    .post('/articles/not-found/comments')
                    .set({ Authorization: `Token ${token}` })
                    .send({ comment: { body } })
                    .expect(404)
            })

            it('should create a new comment', () => {
                request(api)
                    .post(`/articles/${slug}/comments`)
                    .set({ Authorization: `Token ${token}` })
                    .send({ comment: { body: 'Hello!' } })
                    .expect(res => {
                        expect(res.body.comment).toBeInstanceOf(Object)
                        expect(res.body.comment.id).toBeDefined()
                        expect(res.body.comment.createdAt).toBeDefined()
                        expect(res.body.comment.updatedAt).toBeDefined()
                        expect(res.body.comment.body).toEqual(body)
                        expect(res.body.comment.author).toBeInstanceOf(Object)
                        expect(res.body.comment.author.username).toEqual(username)

                        commentId = res.body.comment.id
                    })
            })

            it('should return comment at top of GET request', () => {
                request(api)
                    .get(`/articles/${slug}/comments`)
                    .expect(res => {
                        expect(res.body.comments).toBeInstanceOf(Object)
                        expect(res.body.comments.length).toEqual(2)
                        expect(res.body.comments[0].id).toEqual(commentId)
                        expect(res.body.comments[0].createdAt).toBeDefined()
                        expect(res.body.comments[0].updatedAt).toBeDefined()
                        expect(res.body.comments[0].body).toEqual(body)
                        expect(res.body.comments[0].author).toBeInstanceOf(Object)
                        expect(res.body.comments[0].author.username).toEqual(username)
                    })
            })
        })

        describe('DELETE /:slug/favorite/:commentId → Delete a comment', () => {
            it('should require a valid token', () => {
                request(api)
                    .delete(`/articles/${slug}/comments/${commentId}`)
                    .expect(403)
            })

            it('shouldnt let the user delete someone elses comment', () => {
                request(api)
                    .delete(`/articles/${slug}/comments/${otherCommentId}`)
                    .set({ Authorization: `Token ${token}` })
                    // TODO: .expect(403)
                    .expect(404)
            })

            it('should delete comment', () => {
                request(api)
                    .delete(`/articles/${slug}/comments/${commentId}`)
                    .set({ Authorization: `Token ${token}` })
                    .expect(200)
            })
        })

        describe('DELETE /:slug → Create article', () => {
            it('should require a valid token', () => {
                request(api)
                    .delete(`/articles/${newSlug}`)
                    .send({ article: {} })
                    .expect(403)
            })

            it('should not let you delete article from another author', () => {
                request(api)
                    .delete(`/articles/${slug}`)
                    .set({ Authorization: `Token ${token}` })
                    .send({ article: { body: 'newbody' } })
                    // TODO: 403
                    // .expect(403)
                    .expect(404)
            })

            it('should delete the users article', () => {
                request(api)
                    .delete(`/articles/${newSlug}`)
                    .set({ Authorization: `Token ${token}` })
                    .expect(200)
            })
        })
    })


    // afterAll(() => neo4j.write(`MATCH (u:User {username: $username}) DETACH DELETE u`, { username }))
});
