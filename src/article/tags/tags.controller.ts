import { Controller, Get } from '@nestjs/common';
import { TagService } from '../tag/tag.service';

@Controller('tags')
export class TagsController {

    constructor(private readonly tagService: TagService) {}

    @Get()
    async getList() {
        const tags = await this.tagService.list();

        return {
            tags: tags.map(tag => tag.toJson()),
        }
    }

}
