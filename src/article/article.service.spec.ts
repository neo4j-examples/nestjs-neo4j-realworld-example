import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import { Neo4jModule, Neo4jService } from 'nest-neo4j/dist';
import { User } from '../user/entity/user.entity';

import { int } from 'neo4j-driver'
import { Node } from 'neo4j-driver/lib/graph-types'
import { Result } from 'neo4j-driver/lib/result'

jest.mock('neo4j-driver/lib/driver')

import { mockNode, mockResult } from 'nest-neo4j/dist/test'

describe('ArticleService', () => {
  let service: ArticleService;
  let neo4jService: Neo4jService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        Neo4jModule.forRoot({
          scheme: 'neo4j', host: 'localhost', port: 7687, username: 'neo4j', password: 'neox'
        })
      ],
      providers: [ArticleService],
    }).compile();

    service = await module.resolve<ArticleService>(ArticleService);
    neo4jService = module.get(Neo4jService)
  });

  describe('::create()', () => {
    it('should create a new article', async () => {
      expect(service).toBeDefined();
      expect(neo4jService).toBeDefined();

      const data = {
        title: 'title',
        description: 'description',
        body: 'body',
        tagList: ['tag1', 'tag2']
      }
      const favoritesCount = 100
      const favorited = false

      // Assign user to request
      const user = new User( mockNode('User', { id: 'test-user' } ) )
      Object.defineProperty(service, 'request', { value: { user } })

      // Mock the response from neo4jService.write
      const write = jest.spyOn(neo4jService, 'write')
        .mockResolvedValue(
          mockResult([
            {
              u: user,
              a: mockNode('Article', { ...data, id: 'test-article-1' }),
              tagList: data.tagList.map(name => mockNode('Tag', { name })),
              favoritesCount,
              favorited,
            },
          ])



          // <Result> {
          // records: [
          //   {
          //     keys: [
          //       'u', 'a', 'tagList', 'favorited', 'favoritesCount'
          //     ],
          //     get: key => {
          //       switch (key) {
          //         case 'a':
          //  // If requesting 'a', return a `Node` with the data
          //  // passed to the `create` method
          //  return new Node( int(100), ['Article'], { ...data, id: 'test-article-1' })
          // case 'tagList':
          //   // If 'tagList' return an array of Nodes with a
          //   // property to represent the name
          //   return data.tagList.map((name, index) => new Node ( int(200 + index), 'Tag', { name }))
          // case 'favoritesCount':
          //   // If favouritesCount then return a random number
          //   return 100;
          // case 'favorited':
          //   // If favorited, return a boolean
          //   return false;
          //       }

          //       return null
          //     }
          //   }
          // ]
        )


      const article = await service.create(data.title, data.description, data.body, data.tagList)

      const json = article.toJson()

      expect(json).toEqual({
        ...data,
        author: user.toJson(),
        id: 'test-article-1',
        favorited,
        favoritesCount,
      })

    })
  })

  // it('should be defined', () => {
  //   expect(service).toBeDefined();
  // });
});
