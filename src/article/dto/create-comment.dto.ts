import { IsNotEmpty, ValidateNested, IsObject } from "class-validator";
import { Type } from "class-transformer";

class Comment {

    @IsNotEmpty()
    body: string;

}

export class CreateCommentDto {

    @IsObject()
    @ValidateNested()
    @Type(() => Comment)
    comment: Comment;

}