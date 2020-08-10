import { IsNotEmpty, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class Comment {

    @IsNotEmpty()
    body: string;

}

export class CreateCommentDto {

    @ValidateNested()
    @Type(() => Comment)
    comment: Comment;

}