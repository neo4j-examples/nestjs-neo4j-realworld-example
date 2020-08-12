import { IsNotEmpty, IsEmail, IsDate, MaxDate, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class UserDto {

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    username: string;

    @IsNotEmpty()
    password: string;

    bio?: string = null;
    image?: string = null;

}

export class CreateUserDto {

    @ValidateNested()
    @Type(() => UserDto)
    user: UserDto;

}