import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserService } from "../user.service";
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
      private readonly configService: ConfigService,
      private readonly userService: UserService

    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Token'),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        })
    }
    async validate(payload: any) {
        return this.userService.findByEmail(payload.email)
    }
}