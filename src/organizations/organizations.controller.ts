import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PaginationParams } from 'src/common/pagination.type';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { Organization } from './entities/organization.entity';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated organizations',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: getSchemaPath(Organization) },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @Get()
  findAll(@Query() query: PaginationParams) {
    return this.organizationsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get organizations grouped by name' })
  @ApiResponse({
    status: 200,
    description: 'Returns organizations grouped by name',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  })
  @Get('group-by-name')
  groupOrganizationsByName() {
    return this.organizationsService.groupOrganizationsByName();
  }

  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the organization',
    type: Organization,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(+id);
  }

  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiResponse({
    status: 200,
    description: 'Returns the organization',
    type: Organization,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiParam({ name: 'slug', type: 'string' })
  @Get('slug/:slug')
  findOneBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findOneBySlug(slug);
  }
}
