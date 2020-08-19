import { Injectable } from '@nestjs/common';
import { Tag } from '../entity/tag.entity';
import { Neo4jService } from 'nest-neo4j/dist';

@Injectable()
export class TagService {

    constructor(private readonly neo4jService: Neo4jService) {}

    list(): Promise<Tag[]> {
        return this.neo4jService.read(`MATCH (t:Tag) RETURN t`)
            .then(res => res.records.map(row => new Tag(row.get('t'))))


    }




}
