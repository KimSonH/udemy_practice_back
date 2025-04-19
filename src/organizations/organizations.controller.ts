import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PaginationParams } from 'src/common/pagination.type';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  findAll(@Query() query: PaginationParams) {
    return this.organizationsService.findAll(query);
  }

  @Get('group-by-name')
  groupOrganizationsByName() {
    return this.organizationsService.groupOrganizationsByName();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(+id);
  }

  @Get('slug/:slug')
  findOneBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findOneBySlug(slug);
  }
}
