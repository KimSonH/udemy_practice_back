import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { ConfigModule } from '@nestjs/config';
import { OrganizationsAdminController } from './organizations.admin.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Organization]), ConfigModule],
  controllers: [OrganizationsController, OrganizationsAdminController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
