import { Controller, Post, Body, Request, UseFilters, UseGuards, Get, Put, UseInterceptors } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { AuthService } from './auth/auth.service';
import { User } from './entity/user.entity';
import { Neo4jErrorFilter, Neo4jTypeInterceptor } from 'nest-neo4j';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { JwtAuthGuard } from './auth/jwt.auth-guard';


@UseGuards(JwtAuthGuard)
@UseInterceptors(Neo4jTypeInterceptor.withOptions(true, true))
@Controller('user')
export class UserController {

    constructor(private readonly userService: UserService, private readonly authService: AuthService) {}

    @Get('/')
    async getIndex(@Request() request) {
        const token = this.authService.createToken(request.user)

        return {
            user: {
                ...request.user.toJson(),
                token,
            }
        }
    }

    @Put('/')
    async putIndex(@Request() request, @Body() body) {
        const user: User = request.user
        const updates = body.user

        const updatedUser = await this.userService.updateUser(user, updates)

        const token = this.authService.createToken(updatedUser)

        return {
            user: {
                ...updatedUser.toJson(),
                token,
            }
        }
    }

}
