import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersController } from './users.controller';
import { EncryptionService } from 'src/user/encryption/encryption.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from './auth/auth.service';
import { LocalStrategy } from './auth/local.strategy';
import { JwtStrategy } from './auth/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { UserController } from './user.controller';

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
  controllers: [UserController, UsersController],
  exports: [],
})
export class UserModule {}
