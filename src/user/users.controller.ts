import { Controller, Post, Body, Request, UseFilters, UseGuards, Get } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { AuthService } from './auth/auth.service';
import { User } from './entity/user.entity';
import { Neo4jErrorFilter } from 'nest-neo4j';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { JwtAuthGuard } from './auth/jwt.auth-guard';


@Controller('users')
export class UsersController {

    constructor(private readonly userService: UserService, private readonly authService: AuthService) {}

    @UseFilters(Neo4jErrorFilter)
    @Post('/')
    async postIndex(@Body() createUserDto: CreateUserDto): Promise<any> {
        const user: User = await this.userService.create(
            createUserDto.user.username,
            createUserDto.user.password,
            createUserDto.user.email,
            createUserDto.user.bio,
            createUserDto.user.image
        )

        const token = this.authService.createToken(user)

        return {
            user: {
                ...user.toJson(),
                token,
            }
        }
    }


    @UseGuards(LocalAuthGuard)
    @Post('/login')
    async postLogin(@Request() request) {
        const token = this.authService.createToken(request.user)

        return {
            user: {
                ...request.user.toJson(),
                token,
            }
        }
    }

}
