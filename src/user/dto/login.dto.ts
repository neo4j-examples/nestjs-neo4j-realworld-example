import { IsNotEmpty, IsEmail, ValidateNested, IsObject, Length } from 'class-validator'
import { Type } from 'class-transformer'

class UserDto {

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    password: string;

}

export class LoginDto {

    @IsObject()
    @ValidateNested()
    @Type(() => UserDto)
    user: UserDto;

}