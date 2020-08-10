import { ValidateNested, IsNotEmpty, IsEmail } from "class-validator";
import { Type } from "class-transformer";

class UpdatedUser {

    @IsEmail()
    email?: string;

    password?: string;

    bio?: string = null;
    image?: string = null;
}

export class UpdateUserDto {

    @ValidateNested()
    @Type(() => UpdatedUser)
    user: UpdatedUser
}