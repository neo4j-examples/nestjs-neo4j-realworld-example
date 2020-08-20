import { Node } from 'neo4j-driver'
import { User } from '../../user/entity/user.entity'
import { Tag } from './tag.entity'

export class Article {
    constructor(
        private readonly article: Node,
        private readonly author: User,
        private readonly tagList: Tag[],

        private readonly favoritesCount: number,
        private readonly favorited: boolean
    ) {}

    toJson(): Record<string, any> {
        return {
            ...this.article.properties,
            favoritesCount: this.favoritesCount,
            favorited: this.favorited,
            author: this.author.toJson(),
            tagList: this.tagList.map(tag => tag.toJson()),
        }
    }
}
