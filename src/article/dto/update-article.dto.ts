// {"article":{"title":"How to train your dragon", "description":"Ever wonder how?", "body":"Very carefully.", "tagList":["dragons","training"]}}

import { IsNotEmpty, ValidateNested, IsOptional } from "class-validator";
import { Type } from "class-transformer";

class Article {
    @IsOptional()
    title?: string;

    @IsOptional()
    description?: string;

    @IsOptional()
    body?: string;

    @IsOptional()
    tagList: string[];
}

export class UpdateArticleDto {

    @ValidateNested()
    @Type(() => Article)
    article: Article;

}