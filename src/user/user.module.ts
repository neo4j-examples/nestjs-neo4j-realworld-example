import { Module, OnModuleInit } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersController } from './users.controller';
import { EncryptionService } from '../user/encryption/encryption.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from './auth/auth.service';
import { LocalStrategy } from './auth/local.strategy';
import { JwtStrategy } from './auth/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { UserController } from './user.controller';
import { ProfileController } from './profile/profile.controller';
import { Neo4jService } from 'nest-neo4j/dist';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ ConfigModule ],
      inject: [ ConfigService, ],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      })
    }),
  ],
  providers: [UserService, LocalStrategy, JwtStrategy, AuthService, EncryptionService],
  controllers: [UserController, UsersController, ProfileController],
  exports: [],
})
export class UserModule implements OnModuleInit {

  constructor(private readonly neo4jService: Neo4jService) {}

  async onModuleInit() {
    await this.neo4jService.write(`CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE`).catch(() => {})
    await this.neo4jService.write(`CREATE CONSTRAINT ON (u:User) ASSERT u.username IS UNIQUE`).catch(() => {})
    await this.neo4jService.write(`CREATE CONSTRAINT ON (u:User) ASSERT u.email IS UNIQUE`).catch(() => {})
  }

}
