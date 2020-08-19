import { Node } from 'neo4j-driver'

export class Tag {
    private readonly node: Node;

    constructor(node: Node) {
        this.node = node
    }

    toJson() {
        // @ts-ignore
        return this.node.properties.name
    }
}