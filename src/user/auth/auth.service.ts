import { Injectable } from '@nestjs/common';
import { User } from '../../user/entity/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class AuthService {

    constructor(
        private readonly userService: UserService,
        private readonly encryptionService: EncryptionService,
        private readonly jwtService: JwtService
    ) {}

    createToken(user: User): string {
        const token = this.jwtService.sign(user.getClaims());

        return token
    }

    async validateUser(email: string, password: string): Promise<User | undefined> {
        const user = await this.userService.findByEmail(email)

        if ( user && await this.encryptionService.compare(password, user.getPassword()) ) {
            return user
        }

        return undefined
    }

}
