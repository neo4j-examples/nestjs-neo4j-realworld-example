// {"article":{"title":"How to train your dragon", "description":"Ever wonder how?", "body":"Very carefully.", "tagList":["dragons","training"]}}

import { IsNotEmpty, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class Article {
    @IsNotEmpty()
    title: string;

    @IsNotEmpty()
    description: string;

    @IsNotEmpty()
    body: string;

    tagList: string[];
}

export class CreateArticleDto {

    @ValidateNested()
    @Type(() => Article)
    article: Article;

}