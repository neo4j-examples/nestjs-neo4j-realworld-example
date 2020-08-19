import { Controller, Get, Param, NotFoundException, UseGuards, Request, Post, Delete } from '@nestjs/common';
import { UserService } from '../user.service';
import { use } from 'passport';
import { JwtAuthGuard } from '../auth/jwt.auth-guard';
import { User } from '../entity/user.entity';

@Controller('profiles')
export class ProfileController {

    constructor(private readonly userService: UserService) {}

    @UseGuards(JwtAuthGuard)
    @Get('/:username')
    async getIndex(@Request() request, @Param('username') username) {
        const user = await this.userService.findByUsername(username)

        if ( !user ) throw new NotFoundException(`User ${username} not found`)

        const following = await this.userService.isFollowing(user, <User> request.user)

        return {
            profile: {
                ...user.toJson(),
                following,
            }
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('/:username/follow')
    async postFollow(@Request() request, @Param('username') username) {
        const user = await this.userService.follow(request.user, username)

        if ( !user ) throw new NotFoundException(`User ${username} not found`)

        return {
            profile: {
                ...user.toJson(),
                following: true,
            }
        }
    }

    @UseGuards(JwtAuthGuard)
    @Delete('/:username/follow')
    async deleteFollow(@Request() request, @Param('username') username) {
        const user = await this.userService.unfollow(request.user, username)

        if ( !user ) throw new NotFoundException(`User ${username} not found`)

        return {
            profile: {
                ...user.toJson(),
                following: false,
            }
        }
    }

}
