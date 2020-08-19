import { Injectable } from '@nestjs/common';
import { Neo4jService } from 'nest-neo4j/dist';
import { EncryptionService } from './encryption/encryption.service';
import { User } from './entity/user.entity'

@Injectable()
export class UserService {

    constructor(private readonly neo4jService: Neo4jService, private readonly encryptionService: EncryptionService) {}

    async create(username: string, password: string, email: string, bio?: string, image?: string): Promise<User> {
        return this.neo4jService.write(`
            CREATE (u:User {
                id: randomUUID(),
                username: $username,
                password: $password,
                email: $email,
                bio: $bio,
                image: $image
            })
            RETURN u
        `, {
            username,
            password: await this.encryptionService.hash(password),
            email,
            bio: bio || null,
            image: image || null,
        })
            .then(({ records }) => new User(records[0].get('u')) )
    }

    async findByEmail(email: string): Promise<User | undefined> {
        const res = await this.neo4jService.read('MATCH (u:User {email: $email}) RETURN u', { email })

        return res.records.length ? new User(res.records[0].get('u')) : undefined
    }

    async findByUsername(username: string): Promise<User | undefined> {
        const res = await this.neo4jService.read(`
            MATCH (u:User {username: $username})
            RETURN u
        `, {
            username
        })

        return res.records.length ? new User(res.records[0].get('u')) : undefined
    }

    async updateUser(user: User, updates: Record<string, any>): Promise<User> {
        if ( updates.password ) updates.password = await this.encryptionService.hash(updates.password)

        return this.neo4jService.write(`
            MATCH (u:User {id: $id})
            SET u.updatedAt = localdatetime(), u += $updates
            RETURN u
        `, { id: user.getId(), updates })
            .then(({ records }) => new User(records[0].get('u')) )
    }

    async isFollowing(target: User, current: User): Promise<boolean> {
        return this.neo4jService.read(`
            MATCH (target:User {id: $targetId})<-[:FOLLOWS]-(current:User {id: $currentId})
            RETURN count(*) AS count
        `, {
            targetId: target.getId(),
            currentId: current.getId(),
        })
            .then(res => {
                return res.records[0].get('count') > 0
            })
    }

    follow(user: User, username: string): Promise<User | undefined> {
        return this.neo4jService.write(`
            MATCH (target:User {username: $username})
            MATCH (current:User {id: $userId})

            MERGE (current)-[r:FOLLOWS]->(target)
            ON CREATE SET r.createdAt = datetime()

            RETURN target
        `, { username, userId: user.getId() })
            .then(res => {
                if ( res.records.length == 0 ) return undefined

                return new User(res.records[0].get('target'))
            })
    }

    unfollow(user: User, username: string): Promise<User | undefined> {
        return this.neo4jService.write(`
            MATCH (target:User {username: $username})

            FOREACH (rel IN [ (target)<-[r:FOLLOWS]-(:User {id: $userId}) | r ] |
                DELETE rel
            )

            RETURN target
        `, { username, userId: user.getId() })
            .then(res => {
                if ( res.records.length == 0 ) return undefined

                return new User(res.records[0].get('target'))
            })
        }



}
