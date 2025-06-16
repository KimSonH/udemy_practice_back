import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { PaginationParams } from 'src/common/pagination.type';
import { normalize, join } from 'path';
import * as fs from 'fs';
import { generateUniqueSlug } from 'src/utils/slug';
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  private async deleteThumbnail(filename: string) {
    try {
      if (!filename) return;

      const baseFilename = filename.includes('/')
        ? filename.split('/').pop()
        : filename;

      const filePath = normalize(
        join(process.cwd(), 'uploads', 'organizations', baseFilename),
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Failed to delete organization thumbnail, please try again',
      );
    }
  }

  private async generateSlug(title: string) {
    const slug = await generateUniqueSlug(title, async (slug) => {
      const organization = await this.organizationRepository.findOne({
        where: { slug },
      });
      return !!organization;
    });
    return slug;
  }

  async create(createOrganizationDto: CreateOrganizationDto) {
    const { name, description, thumbnailImageUrl } = createOrganizationDto;
    const slug = await this.generateSlug(name);
    try {
      const organization = this.organizationRepository.create({
        name,
        description,
        slug,
        thumbnailImageUrl,
      });
      await this.organizationRepository.save(organization);
      return organization;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error creating organization');
    }
  }

  async uploadThumbnail(id: number, filename: string) {
    const organization = await this.findOne(id);
    if (organization.thumbnailImageUrl) {
      await this.deleteThumbnail(organization.thumbnailImageUrl);
    }
    try {
      return this.organizationRepository.update(id, {
        thumbnailImageUrl: filename,
      });
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error uploading thumbnail');
    }
  }

  async findAll(query: PaginationParams) {
    const { page, limit, search, organizationId, organizationSlug } = query;
    const offset = (page - 1) * limit;
    try {
      const [items, total] = await this.organizationRepository.findAndCount({
        where: {
          deletedAt: null,
          name: search ? Like(`%${search}%`) : undefined,
        },
        order: {
          createdAt: 'DESC',
        },
        skip: page === 9999 ? undefined : offset,
        take: page === 9999 ? undefined : limit,
      });
      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error finding organizations');
    }
  }

  async groupOrganizationsByName() {
    try {
      const groupOrganizationName = await this.organizationRepository
        .createQueryBuilder('organization')
        .where('organization.deletedAt IS NULL')
        .select('organization.name', 'name')
        .addSelect('organization.slug', 'slug')
        .addSelect('organization.thumbnailImageUrl', 'thumbnailImageUrl')
        .addSelect('COUNT(course.id)', 'count')
        .leftJoin('organization.courses', 'course')
        .groupBy(
          'organization.name, organization.slug, organization.thumbnailImageUrl',
        )
        .getRawMany();
      return groupOrganizationName;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error grouping organizations by name');
    }
  }

  async findOne(id: number) {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id },
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      return organization;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error finding organization');
    }
  }

  async findOneBySlug(slug: string) {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { slug },
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      return organization;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error finding organization by slug');
    }
  }

  async update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
    const organization = await this.findOne(id);
    const { name, description, thumbnailImageUrl } = updateOrganizationDto;
    let slug = organization.slug;
    if (name !== organization.name) {
      slug = await this.generateSlug(name);
    }
    try {
      const organization = await this.organizationRepository.update(id, {
        name,
        description,
        slug,
        thumbnailImageUrl,
      });
      return organization;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error updating organization');
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return this.organizationRepository.softDelete(id);
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error deleting organization');
    }
  }
}
