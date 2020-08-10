import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './user/auth/jwt.auth-guard';
import { AuthService } from './user/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

@Controller()
export class AppController {

}
