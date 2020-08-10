import { Node } from 'neo4j-driver'
import { User } from "../../user/entity/user.entity";

export class Comment {

    constructor(private readonly node: Node, private readonly author: User) {}

    toJson() {
        return {
            ...this.node.properties,
            author: this.author.toJson(),
        }
    }

}