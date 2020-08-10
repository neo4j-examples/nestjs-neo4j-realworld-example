import { Node } from 'neo4j-driver'
import { User } from 'src/user/entity/user.entity'

export class Article {
    constructor(
        private article: Node,
        private author: User,
        private tagList: Node[],

        private favoritesCount: number,
        private favorited: boolean
    ) {}

    toJson(): Record<string, any> {
        // const { password, bio, image, ...properties } = <Record<string, any>> this.article.properties;

        // return {
        //     ...properties,
        // }
        return {
            ...this.article.properties,
            favoritesCount: this.favoritesCount,
            favorited: this.favorited,
            author: this.author.toJson(),
            tagList: this.tagList.map(node => node.properties),
        }
    }
}
